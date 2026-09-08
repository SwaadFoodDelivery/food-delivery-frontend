import MockAdapter from 'axios-mock-adapter'

import http, { configureApi } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { getDriverDelivery, updateDriverAvailability, updateDriverDeliveryStatus } from '@/services/driverService'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('driverService', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(http)
    configureApi({ getAccessToken: () => 'driver-token', onSessionExpired: jest.fn() })
  })

  afterEach(() => mock.restore())

  it('loads the current driver assignment with bearer auth', async () => {
    mock.onGet(API_URLS.DRIVER_DELIVERY).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer driver-token')
      return [200, { status: 'success', data: { order_id: 'order-1', status: 'assigned' } }]
    })

    await expect(getDriverDelivery()).resolves.toEqual({ order_id: 'order-1', status: 'assigned' })
  })

  it('updates availability and advances a delivery status', async () => {
    mock.onPut(API_URLS.PROFILE_ME).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer driver-token')
      expect(JSON.parse(config.data)).toEqual({ is_available: true, current_city: 'Shamgarh' })
      return [200, { status: 'success', data: { profile: { is_available: true, current_city: 'Shamgarh' } } }]
    })
    mock.onPatch(API_URLS.DRIVER_DELIVERY_STATUS).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer driver-token')
      expect(JSON.parse(config.data)).toEqual({ status: 'en_route_to_restaurant' })
      return [200, { status: 'success', data: { order_id: 'order-1', status: 'en_route_to_restaurant' } }]
    })

    await expect(updateDriverAvailability({ isAvailable: true, currentCity: 'Shamgarh' })).resolves.toEqual({ profile: { is_available: true, current_city: 'Shamgarh' } })
    await expect(updateDriverDeliveryStatus('en_route_to_restaurant')).resolves.toEqual({ order_id: 'order-1', status: 'en_route_to_restaurant' })
  })
})
