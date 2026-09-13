import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { handlePreloadError } from './lib/preload-guard';
import './index.css';

// ── ADR-018: Listener global ante errores de precarga de chunks dinámicos ─────
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    handlePreloadError(event);
  });
}

// ── React Mount ─────────────────────────────────────────────────────────────
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
