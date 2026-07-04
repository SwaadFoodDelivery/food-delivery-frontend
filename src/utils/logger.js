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
    // Always log errors — in production swap this for Sentry.captureException or similar
    console.error(`[ERROR] ${message}`, context)
  },

  auth(message, context = {}) {
    if (!isDev) return
    console.info(`[AUTH] ${message}`, context)
  }
}

export default logger
