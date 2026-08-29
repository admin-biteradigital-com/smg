import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// ── Service Worker Registration ─────────────────────────────────
// autoUpdate: el SW se actualiza en background y recarga la página
// cuando hay una nueva versión disponible.
const updateSW = registerSW({
  onNeedRefresh() {
    // Aquí podríamos mostrar un toast "Nueva versión disponible"
    // Por ahora, actualizamos automáticamente.
    updateSW(true);
  },
  onOfflineReady() {
    console.info('[SIGLO] App lista para uso offline.');
  },
  onRegisteredSW(swScriptUrl, registration) {
    // Revisión periódica de actualizaciones cada hora
    if (registration) {
      setInterval(
        () => {
          registration.update().catch(console.error);
        },
        60 * 60 * 1000, // 1 hour
      );
    }
    console.info('[SIGLO] Service Worker registrado:', swScriptUrl);
  },
  onRegisterError(error) {
    console.error('[SIGLO] Error al registrar Service Worker:', error);
  },
});

// ── React Mount ─────────────────────────────────────────────────
const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root en el DOM.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
