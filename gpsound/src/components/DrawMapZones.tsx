import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import SoundKit from './SoundKit';
import { useDocument } from '@automerge/automerge-repo-react-hooks';
import { Repo } from '@automerge/automerge-repo';
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import Flatten from 'flatten-js';
const { point, circle, Polygon, PlanarSet } = Flatten;

// Type definitions for Flatten.js usage
interface PointExt extends Flatten.Point {}
interface CircleExt extends Flatten.Circle {}
interface PolygonExt extends Flatten.Polygon {}

// ArrangementDoc interface for Automerge
interface ArrangementDoc {
  shapes: DrawnShape[];
  mapView: { center: [number, number]; zoom: number } | null;
  userMarkers: { [userId: string]: { pos: [number, number]; avatarUrl: string } };
}

// Human-readable document ID generator
const WORDS = [
    'blue', 'green', 'red', 'yellow', 'purple', 'orange', 'silver', 'gold', 'happy', 'sad', 'tiger', 'lion', 'moon', 'star', 'cloud', 'river', 'mountain', 'forest', 'ocean', 'sky', 'sun', 'leaf', 'rock', 'tree', 'wolf', 'fox', 'owl', 'bear', 'fish', 'eagle', 'hawk', 'ant', 'bee', 'cat', 'dog', 'mouse', 'horse', 'frog', 'bat', 'deer', 'crab', 'shark', 'whale', 'dove', 'falcon', 'panda', 'koala', 'otter', 'seal', 'swan', 'goose', 'duck', 'peach', 'plum', 'pear', 'apple', 'grape', 'melon', 'berry', 'cherry', 'lemon', 'lime', 'nut', 'seed', 'root', 'branch', 'petal', 'bud', 'bark', 'shell', 'coral', 'wave', 'wind', 'rain', 'snow', 'storm', 'mist', 'fog', 'ice', 'fire', 'ember', 'ash', 'smoke', 'flame', 'light', 'dark', 'shadow', 'echo', 'song', 'dream', 'wish', 'luck', 'joy', 'peace', 'hope', 'love', 'grace', 'faith', 'truth', 'spirit', 'soul', 'heart', 'mind', 'voice', 'hand', 'eye', 'face', 'wing', 'tail', 'claw', 'paw', 'hoof', 'fin', 'scale', 'feather', 'fur', 'mane', 'horn', 'tusk', 'fang', 'beak', 'bill', 'web', 'spine', 'shell', 'star', 'moon', 'sun', 'cloud', 'rain', 'snow', 'storm', 'wind', 'wave', 'leaf', 'root', 'branch', 'petal', 'bud', 'bark', 'seed', 'nut', 'berry', 'peach', 'plum', 'pear', 'apple', 'grape', 'melon', 'cherry', 'lemon', 'lime', 'ant', 'bee', 'cat', 'dog', 'mouse', 'horse', 'frog', 'bat', 'deer', 'crab', 'shark', 'whale', 'dove', 'falcon', 'panda', 'koala', 'otter', 'seal', 'swan', 'goose', 'duck'
];
function generateDocId() {
    const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
    return `${pick()}-${pick()}-${pick()}`;
}
// Utility to get a random avatar URL
function getRandomAvatarUrl() {
    const seed = Math.random().toString(36).substring(2, 10);
    // Use RoboHash monsters set
    return `https://robohash.org/${seed}?set=set3&size=48x48`;
}

// Utility to create a marker icon with a reticle overlay
function createUserIconWithReticle(avatarUrl: string) {
    // SVG with avatar and reticle (crosshair at bottom center)
    // Use avatar URL directly
    return L.icon({
        iconUrl: avatarUrl,
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        className: 'user-profile-marker'
    });
}

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DrawnShape {
    id: number;
    type: string;
    coordinates: any;
    soundType: string | null;
}

interface SoundDropdownState {
    show: boolean;
    position: { x: number; y: number };
    shapeId: number | null;
}

interface ConvertedCoords {
    x: number;
    y: number;
}

const AUTOMERGE_SERVER_URL = 'wss://sync.automerge.org';

const DrawMapZones = () => {
    // State hooks should be declared first
    const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
    const [userMarker, setUserMarker] = useState<L.Marker | null>(null);
    const [userMarkerPos, setUserMarkerPos] = useState<L.LatLngTuple>([42.308606, -83.747036]);
    const [avatarUrl] = useState<string>(getRandomAvatarUrl());
    const [soundDropdown, setSoundDropdown] = useState<SoundDropdownState>({
        show: false,
        position: { x: 0, y: 0 },
        shapeId: null
    });
    const userMarkersLayerRef = useRef<L.LayerGroup | null>(null);

    // Get or set document ID in URL
    const getOrSetDocId = () => {
        const params = new URLSearchParams(window.location.search);
        let docId = params.get('doc');
        if (!docId) {
            docId = generateDocId();
            params.set('doc', docId);
            window.location.search = params.toString();
        }
        return docId;
    };
    const docId = getOrSetDocId();

    // Automerge repo setup
    const [repo] = useState(() => {
        const r = new Repo();
        r.networkSubsystem.addNetworkAdapter(new WebSocketClientAdapter(AUTOMERGE_SERVER_URL));
        return r;
    });

    // Create Automerge document if it doesn't exist
    const [docHandle, setDocHandle] = useState<any>(null);
    useEffect(() => {
        let handle = repo.handles[docId as any];
        if (!handle) {
            handle = repo.create(docId as any);
        }
        setDocHandle(handle);
    }, [repo, docId]);

    // Use Automerge doc for arrangement
    const [doc, change] = useDocument<ArrangementDoc>(docHandle?.documentId);

    // Generate a userId for this session
    const [userId] = useState(() => {
        return 'user-' + Math.random().toString(36).substring(2, 10);
    });

    // On local state change, sync to Automerge
    useEffect(() => {
        if (!doc) return;
            change(d => {
                // Deep copy shapes and mapView to avoid Automerge reference errors
                d.shapes = JSON.parse(JSON.stringify(drawnShapes));
                const mv = repoMapView();
                d.mapView = mv ? { ...mv } : null;
                if (!d.userMarkers) d.userMarkers = {};
                d.userMarkers[userId] = { pos: [userMarkerPos[0], userMarkerPos[1]], avatarUrl };
            });
    }, [drawnShapes, userMarkerPos]);

    // On Automerge doc change, update local state
    useEffect(() => {
        if (!doc) return;
        if (doc.shapes) setDrawnShapes(doc.shapes);
        if (doc.userMarkers && doc.userMarkers[userId]) {
            const newPos = [doc.userMarkers[userId].pos[0], doc.userMarkers[userId].pos[1]];
            // Only update if position actually changed
            if (userMarkerPos[0] !== newPos[0] || userMarkerPos[1] !== newPos[1]) {
                setUserMarkerPos(newPos as L.LatLngTuple);
            }
        }
        // Optionally update other users' markers here
    }, [doc, userMarkerPos]);

    // Render all user markers from Automerge
    useEffect(() => {
        if (!doc || !mapInstanceRef.current) return;
        // Create LayerGroup for user markers if not exists
        if (!userMarkersLayerRef.current) {
            userMarkersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        }
        // Remove all layers from the group
        userMarkersLayerRef.current.clearLayers();
        // Add markers for all users
        if (doc.userMarkers) {
            Object.entries(doc.userMarkers).forEach(([uid, info]) => {
                if (!info.pos || !info.avatarUrl) return;
                const icon = L.icon({
                    iconUrl: info.avatarUrl,
                    iconSize: [48, 48],
                    iconAnchor: [24, 48],
                    className: 'multiuser-marker'
                });
                const marker = L.marker(info.pos as [number, number], {
                    icon,
                    draggable: uid === userId // Only allow dragging for current user
                });
                if (uid === userId) {
                    marker.on('drag', function () {
                        const newPos = marker.getLatLng();
                        setUserMarkerPos([newPos.lat, newPos.lng]);
                    });
                    marker.on('dragend', function () {
                        const newPos = marker.getLatLng();
                        setUserMarkerPos([newPos.lat, newPos.lng]);
                    });
                }
                if (userMarkersLayerRef.current) {
                    userMarkersLayerRef.current.addLayer(marker);
                }
            });
        }
    }, [doc, userId]);

    // Helper to get current map view
    function repoMapView() {
        if (mapInstanceRef.current) {
            const center = mapInstanceRef.current.getCenter();
            const zoom = mapInstanceRef.current.getZoom();
            return { center: [center.lat, center.lng] as [number, number], zoom };
        }
        return null;
    }

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [mapLoc,] = useState<L.LatLngTuple>([42.308606, -83.747036]);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        var gulestan: L.LatLngTuple = [42.308606, -83.747036];

        const map = L.map(mapRef.current, {
            maxZoom: 23
        }).setView(gulestan, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 23,
            maxNativeZoom: 19
        }).addTo(map);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 23,
            maxNativeZoom: 19
        }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            draw: {
                polyline: false,
            },
            edit: {
                featureGroup: drawnItems,
            }
        });
        map.addControl(drawControl);

        mapInstanceRef.current = map;
        drawnItemsRef.current = drawnItems;

        // Add user marker with avatar
        const userIcon = createUserIconWithReticle(avatarUrl);
        const marker = L.marker(userMarkerPos, {
            icon: userIcon,
            draggable: true
        }).addTo(map);
        marker.on('drag', function () {
            const newPos = marker.getLatLng();
            if (reticleMarker) {
                reticleMarker.setLatLng(newPos);
            }
        });
        marker.on('dragend', function () {
            const newPos = marker.getLatLng();
            setUserMarkerPos([newPos.lat, newPos.lng]);
            if (reticleMarker) {
                reticleMarker.setLatLng(newPos);
            }
        });
        setUserMarker(marker);

        // Add reticle marker (small green dot)
        const reticleMarker = L.circleMarker(userMarkerPos, {
            radius: 5,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 1,
            weight: 2
        }).addTo(map);

        map.on(L.Draw.Event.CREATED, function (event: any) {
            const layer = event.layer;
            const type = event.layerType;

            drawnItems.addLayer(layer);

            const shapeInfo: DrawnShape = {
                id: Date.now(),
                type: type,
                coordinates: getCoordinates(layer, type),
                soundType: null
            };

            setDrawnShapes(prev => [...prev, shapeInfo]);

            // Add click handler to the new shape
            layer.on('click', function (e: any) {
                const containerPoint = map.mouseEventToContainerPoint(e.originalEvent);
                setSoundDropdown({
                    show: true,
                    position: { x: containerPoint.x, y: containerPoint.y },
                    shapeId: shapeInfo.id
                });
            });

            console.log('Shape drawn. shapeInfo:', shapeInfo);
        });

        map.on(L.Draw.Event.DELETED, function (e: any) {
            var deletedLayers = e.layers;
            deletedLayers.eachLayer(function (layer: any) {
                console.log('Deleted layer:', layer);
            });
        });

        // Close dropdown when clicking on map
        map.on('click', function (e: any) {
            // Only close if not clicking on a shape
            if (!e.originalEvent.target.closest('.leaflet-interactive')) {
                setSoundDropdown(prev => ({ ...prev, show: false }));
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // Update marker position if state changes
        useEffect(() => {
            if (userMarker) {
                userMarker.setLatLng(userMarkerPos);
            }
            // Move reticle marker if it exists
            const map = mapInstanceRef.current;
            if (map) {
                map.eachLayer(layer => {
                    if (layer instanceof L.CircleMarker && layer.options.color === '#10b981') {
                        layer.setLatLng(userMarkerPos);
                    }
                });
            }
        }, [userMarkerPos, userMarker]);
    }, []);

    const getCoordinates = function (layer: any, type: any) {
        switch (type) {
            case 'marker':
                const markerLatLng = layer.getLatLng();
                return [markerLatLng.lat, markerLatLng.lng];
            case 'circle':
                const circleLatLng = layer.getLatLng();
                return {
                    center: [circleLatLng.lat, circleLatLng.lng],
                    radius: layer.getRadius()
                };
            case 'rectangle':
            case 'polygon':
                return layer.getLatLngs()[0].map((latlng: any) => [latlng.lat, latlng.lng]);
            case 'circlemarker':
                const cmLatLng = layer.getLatLng();
                return {
                    center: [cmLatLng.lat, cmLatLng.lng],
                    radius: layer.getRadius()
                };
            default:
                return null;
        }
    };

    const clearArrangement = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setDrawnShapes([]);
            setSoundDropdown(prev => ({ ...prev, show: false }));
        }
    };


    // Export arrangement (shapes and map view) to JSON file
    const exportArrangement = () => {
        let mapView = null;
        if (mapInstanceRef.current) {
            const center = mapInstanceRef.current.getCenter();
            const zoom = mapInstanceRef.current.getZoom();
            mapView = {
                center: [center.lat, center.lng],
                zoom
            };
        }
        const exportData = {
            shapes: drawnShapes,
            mapView
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'arrangement.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Helper to draw shapes on the map from imported data
    const drawShapesOnMap = (shapes: DrawnShape[]) => {
        if (!drawnItemsRef.current) return;
        drawnItemsRef.current.clearLayers();
        shapes.forEach(shape => {
            let layer: L.Layer | null = null;
            switch (shape.type) {
                case 'marker':
                    layer = L.marker(shape.coordinates);
                    break;
                case 'circle':
                    layer = L.circle(shape.coordinates.center, { radius: shape.coordinates.radius });
                    break;
                case 'rectangle':
                    layer = L.rectangle(shape.coordinates);
                    break;
                case 'polygon':
                    layer = L.polygon(shape.coordinates);
                    break;
                case 'circlemarker':
                    layer = L.circleMarker(shape.coordinates.center, { radius: shape.coordinates.radius });
                    break;
                default:
                    break;
            }
            if (layer && drawnItemsRef.current) {
                drawnItemsRef.current.addLayer(layer);
                // Add click handler for sound dropdown
                layer.on('click', function (e: any) {
                    if (!mapInstanceRef.current) return;
                    const containerPoint = mapInstanceRef.current.mouseEventToContainerPoint(e.originalEvent);
                    setSoundDropdown({
                        show: true,
                        position: { x: containerPoint.x, y: containerPoint.y },
                        shapeId: shape.id
                    });
                });
            }
        });
    };

    // Convert GPS to meters relative to a reference point
    const GPStoMeters = (lat: number, lng: number,
        refLat: number, refLng: number): ConvertedCoords => {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat - refLat) * Math.PI / 180;
        const dLng = (lng - refLng) * Math.PI / 180;

        const x = dLng * Math.cos(refLat * Math.PI / 180) * R;
        const y = dLat * R;

        return { x, y };
    };

    const getCollisions = (shapes: DrawnShape[]) => {
        if (drawnShapes.length === 0) return;
        // Use gulestan coordinates as reference
        const refLat = mapLoc[0];
        const refLng = mapLoc[1];

        // 
        let markers: PointExt[] = [];
        let planarSet = new PlanarSet();

        console.log("Checking collisions for", shapes.length, "shapes");
        shapes.forEach(shape => {
            switch (shape.type) {
                case 'marker':
                    console.log("marker:  ", shape.id)
                    console.log(shape.coordinates)

                    const markerCoords = GPStoMeters(
                        shape.coordinates[0],
                        shape.coordinates[1],
                        refLat,
                        refLng
                    );
                    const markerPoint: PointExt = Object.assign(
                        point(markerCoords.x, markerCoords.y),
                        {
                            id: shape.id,
                            soundType: shape.soundType
                        }
                    )
                    markers.push(markerPoint);
                    break;

                case 'circle':
                    console.log("circle:  ", shape.id)

                    const circleCoords = GPStoMeters(
                        shape.coordinates.center[0],
                        shape.coordinates.center[1],
                        refLat,
                        refLng
                    );
                    const circleShape: CircleExt = Object.assign(
                        circle(point(circleCoords.x, circleCoords.y), shape.coordinates.radius),
                        {
                            id: shape.id,
                            soundType: shape.soundType,
                        }
                    );
                    planarSet.add(circleShape);
                    break;

                case 'rectangle':
                    console.log("rectangle:  ", shape.id)
                    const rectcoor: Flatten.Point[] = []
                    shape.coordinates.forEach((pt: [number, number]) => {
                        const pointConv = GPStoMeters(pt[0], pt[1], refLat, refLng)
                        rectcoor.push(point(pointConv.x, pointConv.y))
                    });

                    const rect = Object.assign(new Polygon(), {
                        id: shape.id,
                        soundType: shape.soundType,
                    }) as PolygonExt;
                    rect.addFace(rectcoor);

                    planarSet.add(rect);
                    break;

                case 'polygon':
                    console.log("polygon:  ", shape.id)
                    const polycoor: Flatten.Point[] = []
                    shape.coordinates.forEach((pt: [number, number]) => {
                        const pointConv = GPStoMeters(pt[0], pt[1], refLat, refLng)
                        polycoor.push(point(pointConv.x, pointConv.y))
                    })

                    const polygon = Object.assign(new Polygon(), {
                        id: shape.id,
                        soundType: shape.soundType,
                    }) as PolygonExt;
                    polygon.addFace(polycoor);

                    planarSet.add(polygon);
                    break;

                case 'circlemarker':
                    console.log("cmaker not implemented")
                    break;

                default:
                    console.log("default")
                    break;
            }
        });

        console.log('PlanarSet:', planarSet);
        console.log('Markers:', markers);

        // Check if markers exist before testing collisions
        if (markers.length > 0) {
            markers.forEach((marker, index) => {
                console.log(`Testing marker ${index} - ${marker.id}:`, planarSet.hit(marker));
            });
        }
    };

    // Import arrangement (shapes and map view) from JSON file
    const importArrangement = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target?.result as string);
                if (importedData && Array.isArray(importedData.shapes)) {
                    setDrawnShapes(importedData.shapes);
                    drawShapesOnMap(importedData.shapes);
                    // Restore map view if present
                    if (importedData.mapView && mapInstanceRef.current) {
                        const { center, zoom } = importedData.mapView;
                        if (
                            Array.isArray(center) &&
                            center.length === 2 &&
                            typeof center[0] === 'number' &&
                            typeof center[1] === 'number' &&
                            typeof zoom === 'number'
                        ) {
                            mapInstanceRef.current.setView([center[0], center[1]], zoom);
                        }
                    }
                } else if (Array.isArray(importedData)) {
                    // Fallback for old format
                    setDrawnShapes(importedData);
                    drawShapesOnMap(importedData);
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };

    const handleSoundSelect = (soundType: string) => {
        setDrawnShapes(prev =>
            prev.map(shape =>
                shape.id === soundDropdown.shapeId
                    ? { ...shape, soundType }
                    : shape
            )
        );
        console.log(`Assigned sound "${soundType}" to shape ${soundDropdown.shapeId}`);
    };

    const closeSoundDropdown = () => {
        setSoundDropdown(prev => ({ ...prev, show: false }));
    };

    // Find the selected sound type for the currently selected shape
    const selectedShape = drawnShapes.find(shape => shape.id === soundDropdown.shapeId);
    const selectedSoundType = selectedShape?.soundType || null;

    return (
        <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

            <button
                onClick={clearArrangement}
                style={{
                    position: 'absolute',
                    top: '500px',
                    left: '10px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#ef4444'}
            >
                Clear Arrangement
            </button>

            <button
                onClick={exportArrangement}
                style={{
                    position: 'absolute',
                    top: '540px',
                    left: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                Export Arrangement
            </button>

            <label htmlFor="importArrangement" style={{
                position: 'absolute',
                top: '580px',
                left: '10px',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                Import Arrangement
                <input
                    id="importArrangement"
                    type="file"
                    accept="application/json"
                    style={{ display: 'none' }}
                    onChange={importArrangement}
                />
            </label>

            <button
                onClick={() => getCollisions(drawnShapes)}
                style={{
                    position: 'absolute',
                    top: '625px',
                    left: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                Get collisions
            </button>

            <SoundKit
                show={soundDropdown.show}
                position={soundDropdown.position}
                onSoundSelect={handleSoundSelect}
                onClose={closeSoundDropdown}
                selectedSoundType={selectedSoundType}
            />
        </div>
    );
};

export default DrawMapZones;