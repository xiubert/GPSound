import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import Flatten from 'flatten-js';
import SoundKit from './SoundKit';
import SoundPlayer from './SoundPlayer';
import MarkerSelectDialog from './UserSelection';
import type { DrawnLayer, DrawnShape, SoundConfig } from '../sharedTypes';

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

interface SoundDropdownState {
    show: boolean;
    position: { x: number; y: number };
    shapeId: number | null;
    soundType: string | null;
}

interface ConvertedCoords {
    x: number;
    y: number;
}

const DrawMapZones = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [mapLoc, ] = useState<L.LatLngTuple>([42.308606, -83.747036]);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
    const [drawnMarkers, setDrawnMarkers] = useState<Flatten.Point[]>([]);
    const shapeMetadataRef = useRef(new Map<DrawnShape, DrawnLayer>());
    const markerMetadataRef = useRef(new Map<Flatten.Point, DrawnLayer>());
    const [soundDropdown, setSoundDropdown] = useState<SoundDropdownState>({
        show: false,
        position: { x: 0, y: 0 },
        shapeId: null,
        soundType: null
    });
    const [isMarkerDlgOpen, setIsMarkerDlgOpen] = useState(false);
    let {point} = Flatten;
    const chosenMarkerRef = useRef<Flatten.Point>(point(0,0));
    
    // handling state updates for shapes and markers
    const addUpdateShapeMeta = (k: DrawnShape, v: DrawnLayer) => {
        shapeMetadataRef.current.set(k, v);
    }
    const addUpdateMarkerMeta = (k: Flatten.Point, v: DrawnLayer) => {
        markerMetadataRef.current.set(k, v);
    }
    const removeMarkerFromState = (markerToRemove: Flatten.Point) => {
        // Remove from metadata
        markerMetadataRef.current.delete(markerToRemove);
        // Remove from state
        setDrawnMarkers(prev => prev.filter(marker => marker !== markerToRemove));
    };
    const removeShapeFromState = (shapeToRemove: DrawnShape) => {
        // Remove from metadata
        shapeMetadataRef.current.delete(shapeToRemove);
        // Remove from state
        setDrawnShapes(prev => prev.filter(shape => shape !== shapeToRemove));
    };


    // Helper function to find current sound type for a shape
    const getCurrentSoundType = (shapeId: number) => {
        for (const [_, metadata] of shapeMetadataRef.current.entries()) {
            if (metadata.id === shapeId) {
                return metadata.soundType;
            }
        }
        // If not found in shapes, check marker metadata
        for (const [_, metadata] of markerMetadataRef.current.entries()) {
            if (metadata.id === shapeId) {
                return metadata.soundType;
            }
        }
        return null;
    };

    const getMarkerByID = (markerId: number) => {
        for (const [marker, metadata] of markerMetadataRef.current.entries()) {
            if (metadata.id === markerId) {
                return marker;
            }
        }
        return null;
    }
    const getShapeByID = (shapeId: number) => {
        for (const [marker, metadata] of shapeMetadataRef.current.entries()) {
            if (metadata.id === shapeId) {
                return marker;
            }
        }
        return null;
    }


    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // var gulestan: L.LatLngTuple = [42.308606, -83.747036];

        const map = L.map(mapRef.current, {
            maxZoom: 23
        }).setView(mapLoc, 13);

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
        L.control.scale().addTo(map);
        mapInstanceRef.current = map;
        drawnItemsRef.current = drawnItems;

        map.on(L.Draw.Event.CREATED, function (event: any) {
            const layer = event.layer;
            const type = event.layerType;
            drawnItems.addLayer(layer);

            const shapeId = L.stamp(layer);
            const shapeCoor = getCoordinates(layer, type);
            const flatShape = flattenShape(type, shapeCoor);

            const shapeInfo: DrawnLayer = {
                    id: shapeId,
                    type: type,
                    coordinates: shapeCoor,
                    soundType: null
            }

            // Add to appropriate state based on type
            if (type === 'marker') {
                if (flatShape instanceof Flatten.Point) {
                    addUpdateMarkerMeta(flatShape, shapeInfo)
                    setDrawnMarkers(prev => [...prev, flatShape]);
                }
            } else {
                if (flatShape instanceof Flatten.Circle || flatShape instanceof Flatten.Polygon) {
                    addUpdateShapeMeta(flatShape, shapeInfo)
                    setDrawnShapes(prev => [...prev, flatShape]);
                }
            }

            // Add click handler to the new shape
            if (flatShape !== null) {
                layer.on('click', function (e: any) {
                    if (!mapInstanceRef.current) return;
                    const containerPoint = map.mouseEventToContainerPoint(e.originalEvent);
                    const currentSoundType = getCurrentSoundType(shapeId);

                    setSoundDropdown({
                        show: true,
                        position: { x: containerPoint.x, y: containerPoint.y },
                        shapeId: shapeId,
                        soundType: currentSoundType
                    });
                });
                console.log('Shape drawn. shapeInfo:', shapeInfo, flatShape);
            }
        });

        // TODO UPDATE SHAPE, MARKER, and METADATA STATE HERE:
        map.on(L.Draw.Event.DELETED, function (e: any) {
            var deletedLayers = e.layers;
            deletedLayers.eachLayer(function (layer: any) {
                const leafletId = L.stamp(layer);
                console.log('Deleted id:', leafletId);
                // Remove from shapes
                const shapeToRemove = getShapeByID(leafletId);
                if (shapeToRemove) {
                    removeShapeFromState(shapeToRemove);
                }
                // Remove from markers if not in shapes
                const markerToRemove = getMarkerByID(leafletId);
                if (markerToRemove) {
                    removeMarkerFromState(markerToRemove);
                }
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
            setDrawnMarkers([]);
            shapeMetadataRef.current.clear();
            markerMetadataRef.current.clear();
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
            shapes: Array.from(shapeMetadataRef.current.values())
                .concat(Array.from(markerMetadataRef.current.values())
            ),
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

    const handleOpenMarkerDlg = () => {
        setIsMarkerDlgOpen(true);
    };

    const handleCloseMarkerDlg = () => {
        setIsMarkerDlgOpen(false);
    };

    const handleMarkerSelect = (markerId: number) => {
        const marker = getMarkerByID(markerId);
        if (marker) {  // Type guard to ensure marker is not undefined
            chosenMarkerRef.current = marker;
            console.log(`Selected marker: ${markerId}`);
        } else {
            console.log(`Marker with ID ${markerId} not found`);
        }
    };

    // Helper to draw shapes on the map from imported data
    const drawShapesOnMap = (shapes: DrawnLayer[]): DrawnLayer[] => {
        if (!drawnItemsRef.current) return [];
        // drawnItemsRef.current.clearLayers();
        clearArrangement();
        const updatedShapes: DrawnLayer[] = []
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
                shape.id = L.stamp(layer)
                drawnItemsRef.current.addLayer(layer);
                // Add shape metadata

                // Add click handler for sound dropdown
                layer.on('click', function (e: any) {
                    if (!mapInstanceRef.current) return;
                    const containerPoint = mapInstanceRef.current.mouseEventToContainerPoint(e.originalEvent);
                    const currentSoundType = getCurrentSoundType(shape.id);

                    setSoundDropdown({
                        show: true,
                        position: { x: containerPoint.x, y: containerPoint.y },
                        shapeId: shape.id,
                        soundType: currentSoundType
                    });
                });
            updatedShapes.push(shape)
            }
        });
        return updatedShapes;
    };

    // Get flatten object from leaflet shape
    const flattenShape = (shapeType: string, shapeCoor: any) => {
        const refLat = mapLoc[0];
        const refLng = mapLoc[1];
        let {point, circle, Polygon} = Flatten;
        
        switch (shapeType) {
            case 'marker': {
                const markerCoords = GPStoMeters(
                    shapeCoor[0], 
                    shapeCoor[1], 
                    refLat, 
                    refLng
                );
                return point(markerCoords.x, markerCoords.y);
            }
            case 'circle': {
                const circleCoords = GPStoMeters(
                    shapeCoor.center[0], 
                    shapeCoor.center[1], 
                    refLat, 
                    refLng
                );
                return circle(point(circleCoords.x, circleCoords.y), shapeCoor.radius);
            }
            case 'rectangle': {
                const rectcoor: Flatten.Point[] = []
                shapeCoor.forEach((pt: [number, number]) => {
                        const pointConv = GPStoMeters(pt[0], pt[1], refLat, refLng)
                        rectcoor.push(point(pointConv.x, pointConv.y))
                });
                const rect = new Polygon();
                rect.addFace(rectcoor);
                return rect
            }
            case 'polygon': {
                const polycoor: Flatten.Point[] = []
                    shapeCoor.forEach((pt: [number, number]) => {
                        const pointConv = GPStoMeters(pt[0], pt[1], refLat, refLng)
                        polycoor.push(point(pointConv.x, pointConv.y))
                })
                const polygon = new Polygon();
                polygon.addFace(polycoor);
                return polygon
            }
            case 'circlemarker': {
                const cmCoords = GPStoMeters(
                    shapeCoor.center[0], 
                    shapeCoor.center[1], 
                    refLat, 
                    refLng
                );
                return circle(point(cmCoords.x, cmCoords.y), shapeCoor.radius);
            }
            default:
                throw new Error(`Unknown shape type: ${shapeType}`);
            }
    }

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

    const getCollisions = (chosenMarker: Flatten.Point) => {
        if (!chosenMarker) {
            console.log("no marker selected")
            return
        }
        if (drawnShapes.length === 0 || drawnMarkers.length === 0) {
            console.log("No markers or shapes to check collisions");
            return [];
        }
        // set of unique shapes
        let planarSet = new Flatten.PlanarSet();

        // Add all shape flatten objects to planar set
        drawnShapes.forEach(shape => { 
                planarSet.add(shape)
        });
        
        // Compute marer collisions (may need to edit to update state var rather than create new var)
        const collidedShapes: any[] = planarSet.hit(chosenMarker); 
        if (collidedShapes.length > 0) {
            console.log("get collisions output:", collidedShapes)
            return collidedShapes
        } else {
            console.log("no marker collisions")
            return null
        }
    };


    // nearby zones: modulate sound as user nears zone within distance threshold (meters)
    // potentially calculated when user position changes by x amount
    // 1. get collusions, then filter out collided
    // getDistance: arrA.filter(x => !arrB.includes(x)); ==> drawnShapes.filter(x => !collidedShapes.includes(x));
    // 2. calculate distance to all other shapes ==> drawnShapes[1].distanceTo(chosenMarkerRef.current)
    // drawnShapes.forEach((shape) => {console.log(shape.distanceTo(chosenMarkerRef.current))})
    // 3. filter to those within x
    // 4. ramp sound
    const nearestShapes = ({
        chosenMarker, 
        threshold} : {
            chosenMarker: Flatten.Point,
            threshold?: number}) => {
        // get array of shapes that do not include marker sorted by distance to marker
        if (!chosenMarker) {
            console.log("no marker selected")
            return
        }
        if (drawnShapes.length === 0 || drawnMarkers.length === 0) {
            console.log("No markers or shapes to check collisions");
            return [];
        }
        const collidedShapes = getCollisions(chosenMarker);
        const outsideShapes = drawnShapes.filter(x => !collidedShapes?.includes(x))
        const shapeProximity: any[] = []
        outsideShapes.forEach( (shape) => {
            // distance calculated as meters
            const dist = chosenMarker.distanceTo(shape)[0]
            // if threshold defined return shapes within distance threshold
            if (threshold == null) {
                shapeProximity.push({
                    shape: shape,
                    dist: dist}
                )
            } else {
                if (dist <= threshold) {
                    shapeProximity.push({
                    shape: shape,
                    dist: dist}
                    )
                }
            }  
        })
        shapeProximity.sort((a,b) => a.dist - b.dist)
        console.log(shapeProximity)
        return shapeProximity
    }

    // Import arrangement (shapes and map view) from JSON file
    const importArrangement = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target?.result as string);
                if (importedData && Array.isArray(importedData.shapes)) {
                    const shapeMeta = drawShapesOnMap(importedData.shapes);
                    const markerObjs: any[] = []
                    const shapeObjs: any[] = []
                    // const shapeMarkerMeta: DrawnLayer[] = []
                    shapeMeta.forEach( (shape: DrawnLayer) => {
                        const shapeObj = flattenShape(shape.type, shape.coordinates);
                        if (shape.type == 'marker') {
                            if (shapeObj instanceof Flatten.Point) {
                                markerObjs.push(shapeObj);
                                addUpdateMarkerMeta(shapeObj, shape);
                            }
                        } else {
                            if (shapeObj instanceof Flatten.Circle || shapeObj instanceof Flatten.Polygon) {
                                shapeObjs.push(shapeObj);
                                addUpdateShapeMeta(shapeObj, shape);
                            }
                        }
                    })

                    setDrawnShapes(shapeObjs);
                    setDrawnMarkers(markerObjs);
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
                    // TO REMOVE
                    console.log("old format")
                    setDrawnShapes(importedData);
                    drawShapesOnMap(importedData);
                }
            } catch (err) {
                console.log(err)
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };

    // update soundType assigned to shape
    const handleSoundSelect = (soundType: string) => {
        // Find and update the appropriate metadata
        console.log("chosen sound type: ", soundType)
        let updated = false;
        
        // Try to update shape metadata first
        for (const [shape, metadata] of shapeMetadataRef.current.entries()) {
            if (metadata.id === soundDropdown.shapeId) {
                addUpdateShapeMeta(shape, { ...metadata, soundType });
                updated = true;
                break;
            }
        }
        
        // If not found in shapes, try markers
        if (!updated) {
            for (const [marker, metadata] of markerMetadataRef.current.entries()) {
                if (metadata.id === soundDropdown.shapeId) {
                    addUpdateMarkerMeta(marker, { ...metadata, soundType });
                    updated = true;
                    break;
                }
            }
        }

        // Update the dropdown state with the new sound type
        setSoundDropdown(prev => ({ ...prev, soundType }));

        console.log(`Assigned sound "${soundType}" to shape ${soundDropdown.shapeId}`);
    };

    const closeSoundDropdown = () => {
        setSoundDropdown({
            show: false,
            position: { x: 0, y: 0 },
            shapeId: null,
            soundType: null
        });
    };

    const handleUpdateMarkerAudio = () => {
        const collidedShapes = getCollisions(chosenMarkerRef.current);

        if (collidedShapes) {
            const soundPlayer = SoundPlayer.getInstance();

            const sounds: SoundConfig[] = []
            
            collidedShapes.forEach(shape => {
                const metadata = shapeMetadataRef.current.get(shape);
                if (metadata?.soundType) {
                    sounds.push({
                        soundType: metadata.soundType,
                        note: 'C4' // or get this from metadata if you store notes there
                    });
                }
            });
            
            if (sounds.length > 0) {
                soundPlayer.playMultiple(sounds);
            } else {
                console.log("No shapes with sounds found for this marker");
            }
        } else {
            console.log("marker not present in any shapes")
        }
    }

    const handleStopAudio = () => {
        const soundPlayer = SoundPlayer.getInstance();
        soundPlayer.stopAll()
    }

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
                onClick={() => nearestShapes({chosenMarker: chosenMarkerRef.current, threshold: 30})}
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
                Get nearest (debug)
            </button>
            <div>
                <button 
                    onClick={handleOpenMarkerDlg}
                    style={{
                        position: 'absolute',
                        top: '325px',
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
                Select Active User
                </button>
                <MarkerSelectDialog
                    show={isMarkerDlgOpen}
                    onClose={handleCloseMarkerDlg}
                    onSelect={handleMarkerSelect}
                    markerMeta={markerMetadataRef.current}
                />
            </div>
            <button
                onClick={handleUpdateMarkerAudio}
                style={{
                    position: 'absolute',
                    top: '360px',
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
                }}
            >
                Start User Audio
            </button>
            <button
                onClick={handleStopAudio}
                style={{
                    position: 'absolute',
                    top: '395px',
                    left: '10px',
                    backgroundColor: '#f63b3bff',
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
                Stop Audio
            </button>

            <SoundKit
                show={soundDropdown.show}
                shapeId={soundDropdown.shapeId}
                position={soundDropdown.position}
                onSoundSelect={handleSoundSelect}
                onClose={closeSoundDropdown}
                selectedSoundType={soundDropdown.soundType}
            />
        </div>
    );
};

export default DrawMapZones;