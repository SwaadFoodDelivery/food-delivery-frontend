import { createPinia, setActivePinia } from 'pinia'

import { useOnboardingStore } from '@/stores/onboarding'
import { useAuthStore } from '@/stores/auth'
import * as authService from '@/services/authService'
import * as onboardingService from '@/services/onboardingService'
import { uploadToPresignedUrl } from '@/services/uploadService'
import { initSession } from '@/services/sessionService'
import { ONBOARDING_STATUS, UPLOAD_STATUS } from '@/constants/onboarding'
import { ROLES } from '@/constants/auth'

jest.mock('@/services/authService')
jest.mock('@/services/onboardingService')
jest.mock('@/services/uploadService')
jest.mock('@/services/sessionService')

const initPayload = {
  onboarding_id: 'onboarding-1',
  status: ONBOARDING_STATUS.DRAFT,
  role: ROLES.DRIVER,
  documents: [
    {
      document_id: 'doc-1',
      document_type: 'driving_license',
      s3_key: 'users/u1/onboarding/o1/driving_license',
      upload_url: 'https://s3.example.com/driving_license',
      method: 'PUT',
      upload_status: UPLOAD_STATUS.PENDING
    },
    {
      document_id: 'doc-2',
      document_type: 'vehicle_registration',
      s3_key: 'users/u1/onboarding/o1/vehicle_registration',
      upload_url: 'https://s3.example.com/vehicle_registration',
      method: 'PUT',
      upload_status: UPLOAD_STATUS.PENDING
    }
  ]
}

async function signInAsDriver() {
  const auth = useAuthStore()
  initSession.mockResolvedValue({ guest_token: 'guest-1' })
  authService.verifyOtp.mockResolvedValue({
    access_token: 'tok',
    user: { user_id: 'u1', role: ROLES.DRIVER, first_time_user: true }
  })
  await auth.verifyOtp({ phone: '9876543210', role: ROLES.DRIVER, otp: '123456' })
  return auth
}

describe('onboarding store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    jest.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('start() initializes onboarding for the authenticated role and stores the documents', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)

    const store = useOnboardingStore()
    await store.start()

    expect(onboardingService.initOnboarding).toHaveBeenCalledWith({ role: ROLES.DRIVER })
    expect(store.onboardingId).toBe('onboarding-1')
    expect(store.documents).toHaveLength(2)
    expect(store.isInitialised).toBe(true)
    expect(store.allDocumentsUploaded).toBe(false)
    expect(store.progressPercent).toBe(0)
  })

  it('uploadDocument uploads to the presigned URL, reports it, and flips that document to uploaded', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    uploadToPresignedUrl.mockResolvedValue()
    onboardingService.markDocumentUploaded.mockResolvedValue({ updated: true })

    const store = useOnboardingStore()
    await store.start()

    const file = new File(['content'], 'license.jpg')
    await store.uploadDocument({ documentType: 'driving_license', file })

    expect(uploadToPresignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ file, uploadUrl: initPayload.documents[0].upload_url, method: 'PUT' })
    )
    expect(onboardingService.markDocumentUploaded).toHaveBeenCalledWith({
      s3Key: initPayload.documents[0].s3_key
    })
    const updated = store.documents.find((d) => d.document_type === 'driving_license')
    expect(updated.upload_status).toBe(UPLOAD_STATUS.UPLOADED)
    expect(store.uploadedCount).toBe(1)
    expect(store.allDocumentsUploaded).toBe(false) // second doc still pending
    expect(store.progressPercent).toBe(50)
  })

  it('allDocumentsUploaded is true only once every document is uploaded', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    uploadToPresignedUrl.mockResolvedValue()
    onboardingService.markDocumentUploaded.mockResolvedValue({ updated: true })

    const store = useOnboardingStore()
    await store.start()
    await store.uploadDocument({ documentType: 'driving_license', file: new File([''], 'a.jpg') })
    await store.uploadDocument({ documentType: 'vehicle_registration', file: new File([''], 'b.jpg') })

    expect(store.allDocumentsUploaded).toBe(true)
    expect(store.progressPercent).toBe(100)
  })

  it('uploadDocument clears the uploading flag even when the S3 PUT fails', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    uploadToPresignedUrl.mockRejectedValue(new Error('network error'))

    const store = useOnboardingStore()
    await store.start()

    await expect(
      store.uploadDocument({ documentType: 'driving_license', file: new File([''], 'a.jpg') })
    ).rejects.toThrow('network error')

    expect(store.uploading.driving_license).toBe(false)
    expect(onboardingService.markDocumentUploaded).not.toHaveBeenCalled()
  })

  it('submit() records the returned status and marks the auth store onboarding-complete', async () => {
    const auth = await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    onboardingService.submitOnboarding.mockResolvedValue({
      onboarding_id: 'onboarding-1',
      status: ONBOARDING_STATUS.PENDING_VERIFICATION,
      message: 'Onboarding submitted and pending verification'
    })

    const store = useOnboardingStore()
    await store.start()
    await store.submit()

    expect(store.isSubmitted).toBe(true)
    expect(auth.isOnboardingComplete).toBe(true)
    expect(auth.needsOnboarding).toBe(false)
  })

  it('resubmit() moves status back to draft', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    onboardingService.resubmitOnboarding.mockResolvedValue({
      onboarding_id: 'onboarding-1',
      status: ONBOARDING_STATUS.DRAFT,
      message: 'Onboarding moved to draft'
    })

    const store = useOnboardingStore()
    await store.start()
    store.status = ONBOARDING_STATUS.REJECTED
    expect(store.isRejected).toBe(true)

    await store.resubmit()
    expect(store.status).toBe(ONBOARDING_STATUS.DRAFT)
    expect(store.isRejected).toBe(false)
  })

  it('reset() clears all onboarding state', async () => {
    await signInAsDriver()
    onboardingService.initOnboarding.mockResolvedValue(initPayload)
    const store = useOnboardingStore()
    await store.start()

    store.reset()

    expect(store.onboardingId).toBe('')
    expect(store.documents).toEqual([])
    expect(store.isInitialised).toBe(false)
  })
})
