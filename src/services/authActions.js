import {
  AUTH_ERROR_CODES,
  AUTH_STEPS,
  RESEND_COOLDOWN_SECONDS
} from '@/constants/auth'
import {
  checkPhone,
  getMe,
  logout as logoutRequest,
  register,
  sendEmailOtp,
  sendOtp,
  verifyEmail,
  verifyOtp
} from '@/services/authService'
import {
  clearAuthSession,
  setAccessToken,
  setStoredFlow
} from '@/utils/authSession'
import {
  isValidEmail,
  isValidIndianPhone,
  isValidOtp,
  normalizeIndianPhone
} from '@/utils/validators'
import { normalizedMessage } from '@/utils/authHelpers'
import logger from '@/utils/logger'
import { useAuthStore } from '@/stores/auth'

export const fetchMe = async () => {
  const auth = useAuthStore()
  if (!auth.accessToken) return

  try {
    const result = await getMe()
    auth.setUser(result.user || result)
    logger.auth('Session restored from token', { userId: auth.user?.user_id })
  } catch {
    logger.auth('Stored token invalid — clearing session')
    auth.setAccessToken('')
    auth.setUser(null)
    clearAuthSession()
  }
}

export const beginPhoneCheck = async ({ phone, role }) => {
  const auth = useAuthStore()

  if (!isValidIndianPhone(phone)) throw new Error('Enter a valid Indian mobile number')
  if (!role) throw new Error('Choose an account role')

  auth.resetMessages()
  auth.setLoading(true)

  try {
    const normalizedPhone = normalizeIndianPhone(phone)
    auth.setFlow({ phone: normalizedPhone, role, registered: null })
    const result = await checkPhone({ phone: normalizedPhone, role })

    if (result.registered) {
      const otp = await sendOtp({ phone: normalizedPhone })
      auth.setFlow({
        step: AUTH_STEPS.OTP,
        registered: true,
        maskedPhone: otp.masked_phone || result.masked_phone || '',
        otpExpiresAt: otp.otp_expires_at || '',
        resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
      })
      auth.setNotice(otp.message || 'OTP sent')
      logger.auth('OTP sent to existing user', { maskedPhone: otp.masked_phone || result.masked_phone })
      return AUTH_STEPS.OTP
    }

    auth.setFlow({ step: AUTH_STEPS.REGISTER, registered: false })
    auth.setNotice(result.message || 'Create your account')
    logger.auth('Phone not registered — redirecting to registration')
    return AUTH_STEPS.REGISTER
  } catch (apiError) {
    if (apiError.code === AUTH_ERROR_CODES.ACCOUNT_SUSPENDED) {
      logger.warn('Login attempt by suspended account', { code: apiError.code })
      auth.setFlow({ registered: true })
    } else {
      logger.error('Phone check failed', { code: apiError.code, message: apiError.message })
    }
    auth.setError(normalizedMessage(apiError, 'Unable to continue'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const completeRegistration = async ({ name, email, referralCode }) => {
  const auth = useAuthStore()

  if (!auth.flow.phone || !isValidIndianPhone(auth.flow.phone)) throw new Error('Start with phone verification')
  if (!String(name || '').trim()) throw new Error('Enter your name')
  if (!isValidEmail(email)) throw new Error('Enter a valid email')

  auth.resetMessages()
  auth.setLoading(true)

  try {
    auth.setFlow({
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      referralCode: String(referralCode || '').trim()
    })
    const result = await register({
      phone: auth.flow.phone,
      name,
      email,
      referralCode,
      role: auth.flow.role
    })

    auth.setFlow({
      step: AUTH_STEPS.OTP,
      registered: true,
      maskedPhone: result.masked_phone || '',
      otpExpiresAt: result.otp_expires_at || '',
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    })
    auth.setNotice(result.message || 'OTP sent')
    logger.auth('Registration successful — OTP sent', { maskedPhone: result.masked_phone })
    return result
  } catch (apiError) {
    logger.error('Registration failed', { code: apiError.code, message: apiError.message })
    auth.setError(normalizedMessage(apiError, 'Registration failed'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const resendPhoneOtp = async () => {
  const auth = useAuthStore()

  if (auth.resendRemainingSeconds > 0) return null
  if (!auth.flow.phone || !isValidIndianPhone(auth.flow.phone)) throw new Error('Start with phone verification')

  auth.resetMessages()
  auth.setLoading(true)

  try {
    const result = await sendOtp({ phone: auth.flow.phone })
    auth.setFlow({
      step: AUTH_STEPS.OTP,
      maskedPhone: result.masked_phone || auth.flow.maskedPhone,
      otpExpiresAt: result.otp_expires_at || '',
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    })
    auth.setNotice(result.message || 'OTP sent')
    logger.auth('OTP resent', { maskedPhone: result.masked_phone })
    return result
  } catch (apiError) {
    logger.error('OTP resend failed', { code: apiError.code, message: apiError.message })
    auth.setError(normalizedMessage(apiError, 'Unable to resend OTP'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const completeOtpVerification = async ({ otp }) => {
  const auth = useAuthStore()

  if (!auth.flow.phone || !isValidIndianPhone(auth.flow.phone)) throw new Error('Start with phone verification')
  if (!isValidOtp(otp)) throw new Error('Enter the 6 digit OTP')

  auth.resetMessages()
  auth.setLoading(true)

  try {
    const result = await verifyOtp({ phone: auth.flow.phone, otp })
    const verifiedUser = result.user

    auth.setAccessToken(result.access_token || '')
    auth.setUser(verifiedUser || null)
    setAccessToken(result.access_token || '')
    auth.setFlow({ step: AUTH_STEPS.AUTHENTICATED })
    setStoredFlow(null)
    auth.setNotice('Signed in')
    logger.auth('User signed in successfully', { userId: verifiedUser?.user_id, role: verifiedUser?.role })
    return result
  } catch (apiError) {
    logger.error('OTP verification failed', { code: apiError.code, message: apiError.message })
    auth.setError(normalizedMessage(apiError, 'OTP verification failed'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const requestEmailOtp = async () => {
  const auth = useAuthStore()

  auth.resetMessages()
  auth.setLoading(true)

  try {
    const result = await sendEmailOtp()
    auth.setNotice(result.message || 'OTP sent')
    logger.auth('Email OTP sent')
    return result
  } catch (apiError) {
    logger.error('Email OTP send failed', { code: apiError.code, message: apiError.message })
    auth.setError(normalizedMessage(apiError, 'Unable to send email OTP'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const completeEmailVerification = async ({ otp }) => {
  const auth = useAuthStore()

  if (!isValidOtp(otp)) throw new Error('Enter the 6 digit OTP')

  auth.resetMessages()
  auth.setLoading(true)

  try {
    const result = await verifyEmail({ otp })
    auth.setUser({ ...auth.user, email_verified: result.email_verified })
    auth.setNotice(result.message || 'Email verified')
    logger.auth('Email verified successfully', { userId: auth.user?.user_id })
    return result
  } catch (apiError) {
    logger.error('Email verification failed', { code: apiError.code, message: apiError.message })
    auth.setError(normalizedMessage(apiError, 'Email verification failed'))
    throw apiError
  } finally {
    auth.setLoading(false)
  }
}

export const logout = async () => {
  const auth = useAuthStore()

  auth.resetMessages()
  auth.setLoading(true)

  try {
    if (auth.accessToken) {
      await logoutRequest()
    }
  } catch {
    // Local session is cleared even if the network request fails.
  } finally {
    logger.auth('User logged out', { userId: auth.user?.user_id })
    auth.setAccessToken('')
    auth.setUser(null)
    clearAuthSession()
    auth.resetFlow()
    auth.setLoading(false)
  }
}
