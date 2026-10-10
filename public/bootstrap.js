(() => {
  try {
    const lang = localStorage.getItem('tabia_language') === 'en' ? 'en' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  } catch {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
