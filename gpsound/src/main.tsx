import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { CollaborationProvider } from './collab/CollaborationProvider'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CollaborationProvider>
      <App />
    </CollaborationProvider>
  </StrictMode>,
)
