1. https://marketplace.visualstudio.com/items?itemName=firefox-devtools.vscode-firefox-debug
2. Update firefox settings
3. Create launch.json debug config in VSCode:
```JSON
{
  "version": "0.2.0",
  "configurations": [
    {
        "name": "Launch Firefox",
        "type": "firefox",
        "request": "launch",
        "reAttach": true,
        "url": "http://localhost:5173",
        "webRoot": "${workspaceFolder}/gpsound/src",
        "firefoxExecutable": "/Applications/Firefox.app/Contents/MacOS/firefox"
    },
    {
        "name": "Attach Firefox",
        "type": "firefox",
        "request": "attach",
        "url": "http://localhost:5173",
        "webRoot": "${workspaceFolder}/gpsound/src",
        "port": 6000,
        "pathMappings": [
            {
                "url": "http://localhost:5173/src",
                "path": "${workspaceFolder}/gpsound/src"
            }
        ]
    }
]
}
```
4. Configure Vite to enable source maps `vite.config.ts`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true
  }
  // Source maps are enabled by default in dev mode
})
```
5. Start firefox w/ debugging: `/Applications/Firefox.app/Contents/MacOS/firefox -start-debugger-server=6000`
6. set breakpoint inside component that triggers only after component initialization (eg via function via button)
7. run `npm run dev`
8. navigate to path and trigger component with breakpoint