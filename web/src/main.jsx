/*
 * File:    main.jsx
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Start-up: loads the fonts and theme, connects the API client to the
 *          session and draws the app into #root.
 * Source:  WEB-02 (Vite React entry), WEB-07 (Fontsource fonts).
 */
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/nunito'
import './styles/theme.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureClient } from './api/client'
import App from './App'
import { SESSION_EXPIRED } from './context/AuthContext'
import { endSession, getToken } from './context/sessionStore'

// The API explains why a token was refused (expired, deactivated, role changed).
configureClient({
  getToken,
  onSessionEnd: (message) => endSession({ tone: 'warning', message: message || SESSION_EXPIRED }),
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
