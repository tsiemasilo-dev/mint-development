const _resetCallbacks = [];

export function registerCacheResetCallback(fn) {
  if (!_resetCallbacks.includes(fn)) {
    _resetCallbacks.push(fn);
  }
}

export function clearAllUserCaches() {
  _resetCallbacks.forEach((fn) => {
    try { fn(); } catch {}
  });
}
