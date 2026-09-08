import MockAdapter from 'axios-mock-adapter'

import http, { configureApi } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { getOwnedRestaurant, listOwnerOrders, updateOwnerOrderStatus } from '@/services/restaurantOwnerService'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('restaurantOwnerService', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(http)
    configureApi({ getAccessToken: () => 'owner-token', onSessionExpired: jest.fn() })
  })

  afterEach(() => mock.restore())

  it('loads the owner restaurant and its order queue with bearer auth', async () => {
    mock.onGet(API_URLS.OWNER_RESTAURANT).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      return [200, { status: 'success', data: { restaurant_id: 'restaurant-1', name: 'Demo Kitchen' } }]
    })
    mock.onGet('/restaurants/restaurant-1/orders').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      return [200, { status: 'success', data: { orders: [] } }]
    })

    await expect(getOwnedRestaurant()).resolves.toEqual({ restaurant_id: 'restaurant-1', name: 'Demo Kitchen' })
    await expect(listOwnerOrders('restaurant-1')).resolves.toEqual({ orders: [] })
  })

  it('sends the next status to the owner mutation endpoint', async () => {
    mock.onPatch('/restaurants/restaurant-1/orders/order-1/status').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      expect(JSON.parse(config.data)).toEqual({ status: 'preparing' })
      return [200, { status: 'success', data: { order_id: 'order-1', status: 'preparing' } }]
    })

    await expect(updateOwnerOrderStatus({ restaurantId: 'restaurant-1', orderId: 'order-1', status: 'preparing' })).resolves.toEqual({ order_id: 'order-1', status: 'preparing' })
  })
})
