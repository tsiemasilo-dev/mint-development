2(function initAutoRefresh() {
  // Disable auto-refresh in development environments to prevent spurious reloads
  // caused by hot-module replacement changing bundle hashes
  const host = window.location.hostname;
  const isDev = host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.replit.dev') ||
    host.endsWith('.repl.co') ||
    window.location.port !== '';

  if (isDev) {
    console.log('[auto-refresh] Development environment detected — auto-refresh disabled');
    return;
  }

  const POLL_INTERVAL = 30000;
  const VERSION_ENDPOINT = '/api/version';

  let currentVersion = null;

  async function fetchVersion() {
    try {
      const response = await fetch(`${VERSION_ENDPOINT}?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.version || null;
    } catch {
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
      window.dispatchEvent(new CustomEvent('mint-auto-refresh-check', {
        detail: { current: version, latest: version }
      }));
      return;
    }

    window.dispatchEvent(new CustomEvent('mint-auto-refresh-check', {
      detail: { current: currentVersion, latest: version }
    }));

    if (version !== currentVersion) {
      window.dispatchEvent(new CustomEvent('mint-auto-refresh-reload', {
        detail: { from: currentVersion, to: version }
      }));
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
