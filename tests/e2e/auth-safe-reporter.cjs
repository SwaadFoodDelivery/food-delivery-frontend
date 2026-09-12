// Never serialize test titles, steps, errors, attachments, stdout or stderr.
// Any of them can contain credentials from an auth action or a failed assertion.
class AuthSafeReporter {
  constructor() {
    this.counts = { passed: 0, failed: 0, timedOut: 0, skipped: 0, interrupted: 0 }
  }

  onTestEnd(_test, result) {
    if (Object.prototype.hasOwnProperty.call(this.counts, result.status)) this.counts[result.status]++
  }

  onStdOut() {}
  onStdErr() {}
  onError() {}

  onEnd(result) {
    const status = ['passed', 'failed', 'timedout', 'interrupted'].includes(result.status) ? result.status : 'unknown'
    process.stdout.write(`${JSON.stringify({ suite: 'auth-browser', status, ...this.counts })}\n`)
    if (status !== 'passed') process.stdout.write('Auth test failed. Sensitive diagnostics are suppressed; inspect locally without recording credentials.\n')
  }

  printsToStdio() { return true }
}

module.exports = AuthSafeReporter
