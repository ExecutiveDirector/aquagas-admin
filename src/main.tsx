import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import { initSentry, Sentry } from './utils/sentry'

initSentry()


createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <p>The error has been reported. Please refresh the page.</p>
        </div>
      }
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
