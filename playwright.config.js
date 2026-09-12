const { defineConfig, devices } = require('@playwright/test')

// The primary command uses the real backend. Mocked tests are supplemental.
const port = Number(process.env.E2E_PORT || 4173)
const baseURL = `http://127.0.0.1:${port}`

module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir: './node_modules/.cache/swaad-e2e/results',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { outputFolder: 'node_modules/.cache/swaad-e2e/report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    serviceWorkers: 'block',
    actionTimeout: 15000,
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium-live', testMatch: '**/*.live.spec.js', use: { trace: 'off' } },
    { name: 'chromium-personas', testMatch: '**/*.persona.spec.js', use: { trace: 'off' } },
    { name: 'chromium-auth', testMatch: '**/*.auth.spec.js', use: { trace: 'off', screenshot: 'off' } },
    { name: 'chromium-mocked', testMatch: '**/*.mock.spec.js', use: { trace: 'retain-on-failure' } }
  ],
  webServer: {
    command: `npm run serve -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      VUE_APP_API_BASE_URL: '/api/v1',
      VUE_APP_DEV_PROXY_TARGET: process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8080',
      VUE_APP_CLIENT_API_KEY: process.env.E2E_CLIENT_API_KEY || ''
    },
    stdout: 'ignore',
    stderr: 'pipe'
  }
})
