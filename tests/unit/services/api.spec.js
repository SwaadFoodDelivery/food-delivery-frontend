import MockAdapter from 'axios-mock-adapter'

import http, { ApiError, configureApi, request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_HEADERS, HTTP_STATUS } from '@/constants/common'
import { ERROR_CODES } from '@/constants/auth'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))
// CLIENT_API_KEY reads process.env.VUE_APP_CLIENT_API_KEY at module load —
// only set locally via .env (gitignored, absent in CI). Force a fixed value
// so this test is deterministic in both places, rather than silently
// asserting on whatever happens to be in the environment it runs in.
jest.mock('@/constants/common', () => ({
  ...jest.requireActual('@/constants/common'),
  CLIENT_API_KEY: 'test-api-key'
}))

describe('services/api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(http)
    configureApi({
      getGuestToken: () => '',
      getAccessToken: () => '',
      refreshGuestToken: jest.fn().mockResolvedValue(''),
      onSessionExpired: jest.fn()
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('unwraps the success envelope to just the data field', async () => {
    mock.onGet('/health').reply(200, { status: 'success', data: { healthy: true } })
    const data = await request('/health')
    expect(data).toEqual({ healthy: true })
  })

  it('always sends X-Device-ID', async () => {
    mock.onGet('/health').reply((config) => {
      expect(config.headers[HTTP_HEADERS.DEVICE_ID]).toBe('device-123')
      return [200, { status: 'success', data: null }]
    })
    await request('/health')
  })

  describe('auth mode header injection', () => {
    it('AUTH_MODE.API_KEY sends X-API-Key', async () => {
      mock.onPost(API_URLS.INIT_SESSION).reply((config) => {
        expect(config.headers[HTTP_HEADERS.API_KEY]).toBe('test-api-key')
        expect(config.headers[HTTP_HEADERS.GUEST_TOKEN]).toBeUndefined()
        expect(config.headers[HTTP_HEADERS.AUTHORIZATION]).toBeUndefined()
        return [200, { status: 'success', data: {} }]
      })
      await request(API_URLS.INIT_SESSION, { method: 'POST', authMode: AUTH_MODE.API_KEY, body: {} })
    })

    it('AUTH_MODE.GUEST sends X-Guest-Token from the configured hook', async () => {
      configureApi({ getGuestToken: () => 'guest-tok-1' })
      mock.onPost(API_URLS.AUTH_CHECK_PHONE).reply((config) => {
        expect(config.headers[HTTP_HEADERS.GUEST_TOKEN]).toBe('guest-tok-1')
        expect(config.headers[HTTP_HEADERS.API_KEY]).toBeUndefined()
        return [200, { status: 'success', data: { registered: true } }]
      })
      await request(API_URLS.AUTH_CHECK_PHONE, {
        method: 'POST',
        authMode: AUTH_MODE.GUEST,
        body: { phone: '9876543210', role: 'client' }
      })
    })

    it('AUTH_MODE.BEARER sends Authorization from the configured hook', async () => {
      configureApi({ getAccessToken: () => 'access-tok-1' })
      mock.onGet(API_URLS.PROFILE_ME).reply((config) => {
        expect(config.headers[HTTP_HEADERS.AUTHORIZATION]).toBe('Bearer access-tok-1')
        return [200, { status: 'success', data: { role: 'client' } }]
      })
      await request(API_URLS.PROFILE_ME, { authMode: AUTH_MODE.BEARER })
    })

    it('omits the credential header entirely when the hook returns empty', async () => {
      mock.onGet(API_URLS.PROFILE_ME).reply((config) => {
        expect(config.headers[HTTP_HEADERS.AUTHORIZATION]).toBeUndefined()
        return [200, { status: 'success', data: null }]
      })
      await request(API_URLS.PROFILE_ME, { authMode: AUTH_MODE.BEARER })
    })
  })

  describe('error normalisation', () => {
    it('normalises an HTTP-200 envelope with status:"error" (e.g. suspended account)', async () => {
      mock.onPost(API_URLS.AUTH_CHECK_PHONE).reply(200, {
        status: 'error',
        error_code: ERROR_CODES.ACCOUNT_SUSPENDED,
        message: 'account suspended',
        data: { registered: true, account_status: 'suspended' }
      })

      await expect(
        request(API_URLS.AUTH_CHECK_PHONE, { method: 'POST', authMode: AUTH_MODE.GUEST, body: {} })
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 200,
        errorCode: ERROR_CODES.ACCOUNT_SUSPENDED,
        data: { registered: true, account_status: 'suspended' }
      })
    })

    it('normalises a non-2xx error with field-level validation details', async () => {
      mock.onPost(API_URLS.AUTH_REGISTER).reply(400, {
        status: 'error',
        error_code: ERROR_CODES.VALIDATION,
        message: 'validation failed',
        details: [{ field: 'phone', message: 'must be a valid phone number' }]
      })

      try {
        await request(API_URLS.AUTH_REGISTER, { method: 'POST', authMode: AUTH_MODE.GUEST, body: {} })
        throw new Error('expected request() to reject')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect(error.status).toBe(400)
        expect(error.fieldMessages).toEqual(['phone: must be a valid phone number'])
      }
    })

    it('surfaces a network failure (no response at all) as a generic ApiError', async () => {
      mock.onGet('/health').networkError()
      await expect(request('/health')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
    })

    it('exposes isRateLimited for 429 responses', async () => {
      mock.onPost(API_URLS.AUTH_SEND_EMAIL_OTP).reply(429, {
        status: 'error',
        error_code: ERROR_CODES.RATE_LIMITED,
        message: 'too many requests'
      }, { 'retry-after': '30' })

      try {
        await request(API_URLS.AUTH_SEND_EMAIL_OTP, { method: 'POST', authMode: AUTH_MODE.GUEST, body: {} })
        throw new Error('expected request() to reject')
      } catch (error) {
        expect(error.isRateLimited).toBe(true)
        expect(error.retryAfter).toBe(30)
      }
    })
  })

  describe('guest token retry', () => {
    it('mints a fresh guest token once and replays the request on GUEST_TOKEN_INVALID', async () => {
      let attempt = 0
      mock.onPost(API_URLS.AUTH_CHECK_PHONE).reply(() => {
        attempt += 1
        if (attempt === 1) {
          return [401, { status: 'error', error_code: ERROR_CODES.GUEST_TOKEN_INVALID, message: 'bad token' }]
        }
        return [200, { status: 'success', data: { registered: false } }]
      })

      const refreshGuestToken = jest.fn().mockResolvedValue('new-guest-token')
      configureApi({ refreshGuestToken })

      const data = await request(API_URLS.AUTH_CHECK_PHONE, {
        method: 'POST',
        authMode: AUTH_MODE.GUEST,
        body: {}
      })

      expect(refreshGuestToken).toHaveBeenCalledTimes(1)
      expect(attempt).toBe(2)
      expect(data).toEqual({ registered: false })
    })

    it('does not retry a second time if the refreshed token still fails', async () => {
      mock.onPost(API_URLS.AUTH_CHECK_PHONE).reply(401, {
        status: 'error',
        error_code: ERROR_CODES.GUEST_TOKEN_INVALID,
        message: 'bad token'
      })
      const refreshGuestToken = jest.fn().mockResolvedValue('new-guest-token')
      configureApi({ refreshGuestToken })

      await expect(
        request(API_URLS.AUTH_CHECK_PHONE, { method: 'POST', authMode: AUTH_MODE.GUEST, body: {} })
      ).rejects.toMatchObject({ errorCode: ERROR_CODES.GUEST_TOKEN_INVALID })
      expect(refreshGuestToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('session expiry', () => {
    it('calls onSessionExpired for a 401 session error on a bearer call', async () => {
      const onSessionExpired = jest.fn()
      configureApi({ onSessionExpired })
      mock.onGet(API_URLS.PROFILE_ME).reply(HTTP_STATUS.UNAUTHORIZED, {
        status: 'error',
        error_code: ERROR_CODES.SESSION_NOT_FOUND,
        message: 'session not found'
      })

      await expect(request(API_URLS.PROFILE_ME, { authMode: AUTH_MODE.BEARER })).rejects.toBeInstanceOf(ApiError)
      expect(onSessionExpired).toHaveBeenCalledTimes(1)
    })

    it('does not call onSessionExpired for the logout endpoint itself', async () => {
      const onSessionExpired = jest.fn()
      configureApi({ onSessionExpired })
      mock.onPost(API_URLS.AUTH_LOGOUT).reply(HTTP_STATUS.UNAUTHORIZED, {
        status: 'error',
        error_code: ERROR_CODES.SESSION_NOT_FOUND,
        message: 'session not found'
      })

      await expect(
        request(API_URLS.AUTH_LOGOUT, { method: 'POST', authMode: AUTH_MODE.BEARER, body: {} })
      ).rejects.toBeInstanceOf(ApiError)
      expect(onSessionExpired).not.toHaveBeenCalled()
    })
  })
})
