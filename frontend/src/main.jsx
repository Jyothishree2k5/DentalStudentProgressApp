import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerSW } from './serviceWorker'

const root = createRoot(document.getElementById('root'))
root.render(<App />)

// register simple service worker for offline caching (works after build/preview)
registerSW();
