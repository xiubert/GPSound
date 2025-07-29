// DrawMapZones.tsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
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

    const map = L.map(mapRef.current).setView(gulestan, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
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
      layer.on('click', function(e: any) {
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
    map.on('click', function(e: any) {
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
      case 'polyline':
        return layer.getLatLngs().map((latlng: any) => [latlng.lat, latlng.lng]);
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
      setSoundDropdown(prev => ({ ...prev, show: false }));
    }
  };

  const logAllShapes = () => {
    console.log(drawnShapes);
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
        onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
        onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#ef4444'}
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

      <SoundKit
        show={soundDropdown.show}
        position={soundDropdown.position}
        onSoundSelect={handleSoundSelect}
        onClose={closeSoundDropdown}
      />
    </div>
  );
};

export default DrawMapZones;