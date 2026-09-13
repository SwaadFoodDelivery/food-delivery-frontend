const { test: base, expect } = require('@playwright/test')
const { installSession } = require('./helpers')

const order = (id, createdAt = '2026-09-13T10:00:00.123456Z') => ({
  order_id: id, created_at: createdAt, restaurant_name: `Fictional kitchen ${id}`,
  status: 'order_created', total_amount_minor: 12001, payment_method: 'cod'
})
function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Supplemental UI fixtures only: no real backend acceptance or real credentials.
const test = base.extend({
  history: [async ({ page }, use) => {
    const state = { pages: [], requests: [], unexpected: [], errors: [], holds: [] }
    state.hold = response => {
      const hold = { response, started: deferred(), release: deferred() }
      state.pages.push(hold)
      state.holds.push(hold)
      return hold
    }
    await installSession(page, { accessToken: 'network-mocked-history-token', userId: 'network-mocked-history-client' })
    page.on('pageerror', error => state.errors.push(error.message))
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/v1/users/me/profile') {
        return route.fulfill({ json: { status: 'success', data: { user_id: 'network-mocked-history-client', role: 'client', account_status: 'active', onboarding_complete: true } } })
      }
      if (url.pathname === '/api/v1/orders' && route.request().method() === 'GET') {
        state.requests.push(Object.fromEntries(url.searchParams))
        let response = state.pages.shift()
        if (response?.started) {
          response.started.resolve()
          await response.release.promise
          response = response.response
        }
        if (response) {
          if (response.failure) return route.fulfill({ status: response.failure, json: { status: 'error', message: 'Fictional list temporarily unavailable', error_code: 'LIST_FIXTURE_ERROR' } })
          return route.fulfill({ json: { status: 'success', data: response } })
        }
      }
      state.unexpected.push(`${route.request().method()} ${url.pathname}`)
      return route.fulfill({ status: 501, json: { status: 'error', message: 'Unexpected mocked request' } })
    })
    await use(state)
    state.holds.forEach(hold => hold.release.resolve())
    expect(state.unexpected).toEqual([])
    expect(state.errors).toEqual([])
  }, { auto: true }]
})

test('mocked 20-to-23 pagination preserves order and gives last-page focus, then Refresh resets', async ({ page, history }) => {
  const first = Array.from({ length: 20 }, (_, index) => order(String(index).padStart(2, '0')))
  history.pages.push({ orders: first, next_cursor: 'opaque+/=cursor' }, { orders: [first[19], order('20'), order('21'), order('22')], next_cursor: '' }, { orders: [order('fresh')] })
  await page.goto('/orders/history')
  await expect(page.getByRole('article')).toHaveCount(20)
  const more = page.getByRole('button', { name: 'Load older orders' })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('article')).toHaveCount(23)
  await expect(more).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: '23 orders shown. No more orders.' })).toBeFocused()
  await expect(page.getByRole('article').last().getByRole('heading')).toHaveText('Fictional kitchen 22')
  expect(history.requests).toEqual([{ limit: '20' }, { limit: '20', cursor: 'opaque+/=cursor' }])
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article').getByRole('heading')).toHaveText('Fictional kitchen fresh')
  expect(history.requests[2]).toEqual({ limit: '20' })
})

test('mocked transient failure retains rows and retries cursor; 400 requires explicit restart', async ({ page, history }) => {
  history.pages.push({ orders: [order('first')], next_cursor: 'retry-cursor' }, { failure: 503 }, { failure: 400 }, { orders: [order('reset')], next_cursor: '' })
  await page.goto('/orders/history')
  await page.getByRole('button', { name: 'Load older orders' }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'Load older orders' }).click()
  await expect(page.getByRole('alert')).toContainText('Restart from the first page')
  await expect(page.getByRole('article').getByRole('heading')).toHaveText('Fictional kitchen first')
  await expect(page.getByRole('button', { name: 'Load older orders' })).toBeHidden()
  expect(history.requests).toEqual([{ limit: '20' }, { limit: '20', cursor: 'retry-cursor' }, { limit: '20', cursor: 'retry-cursor' }])
  await page.getByRole('button', { name: 'Restart from first page' }).click()
  await expect(page.getByRole('article').getByRole('heading')).toHaveText('Fictional kitchen reset')
  expect(history.requests[3]).toEqual({ limit: '20' })
})

test('mocked delayed older response cannot overwrite Refresh or resurrect its cursor', async ({ page, history }) => {
  history.pages.push({ orders: [order('first')], next_cursor: 'old-cursor' })
  const hold = history.hold({ orders: [order('stale')], next_cursor: 'stale-cursor' })
  history.pages.push({ orders: [order('fresh')] })
  await page.goto('/orders/history')
  await page.getByRole('button', { name: 'Load older orders' }).click()
  await hold.started.promise
  await expect(page.getByRole('button', { name: 'Load older orders' })).toBeDisabled()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('article').getByRole('heading')).toHaveText('Fictional kitchen fresh')
  const response = page.waitForResponse(result => new URL(result.url()).searchParams.get('cursor') === 'old-cursor')
  hold.release.resolve()
  await response
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Load older orders' })).toBeHidden()
})

test('mocked mobile legacy page keeps precise duplicate IDs visible but disables ambiguous actions', async ({ page, history }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  history.pages.push({ orders: [order('same'), order('same', '2026-09-13T10:00:00.123457Z')] })
  await page.goto('/orders/history')
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Load older orders' })).toBeHidden()
  for (const card of await page.getByRole('article').all()) {
    await expect(card.getByText(/multiple loaded orders share this order ID/)).toBeVisible()
    await expect(card.getByRole('button', { name: 'View timeline' })).toBeDisabled()
    await expect(card.getByRole('button', { name: 'Cancel demo order' })).toBeDisabled()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(history.requests).toHaveLength(1)
})
