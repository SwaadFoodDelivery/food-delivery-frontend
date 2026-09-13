const { defineConfig } = require('@playwright/test')
const secure = require('./playwright.auth.config')

// Reuse the counts-only reporter, private 0700 transient output, preserveOutput:
// never, and disabled trace/video/screenshots. No credential-bearing HTML report.
module.exports = defineConfig({
  ...secure,
  projects: [{ name: 'chromium-order-history-real', testMatch: '**/*.order-list.spec.js' }]
})
