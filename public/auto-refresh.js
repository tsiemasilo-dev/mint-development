(function initAutoRefresh() {
  const POLL_INTERVAL = 30000;
  const VERSION_ENDPOINT = '/api/version';

  let currentVersion = null;

  async function fetchVersion() {
    try {
      const response = await fetch(`${VERSION_ENDPOINT}?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      // Silently ignore 404s or other non-OK responses to avoid console clutter in dev
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.version || null;
    } catch {
      // Network errors are also ignored silently
      return null;
    }
  }

  async function checkVersion() {
    const version = await fetchVersion();

    if (!version) {
      return;
    }

    if (currentVersion === null) {
      currentVersion = version;
      return;
    }

    if (version !== currentVersion) {
      window.location.reload();
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  }

  function init() {
    checkVersion();
    window.setInterval(checkVersion, POLL_INTERVAL);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
