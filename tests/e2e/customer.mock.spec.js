const { test, expect, savedAddresses } = require('./mock-backend')
const { browseToCheckout, addAddress } = require('./helpers')

test.describe('Supplemental network-mocked customer UI', () => {
  test('browse through address creation, payment and delivery polling', async ({ page, backend }) => {
    await page.clock.install()
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
    await addAddress(page)
    await expect(page.getByText('₹259.95', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Place demo order' }).click()
    await expect(page).toHaveURL(/\/orders\/mock-order\/tracking$/)
    await expect(page.getByRole('heading', { name: 'Partner assigned', exact: true })).toBeVisible()
    await expect(page.getByText('Network-mocked demo delivery — no real courier')).toBeVisible()
    await page.clock.fastForward(10000)
    await expect(page.getByRole('heading', { name: 'Delivered', exact: true })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('swaad.cart_token'))).toBeNull()
    const order = backend.calls.find(call => call.path === '/orders')
    expect(order.body).toMatchObject({ cart_token: 'mock-cart', address_id: 'created', payment_method: 'upi' })
    expect(order.headers['idempotency-key']).toMatch(/^order-/)
    const payment = backend.calls.find(call => call.path.endsWith('/payment'))
    expect(payment.body.payment_token).toBe('demo-token')
    expect(payment.headers['idempotency-key']).toMatch(/^payment-/)
  })

  test('outside radius blocks checkout and switching back restores quote', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const before = backend.calls.filter(call => call.path === '/orders/quote').length
    await page.getByRole('button', { name: /E2E outside radius/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'We can’t deliver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
    await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
    expect(backend.calls.filter(call => call.path === '/orders/quote')).toHaveLength(before)
    expect(backend.calls.filter(call => call.path === '/orders')).toHaveLength(0)
    await page.getByRole('button', { name: /Demo nearby/ }).click()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
  })

  test('removing the last item clears totals and prevents ordering', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByText('1 × Kesar Special Thali', { exact: true })).toBeHidden()
    await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
  })

  test('serviceability failure clears an earlier valid quote', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    backend.serviceError = true
    await page.getByRole('button', { name: /Demo nearby/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Demo serviceability temporarily unavailable' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
    await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
  })

  test('Place disables immediately while last-item removal is pending', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const hold = backend.delayNext('/cart/mock-cart/items/mock-item')
    try {
      await page.getByRole('button', { name: 'Remove', exact: true }).click()
      await hold.started.promise
      await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled()
      await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
      hold.release.resolve()
      await expect(page.getByText('1 × Kesar Special Thali', { exact: true })).toBeHidden()
    } finally {
      hold.release.resolve()
    }
  })

  test('late quote cannot resurrect totals after removing the last item', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    const hold = backend.delayNext('/orders/quote', 'near')
    try {
      await page.getByRole('button', { name: /Demo nearby/ }).click()
      await hold.started.promise
      await page.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect(page.getByText('1 × Kesar Special Thali', { exact: true })).toBeHidden()
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/orders/quote')
      hold.release.resolve()
      await response
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
      await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
    } finally {
      hold.release.resolve()
    }
  })

  test('cart refresh failure cannot leave a placeable stale cart', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
    backend.cartError = true
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Demo cart refresh failed' })).toBeVisible()
    await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
  })

  test('declined payment retries the same saved order after reload', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await page.getByRole('radio', { name: 'Simulate a declined payment' }).check()
    await page.getByRole('button', { name: 'Place demo order' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Demo payment declined' })).toBeVisible()
    await expect(page).toHaveURL(/\/order$/)
    expect(backend.calls.some(call => call.path.endsWith('/delivery'))).toBe(false)
    expect(await page.evaluate(() => sessionStorage.getItem('swaad.cart_token'))).toBeNull()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    await page.getByRole('radio', { name: 'Demo payment succeeds', exact: true }).check()
    await page.getByRole('button', { name: 'Retry demo payment', exact: true }).click()
    await expect(page).toHaveURL(/\/orders\/mock-order\/tracking$/)
    expect(backend.calls.filter(call => call.path === '/orders')).toHaveLength(1)
    expect(backend.calls.filter(call => call.path.endsWith('/payment'))).toHaveLength(2)
  })

  test('declined saved order can be cancelled before starting another cart', async ({ page, backend }) => {
    backend.addresses = structuredClone(savedAddresses)
    await browseToCheckout(page)
    await page.getByRole('radio', { name: 'Simulate a declined payment' }).check()
    await page.getByRole('button', { name: 'Place demo order' }).click()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel saved order', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Fictional kitchens of Shamgarh' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Complete your demo payment' })).toBeHidden()
    expect(backend.calls.filter(call => call.path === '/orders/mock-order/cancel')).toHaveLength(1)
  })

  for (const path of ['/orders/serviceability', '/orders/quote']) {
    test(`late ${path} cannot restore a quote for the previous address`, async ({ page, backend }) => {
      backend.addresses = structuredClone(savedAddresses)
      await browseToCheckout(page)
      await expect(page.getByRole('button', { name: 'Place demo order' })).toBeEnabled()
      const hold = backend.delayNext(path, 'near')
      try {
        await page.getByRole('button', { name: /Demo nearby/ }).click()
        await hold.started.promise
        await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
        await page.getByRole('button', { name: /E2E outside radius/ }).click()
        await expect(page.getByRole('alert').filter({ hasText: 'We can’t deliver' })).toBeVisible()
        const staleResponse = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1${path}` && r.request().postDataJSON().address_id === 'near')
        hold.release.resolve()
        await staleResponse
        await hold.finished.promise
        // Flush rendering after the released response has completed in Chromium.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        await expect(page.getByRole('alert').filter({ hasText: 'We can’t deliver' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Place demo order' })).toBeDisabled()
        await expect(page.getByText('₹259.95', { exact: true })).toBeHidden()
      } finally {
        hold.release.resolve()
      }
    })
  }
})
