/**
 * localStorage with the failure modes handled: Safari private mode throws on
 * write, and a half-written value must not crash the app on boot.
 */

/**
 * @param {string} key
 * @param {*} [fallback]
 * @returns {*} the stored value, or `fallback` when absent/corrupt.
 */
export function readValue(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * @param {string} key
 * @param {*} value
 * @returns {boolean} false when storage is unavailable or full.
 */
export function writeValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** @param {string} key */
export function removeValue(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
