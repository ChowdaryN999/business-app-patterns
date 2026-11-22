import '@fontsource-variable/archivo/standard.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { createDataSource } from './data'
import './index.css'
import { AppProvider } from './store'

// Hash routing: the Power Apps host serves the bundle from a path it owns, so
// the route has to live in the fragment to survive a reload or a shared link.
const root = createRoot(document.getElementById('root')!)
createDataSource().then((ds) =>
  root.render(
    <StrictMode>
      <AppProvider ds={ds}>
        <HashRouter>
          <App />
        </HashRouter>
      </AppProvider>
    </StrictMode>,
  ),
)
