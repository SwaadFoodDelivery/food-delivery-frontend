const { defineConfig } = require('@vue/cli-service')

const DEV_PROXY_TARGET = process.env.VUE_APP_DEV_PROXY_TARGET || 'http://127.0.0.1:8080'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    // The frontend calls the relative `/api/v1/...`, which keeps requests
    // same-origin in dev: no CORS preflight, and the HttpOnly refresh cookie the
    // backend sets for X-Client-Type: web is actually stored.
    proxy: {
      '/api': {
        target: DEV_PROXY_TARGET,
        changeOrigin: true
      }
    }
  }
})
