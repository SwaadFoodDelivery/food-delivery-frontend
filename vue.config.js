const { defineConfig } = require('@vue/cli-service')

const backendTarget = process.env.VUE_APP_DEV_PROXY_TARGET || 'http://127.0.0.1:8080'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 5173,
    proxy: {
      '^/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      }
    }
  }
})
