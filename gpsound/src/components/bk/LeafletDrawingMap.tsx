import React, { useEffect, useRef, useState } from 'react';

const LeafletDrawingMap = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [drawnShapes, setDrawnShapes] = useState([]);

    useEffect(() => {
        // Load Leaflet CSS and JS
        const loadLeaflet = async () => {
            // Load CSS
            if (!document.querySelector('link[href*="leaflet"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
                document.head.appendChild(cssLink);
            }

            // Load Leaflet Draw CSS
            if (!document.querySelector('link[href*="leaflet.draw"]')) {
                const drawCssLink = document.createElement('link');
                drawCssLink.rel = 'stylesheet';
                drawCssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
                document.head.appendChild(drawCssLink);
            }

            // Load Leaflet JS
            if (!window.L) {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            // Load Leaflet Draw JS
            if (!window.L.Control.Draw) {
                await new Promise((resolve) => {
                    const drawScript = document.createElement('script');
                    drawScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
                    drawScript.onload = resolve;
                    document.head.appendChild(drawScript);
                });
            }

            setIsMapLoaded(true);
        };

        loadLeaflet();
    }, []);

    useEffect(() => {
        if (!isMapLoaded || !mapRef.current || mapInstanceRef.current) return;

        var gulestan: L.LatLngTuple = [42.308606, -83.747036];

        // Initialize map
        const map = window.L.map(mapRef.current).setView(gulestan, 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Create a feature group for drawn items
        const drawnItems = new window.L.FeatureGroup();
        map.addLayer(drawnItems);

        // Initialize the draw control
        const drawControl = new window.L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        message: '<strong>Error:</strong> shape edges cannot cross!'
                    },
                    shapeOptions: {
                        color: '#97009c'
                    }
                },
                polyline: {
                    shapeOptions: {
                        color: '#f357a1',
                        weight: 10
                    }
                },
                rect: {
                    shapeOptions: {
                        clickable: false,
                        color: '#3388ff'
                    }
                },
                circle: {
                    shapeOptions: {
                        color: '#662d91'
                    }
                },
                marker: true,
                circlemarker: {
                    color: '#ff7800',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });

        map.addControl(drawControl);

        // Event handlers
        map.on('draw:created', (event) => {
            const layer = event.layer;
            const type = event.layerType;

            drawnItems.addLayer(layer);

            // Add to state for tracking
            const shapeInfo = {
                id: Date.now(),
                type: type,
                coordinates: getCoordinates(layer, type)
            };

            setDrawnShapes(prev => [...prev, shapeInfo]);
        });

        map.on('draw:edited', function (event: any) {
            const layers = event.layers;
            layers.eachLayer((layer) => {
                // Handle edit logic here if needed
                console.log('Edited layer:', layer);
            });
        });

        map.on('draw:deleted', function (event: any) {
            const layers = event.layers;
            layers.eachLayer((layer) => {
                // Handle delete logic here if needed
                console.log('Deleted layer:', layer);
            });
            // Update state to reflect deletions
            setDrawnShapes([]);
        });

        // Store references
        mapInstanceRef.current = map;
        drawnItemsRef.current = drawnItems;
        drawControlRef.current = drawControl;

        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isMapLoaded]);

    const getCoordinates = (layer, type) => {
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
                return layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
            case 'polyline':
                return layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
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

    const clearAllShapes = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setDrawnShapes([]);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-100">
            <div className="bg-white shadow-sm border-b px-4 py-3">
                <h1 className="text-xl font-semibold text-gray-800">Interactive Map with Drawing Tools</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Use the drawing tools on the top-right to draw shapes, then edit or delete them as needed.
                </p>
            </div>

            <div className="relative">
                <div
                    ref={mapRef}
                    className="w-full h-[calc(100vh-120px)]"
                    style={{ minHeight: '500px' }}
                />

                {/* Control Panel */}
                <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
                    <h3 className="font-semibold text-gray-800 mb-3">Drawing Controls</h3>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-purple-600 rounded mr-2"></div>
                            <span>Polygon</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-pink-400 rounded mr-2"></div>
                            <span>Polyline</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                            <span>Rectangle</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-purple-800 rounded-full mr-2"></div>
                            <span>Circle</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                            <span>Circle Marker</span>
                        </div>
                    </div>

                    <button
                        onClick={clearAllShapes}
                        className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                        Clear All Shapes
                    </button>

                    {drawnShapes.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                            <h4 className="font-medium text-gray-700 mb-2">Drawn Shapes: {drawnShapes.length}</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {drawnShapes.map((shape, index) => (
                                    <div key={shape.id} className="text-xs bg-gray-50 p-2 rounded">
                                        <span className="font-medium capitalize">{shape.type}</span>
                                        {shape.type === 'marker' && (
                                            <div className="text-gray-600">
                                                Lat: {shape.coordinates[0].toFixed(4)},
                                                Lng: {shape.coordinates[1].toFixed(4)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeafletDrawingMap;