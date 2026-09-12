const AuthSafeReporter = require('../../../e2e/auth-safe-reporter.cjs')
const config = require('../../../../playwright.auth.config')
const baseConfig = require('../../../../playwright.config')

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
    expect(baseConfig.projects.some(project => project.testMatch.includes('.auth.'))).toBe(false)
    expect(config.reporter).toHaveLength(1)
    expect(config.reporter[0][0]).toContain('auth-safe-reporter.cjs')
    expect(config.use).toMatchObject({ trace: 'off', screenshot: 'off', video: 'off' })
  })
})
