import LeafletDrawingMap_npm from './components/LeafletDrawingMap_npm';

function App() {
  return <LeafletDrawingMap_npm />;
}

export default App;

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
// import Draw from 'leaflet-draw';
import 'leaflet-draw';

const LeafletDrawingMap_npm = () => {
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
      //   position: 'topright',
      edit: {
        featureGroup: drawnItems,
      }
    });
    map.addControl(drawControl);

    // Event handlers
    // map.on('draw:created', function (event: any) {
    //   const layer = event.layer;
    //   const type = event.layerType;

    //   drawnItems.addLayer(layer);

    //   const shapeInfo = {
    //     id: Date.now(),
    //     type: type,
    //     coordinates: getCoordinates(layer, type)
    //   };

    //   setDrawnShapes(prev => [...prev, shapeInfo]);
    // });
    // Listen for draw:created event to add rectangles to the map
    map.on('draw:created', function (event: any) {
      const layer = event.layer;
      drawnItems.addLayer(layer);
      console.log('Rectangle drawn:', layer.getBounds());
    });

    map.on('draw:deleted', function () {
      setDrawnShapes([]);
    });

    // map.on('draw:edited', (event) => {
    // });

    // // Store references
    // mapInstanceRef.current = map;
    // drawnItemsRef.current = drawnItems;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  //   const getCoordinates = function (layer, type) {
  //     switch (type) {
  //       case 'marker':
  //         const markerLatLng = layer.getLatLng();
  //         return [markerLatLng.lat, markerLatLng.lng];
  //       case 'circle':
  //         const circleLatLng = layer.getLatLng();
  //         return {
  //           center: [circleLatLng.lat, circleLatLng.lng],
  //           radius: layer.getRadius()
  //         };
  //       case 'rectangle':
  //       case 'polygon':
  //         return layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
  //       case 'polyline':
  //         return layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
  //       default:
  //         return null;
  //     }
  //   };

  //   const clearAllShapes = () => {
  //     if (drawnItemsRef.current) {
  //       drawnItemsRef.current.clearLayers();
  //       setDrawnShapes([]);
  //     }
  //   };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default LeafletDrawingMap_npm;