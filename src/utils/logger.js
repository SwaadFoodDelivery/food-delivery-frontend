/**
 * Dev-only info/warn/auth channels; error always logs (swap for a real
 * reporting service — Sentry.captureException or similar — in production).
 */
const isDev = process.env.NODE_ENV !== 'production'

const logger = {
  info(message, context = {}) {
    if (!isDev) return
    console.info(`[INFO] ${message}`, context)
  },

  warn(message, context = {}) {
    if (!isDev) return
    console.warn(`[WARN] ${message}`, context)
  },

  error(message, context = {}) {
    console.error(`[ERROR] ${message}`, context)
  },

  auth(message, context = {}) {
    if (!isDev) return
    console.info(`[AUTH] ${message}`, context)
  }
}

export default logger
