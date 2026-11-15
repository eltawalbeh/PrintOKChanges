import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PWAInstall, { registerPrintOKPWA } from './pwa'
import { initializeTelegramMiniApp } from './telegram'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <PWAInstall />
  </React.StrictMode>,
)

initializeTelegramMiniApp()
registerPrintOKPWA()
