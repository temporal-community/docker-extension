import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// Catch and display any unhandled errors so blank screens show a reason
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.style.cssText = 'color:white;padding:20px;font-family:monospace;white-space:pre-wrap;';
    root.textContent = 'Error: ' + e.message + '\n' + (e.error?.stack ?? '');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.style.cssText = 'color:white;padding:20px;font-family:monospace;white-space:pre-wrap;';
    root.textContent = 'Unhandled rejection: ' + String(e.reason);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
