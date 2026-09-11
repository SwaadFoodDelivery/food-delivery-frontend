/**
 * Auth store — guest session, credentials, and the two routing guards
 * (email-verified, first-time-user).
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { ApiError, configureApi } from '@/services/api'
import * as authService from '@/services/authService'
import { initSession } from '@/services/sessionService'
import { getProfile } from '@/services/profileService'
import { ACCOUNT_STATUS, ERROR_CODES } from '@/constants/auth'
import { STORAGE_KEYS } from '@/constants/common'
import {
  readSessionValue,
  readValue,
  removeSessionValue,
  removeValue,
  writeSessionValue,
  writeValue
} from '@/utils/storage'
import { normalizeEmail } from '@/utils/validators'
import logger from '@/utils/logger'

export const useAuthStore = defineStore('auth', () => {
  // ─── Guest session ─────────────────────────────────────────────────────────
  const guestToken = ref(readValue(STORAGE_KEYS.GUEST_TOKEN, '') || '')
  /** De-duplicates concurrent init-session calls into one in-flight request. */
  const guestSessionPromise = ref(null)

  // ─── Authenticated session ─────────────────────────────────────────────────
  // sessionStorage, not localStorage: cleared when the tab/browser closes.
  // Access tokens expire in 60 minutes server-side regardless (no refresh
  // endpoint on this backend), so this costs nothing beyond the sign-in the
  // user would need anyway — it just shortens how long a stolen disk keeps a
  // live session.
  const accessToken = ref(readSessionValue(STORAGE_KEYS.ACCESS_TOKEN, '') || '')
  /** The `user` object from verify-otp — carries `first_time_user`. */
  const user = ref(readSessionValue(STORAGE_KEYS.USER, null))
  /** The full `GET /users/me/profile` payload, loaded lazily. */
  const profile = ref(null)

  // ─── Pre-registration email verification ───────────────────────────────────
  /** The address most recently confirmed by POST /auth/verify-email. */
  const verifiedEmail = ref('')

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const role = computed(() => profile.value?.role || user.value?.role || '')
  const userId = computed(() => profile.value?.user_id || user.value?.user_id || '')
  const displayName = computed(() => profile.value?.name || user.value?.name || '')

  /**
   * The backend's own first-time signal, from verify-otp. business/auth.go sets
   * it to `CountVerifiedOTPs(user) == 1`, so it is true exactly once — on the
   * first OTP a given account ever verifies.
   */
  const isFirstTimeUser = computed(() => user.value?.first_time_user === true)

  /** Only server-confirmed approval completes onboarding; legacy submit markers do not. */
  const isOnboardingComplete = computed(() => profile.value?.onboarding_complete === true)

  /**
   * Every signed-in user needs approval, including returning applicants.
   * Missing/failed profile loads keep the gate closed.
   */
  const needsOnboarding = computed(
    () => isAuthenticated.value && !isOnboardingComplete.value
  )

  const isAccountSuspended = computed(
    () => (profile.value?.account_status || user.value?.account_status) === ACCOUNT_STATUS.SUSPENDED
  )

  /**
   * All roles require approval. Suspension takes precedence in account copy.
   */
  const isPendingManualVerification = computed(
    () => needsOnboarding.value && !isAccountSuspended.value
  )

  /**
   * The register submit gate: the email currently in the form must be the one
   * that was verified on this guest session.
   * @param {string} email
   * @returns {boolean}
   */
  function isEmailVerifiedFor(email) {
    const candidate = normalizeEmail(email)
    return Boolean(candidate) && candidate === verifiedEmail.value
  }

  // ─── Guest session ─────────────────────────────────────────────────────────

  function setGuestToken(token) {
    guestToken.value = token || ''
    if (token) writeValue(STORAGE_KEYS.GUEST_TOKEN, token)
    else removeValue(STORAGE_KEYS.GUEST_TOKEN)
  }

  /**
   * Mints a fresh guest token. Concurrent callers share one request.
   * @returns {Promise<string>}
   */
  async function refreshGuestSession() {
    if (guestSessionPromise.value) return guestSessionPromise.value

    guestSessionPromise.value = (async () => {
      try {
        const data = await initSession()
        setGuestToken(data?.guest_token || '')
        // A new guest session invalidates any email verified against the old one.
        verifiedEmail.value = ''
        return guestToken.value
      } finally {
        guestSessionPromise.value = null
      }
    })()

    return guestSessionPromise.value
  }

  /**
   * Guarantees a guest token exists before a public auth call.
   * @returns {Promise<string>}
   */
  async function ensureGuestSession() {
    if (guestToken.value) return guestToken.value
    return refreshGuestSession()
  }

  // ─── Authenticated session ─────────────────────────────────────────────────

  function setSession({ access_token: token, user: verifiedUser }) {
    accessToken.value = token || ''
    user.value = verifiedUser || null
    profile.value = null
    writeSessionValue(STORAGE_KEYS.ACCESS_TOKEN, accessToken.value)
    writeSessionValue(STORAGE_KEYS.USER, user.value)
    logger.auth('Session established', { userId: user.value?.user_id, role: user.value?.role })
  }

  function clearSession() {
    accessToken.value = ''
    user.value = null
    profile.value = null
    removeSessionValue(STORAGE_KEYS.ACCESS_TOKEN)
    removeSessionValue(STORAGE_KEYS.USER)
  }

  // ─── Flows ─────────────────────────────────────────────────────────────────

  /**
   * @param {{phone: string, role: string}} params
   * @returns {Promise<object>} the check-phone payload
   */
  async function checkPhone(params) {
    await ensureGuestSession()
    return authService.checkPhone(params)
  }

  async function sendLoginOtp(params) {
    await ensureGuestSession()
    return authService.sendOtp(params)
  }

  async function sendEmailOtp({ email }) {
    await ensureGuestSession()
    // Re-sending invalidates the previous confirmation for this address.
    if (isEmailVerifiedFor(email)) verifiedEmail.value = ''
    return authService.sendEmailOtp({ email })
  }

  /**
   * Confirms the email OTP and, on success, unlocks the register submit.
   * @returns {Promise<object>}
   */
  async function verifyEmail({ email, otp }) {
    await ensureGuestSession()
    const data = await authService.verifyEmail({ email, otp })
    if (data?.email_verified) verifiedEmail.value = normalizeEmail(email)
    return data
  }

  /**
   * Creates the account. Requires a verification of `email` on this guest
   * session — the backend answers 403 EMAIL_NOT_VERIFIED otherwise.
   * @returns {Promise<object>} the phone-OTP payload
   */
  async function register(params) {
    await ensureGuestSession()
    return authService.register(params)
  }

  /**
   * Verifies the phone OTP and opens the session. Ends both login and register.
   * @returns {Promise<object>} the verify-otp payload, including `user`
   */
  async function verifyOtp(params) {
    await ensureGuestSession()
    const data = await authService.verifyOtp(params)
    setSession(data)
    // The account exists now, so the guest-session email marker is spent.
    verifiedEmail.value = ''
    return data
  }

  /**
   * Loads `GET /users/me/profile`. Never cached — it backs the onboarding gate.
   * @param {{force?: boolean}} [options]
   * @returns {Promise<object|null>}
   */
  async function fetchProfile({ force = false } = {}) {
    if (!isAuthenticated.value) return null
    if (profile.value && !force) return profile.value
    profile.value = await getProfile()
    return profile.value
  }

  /** Revokes the session server-side, then clears it locally regardless. */
  async function signOut() {
    const signedOutUserId = userId.value
    if (isAuthenticated.value) {
      try {
        await authService.logout()
      } catch (error) {
        // A dead session is already logged out; anything else is not worth
        // blocking the user on.
        if (!(error instanceof ApiError)) throw error
      }
    }
    clearSession()
    logger.auth('User signed out', { userId: signedOutUserId })
  }

  // ─── Wiring ────────────────────────────────────────────────────────────────

  /**
   * Hands the api layer its credential providers. Called once from main.js,
   * before the router mounts.
   */
  function registerApiHooks() {
    configureApi({
      getGuestToken: () => guestToken.value,
      getAccessToken: () => accessToken.value,
      refreshGuestToken: () => refreshGuestSession(),
      onSessionExpired: () => clearSession()
    })
  }

  /**
   * Refreshes approval after an already-completed response. The profile remains
   * authoritative even when a conflict response and a review race each other.
   * @param {ApiError} error
   * @returns {Promise<boolean>} whether approval was confirmed
   */
  async function consumeAlreadyCompleted(error) {
    if (error?.errorCode !== ERROR_CODES.ONBOARDING_ALREADY_COMPLETED) return false
    try {
      await fetchProfile({ force: true })
      return isOnboardingComplete.value
    } catch {
      return false
    }
  }

  return {
    // state
    guestToken,
    accessToken,
    user,
    profile,
    verifiedEmail,
    // getters
    isAuthenticated,
    role,
    userId,
    displayName,
    isFirstTimeUser,
    isOnboardingComplete,
    needsOnboarding,
    isAccountSuspended,
    isPendingManualVerification,
    // actions
    isEmailVerifiedFor,
    ensureGuestSession,
    refreshGuestSession,
    checkPhone,
    sendLoginOtp,
    sendEmailOtp,
    verifyEmail,
    register,
    verifyOtp,
    fetchProfile,
    signOut,
    clearSession,
    consumeAlreadyCompleted,
    registerApiHooks
  }
})
