import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import Flatten from 'flatten-js';
import SoundKit from './SoundKit'; // Import the separate component

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

const DrawMapZones = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
    const [soundDropdown, setSoundDropdown] = useState<SoundDropdownState>({
        show: false,
        position: { x: 0, y: 0 },
        shapeId: null
    });

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
    const convertGPSToMeters = (lat, lng, refLat, refLng) => {
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
        const refLat = 42.308606;
        const refLng = -83.747036;

        // 
        let {point, circle, polygon, box, PlanarSet} = Flatten;
        let markers = [];
        let planarSet = new PlanarSet();

        console.log("Checking collisions for", shapes.length, "shapes");
        shapes.forEach(shape => {
            switch (shape.type) {
                case 'marker':
                    console.log("marker")
                    console.log(shape.coordinates)

                    const markerCoords = convertGPSToMeters(
                        shape.coordinates[0], 
                        shape.coordinates[1], 
                        refLat, 
                        refLng
                    );
                    const markerPoint = point(markerCoords.x, markerCoords.y)
                    markerPoint.id = shape.id
                    markers.push(markerPoint);
                    console.log(markers)

                    break;

                case 'circle':
                    console.log("circle")

                    const circleCoords = convertGPSToMeters(
                        shape.coordinates.center[0], 
                        shape.coordinates.center[1], 
                        refLat, 
                        refLng
                    );
                    const circleShape = circle(
                        point(circleCoords.x, circleCoords.y), 
                        shape.coordinates.radius,
                    );
                    // monkey patch in shape info
                    circleShape.id = shape.id
                    circleShape.soundType = shape.soundType

                    planarSet.add(circleShape);
                    break;

                case 'rectangle':
                    // layer = L.rectangle(shape.coordinates);
                    console.log("rect")
                    break;

                case 'polygon':
                    // layer = L.polygon(shape.coordinates);
                    console.log("poly")
                    break;

                case 'circlemarker':
                    // layer = L.circleMarker(shape.coordinates.center, { radius: shape.coordinates.radius });
                    console.log("cmaker")
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
                    top: '620px',
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