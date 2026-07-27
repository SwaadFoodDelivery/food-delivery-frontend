/**
 * localStorage/sessionStorage with the failure modes handled: Safari private
 * mode throws on write, and a half-written value must not crash the app on boot.
 */

function createAdapter(storage) {
  return {
    /**
     * @param {string} key
     * @param {*} [fallback]
     * @returns {*} the stored value, or `fallback` when absent/corrupt.
     */
    read(key, fallback = null) {
      try {
        const raw = storage.getItem(key)
        if (raw === null) return fallback
        return JSON.parse(raw)
      } catch {
        return fallback
      }
    },

    /**
     * @param {string} key
     * @param {*} value
     * @returns {boolean} false when storage is unavailable or full.
     */
    write(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },

    /** @param {string} key */
    remove(key) {
      try {
        storage.removeItem(key)
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
    }
  }
}

const local = createAdapter(window.localStorage)
/**
 * Session-scoped storage — cleared when the tab/browser closes, unlike
 * localStorage. Used for the access token and user object so a stolen disk
 * (or a shared machine) doesn't carry a live session past the browser
 * closing; access tokens expire in 60 minutes server-side regardless, so this
 * costs nothing in practice, only the (already-required) sign-in if the user
 * returns in a new browser session.
 */
const session = createAdapter(window.sessionStorage)

export const readValue = local.read
export const writeValue = local.write
export const removeValue = local.remove

export const readSessionValue = session.read
export const writeSessionValue = session.write
export const removeSessionValue = session.remove
