import MockAdapter from 'axios-mock-adapter'

import http, { configureApi } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { payForOrder, placeOrder, quoteOrder } from '@/services/orderService'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('orderService', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(http)
    configureApi({ getAccessToken: () => 'access-token', onSessionExpired: jest.fn() })
  })

  afterEach(() => mock.restore())

  it('quotes an authenticated cart', async () => {
    mock.onPost(API_URLS.ORDER_QUOTE).reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ cart_token: 'cart-1', address_id: 'address-1' })
      expect(config.headers.Authorization).toBe('Bearer access-token')
      return [200, { status: 'success', data: { total_amount_minor: 43800 } }]
    })

    await expect(quoteOrder({ cartToken: 'cart-1', addressId: 'address-1' })).resolves.toEqual({ total_amount_minor: 43800 })
  })

  it('sends idempotency keys for placement and mock payment', async () => {
    mock.onPost(API_URLS.ORDERS).reply((config) => {
      expect(config.headers['Idempotency-Key'] || config.headers['idempotency-key']).toMatch(/^order-/)
      return [200, { status: 'success', data: { order_id: 'order-1' } }]
    })
    mock.onPost('/orders/order-1/payment').reply((config) => {
      expect(config.headers['Idempotency-Key'] || config.headers['idempotency-key']).toMatch(/^payment-/)
      expect(JSON.parse(config.data)).toEqual({ payment_token: 'demo-token' })
      return [201, { status: 'success', data: { status: 'success' } }]
    })

    await placeOrder({ cartToken: 'cart-1', addressId: 'address-1' })
    await expect(payForOrder({ orderId: 'order-1' })).resolves.toEqual({ status: 'success' })
  })
})
