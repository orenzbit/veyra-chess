(() => {
  try {
    const lang = localStorage.getItem('tabia_language') === 'en' ? 'en' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  } catch {}

  // If the human-check cookie expires while the app is open, return to the edge gate.
  // The gate will issue a fresh challenge; never retry API writes automatically.
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    let reloadingForHumanCheck = false;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403 && !reloadingForHumanCheck) {
        const contentType = response.headers?.get?.('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const payload = await response.clone().json();
            if (payload?.error === 'HUMAN_CHECK_REQUIRED') {
              reloadingForHumanCheck = true;
              window.location.reload();
            }
          } catch {}
        }
      }
      return response;
    };
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
