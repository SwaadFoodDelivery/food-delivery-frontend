import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'

import OnboardingView from '@/views/OnboardingView.vue'
import DocumentUploadCard from '@/components/onboarding/DocumentUploadCard.vue'
import PersonalDetailsCard from '@/components/onboarding/PersonalDetailsCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
import * as onboardingService from '@/services/onboardingService'
import { getProfile } from '@/services/profileService'
import { uploadToPresignedUrl } from '@/services/uploadService'
import { ApiError } from '@/services/api'
import { ROUTE_NAMES } from '@/constants/routes'
import { useRouter } from 'vue-router'

jest.mock('@/services/onboardingService')
jest.mock('@/services/profileService')
jest.mock('@/services/uploadService')
jest.mock('@/services/authService')
jest.mock('vue-router', () => ({ useRouter: jest.fn() }))

const draft = {
  onboarding_id: 'application-1', status: 'draft', role: 'driver',
  documents: [{ document_id: 'doc-1', document_type: 'driving_license', upload_status: 'uploaded', s3_key: 'users/driver/application-1/licence', upload_url: 'https://storage.example/licence', method: 'PUT' }]
}
const pending = { onboarding_id: 'application-1', status: 'pending_verification', role: 'driver', documents: [] }
const rejected = { ...pending, status: 'rejected', rejection_reason: 'Upload a clearer driving licence' }

describe('OnboardingView review flow', () => {
  let pinia
  let wrapper
  let replace

  const button = (label) => wrapper.findAll('button').find((item) => item.text() === label)
  const mountView = async () => {
    wrapper = shallowMount(OnboardingView, {
      global: {
        plugins: [pinia],
        stubs: {
          AppButton: false,
          FormAlert: false,
          'v-alert': { template: '<div><slot /></div>' },
          'v-skeleton-loader': true,
          'v-progress-linear': true
        }
      }
    })
    await flushPromises()
  }

  beforeEach(() => {
    jest.resetAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.accessToken = 'owner-token'
    auth.user = { user_id: 'driver-1', role: 'driver', first_time_user: false }
    getProfile.mockResolvedValue({ user_id: 'driver-1', role: 'driver', onboarding_complete: false })
    onboardingService.initOnboarding.mockResolvedValue(draft)
    onboardingService.submitOnboarding.mockResolvedValue(pending)
    replace = jest.fn()
    useRouter.mockReturnValue({ replace })
  })

  afterEach(() => wrapper?.unmount())

  it('shows pending review after submission without Continue or application access', async () => {
    await mountView()
    await button('Submit for verification').trigger('click')
    await flushPromises()

    expect(onboardingService.submitOnboarding).toHaveBeenCalledWith({ onboardingId: 'application-1' })
    expect(wrapper.text()).toContain('Pending review')
    expect(wrapper.text()).toContain('Access will be available after approval')
    expect(button('Continue')).toBeUndefined()
    expect(button('Submit for verification')).toBeUndefined()
    expect(button('Check review status')).toBeDefined()
    expect(useAuthStore().needsOnboarding).toBe(true)
    expect(replace).not.toHaveBeenCalled()
  })

  it('resumes pending review with empty documents after mounting again', async () => {
    onboardingService.initOnboarding.mockResolvedValue(pending)
    await mountView()
    wrapper.unmount()
    await mountView()
    expect(wrapper.text()).toContain('Pending review')
    expect(wrapper.text()).not.toContain('No documents are configured')
    expect(wrapper.findComponent(DocumentUploadCard).exists()).toBe(false)
    expect(button('Continue')).toBeUndefined()
    expect(useOnboardingStore().onboardingId).toBe('application-1')
  })

  it('refreshes review state through Init while the profile remains incomplete', async () => {
    onboardingService.initOnboarding.mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected)
    await mountView()
    await button('Check review status').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain(rejected.rejection_reason)
    expect(button('Start over')).toBeDefined()
    expect(button('Continue')).toBeUndefined()
    expect(onboardingService.initOnboarding).toHaveBeenCalledTimes(2)
  })

  it('only enables Continue after refreshing a profile that confirms approval', async () => {
    onboardingService.initOnboarding.mockResolvedValue(pending)
    await mountView()
    getProfile.mockResolvedValue({ role: 'driver', onboarding_complete: true })
    await button('Check review status').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Your application is approved')
    expect(useAuthStore().needsOnboarding).toBe(false)
    expect(onboardingService.initOnboarding).toHaveBeenCalledTimes(1)
    await button('Continue').trigger('click')
    expect(replace).toHaveBeenCalledWith({ name: ROUTE_NAMES.LANDING })
  })

  it('refreshes approval when Init returns the complete-account 409', async () => {
    onboardingService.initOnboarding.mockRejectedValue(new ApiError({ status: 409, errorCode: 'ONBOARDING_ALREADY_COMPLETED' }))
    getProfile.mockResolvedValueOnce({ onboarding_complete: false }).mockResolvedValueOnce({ onboarding_complete: true })
    await mountView()
    expect(replace).toHaveBeenCalledWith({ name: ROUTE_NAMES.LANDING })
    expect(useAuthStore().isOnboardingComplete).toBe(true)
  })

  it('does not trust a complete-account conflict when the profile still says incomplete', async () => {
    onboardingService.initOnboarding.mockRejectedValue(new ApiError({ status: 409, errorCode: 'ONBOARDING_ALREADY_COMPLETED', message: 'Onboarding already completed' }))
    await mountView()
    expect(replace).not.toHaveBeenCalled()
    expect(button('Continue')).toBeUndefined()
    expect(button('Try again')).toBeDefined()
    expect(useAuthStore().needsOnboarding).toBe(true)
  })

  it('shows rejection feedback with empty documents, then resubmits and resumes the same draft', async () => {
    onboardingService.initOnboarding.mockResolvedValueOnce(rejected).mockResolvedValueOnce(draft)
    onboardingService.resubmitOnboarding.mockResolvedValue({ onboarding_id: 'application-1', status: 'draft' })
    await mountView()
    expect(wrapper.text()).toContain(rejected.rejection_reason)
    expect(wrapper.findComponent(DocumentUploadCard).exists()).toBe(false)
    expect(button('Submit for verification')).toBeUndefined()
    await button('Start over').trigger('click')
    await flushPromises()
    expect(onboardingService.resubmitOnboarding).toHaveBeenCalledWith({ onboardingId: 'application-1' })
    expect(onboardingService.resubmitOnboarding.mock.invocationCallOrder[0]).toBeLessThan(onboardingService.initOnboarding.mock.invocationCallOrder[1])
    expect(useOnboardingStore().onboardingId).toBe('application-1')
    expect(wrapper.findComponent(DocumentUploadCard).exists()).toBe(true)
    await button('Submit for verification').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Pending review')
    expect(useAuthStore().needsOnboarding).toBe(true)
  })

  it('keeps rejection feedback and retry available after failed resubmission', async () => {
    onboardingService.initOnboarding.mockResolvedValue(rejected)
    onboardingService.resubmitOnboarding.mockRejectedValue(new ApiError({ status: 409, errorCode: 'VALIDATION', message: 'Resubmission failed' }))
    await mountView()
    await button('Start over').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain(rejected.rejection_reason)
    expect(wrapper.text()).toContain('Resubmission failed')
    expect(button('Start over').element.disabled).toBe(false)
    expect(onboardingService.initOnboarding).toHaveBeenCalledTimes(1)
  })

  it('does not offer a skip when a draft has no configured documents', async () => {
    onboardingService.initOnboarding.mockResolvedValue({ ...draft, documents: [] })
    await mountView()
    expect(wrapper.text()).toContain('No documents are configured')
    expect(button('Skip for now')).toBeUndefined()
    expect(button('Sign out')).toBeDefined()
    expect(useAuthStore().needsOnboarding).toBe(true)
  })

  it('surfaces storage confirmation errors and keeps submission disabled', async () => {
    onboardingService.initOnboarding.mockResolvedValue({ ...draft, documents: [{ ...draft.documents[0], upload_status: 'pending' }] })
    uploadToPresignedUrl.mockResolvedValue()
    onboardingService.markDocumentUploaded.mockRejectedValue(new ApiError({ status: 412, errorCode: 'ONBOARDING_UPLOADS_INCOMPLETE', message: 'Stored object not found' }))
    await mountView()
    wrapper.findComponent(DocumentUploadCard).vm.$emit('upload', { documentType: 'driving_license', file: new File(['content'], 'licence.jpg') })
    await flushPromises()
    expect(wrapper.text()).toContain('Stored object not found')
    expect(button('Submit for verification').element.disabled).toBe(true)
    expect(useOnboardingStore().uploadedCount).toBe(0)
  })

  it('keeps client details required before submission', async () => {
    getProfile.mockResolvedValue({ role: 'client', onboarding_complete: false })
    await mountView()
    expect(wrapper.findComponent(PersonalDetailsCard).exists()).toBe(true)
    expect(button('Submit for verification').element.disabled).toBe(true)
    wrapper.findComponent(PersonalDetailsCard).vm.$emit('save', { dateOfBirth: '1990-01-01', gender: 'other' })
    await flushPromises()
    expect(button('Submit for verification').element.disabled).toBe(false)
  })

  it('offers sign out while waiting for review', async () => {
    onboardingService.initOnboarding.mockResolvedValue(pending)
    await mountView()
    await button('Sign out').trigger('click')
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(useOnboardingStore().isInitialised).toBe(false)
    expect(replace).toHaveBeenCalledWith({ name: ROUTE_NAMES.LOGIN })
  })
})
