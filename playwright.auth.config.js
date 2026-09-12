const { defineConfig } = require('@playwright/test')
const base = require('./playwright.config')

// Auth is deliberately excluded from the HTML-reporting projects. Playwright
// records filled values in step titles even without screenshots or tracing.
module.exports = defineConfig({
  ...base,
  outputDir: './node_modules/.cache/swaad-e2e/auth-results',
  reporter: [[require.resolve('./tests/e2e/auth-safe-reporter.cjs')]],
  use: { ...base.use, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium-auth', testMatch: '**/*.auth.spec.js' }]
})
