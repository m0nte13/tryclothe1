if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', location.href), { scope: new URL('./', location.href).pathname })
      .catch(err => console.warn('MONTE PWA:', err));
  });
}
