import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Qat'iy Dark Mode (Emerald-500, Amber-500, Slate-900)
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

// Register Service Worker for Offline PWA resilience and network shielding
if ('serviceWorker' in navigator && (import.meta.env.PROD || !['localhost', '127.0.0.1'].includes(window.location.hostname))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update();
    }).catch((err) => {
      console.warn('YuksalQuiz SW registration error:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
