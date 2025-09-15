import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import Flatten from 'flatten-js';
import SoundKit from './SoundKit';
import SoundPlayer from './SoundPlayer';
import MarkerSelectDialog from './UserSelection';
import type { DrawnShape, SoundConfig } from '../sharedTypes';

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

interface Collision {
    markerId: number | null;
    shapes: DrawnShape[];
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

// Extend Flatten.js types to include custom props
interface PointExt extends Flatten.Point {
    id: number;
    soundType: string | null;
}
interface CircleExt extends Flatten.Circle {
    id: number;
    soundType: string | null;
}
interface PolygonExt extends Flatten.Polygon {
    id: number;
    soundType: string | null;
}

const DrawMapZones = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [mapLoc, ] = useState<L.LatLngTuple>([42.308606, -83.747036]);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
    const [soundDropdown, setSoundDropdown] = useState<SoundDropdownState>({
        show: false,
        position: { x: 0, y: 0 },
        shapeId: null
    });
    const [isMarkerDlgOpen, setIsMarkerDlgOpen] = useState(false);
    const [chosenMarker, setChosenMarker] = useState<Number | null>(null);

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

        mapInstanceRef.current = map;
        drawnItemsRef.current = drawnItems;

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


    const handleOpenMarkerDlg = () => {
        setIsMarkerDlgOpen(true);
    };

    const handleCloseMarkerDlg = () => {
        setIsMarkerDlgOpen(false);
    };

    const handleMarkerSelect = (markerId: number) => {
        setChosenMarker(markerId);
        console.log(`Selected marker: ${markerId}`);
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

        let {point, circle, Polygon, PlanarSet} = Flatten;
        let markers: PointExt[] = [];
        let planarSet = new PlanarSet();

        shapes.forEach(shape => {
            switch (shape.type) {
                case 'marker':
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
        
        let collisions: Collision[] = []
        // Compute marker collisions (may need to edit to update state var rather than create new var)
        if (markers.length > 0) {
            markers.forEach((marker, ) => {
                const collision: any[] = planarSet.hit(marker); 
                if (collision.length > 0) {collisions.push({markerId: marker.id, shapes: collision});};
            });
        };
        console.log("get collisions output:")
        console.log(collisions)
        return collisions;
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

    // update soundType assigned to shape
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

    // handle marker audio control
    const handleUpdateMarkerAudio = () => {
        let collided: Collision[] = [];
        const result = getCollisions(drawnShapes);
        if (result) {
            const soundPlayer = SoundPlayer.getInstance();
            collided = result;
            // handle for chosen marker
            const markerCollisions = collided.find(collision => collision.markerId === chosenMarker);
            if (markerCollisions) {
                const sounds: SoundConfig[] = markerCollisions.shapes
                    .filter(shape => shape.soundType !== null)
                    .map(shape => ({
                        soundType: shape.soundType!,
                        note: 'C4'
                    }));
                
                if (sounds.length > 0) {
                    soundPlayer.playMultiple(sounds);
                } else {
                    console.log("No shapes with sounds found for this marker");
                }
            } else {
                console.log("marker not present in any shapes")
            }

        } else {
            console.log("no marker shape collisions")
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
                Get collisions (debug)
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
                    isOpen={isMarkerDlgOpen}
                    onClose={handleCloseMarkerDlg}
                    onSelect={handleMarkerSelect}
                    markers={drawnShapes.filter(shape => shape.type === 'marker')}
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
                selectedSoundType={selectedSoundType}
            />
        </div>
    );
};

export default DrawMapZones;