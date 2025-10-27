import React, { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Repo, DocHandle } from '@automerge/automerge-repo';
import { useDocument, RepoContext } from '@automerge/automerge-repo-react-hooks';
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
// @ts-ignore - types may not yet be installed for storage adapter
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

// ---- Types ----
export interface MarkerDocMarker { id: string; lat: number; lng: number; owner?: string; soundType?: string | null; }
export interface MarkerDocShape { id: string; type: string; coordinates: any; soundType?: string | null; }
export interface MarkerDoc { markers: MarkerDocMarker[]; shapes: MarkerDocShape[]; }

interface CollabContextValue {
    repo: Repo | null;
    handle: DocHandle<MarkerDoc> | null;
    doc: MarkerDoc | null;
    changeDoc: (fn:(d:MarkerDoc)=>void) => void;
    docId: string | null;
    docUrl: string | null;
    peerId: string | null;
    status: 'creating' | 'joining' | 'waiting' | 'ready' | 'error';
    error: string | null;
    attemptCount?: number;
    ensureMarker: (id:string, init: Omit<MarkerDocMarker,'id'>) => void;
    updateMarker: (id:string, partial: Partial<Omit<MarkerDocMarker,'id'>>) => void;
    deleteMarker: (id:string) => void;
    addShape: (shape: Omit<MarkerDocShape,'id'> & { id?: string }) => string;
    updateShape: (id:string, partial: Partial<Omit<MarkerDocShape,'id'>>) => void;
    deleteShape: (id:string) => void;
    createNewDocument: () => void;
    retryJoin?: () => void;
}

const CollabContext = createContext<CollabContextValue | undefined>(undefined);
const randomId = () => crypto.randomUUID();
const readDocParam = () => new URL(window.location.href).searchParams.get('doc');
const sanitizeDocParam = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return null;
    return trimmed;
};
const writeDocParam = (h: DocHandle<any>) => {
    const u = new URL(window.location.href);
    // Some adapters may not populate handle.url immediately. Fall back to documentId.
    let canonical = (h as any).url as string | undefined;
    if (!canonical) {
        const docId = (h as any).documentId as string | undefined;
        if (docId) {
            canonical = docId.startsWith('automerge:') ? docId : `automerge:${docId}`;
            console.warn('[Collab] handle.url missing; using documentId fallback for URL param', canonical);
        }
    }
    if (!canonical) {
        console.warn('[Collab] No canonical URL available for handle; not updating ?doc=');
        return;
    }
    if (u.searchParams.get('doc') !== canonical) {
        u.searchParams.set('doc', canonical);
        window.history.replaceState({}, '', u.toString());
    }
};

export const CollaborationProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [repo] = useState(() => {
        let storage: any = undefined;
        try {
            if (typeof indexedDB !== 'undefined') {
                storage = new IndexedDBStorageAdapter();
            } else {
                console.warn('[Collab] indexedDB not available; running without persistence');
            }
        } catch (e) {
            console.warn('[Collab] Failed to initialize IndexedDBStorageAdapter; continuing without persistence', e);
        }
        return new Repo({
            network: [new WebSocketClientAdapter('wss://sync.automerge.org')],
            ...(storage ? { storage } : {})
        });
    });
    const [peerId] = useState(() => (repo as any).peerId ?? randomId());
    const [handle, setHandle] = useState<DocHandle<MarkerDoc> | null>(null);
    const [status, setStatus] = useState<'creating' | 'joining' | 'waiting' | 'ready' | 'error'>('joining');
    const [error, setError] = useState<string | null>(null);
    const [attemptCount, setAttemptCount] = useState(0);
    const [joinSeed, setJoinSeed] = useState(0); // bump to restart join loop
    const joinStartedRef = useRef(false); // StrictMode guard
    const createNewDocument = () => {
        const h = repo.create<MarkerDoc>({ markers: [], shapes: [] });
        console.log('[Collab] Created new document', (h as any).documentId, (h as any).url);
        writeDocParam(h);
        setHandle(h);
        setStatus('ready');
        setError(null);
    };

    useEffect(() => {
        let cancelled = false;
        const join = async () => {
            const rawParam = readDocParam();
            const param = sanitizeDocParam(rawParam);
            console.log('[Collab][debug] join invoked', { rawParam, sanitized: param, joinSeed, alreadyStarted: joinStartedRef.current });
            if (joinStartedRef.current) {
                console.log('[Collab][debug] join aborted (already running)');
                return;
            }
            joinStartedRef.current = true;
            if (!param) {
                setStatus('creating');
                createNewDocument();
                return;
            }
            setStatus('joining');
            const wanted = param.startsWith('automerge:') ? param : `automerge:${param}`;
            let attempt = 0;
            // Indefinite retry with capped exponential backoff + jitter
            while (!cancelled) {
                try {
                    const h = await (repo as any).find?.(wanted);
                    if (h) {
                        console.log('[Collab] Joined existing document', { docId: (h as any).documentId, url: (h as any).url });
                        writeDocParam(h);
                        setHandle(h);
                        setStatus('ready');
                        setError(null);
                        setAttemptCount(attempt);
                        joinStartedRef.current = false; // allow future retryJoin if needed
                        return;
                    }
                } catch (e: any) {
                    console.warn('[Collab] find attempt failed', { attempt, wanted, error: e?.message });
                    setError(e?.message || 'find failed');
                }
                attempt++;
                setAttemptCount(attempt);
                // Backoff: base 500ms * 2^attempt capped at 20s
                const base = 500 * Math.pow(2, attempt);
                const capped = Math.min(base, 20000);
                const jitter = Math.random() * 0.3 * capped; // up to +30%
                const delay = capped + jitter;
                setStatus('waiting');
                if (attempt % 5 === 0) console.log('[Collab] Waiting for remote doc (still retrying)', { attempt, nextDelayMs: Math.round(delay) });
                await new Promise(r => setTimeout(r, delay));
            }
        };
        join();
        return () => { cancelled = true; };
    }, [repo, joinSeed]);

    const retryJoin = () => {
        if (status === 'ready') return;
        console.log('[Collab] Manual retryJoin invoked');
        setAttemptCount(0);
        setError(null);
        joinStartedRef.current = false; // allow new join cycle
        setJoinSeed(s => s + 1);
    };

    if (!handle) {
        // Provide context even while waiting so UI can show status / createNewDocument action
        return (
            <RepoContext.Provider value={repo as any}>
                <CollabContext.Provider value={{
                    repo,
                    handle: null,
                    doc: null,
                    changeDoc: () => {},
                    docId: null,
                    docUrl: null,
                    peerId,
                    status,
                    error,
                    attemptCount,
                    ensureMarker: () => {},
                    updateMarker: () => {},
                    deleteMarker: () => {},
                    addShape: () => randomId(),
                    updateShape: () => {},
                    deleteShape: () => {},
                    createNewDocument,
                    retryJoin
                }}>{children}</CollabContext.Provider>
            </RepoContext.Provider>
        );
    }
    return (
        <RepoContext.Provider value={repo as any}>
            <Inner repo={repo} handle={handle} peerId={peerId} createNewDocument={createNewDocument}>{children}</Inner>
        </RepoContext.Provider>
    );
};

const Inner: React.FC<{ repo: Repo; handle: DocHandle<MarkerDoc>; peerId: string; createNewDocument: () => void; children: React.ReactNode }> = ({ repo, handle, peerId, createNewDocument, children }) => {
    // Guard: if url not yet available, delay using hook (avoids unavailable doc error)
    const handleUrl = (handle as any).url as string | undefined;
    // Provide a typed fallback for change function when handleUrl not yet ready
    const emptyChange: any = () => {};
    const docHook = handleUrl ? useDocument<MarkerDoc>(handleUrl as any) : [null, emptyChange];
    const doc = docHook[0] as MarkerDoc | null;
    const change: any = docHook[1];
    const changeDoc = (fn:(d:MarkerDoc)=>void) => {
        change((d: any) => {
            fn(d);
            // Provide a lightweight debug snapshot after each mutation
            try {
                console.log('[Collab] Doc mutated', {
                    markers: d.markers?.map((m: any) => ({ id: m.id, owner: m.owner, lat: m.lat, lng: m.lng, soundType: m.soundType })),
                    shapes: d.shapes?.map((s: any) => ({ id: s.id, type: s.type, soundType: s.soundType }))
                });
            } catch {/* ignore logging error */}
        });
    };

    const ensureMarker = (id:string, init: Omit<MarkerDocMarker,'id'>) => changeDoc(d => {
        if (!d.markers) d.markers = [];
        if (!d.markers.find(m => m.id === id)) {
            d.markers.push({ id, ...init });
            console.log('[Collab] ensureMarker added', id, init);
        }
    });
    const updateMarker = (id:string, partial: Partial<Omit<MarkerDocMarker,'id'>>) => changeDoc(d => {
        const m = d.markers?.find(mk => mk.id === id); if (m) { Object.assign(m, partial); console.log('[Collab] updateMarker', id, partial); }
    });
    const deleteMarker = (id:string) => changeDoc(d => { if (!d.markers) return; d.markers = d.markers.filter(m => m.id !== id); console.log('[Collab] deleteMarker', id); });
    const addShape = (shape: Omit<MarkerDocShape,'id'> & { id?: string }) => { const newId = shape.id || randomId(); changeDoc(d => { if (!d.shapes) d.shapes = []; d.shapes.push({ id: newId, ...shape }); console.log('[Collab] addShape', newId, shape.type); }); return newId; };
    const updateShape = (id:string, partial: Partial<Omit<MarkerDocShape,'id'>>) => changeDoc(d => { const s = d.shapes?.find(sh => sh.id === id); if (s) { Object.assign(s, partial); console.log('[Collab] updateShape', id, partial); } });
    const deleteShape = (id:string) => changeDoc(d => { if (!d.shapes) return; d.shapes = d.shapes.filter(s => s.id !== id); console.log('[Collab] deleteShape', id); });

    // Ensure a marker for this peer exists
    useEffect(() => { if (!doc) return; if (!doc.markers.find(m => m.owner === peerId)) { ensureMarker(randomId(), { lat: 42.308606, lng: -83.747036, owner: peerId, soundType: null }); } }, [doc, peerId]);

    useEffect(() => { console.log('[Collab] Peer ready', { peerId, docId: handle.documentId, url: handle.url }); }, [peerId, handle.documentId, handle.url]);

    const value: CollabContextValue = { repo, handle, doc: (doc as MarkerDoc) ?? null, changeDoc, docId: handle.documentId as string, docUrl: handle.url, peerId, status: 'ready', error: null, attemptCount: undefined, ensureMarker, updateMarker, deleteMarker, addShape, updateShape, deleteShape, createNewDocument };
    return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
};

export function useCollaboration() { const ctx = useContext(CollabContext); if (!ctx) throw new Error('useCollaboration must be used inside CollaborationProvider'); return ctx; }
export function useMarkers(): MarkerDocMarker[] { const { doc } = useCollaboration(); return doc?.markers ?? []; }
export default CollaborationProvider;
