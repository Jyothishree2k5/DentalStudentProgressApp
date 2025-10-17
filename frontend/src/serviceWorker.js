// Minimal service worker registration + simple caching (for preview/build).
export function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW register failed', e));
  }
}
