import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  AUTH_ERROR_CODES,
  AUTH_STEPS,
  DEFAULT_AUTH_REDIRECT,
  RESEND_COOLDOWN_SECONDS
} from '@/constants/auth'
import {
  checkPhone,
  logout as logoutRequest,
  register,
  sendEmailOtp,
  sendOtp,
  verifyEmail,
  verifyOtp
} from '@/services/authService'
import {
  clearAuthSession,
  getAccessToken,
  getStoredFlow,
  getStoredUser,
  setAccessToken,
  setStoredFlow,
  setStoredUser
} from '@/utils/authSession'
import {
  isValidEmail,
  isValidIndianPhone,
  isValidOtp,
  normalizeIndianPhone
} from '@/utils/validators'

const emptyFlow = () => ({
  step: AUTH_STEPS.PHONE,
  phone: '',
  role: 'client',
  name: '',
  email: '',
  referralCode: '',
  registered: null,
  maskedPhone: '',
  otpExpiresAt: '',
  resendAvailableAt: 0
})

const normalizedMessage = (error, fallback) => error?.message || fallback || 'Something went wrong'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(getAccessToken())
  const user = ref(getStoredUser())
  const flow = ref({ ...emptyFlow(), ...(getStoredFlow() || {}) })
  const loading = ref(false)
  const error = ref('')
  const errorCode = ref('')
  const notice = ref('')

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value?.user_id))
  const needsEmailVerification = computed(() => Boolean(
    isAuthenticated.value &&
    user.value?.email &&
    user.value?.email_verified === false
  ))
  const resendRemainingSeconds = computed(() => {
    const remaining = Math.ceil((Number(flow.value.resendAvailableAt || 0) - Date.now()) / 1000)
    return Math.max(0, remaining)
  })

  const persistFlow = () => setStoredFlow(flow.value)

  const setFlow = (patch) => {
    flow.value = { ...flow.value, ...patch }
    persistFlow()
  }

  const resetMessages = () => {
    error.value = ''
    errorCode.value = ''
    notice.value = ''
  }

  const setFailure = (apiError, fallback) => {
    error.value = normalizedMessage(apiError, fallback)
    errorCode.value = apiError?.code || ''
  }

  const resetFlow = () => {
    flow.value = emptyFlow()
    setStoredFlow(null)
    resetMessages()
  }

  const validatePhoneStep = ({ phone, role }) => {
    if (!isValidIndianPhone(phone)) {
      throw new Error('Enter a valid Indian mobile number')
    }

    if (!role) {
      throw new Error('Choose an account role')
    }
  }

  const beginPhoneCheck = async ({ phone, role }) => {
    resetMessages()
    validatePhoneStep({ phone, role })
    loading.value = true

    try {
      const normalizedPhone = normalizeIndianPhone(phone)
      setFlow({ phone: normalizedPhone, role, registered: null })
      const result = await checkPhone({ phone: normalizedPhone, role })

      if (result.registered) {
        const otp = await sendOtp({ phone: normalizedPhone })
        setFlow({
          step: AUTH_STEPS.OTP,
          registered: true,
          maskedPhone: otp.masked_phone || result.masked_phone || '',
          otpExpiresAt: otp.otp_expires_at || '',
          resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
        })
        notice.value = otp.message || 'OTP sent'
        return AUTH_STEPS.OTP
      }

      setFlow({ step: AUTH_STEPS.REGISTER, registered: false })
      notice.value = result.message || 'Create your account'
      return AUTH_STEPS.REGISTER
    } catch (apiError) {
      if (apiError.code === AUTH_ERROR_CODES.ACCOUNT_SUSPENDED) {
        setFlow({ registered: true })
      }
      setFailure(apiError, 'Unable to continue')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const completeRegistration = async ({ name, email, referralCode }) => {
    resetMessages()

    if (!flow.value.phone || !isValidIndianPhone(flow.value.phone)) {
      throw new Error('Start with phone verification')
    }

    if (!String(name || '').trim()) {
      throw new Error('Enter your name')
    }

    if (!isValidEmail(email)) {
      throw new Error('Enter a valid email')
    }

    loading.value = true

    try {
      setFlow({
        name: String(name || '').trim(),
        email: String(email || '').trim(),
        referralCode: String(referralCode || '').trim()
      })
      const result = await register({
        phone: flow.value.phone,
        name,
        email,
        referralCode,
        role: flow.value.role
      })

      setFlow({
        step: AUTH_STEPS.OTP,
        registered: true,
        maskedPhone: result.masked_phone || '',
        otpExpiresAt: result.otp_expires_at || '',
        resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
      })
      notice.value = result.message || 'OTP sent'
      return result
    } catch (apiError) {
      setFailure(apiError, 'Registration failed')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const resendPhoneOtp = async () => {
    resetMessages()

    if (resendRemainingSeconds.value > 0) {
      return null
    }

    if (!flow.value.phone || !isValidIndianPhone(flow.value.phone)) {
      throw new Error('Start with phone verification')
    }

    loading.value = true

    try {
      const result = await sendOtp({ phone: flow.value.phone })
      setFlow({
        step: AUTH_STEPS.OTP,
        maskedPhone: result.masked_phone || flow.value.maskedPhone,
        otpExpiresAt: result.otp_expires_at || '',
        resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
      })
      notice.value = result.message || 'OTP sent'
      return result
    } catch (apiError) {
      setFailure(apiError, 'Unable to resend OTP')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const completeOtpVerification = async ({ otp }) => {
    resetMessages()

    if (!flow.value.phone || !isValidIndianPhone(flow.value.phone)) {
      throw new Error('Start with phone verification')
    }

    if (!isValidOtp(otp)) {
      throw new Error('Enter the 6 digit OTP')
    }

    loading.value = true

    try {
      const result = await verifyOtp({ phone: flow.value.phone, otp })
      const verifiedUser = result.user

      accessToken.value = result.access_token || ''
      user.value = verifiedUser || null
      setAccessToken(accessToken.value)
      setStoredUser(user.value)
      setFlow({ step: AUTH_STEPS.AUTHENTICATED })
      setStoredFlow(null)
      notice.value = 'Signed in'

      return result
    } catch (apiError) {
      setFailure(apiError, 'OTP verification failed')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const requestEmailOtp = async () => {
    resetMessages()
    loading.value = true

    try {
      const result = await sendEmailOtp()
      notice.value = result.message || 'OTP sent'
      return result
    } catch (apiError) {
      setFailure(apiError, 'Unable to send email OTP')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const completeEmailVerification = async ({ otp }) => {
    resetMessages()

    if (!isValidOtp(otp)) {
      throw new Error('Enter the 6 digit OTP')
    }

    loading.value = true

    try {
      const result = await verifyEmail({ otp })
      user.value = {
        ...user.value,
        email_verified: result.email_verified
      }
      setStoredUser(user.value)
      notice.value = result.message || 'Email verified'
      return result
    } catch (apiError) {
      setFailure(apiError, 'Email verification failed')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    resetMessages()
    loading.value = true

    try {
      if (accessToken.value) {
        await logoutRequest()
      }
    } catch {
      // Local session is cleared even if the network request fails.
    } finally {
      accessToken.value = ''
      user.value = null
      clearAuthSession()
      resetFlow()
      loading.value = false
    }
  }

  const redirectAfterAuth = (route) => {
    const redirect = route?.query?.redirect
    return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : DEFAULT_AUTH_REDIRECT
  }

  return {
    accessToken,
    user,
    flow,
    loading,
    error,
    errorCode,
    notice,
    isAuthenticated,
    needsEmailVerification,
    resendRemainingSeconds,
    beginPhoneCheck,
    completeRegistration,
    resendPhoneOtp,
    completeOtpVerification,
    requestEmailOtp,
    completeEmailVerification,
    logout,
    resetFlow,
    setFlow,
    resetMessages,
    redirectAfterAuth
  }
})
