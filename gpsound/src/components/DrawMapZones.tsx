import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
// npm install -D @types/leaflet @types/leaflet-draw  # if using TypeScript

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

const DrawMapZones = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const [drawnShapes, setDrawnShapes] = useState([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Provide map anchors
    var gulestan: L.LatLngTuple = [42.308606, -83.747036];

    // Initialize the map
    const map = L.map(mapRef.current).setView(gulestan, 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Create a feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
      }
    });
    map.addControl(drawControl);

    // Store references (you need these!)
    mapInstanceRef.current = map;
    drawnItemsRef.current = drawnItems;

    // Event handlers
    // L.Draw.Event.CREATED,
    map.on(L.Draw.Event.CREATED, function (event: any) {
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

    //   console.log('Shape drawn:', layer);
      console.log('Shape drawn. shapeInfo:', shapeInfo);
    });

    map.on(L.Draw.Event.DELETED, function (e: any) {
    var deletedLayers = e.layers;
    deletedLayers.eachLayer(function (layer: any) {
        // Perform actions with each deleted layer, e.g.,
        console.log('Deleted layer:', layer);
        // Remove layer from a FeatureGroup if needed
        // editableLayers.removeLayer(layer); 
    });
    });

    // map.on('draw:edited', function (event: any) {
    //   const layer = event.layer
    // //   setDrawnShapes([]);
    //   console.log("SHAPE EDITED", layer)
    // });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

//   funcs
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

    const logAllShapes = () => {
        // if (drawnItemsRef.current) {
        //     drawnItemsRef.current.clearLayers();
        //     setDrawnShapes([]);
        // }
        console.log(drawnShapes)
    };

return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        <button
            onClick={clearAllShapes}
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
            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
        >
            Clear All Shapes
        </button>
        <button
            onClick={logAllShapes}
            style={{
                position: 'absolute',
                top: '540px',
                left: '10px',
                backgroundColor: '#4fef44ff',
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
            Log All Shapes
        </button>
    </div>
);
};

export default DrawMapZones;