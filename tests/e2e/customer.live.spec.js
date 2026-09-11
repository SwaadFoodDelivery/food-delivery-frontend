const { test, expect } = require('@playwright/test')
const { readFileSync, mkdtempSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { installSession, browseToCheckout, addAddress, responseFor, dataFrom } = require('./helpers')

// PRIMARY ACCEPTANCE: no page.route(), response replacement, or backend stubs.
// External payment/delivery providers are mocked by the real demo backend.
test.describe('Real backend customer journey (external providers mocked)', () => {
  let auth
  test.beforeEach(async ({ page, request }) => {
    let authFile = process.env.E2E_AUTH_FILE
    if (process.env.E2E_LOCAL_SEED === '1') {
      // Explicit local mode isolates customer/cart/rate-limit state per test.
      // The provisioner still refuses shared DB/Redis targets. No limit bypass.
      authFile = join(mkdtempSync(join(tmpdir(), 'swaad-browser-auth-')), 'session.json')
      execFileSync(process.execPath, [join(__dirname, 'seed-session.cjs')], {
        env: { ...process.env, E2E_AUTH_FILE: authFile }, stdio: 'pipe'
      })
    }
    auth = authFile ? JSON.parse(readFileSync(authFile, 'utf8')) : {
      accessToken: process.env.E2E_ACCESS_TOKEN, userId: process.env.E2E_USER_ID, deviceId: process.env.E2E_DEVICE_ID
    }
    expect(Boolean(process.env.E2E_BACKEND_URL), 'Set E2E_BACKEND_URL; see tests/e2e/README.md. Live acceptance never silently skips.').toBeTruthy()
    expect(Boolean(auth.accessToken && auth.userId), 'Use E2E_LOCAL_SEED=1 for the isolated local stack, E2E_AUTH_FILE or explicit session variables').toBeTruthy()
    const profile = await request.get(`${process.env.E2E_BACKEND_URL.replace(/\/$/, '')}/api/v1/users/me/profile`, {
      headers: { Authorization: `Bearer ${auth.accessToken}`, 'X-Device-ID': auth.deviceId || 'e2e-demo-device' }
    })
    expect(profile.status(), 'Seed an active client plus an unexpired JWT and Redis session').toBe(200)
    const { data } = await profile.json()
    expect(data.user_id).toBe(auth.userId)
    expect(data.role).toBe('client')
    expect(data.account_status).toBe('active')
    expect(data.onboarding_complete).toBe(true)
    await installSession(page, auth)
  })

  test('browse, cart, create address, quote, place, pay, and track persisted delivery', async ({ page }, testInfo) => {
    const trackingTimeout = Number(process.env.E2E_TRACKING_TIMEOUT_MS || 90000)
    test.setTimeout(trackingTimeout + 60000)
    await browseToCheckout(page)
    const addressResponse = responseFor(page, '/users/me/addresses')
    const serviceResponse = responseFor(page, '/orders/serviceability')
    const quoteResponse = responseFor(page, '/orders/quote')
    await addAddress(page, `E2E demo ${Date.now()}`)
    const address = (await dataFrom(addressResponse)).address
    expect(address.address_id).toBeTruthy()
    const service = await dataFrom(serviceResponse)
    expect(service.serviceable).toBe(true)
    const quote = await dataFrom(quoteResponse)
    expect(quote.total_amount_minor).toBeGreaterThan(0)
    expect(quote.delivery_fee_minor).toBe(service.delivery_fee_minor)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const placedResponse = responseFor(page, '/orders')
    const paymentResponse = page.waitForResponse(r => /\/api\/v1\/orders\/[^/]+\/payment$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST')
    const deliveryResponse = page.waitForResponse(r => /\/api\/v1\/orders\/[^/]+\/delivery$/.test(new URL(r.url()).pathname))
    await page.getByRole('button', { name: 'Place demo order' }).click()
    const placed = await dataFrom(placedResponse)
    expect(placed.order_id).toBeTruthy()
    await dataFrom(paymentResponse)
    const delivery = await dataFrom(deliveryResponse)
    expect(delivery.provider).toBe('mock')
    await expect(page).toHaveURL(new RegExp(`/orders/${placed.order_id}/tracking$`))
    await expect(page.getByRole('heading', { name: 'Your delivery journey' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Delivery progress' })).toBeVisible()
    // Real elapsed time and backend polling, no clock manipulation in live mode.
    await expect(page.getByRole('heading', { name: 'Delivered', exact: true })).toBeVisible({ timeout: trackingTimeout })
    expect(await page.evaluate(() => sessionStorage.getItem('swaad.cart_token'))).toBeNull()
    await testInfo.attach('real-backend-evidence.json', {
      body: JSON.stringify({ mode: 'real-backend-external-providers-mocked', address_id: address.address_id, order_id: placed.order_id, total_amount_minor: quote.total_amount_minor, delivery_provider: delivery.provider }),
      contentType: 'application/json'
    })
  })

  test('outside-radius saved address blocks quote and placement', async ({ page }) => {
    await browseToCheckout(page)
    // Settle any automatic default-address quote before counting requests.
    await expect(page.getByText('Calculating delivery for this address…')).toBeHidden()
    const sent = []
    page.on('request', request => {
      const path = new URL(request.url()).pathname
      if (request.method() === 'POST') sent.push(path)
    })
    const serviceResponse = responseFor(page, '/orders/serviceability')
    await page.getByRole('button').filter({ hasText: process.env.E2E_OUTSIDE_ADDRESS_LABEL || 'E2E outside radius' }).click()
    const decision = await dataFrom(serviceResponse)
    expect(decision.serviceable).toBe(false)
    expect(decision.reason_code).toBe('outside_delivery_radius')
    await expect(page.getByRole('alert').filter({ hasText: 'We can’t deliver to this address' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
    expect(sent).not.toContain('/api/v1/orders/quote')
    expect(sent).not.toContain('/api/v1/orders')
  })

  test('declined order cancelled through history no longer traps checkout', async ({ page }) => {
    await browseToCheckout(page)
    await addAddress(page, `E2E cancel ${Date.now()}`)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const placedResponse = responseFor(page, '/orders')
    await page.getByRole('radio', { name: 'Simulate a declined payment' }).check()
    await page.getByRole('button', { name: 'Place demo order' }).click()
    const placed = await dataFrom(placedResponse)
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    await page.getByRole('button', { name: 'View order history', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your orders', exact: true })).toBeVisible()
    const cancelled = responseFor(page, `/orders/${placed.order_id}/cancel`, 'PATCH')
    await page.getByRole('button', { name: 'Cancel demo order', exact: true }).first().click()
    await dataFrom(cancelled)
    const historyResponse = responseFor(page, `/orders/${placed.order_id}/history`, 'GET')
    await page.getByRole('button', { name: 'Order again', exact: true }).click()
    expect((await dataFrom(historyResponse)).order_status.at(-1).to_status).toBe('cancelled')
    await expect(page.getByRole('heading', { name: 'Fictional kitchens of Shamgarh' })).toBeVisible()
    await expect(page.getByText('Your saved order is already cancelled. You can start a new cart.')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeHidden()
  })

  test('decline, reload and retry pay the same persisted order', async ({ page, request }) => {
    await browseToCheckout(page)
    await addAddress(page, `E2E retry ${Date.now()}`)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const placements = []
    page.on('request', r => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/orders') placements.push(r.url())
    })
    const placedResponse = responseFor(page, '/orders')
    const declinedResponse = page.waitForResponse(r => /\/orders\/[^/]+\/payment$/.test(new URL(r.url()).pathname))
    await page.getByRole('radio', { name: 'Simulate a declined payment' }).check()
    await page.getByRole('button', { name: 'Place demo order' }).click()
    const placed = await dataFrom(placedResponse)
    expect((await declinedResponse).status()).toBe(402)
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    const delivery = await request.get(`${process.env.E2E_BACKEND_URL}/api/v1/orders/${placed.order_id}/delivery`, { headers: { Authorization: `Bearer ${auth.accessToken}` } })
    expect(delivery.status(), 'declined prepaid orders must not be assigned').toBe(404)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    await page.getByRole('radio', { name: 'Demo payment succeeds', exact: true }).check()
    const success = responseFor(page, `/orders/${placed.order_id}/payment`)
    await page.getByRole('button', { name: 'Retry demo payment', exact: true }).click()
    expect((await dataFrom(success)).status).toBe('success')
    await expect(page).toHaveURL(new RegExp(`/orders/${placed.order_id}/tracking$`))
    expect(placements).toHaveLength(1)
  })
})
