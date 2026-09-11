const { test, expect } = require('@playwright/test')
const { readFileSync, mkdtempSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { installSession, responseFor, dataFrom } = require('./helpers')

// No network interception. Seeded preconditions are explicit; transitions,
// review, access refresh and cancellation use the real application/backend.
test('owner, driver and operations complete persisted role-scoped workflows', async ({ browser, request }, testInfo) => {
  test.setTimeout(120000)
  expect(process.env.E2E_LOCAL_SEED, 'Persona provisioning requires E2E_LOCAL_SEED=1 and the disposable local stack').toBe('1')
  expect(Boolean(process.env.E2E_BACKEND_URL)).toBeTruthy()
  const file = join(mkdtempSync(join(tmpdir(), 'swaad-persona-auth-')), 'sessions.json')
  execFileSync(process.execPath, [join(__dirname, 'seed-personas.cjs')], { env: { ...process.env, E2E_PERSONA_FILE: file }, stdio: 'pipe' })
  const fixture = JSON.parse(readFileSync(file, 'utf8'))
  const api = process.env.E2E_BACKEND_URL.replace(/\/$/, '') + '/api/v1'
  const headers = person => ({ Authorization: `Bearer ${person.accessToken}`, 'X-Device-ID': person.deviceId })
  const short = id => id.slice(0, 8).toUpperCase()
  const contexts = []
  const errors = []
  async function pageFor(name) {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
    contexts.push(context)
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(`${name}: ${error.message}`))
    await installSession(page, fixture.people[name])
    return page
  }
  async function screenshot(page, name) {
    await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  }
  try {
    // Backend authorization is checked separately from frontend navigation.
    for (const path of ['/operations/overview', '/owner/restaurant', '/driver/delivery']) {
      const denied = await request.get(api + path, { headers: headers(fixture.people.client) })
      expect(denied.status(), `client must not access ${path}`).toBe(403)
    }
    const unapproved = await request.get(api + '/driver/delivery', { headers: headers(fixture.people.applicant) })
    expect(unapproved.status(), 'pending applicant cannot operate').toBe(403)
    const applicant = await pageFor('applicant')
    await applicant.goto('/driver')
    await expect(applicant).toHaveURL(/\/onboarding$/)
    await expect(applicant.getByRole('heading', { name: 'Pending review', exact: true })).toBeVisible()

    const owner = await pageFor('owner')
    await owner.goto('/restaurant/orders')
    await expect(owner.getByRole('heading', { name: `E2E Persona Kitchen ${fixture.restaurantId.slice(0, 8)}` })).toBeVisible()
    const card = owner.locator('.owner-order-card').filter({ hasText: `Order ${short(fixture.orders.owner)}` })
    for (const [label, status] of [['Accept order', 'accepted'], ['Start preparing', 'preparing'], ['Mark ready', 'ready_for_pickup']]) {
      const changed = responseFor(owner, `/restaurants/${fixture.restaurantId}/orders/${fixture.orders.owner}/status`, 'PATCH')
      await card.getByRole('button', { name: label, exact: true }).click()
      expect((await dataFrom(changed)).status).toBe(status)
    }
    await owner.reload()
    await expect(card.getByText('Ready For Pickup', { exact: true })).toBeVisible()
    await screenshot(owner, 'owner-ready.png')

    const driver = await pageFor('driver')
    await driver.goto('/driver')
    await expect(driver.getByRole('heading', { name: 'Ready when you are', exact: true })).toBeVisible()
    await expect(driver.getByText(`Order ${short(fixture.orders.driver)}`, { exact: true })).toBeVisible()
    await driver.getByRole('textbox', { name: 'Current city', exact: true }).fill('Shamgarh')
    const available = responseFor(driver, '/users/me/profile', 'PUT')
    await driver.getByRole('checkbox', { name: 'Offline', exact: true }).check()
    expect((await dataFrom(available)).profile.is_available).toBe(true)
    for (const [label, status] of [['Head to restaurant', 'en_route_to_restaurant'], ['Mark arrived', 'arrived_at_restaurant'], ['Confirm pickup', 'picked_up'], ['Start delivery', 'out_for_delivery'], ['Mark delivered', 'delivered']]) {
      const changed = responseFor(driver, '/driver/delivery/status', 'PATCH')
      await driver.getByRole('button', { name: label, exact: true }).click()
      expect((await dataFrom(changed)).status).toBe(status)
    }
    await screenshot(driver, 'driver-delivered.png')
    await driver.reload()
    await expect(driver.getByRole('heading', { name: 'No active delivery', exact: true })).toBeVisible()
    const history = await request.get(`${api}/orders/${fixture.orders.driver}/history`, { headers: headers(fixture.people.client) })
    expect(history.ok()).toBeTruthy()
    expect((await history.json()).data.order_status.at(-1).to_status).toBe('delivered')

    const manager = await pageFor('manager')
    await manager.goto('/operations')
    await expect(manager.getByRole('heading', { name: 'Keep the demo moving', exact: true })).toBeVisible()
    const opsRow = manager.locator('.order-row').filter({ hasText: short(fixture.orders.operations) })
    const cancelled = responseFor(manager, `/operations/orders/${fixture.orders.operations}/cancel`, 'PATCH')
    await opsRow.getByRole('button', { name: 'Cancel demo order', exact: true }).click()
    await dataFrom(cancelled)
    await expect(opsRow.getByText('Cancelled', { exact: true })).toBeVisible()
    const review = manager.locator('.review-card').filter({ hasText: fixture.people.applicant.userId.slice(0, 8) })
    await expect(review.getByText('3/3 documents', { exact: true })).toBeVisible()
    const approved = responseFor(manager, `/operations/onboarding/${fixture.applicationId}`, 'PATCH')
    await review.getByRole('button', { name: 'Approve', exact: true }).click()
    await dataFrom(approved)
    await expect(review).toBeHidden()
    await expect(manager.locator('.audit-row').filter({ hasText: short(fixture.applicationId) }).getByText('Onboarding Approved', { exact: true })).toBeVisible()
    await expect(manager.locator('.audit-row').filter({ hasText: short(fixture.orders.operations) }).getByText('Ops Order Cancelled', { exact: true })).toBeVisible()
    await screenshot(manager, 'operations-review-audit.png')

    // Existing applicant session gains access only after actual server approval.
    await applicant.goto('/driver')
    await expect(applicant).toHaveURL(/\/driver$/)
    await expect(applicant.getByRole('heading', { name: 'No active delivery', exact: true })).toBeVisible()
    await screenshot(applicant, 'approved-applicant-access.png')
    const profile = await request.get(api + '/users/me/profile', { headers: headers(fixture.people.applicant) })
    expect((await profile.json()).data.onboarding_complete).toBe(true)
    expect(errors, 'Unhandled errors across persona contexts').toEqual([])
    await testInfo.attach('persona-evidence.json', { body: JSON.stringify({ mode: 'real-backend-seeded-preconditions-external-providers-mocked', restaurant_id: fixture.restaurantId, orders: fixture.orders, application_id: fixture.applicationId, approved_user_id: fixture.people.applicant.userId }), contentType: 'application/json' })
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})
