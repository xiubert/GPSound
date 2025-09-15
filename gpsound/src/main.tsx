import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Repo } from '@automerge/automerge-repo'
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket'
import { RepoContext } from '@automerge/automerge-repo-react-hooks'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

import './index.css'

const repo = new Repo()
repo.networkSubsystem.addNetworkAdapter(new WebSocketClientAdapter('wss://sync.automerge.org'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepoContext.Provider value={repo}>
      <App />
    </RepoContext.Provider>
  </StrictMode>,
)
