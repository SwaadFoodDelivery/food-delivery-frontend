import MockAdapter from 'axios-mock-adapter'

import http, { configureApi } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { initOnboarding, markDocumentUploaded, resubmitOnboarding, submitOnboarding } from '@/services/onboardingService'
import { uploadToPresignedUrl } from '@/services/uploadService'

jest.mock('@/utils/device', () => ({ getDeviceId: () => 'device-123' }))
jest.mock('@/utils/logger', () => ({ auth: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() }))

describe('onboardingService', () => {
  let mock
  let expired

  beforeEach(() => {
    mock = new MockAdapter(http)
    expired = jest.fn()
    configureApi({ getAccessToken: () => 'owner-token', getGuestToken: () => 'guest-token', onSessionExpired: expired })
  })

  afterEach(() => mock.restore())

  it('confirms the exact object key using the authenticated owner token', async () => {
    const s3Key = 'users/owner/onboarding/application/identity_proof'
    mock.onPost(API_URLS.ONBOARDING_DOCUMENT_UPLOADED).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      expect(config.headers['X-Guest-Token']).toBeUndefined()
      expect(JSON.parse(config.data)).toEqual({ s3_key: s3Key })
      return [200, { status: 'success', data: { updated: true } }]
    })
    await expect(markDocumentUploaded({ s3Key })).resolves.toEqual({ updated: true })
  })

  it.each([403, 404, 412, 500])('propagates confirmation failure %s', async (status) => {
    mock.onPost(API_URLS.ONBOARDING_DOCUMENT_UPLOADED).reply(status, {
      status: 'error', error_code: 'DOCUMENT_UNAVAILABLE', message: 'Document unavailable'
    })
    await expect(markDocumentUploaded({ s3Key: 'object-key' })).rejects.toMatchObject({ status, message: 'Document unavailable' })
    expect(mock.history.post).toHaveLength(1)
  })

  it('expires the session when authenticated confirmation returns SESSION_NOT_FOUND', async () => {
    mock.onPost(API_URLS.ONBOARDING_DOCUMENT_UPLOADED).reply(401, { status: 'error', error_code: 'SESSION_NOT_FOUND' })
    await expect(markDocumentUploaded({ s3Key: 'object-key' })).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it.each(['pending_verification', 'rejected'])('resumes %s with no documents through Init', async (status) => {
    const application = { onboarding_id: 'application-1', status, documents: [], rejection_reason: 'Replace licence' }
    mock.onPost(API_URLS.ONBOARDING_INIT).reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      expect(JSON.parse(config.data)).toEqual({ role: 'driver', country: 'IN' })
      return [200, { status: 'success', data: application }]
    })
    await expect(initOnboarding({ role: 'driver' })).resolves.toEqual(application)
  })

  it('uses bearer auth for submission and rejected-to-draft resubmission', async () => {
    mock.onPatch('/onboarding/application-1/submit').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      return [200, { status: 'success', data: { status: 'pending_verification' } }]
    })
    mock.onPost('/onboarding/application-1/resubmit').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer owner-token')
      return [200, { status: 'success', data: { status: 'draft' } }]
    })
    await expect(submitOnboarding({ onboardingId: 'application-1' })).resolves.toEqual({ status: 'pending_verification' })
    await expect(resubmitOnboarding({ onboardingId: 'application-1' })).resolves.toEqual({ status: 'draft' })
  })

  it('keeps application credentials off the direct storage PUT', async () => {
    const originalFetch = window.fetch
    window.fetch = jest.fn().mockResolvedValue({ ok: true })
    try {
      const file = new File(['content'], 'identity.pdf')
      await uploadToPresignedUrl({ file, uploadUrl: 'https://storage.example/identity?signature=example' })
      expect(window.fetch).toHaveBeenCalledWith('https://storage.example/identity?signature=example', expect.objectContaining({
        method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' }
      }))
      expect(mock.history.post).toHaveLength(0)
    } finally {
      window.fetch = originalFetch
    }
  })
})
