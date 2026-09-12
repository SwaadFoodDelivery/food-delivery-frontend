const { test, expect } = require('@playwright/test')
const { mkdtempSync, readFileSync, readdirSync, unlinkSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { responseFor, dataFrom } = require('./helpers')

// Browser obtains guest/JWT/refresh credentials through normal auth endpoints.
// Only initial fictional account records and the SMS transport are fixtures.
test('browser OTP login, real uploads, rejection, replacement, resubmission and approval', async ({ browser }, testInfo) => {
  test.setTimeout(120000)
  expect(process.env.E2E_LOCAL_SEED).toBe('1')
  expect(Boolean(process.env.E2E_OTP_OUTBOX && process.env.E2E_CLIENT_API_KEY)).toBeTruthy()
  const file = join(mkdtempSync(join(tmpdir(), 'swaad-auth-')), 'accounts.json')
  execFileSync(process.execPath, [join(__dirname, 'seed-auth.cjs')], { env: { ...process.env, E2E_AUTH_FIXTURE_FILE: file }, stdio: 'pipe' })
  const people = JSON.parse(readFileSync(file, 'utf8'))
  const contexts = []
  const errors = []
  async function newPage() {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
    contexts.push(context)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    return page
  }
  async function login(page, person, negative = false) {
    await page.goto(`/login?role=${person.role}`)
    await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill(person.phone)
    const sentAfter = Date.now()
    const sent = responseFor(page, '/auth/send-otp')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await dataFrom(sent)
    await expect(page.getByRole('heading', { name: 'Enter the code', exact: true })).toBeVisible()
    const hash = createHash('sha256').update(person.phone).digest('hex')
    let delivery
    await expect.poll(() => {
      for (const name of readdirSync(process.env.E2E_OTP_OUTBOX).filter(n => n.endsWith('.json'))) {
        const path = join(process.env.E2E_OTP_OUTBOX, name)
        const value = JSON.parse(readFileSync(path, 'utf8'))
        if (value.phone_hash === hash && Date.parse(value.sent_at) >= sentAfter) { delivery = { ...value, path }; return true }
      }
      return false
    }, { message: 'mock SMS delivery must arrive in the private outbox' }).toBe(true)
    if (negative) {
      const wrong = responseFor(page, '/auth/verify-otp')
      await page.getByRole('textbox', { name: '6-digit code', exact: true }).fill(delivery.code === '000000' ? '111111' : '000000')
      await page.getByRole('button', { name: 'Verify and continue', exact: true }).click()
      expect((await wrong).status()).toBe(401)
      await expect(page.getByRole('heading', { name: 'Enter the code', exact: true })).toBeVisible()
    }
    const verified = responseFor(page, '/auth/verify-otp')
    await page.getByRole('textbox', { name: '6-digit code', exact: true }).fill(delivery.code)
    await page.getByRole('button', { name: 'Verify and continue', exact: true }).click()
    const result = await dataFrom(verified)
    expect(Boolean(result.access_token)).toBe(true) // never attach/log credentials
    expect(result.refresh_token || '').toBe('')
    unlinkSync(delivery.path) // consume only this generated mock delivery
    const cookies = await page.context().cookies()
    expect(cookies.some(c => c.httpOnly && /refresh/i.test(c.name))).toBe(true)
  }
  try {
    const applicant = await newPage()
    const initialized = responseFor(applicant, '/onboarding/role/init')
    await login(applicant, people.applicant, true)
    const application = await dataFrom(initialized)
    expect(application.status).toBe('draft')
    expect(application.documents.length).toBeGreaterThan(0)
    await expect(applicant).toHaveURL(/\/onboarding$/)
    await expect(applicant.getByRole('button', { name: 'Submit for verification', exact: true })).toBeDisabled()
    const uploads = []
    applicant.on('request', request => {
      if (request.method() === 'PUT' && new URL(request.url()).port === '9000') {
        uploads.push({ authorization: Boolean(request.headers().authorization), contentType: request.headers()['content-type'] })
      }
    })
    const upload = async (card, revision) => {
      const confirmed = responseFor(applicant, '/onboarding/documents/uploaded')
      await card.locator('input[type="file"]').setInputFiles({ name: `fictional-demo-${revision}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4\nFictional test document ${revision}; not an identity document\n%%EOF`) })
      await card.getByRole('button', { name: 'Upload', exact: true }).click()
      await dataFrom(confirmed)
      await expect(card.getByText('Uploaded', { exact: true })).toBeVisible()
    }
    const cards = applicant.locator('.doc-card')
    for (let i = 0; i < application.documents.length; i++) await upload(cards.nth(i), `initial-${i}`)
    const submitted = responseFor(applicant, `/onboarding/${application.onboarding_id}/submit`, 'PATCH')
    await applicant.getByRole('button', { name: 'Submit for verification', exact: true }).click()
    expect((await dataFrom(submitted)).status).toBe('pending_verification')
    await applicant.reload()
    await expect(applicant.getByRole('heading', { name: 'Pending review', exact: true })).toBeVisible()
    await applicant.goto('/driver')
    await expect(applicant).toHaveURL(/\/onboarding$/)

    const manager = await newPage()
    await login(manager, people.manager)
    await manager.goto('/operations')
    const review = manager.locator('.review-card').filter({ hasText: people.applicant.name })
    await review.getByRole('textbox', { name: 'Rejection feedback (if needed)', exact: true }).fill('Please replace the fictional licence scan')
    const rejected = responseFor(manager, `/operations/onboarding/${application.onboarding_id}`, 'PATCH')
    await review.getByRole('button', { name: 'Reject', exact: true }).click()
    await dataFrom(rejected)
    await applicant.reload()
    await expect(applicant.getByText('Please replace the fictional licence scan', { exact: true })).toBeVisible()
    const reopened = responseFor(applicant, `/onboarding/${application.onboarding_id}/resubmit`)
    await applicant.getByRole('button', { name: 'Start over', exact: true }).click()
    expect((await dataFrom(reopened)).status).toBe('draft')
    await cards.first().getByRole('button', { name: 'Replace document', exact: true }).click()
    await expect(applicant.getByRole('button', { name: 'Submit for verification', exact: true })).toBeDisabled()
    await cards.first().getByRole('button', { name: 'Keep current document', exact: true }).click()
    await expect(applicant.getByRole('button', { name: 'Submit for verification', exact: true })).toBeEnabled()
    await cards.first().getByRole('button', { name: 'Replace document', exact: true }).click()
    await upload(cards.first(), 'replacement')
    const resubmitted = responseFor(applicant, `/onboarding/${application.onboarding_id}/submit`, 'PATCH')
    await applicant.getByRole('button', { name: 'Submit for verification', exact: true }).click()
    await dataFrom(resubmitted)
    await manager.reload()
    const approved = responseFor(manager, `/operations/onboarding/${application.onboarding_id}`, 'PATCH')
    await review.getByRole('button', { name: 'Approve', exact: true }).click()
    await dataFrom(approved)
    await applicant.goto('/driver')
    await expect(applicant).toHaveURL(/\/driver$/)
    await expect(applicant.getByRole('heading', { name: 'No active delivery', exact: true })).toBeVisible()
    expect(uploads.length).toBe(application.documents.length + 1)
    expect(uploads.every(u => !u.authorization && u.contentType === 'application/octet-stream')).toBe(true)
    expect(errors).toEqual([])
    await testInfo.attach('auth-onboarding-evidence.json', { body: JSON.stringify({ mode: 'browser-auth-real-storage-mock-SMS', onboarding_id: application.onboarding_id, uploads: uploads.length, rejected_then_approved: true }), contentType: 'application/json' })
  } finally { await Promise.all(contexts.map(c => c.close())) }
})
