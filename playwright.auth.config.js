const { defineConfig } = require('@playwright/test')
const base = require('./playwright.config')
const { mkdtempSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

// Auth is deliberately excluded from the HTML-reporting projects. Playwright
// records filled values in step titles even without screenshots or tracing.
module.exports = defineConfig({
  ...base,
  // Playwright can generate error-context.md independently of reporters.
  // Keep even transient failure artifacts private and discard at test completion.
  outputDir: mkdtempSync(join(tmpdir(), 'swaad-auth-results-')),
  preserveOutput: 'never',
  reporter: [[require.resolve('./tests/e2e/auth-safe-reporter.cjs')]],
  use: { ...base.use, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium-auth', testMatch: '**/*.auth.spec.js' }]
})
