
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// @ts-ignore
window.type = true;

function App() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    var gulestan: L.LatLngTuple = [42.308606, -83.747036];

    // Initialize map
    const map = L.map(mapRef.current).setView(gulestan, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 30,
      maxNativeZoom: 19
    }).addTo(map);

    // var toolbar = L.Control.To
    // toolbar.addToolbar(map);
    // Add Leaflet.Draw control to the map
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // const drawControl = new L.Control.Draw({
    //   draw: {
    //     polyline: false,
    //     polygon: false,
    //     circle: false,
    //     marker: false,
    //     circlemarker: false,
    //     rectangle: {
    //       shapeOptions: {
    //         color: '#ff7800',
    //         weight: 1
    //       }
    //     }
    //   },
    //   edit: {
    //     featureGroup: drawnItems
    //   }
    // });
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems
      }
    });
    map.addControl(drawControl);

    // Listen for draw:created event to add rectangles to the map
    map.on('draw:created', function (event: any) {
      const layer = event.layer;
      drawnItems.addLayer(layer);
      console.log('Rectangle drawn:', layer.getBounds());
    });

    // // Listen for edit events
    map.on('draw:edited', function (event: any) {
      event.layers.eachLayer(function (layer: any) {
        console.log('Rectangle edited:', layer.getBounds());
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default App;
