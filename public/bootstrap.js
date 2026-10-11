(() => {
  try {
    const lang = localStorage.getItem('tabia_language') === 'en' ? 'en' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  } catch {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // The human-check cookie lasts 24 hours. If it expires while the app is open, the server answers API calls with
  // HUMAN_CHECK_REQUIRED. Reload once so the visitor passes the (automatic, few seconds) check again instead of seeing
  // silent errors. The 10 second guard prevents any reload loop.
  try {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        if (response.status === 403) {
          const target = new URL(typeof args[0] === 'string' ? args[0] : args[0]?.url || '', location.href);
          if (target.origin === location.origin && target.pathname.startsWith('/api/')) {
            const body = await response.clone().json().catch(() => null);
            if (String(body?.error || '').toUpperCase() === 'HUMAN_CHECK_REQUIRED') {
              const last = Number(sessionStorage.getItem('veyra_human_reload') || 0);
              if (Date.now() - last > 10000) {
                sessionStorage.setItem('veyra_human_reload', String(Date.now()));
                location.reload();
              }
            }
          }
        }
      } catch {}
      return response;
    };
  } catch {}
})();
