import MockAdapter from 'axios-mock-adapter'

import http, { configureApi } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { cancelOperationsOrder, getOnboardingReviews, getOperationsOverview, reviewOnboarding } from '@/services/operationsService'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('operationsService', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(http)
    configureApi({ getAccessToken: () => 'manager-token', onSessionExpired: jest.fn() })
  })

  afterEach(() => mock.restore())

  it('loads a filtered operations overview with manager bearer auth', async () => {
    mock.onGet(API_URLS.OPERATIONS_OVERVIEW).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer manager-token')
      expect(config.params).toEqual({ status: 'preparing' })
      return [200, { status: 'success', data: { summary: { active_orders: 1 }, orders: [], drivers: [] } }]
    })

    await expect(getOperationsOverview('preparing')).resolves.toEqual({ summary: { active_orders: 1 }, orders: [], drivers: [] })
  })

  it('cancels an order through the intervention endpoint', async () => {
    mock.onPatch('/operations/orders/order-1/cancel').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer manager-token')
      return [200, { status: 'success', data: { order_id: 'order-1', status: 'cancelled' } }]
    })

    await expect(cancelOperationsOrder('order-1')).resolves.toEqual({ order_id: 'order-1', status: 'cancelled' })
  })

  it('loads onboarding review records and submits a manager decision', async () => {
    mock.onGet(API_URLS.OPERATIONS_ONBOARDING).reply((config) => {
      expect(config.params).toEqual({ status: 'pending_verification' })
      return [200, { status: 'success', data: { items: [{ onboarding_id: 'onboarding-1' }] } }]
    })
    mock.onPatch('/operations/onboarding/onboarding-1').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ status: 'rejected', rejection_reason: 'Upload a clearer license' })
      return [200, { status: 'success', data: { onboarding_id: 'onboarding-1', status: 'rejected' } }]
    })

    await expect(getOnboardingReviews('pending_verification')).resolves.toEqual({ items: [{ onboarding_id: 'onboarding-1' }] })
    await expect(reviewOnboarding('onboarding-1', 'rejected', 'Upload a clearer license')).resolves.toEqual({ onboarding_id: 'onboarding-1', status: 'rejected' })
  })
})
