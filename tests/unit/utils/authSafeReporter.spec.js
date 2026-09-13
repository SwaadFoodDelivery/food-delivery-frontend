/** @jest-environment node */
const AuthSafeReporter = require('../../e2e/auth-safe-reporter.cjs')
const { execFileSync } = require('node:child_process')
const { statSync, rmdirSync } = require('node:fs')
const { resolve } = require('node:path')

describe('auth reporting credential boundary', () => {
  it('never emits synthetic credentials from titles, steps, errors, attachments or logs', () => {
    const secret = 'SYNTHETIC-OTP-529183'
    const output = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      const reporter = new AuthSafeReporter()
      reporter.onTestEnd({ title: secret }, {
        status: 'failed', steps: [{ title: `Fill "${secret}"` }],
        errors: [{ message: secret }], attachments: [{ name: secret, body: Buffer.from(secret) }]
      })
      reporter.onStdOut(secret)
      reporter.onStdErr(secret)
      reporter.onError({ message: secret })
      reporter.onEnd({ status: 'failed', error: secret })
      const written = output.mock.calls.map(([text]) => text).join('')
      expect(written).not.toContain(secret)
      expect(written).not.toContain('529183')
      expect(written).toContain('"failed":1')
    } finally { output.mockRestore() }
  })

  it('isolates auth from HTML reporters, screenshots, videos and traces', () => {
    // Playwright's ESM loader must run in Node, outside legacy Jest's VM.
    const root = resolve(__dirname, '../../..')
    const { config, baseConfig } = JSON.parse(execFileSync(process.execPath, ['-e', 'console.log(JSON.stringify({config:require("./playwright.auth.config"),baseConfig:require("./playwright.config")}))'], { cwd: root, encoding: 'utf8' }))
    expect(statSync(config.outputDir).mode & 0o777).toBe(0o700)
    rmdirSync(config.outputDir) // exact empty directory created by this config test
    expect(config.preserveOutput).toBe('never')
    expect(baseConfig.projects.some(project => project.testMatch.includes('.auth.'))).toBe(false)
    expect(config.reporter).toHaveLength(1)
    expect(config.reporter[0][0]).toContain('auth-safe-reporter.cjs')
    expect(config.use).toMatchObject({ trace: 'off', screenshot: 'off', video: 'off' })
  })
})
