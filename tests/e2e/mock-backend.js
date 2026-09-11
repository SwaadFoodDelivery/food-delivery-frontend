const { test: base, expect } = require('@playwright/test')
const { installSession } = require('./helpers')

const restaurantId = '10000000-0000-4000-8000-000000000001'
const itemId = '40000000-0000-4000-8000-000000000001'
const restaurant = { restaurant_id: restaurantId, name: 'Kesar Thali Ghar', description: 'Network-mocked demo kitchen', cuisine_types: ['Vegetarian'], rating: 4.7, delivery_time_min: 35, is_open: true }
const item = { item_id: itemId, name: 'Kesar Special Thali', description: 'Network-mocked demo thali', price_minor: 21900, is_veg: true, is_available: true, tags: ['demo'] }
const savedAddresses = [
  { address_id: 'near', label: 'Demo nearby', line1: 'Demo Market', city: 'Shamgarh', pincode: '458883', is_default: true },
  { address_id: 'far', label: 'E2E outside radius', line1: 'Demo distant address', city: 'Shamgarh', pincode: '458883' }
]

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

const test = base.extend({
  backend: [async ({ page }, use) => {
    const state = {
      addresses: [], quantity: 0, calls: [], unexpected: [], pageErrors: [],
      serviceError: false, cartError: false, deliveryReads: 0, holds: [],
      // Explicit handshakes let the test release a stale response after a newer one.
      delayNext(path, addressId) {
        const hold = { path, addressId, started: deferred(), release: deferred(), finished: deferred() }
        this.holds.push(hold)
        return hold
      }
    }
    page.on('pageerror', error => state.pageErrors.push(error.message))
    await installSession(page, { accessToken: 'network-mocked-demo-token', userId: 'network-mocked-client' })
    await page.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname.replace(/^\/api\/v1/, '')
      if (!url.pathname.startsWith('/api/')) {
        if (url.origin === new URL(test.info().project.use.baseURL || 'http://127.0.0.1:4173').origin || url.hostname === '127.0.0.1') return route.continue()
        state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
        return route.abort('blockedbyclient')
      }
      const body = request.postData() ? request.postDataJSON() : {}
      state.calls.push({ path, method: request.method(), body, headers: request.headers() })
      const reply = data => route.fulfill({ json: { status: 'success', data } })
      const fail = (status, error_code, message) => route.fulfill({ status, json: { status: 'error', error_code, message } })
      const hold = state.holds.find(h => h.path === path && h.addressId === body.address_id && !h.consumed)
      if (hold) {
        hold.consumed = true
        hold.started.resolve()
        await hold.release.promise
      }
      try {
        if (path === '/users/me/profile') return await reply({ user_id: 'network-mocked-client', name: 'Demo test client', role: 'client', account_status: 'active', onboarding_complete: true })
        if (path === '/restaurants') return await reply({ restaurants: [restaurant] })
        if (path === `/restaurants/${restaurantId}/menu`) return await reply({ categories: [{ category_id: 'thalis', category: 'Thalis', items: [item, { ...item, item_id: 'unavailable', name: 'Unavailable demo dish', is_available: false }] }] })
        if (path === '/cart' && request.method() === 'POST') {
          state.quantity += body.quantity
          return await reply({ cart_token: 'mock-cart' })
        }
        if (path === '/cart/mock-cart/items/mock-item' && request.method() === 'DELETE') {
          state.quantity = 0
          return await reply({})
        }
        if (path === '/cart/mock-cart') {
          if (state.cartError) return await fail(503, 'INTERNAL_ERROR', 'Demo cart refresh failed')
          return await reply({ cart_token: 'mock-cart', restaurant_id: restaurantId, subtotal_minor: state.quantity * item.price_minor, items: state.quantity ? [{ ...item, cart_item_id: 'mock-item', quantity: state.quantity, line_total_minor: state.quantity * item.price_minor }] : [] })
        }
        if (path === '/users/me/addresses') {
          if (request.method() === 'POST') {
            const address = { ...body, address_id: 'created', label: 'Demo saved address' }
            state.addresses.push(address)
            return await reply({ address })
          }
          return await reply({ addresses: state.addresses })
        }
        if (path === '/orders/serviceability') {
          if (state.serviceError) return await fail(503, 'INTERNAL_ERROR', 'Demo serviceability temporarily unavailable')
          const near = body.address_id !== 'far'
          return await reply({ serviceable: near, reason_code: near ? 'serviceable' : 'outside_delivery_radius', reason: near ? 'This address is serviceable.' : "This address is outside the restaurant's delivery area.", delivery_fee_minor: near ? 3000 : 0, estimated_delivery_min: 35 })
        }
        if (path === '/orders/quote') return await reply({ subtotal_minor: 21900, taxes_minor: 1095, delivery_fee_minor: 3000, total_amount_minor: 25995, currency: 'INR' })
        if (path === '/orders' && request.method() === 'POST') {
          if (!state.quantity) return await fail(400, 'CART_EMPTY', 'Cart is empty')
          state.quantity = 0 // The real backend consumes the cart at placement, even if payment fails.
          return await reply({ order_id: 'mock-order', status: 'order_created', total_amount_minor: 25995 })
        }
        if (path === '/orders/mock-order/payment') {
          if (body.payment_token === 'mock_fail') return await fail(402, 'PAYMENT_FAILED', 'Demo payment declined')
          return await reply({ order_id: 'mock-order', status: 'success' })
        }
        if (path === '/orders/mock-order/delivery') return await reply({ order_id: 'mock-order', provider: 'mock', status: ++state.deliveryReads > 1 ? 'delivered' : 'assigned', demo_label: 'Network-mocked demo delivery — no real courier', partner_name: 'Demo courier fixture', partner_phone: 'Not a real contact', updated_at: '2026-09-11T10:00:00Z' })
        state.unexpected.push(`${request.method()} ${path}`)
        return await fail(501, 'UNEXPECTED_MOCK_REQUEST', 'Missing deterministic fixture')
      } finally {
        if (hold) hold.finished.resolve()
      }
    })
    await use(state)
    state.holds.forEach(hold => hold.release.resolve())
    expect(state.unexpected, 'Unexpected network calls in supplemental mocked suite').toEqual([])
    expect(state.pageErrors, 'Unhandled browser errors').toEqual([])
  }, { auto: true }]
})

module.exports = { test, expect, savedAddresses }
