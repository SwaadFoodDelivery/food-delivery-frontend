import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '@/stores/auth'
import * as authService from '@/services/authService'
import { initSession } from '@/services/sessionService'
import { getProfile } from '@/services/profileService'
import { ApiError } from '@/services/api'
import { ROLES } from '@/constants/auth'
import { STORAGE_KEYS } from '@/constants/common'

jest.mock('@/services/authService')
jest.mock('@/services/sessionService')
jest.mock('@/services/profileService')

const verifiedClient = {
  user_id: 'user-1',
  name: 'Rishabh Jain',
  role: ROLES.CLIENT,
  phone: '7909338983',
  email: 'rishabh@swaad.test',
  phone_verified: true,
  email_verified: true,
  account_status: 'active',
  first_time_user: true
}

function verifyOtpResult(overrides = {}) {
  return {
    access_token: 'access-tok-1',
    token_type: 'Bearer',
    expires_in: 3600,
    user: { ...verifiedClient, ...overrides }
  }
}

describe('auth store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    jest.resetAllMocks()
    initSession.mockResolvedValue({ guest_token: 'guest-1' })
    setActivePinia(createPinia())
  })

  it('is not authenticated until a session is set', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('verifyOtp sets the session and persists the token/user to sessionStorage, not localStorage', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    const store = useAuthStore()

    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe(ROLES.CLIENT)
    expect(window.sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toContain('access-tok-1')
    expect(window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
  })

  it('isFirstTimeUser mirrors the backend flag from verify-otp', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ first_time_user: true }))
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })
    expect(store.isFirstTimeUser).toBe(true)

    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ first_time_user: false }))
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })
    expect(store.isFirstTimeUser).toBe(false)
  })

  it.each([true, false])('requires approval regardless of first_time_user=%s', async (firstTime) => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ first_time_user: firstTime }))
    const store = useAuthStore()
    expect(store.needsOnboarding).toBe(false) // not authenticated yet

    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })
    expect(store.needsOnboarding).toBe(true)

    getProfile.mockResolvedValue({ onboarding_complete: true })
    await store.fetchProfile()
    expect(store.needsOnboarding).toBe(false)
  })

  it('ignores legacy local submission markers, even after signing in again', async () => {
    window.localStorage.setItem(STORAGE_KEYS.ONBOARDING_SUBMITTED, JSON.stringify({ 'user-1': true }))
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ first_time_user: false }))
    getProfile.mockResolvedValue({ onboarding_complete: false })
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    expect(store.isOnboardingComplete).toBe(false)
    await store.fetchProfile()
    expect(store.needsOnboarding).toBe(true)
  })

  it('fetchProfile onboarding_complete:true wins even without the local marker', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    getProfile.mockResolvedValue({ role: ROLES.CLIENT, onboarding_complete: true })
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    await store.fetchProfile()
    expect(store.isOnboardingComplete).toBe(true)
  })

  it('isPendingManualVerification is true for an unapproved driver', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ role: ROLES.DRIVER }))
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.DRIVER, otp: '123456' })
    expect(store.isPendingManualVerification).toBe(true)
  })

  it('client also requires review until approved', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ role: ROLES.CLIENT }))
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })
    expect(store.isPendingManualVerification).toBe(true)
    getProfile.mockResolvedValue({ onboarding_complete: true })
    await store.fetchProfile()
    expect(store.isPendingManualVerification).toBe(false)
  })

  it('approved drivers no longer display pending verification', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ role: ROLES.DRIVER }))
    getProfile.mockResolvedValue({ onboarding_complete: true })
    const store = useAuthStore()
    await store.verifyOtp({})
    await store.fetchProfile()
    expect(store.isPendingManualVerification).toBe(false)
  })

  it('a failed profile load keeps returning applicants gated', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult({ first_time_user: false }))
    getProfile.mockRejectedValue(new Error('offline'))
    const store = useAuthStore()
    await store.verifyOtp({})
    await expect(store.fetchProfile()).rejects.toThrow('offline')
    expect(store.needsOnboarding).toBe(true)
  })

  it('a suspended account never reads as pending-manual-verification', async () => {
    authService.verifyOtp.mockResolvedValue(
      verifyOtpResult({ role: ROLES.DRIVER, account_status: 'suspended' })
    )
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.DRIVER, otp: '123456' })
    expect(store.isAccountSuspended).toBe(true)
    expect(store.isPendingManualVerification).toBe(false)
  })

  it('isEmailVerifiedFor matches only the address confirmed on this guest session', async () => {
    initSession.mockResolvedValue({ guest_token: 'guest-1' })
    authService.verifyEmail.mockResolvedValue({ email_verified: true, masked_email: 'XXXX@x.com' })
    const store = useAuthStore()

    await store.verifyEmail({ email: 'User@Example.com', otp: '123456' })

    expect(store.isEmailVerifiedFor('user@example.com')).toBe(true)
    expect(store.isEmailVerifiedFor('someone-else@example.com')).toBe(false)
  })

  it('verifyOtp clears any pending email verification marker (account now exists)', async () => {
    initSession.mockResolvedValue({ guest_token: 'guest-1' })
    authService.verifyEmail.mockResolvedValue({ email_verified: true, masked_email: 'XXXX@x.com' })
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    const store = useAuthStore()

    await store.verifyEmail({ email: 'user@example.com', otp: '123456' })
    expect(store.isEmailVerifiedFor('user@example.com')).toBe(true)

    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })
    expect(store.isEmailVerifiedFor('user@example.com')).toBe(false)
  })

  it('checkPhone/sendLoginOtp/register/sendEmailOtp all ensure a guest session first', async () => {
    initSession.mockResolvedValue({ guest_token: 'guest-1' })
    authService.checkPhone.mockResolvedValue({ registered: true })
    const store = useAuthStore()

    await store.checkPhone({ phone: '7909338983', role: ROLES.CLIENT })

    expect(initSession).toHaveBeenCalledTimes(1)
    expect(authService.checkPhone).toHaveBeenCalledWith({ phone: '7909338983', role: ROLES.CLIENT })
  })

  it('a guest session already in memory is reused, not re-fetched', async () => {
    initSession.mockResolvedValue({ guest_token: 'guest-1' })
    authService.checkPhone.mockResolvedValue({ registered: true })
    const store = useAuthStore()

    await store.checkPhone({ phone: '7909338983', role: ROLES.CLIENT })
    await store.checkPhone({ phone: '7909338983', role: ROLES.CLIENT })

    expect(initSession).toHaveBeenCalledTimes(1)
  })

  it('signOut clears the session even when the logout request fails', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    authService.logout.mockRejectedValue(new ApiError({ status: 401, errorCode: 'SESSION_NOT_FOUND' }))
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    await store.signOut()

    expect(store.isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
  })

  it('signOut re-throws a non-ApiError failure instead of silently clearing', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    authService.logout.mockRejectedValue(new TypeError('boom'))
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    await expect(store.signOut()).rejects.toThrow('boom')
  })

  it('consumeAlreadyCompleted only recognises its specific error code', async () => {
    const store = useAuthStore()
    await expect(store.consumeAlreadyCompleted(new ApiError({ errorCode: 'SOMETHING_ELSE' }))).resolves.toBe(false)
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('consumeAlreadyCompleted refreshes the profile to confirm approval', async () => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    const store = useAuthStore()
    await store.verifyOtp({ phone: '7909338983', role: ROLES.CLIENT, otp: '123456' })

    getProfile.mockResolvedValueOnce({ onboarding_complete: false })
    await store.fetchProfile()
    getProfile.mockResolvedValueOnce({ onboarding_complete: true })
    await expect(store.consumeAlreadyCompleted(new ApiError({ errorCode: 'ONBOARDING_ALREADY_COMPLETED' }))).resolves.toBe(true)

    expect(store.isOnboardingComplete).toBe(true)
    expect(getProfile).toHaveBeenCalledTimes(2)
    expect(window.localStorage.getItem(STORAGE_KEYS.ONBOARDING_SUBMITTED)).toBeNull()
  })

  it.each(['unapproved', 'offline'])('a conflict cannot grant approval when the profile is %s', async (state) => {
    authService.verifyOtp.mockResolvedValue(verifyOtpResult())
    const store = useAuthStore()
    await store.verifyOtp({})
    if (state === 'offline') getProfile.mockRejectedValue(new Error('offline'))
    else getProfile.mockResolvedValue({ onboarding_complete: false })

    await expect(store.consumeAlreadyCompleted(new ApiError({ errorCode: 'ONBOARDING_ALREADY_COMPLETED' }))).resolves.toBe(false)
    expect(store.needsOnboarding).toBe(true)
  })
})
