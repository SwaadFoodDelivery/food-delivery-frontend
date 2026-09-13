const { test, expect } = require('@playwright/test')
const { seedOrderHistory } = require('./seed-order-history.cjs')
const { installSession } = require('./helpers')

// REAL backend list acceptance: no request interception or response mocking.
// Run only after coordinating the dedicated database/runtime with its owner.
test('seeded-auth real list: exact amounts, timestamp ties, 20-to-23, end and Refresh', async ({ page }, testInfo) => {
  expect(testInfo.project.name).toBe('chromium-order-history-real')
  expect(testInfo.config.preserveOutput).toBe('never')
  const backend = new URL(process.env.E2E_BACKEND_URL || 'http://invalid')
  expect(['localhost', '127.0.0.1']).toContain(backend.hostname)
  expect(backend.port).toBe('18081')
  const fixture = seedOrderHistory()
  try {
    await installSession(page, fixture.auth)
    const listResponse = () => page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1/orders' && response.request().method() === 'GET')
    const firstResponse = listResponse()
    await page.goto('/orders/history')
    const first = await firstResponse
    expect(first.status()).toBe(200)
    expect(new URL(first.url()).searchParams.has('cursor')).toBe(false)
    const firstData = (await first.json()).data
    expect(firstData.orders).toHaveLength(20)
    expect(typeof firstData.next_cursor).toBe('string')
    expect(firstData.next_cursor.length).toBeGreaterThan(0)
    await expect(page.getByRole('article')).toHaveCount(20)
    const olderResponse = listResponse()
    await page.getByRole('button', { name: 'Load older orders' }).focus()
    await page.keyboard.press('Enter')
    const older = await olderResponse
    expect(older.status()).toBe(200)
    expect(new URL(older.url()).searchParams.get('cursor')).toBe(firstData.next_cursor)
    const olderData = (await older.json()).data
    expect(olderData.orders).toHaveLength(3)
    expect(olderData.next_cursor || '').toBe('')
    const rows = [...firstData.orders, ...olderData.orders]
    expect(rows.map(({ order_id, created_at, total_amount_minor }) => ({ order_id, created_at, total_amount_minor })))
      .toEqual(fixture.orders.map(({ order_id, created_at, total_amount_minor }) => ({ order_id, created_at, total_amount_minor })))
    await expect(page.getByRole('article')).toHaveCount(23)
    await expect(page.getByRole('button', { name: 'Load older orders' })).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: '23 orders shown. No more orders.' })).toBeFocused()
    for (let index = 0; index < fixture.orders.length; index++) {
      await expect(page.getByRole('article').nth(index)).toContainText(`₹${(fixture.orders[index].total_amount_minor / 100).toFixed(2)}`)
    }
    const refreshResponse = listResponse()
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    const refresh = await refreshResponse
    expect(refresh.status()).toBe(200)
    expect(new URL(refresh.url()).searchParams.has('cursor')).toBe(false)
    expect((await refresh.json()).data.orders).toEqual(firstData.orders)
    await expect(page.getByRole('article')).toHaveCount(20)
    await expect(page.getByRole('button', { name: 'Load older orders' })).toBeVisible()
  } finally {
    fixture.cleanup()
  }
})
