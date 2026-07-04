import {
  getMe,
  logout as logoutRequest,
  sendEmailOtp,
  verifyEmail
} from '@/services/authService'
import { clearAuthSession } from '@/utils/authSession'
import { isValidOtp } from '@/utils/validators'
import logger from '@/utils/logger'
import { useAuthStore } from '@/stores/auth'

export const fetchMe = async () => {
  const auth = useAuthStore()
  if (!auth.accessToken) return

  try {
    const result = await getMe()
    auth.setUser(result.data?.user || result.data)
    logger.auth('Session restored from token', { userId: auth.user?.user_id })
  } catch {
    logger.auth('Stored token invalid — clearing session')
    auth.resetSession()
    clearAuthSession()
  }
}

export const requestEmailOtp = async () => {
  const result = await sendEmailOtp()
  logger.auth('Email OTP sent')
  return result
}

export const completeEmailVerification = async ({ otp }) => {
  const auth = useAuthStore()

  if (!isValidOtp(otp)) throw new Error('Enter the 6 digit OTP')

  const result = await verifyEmail({ otp })
  auth.setUser({ ...auth.user, email_verified: result.data?.email_verified })
  logger.auth('Email verified successfully', { userId: auth.user?.user_id })
  return result
}

export const logout = async () => {
  const auth = useAuthStore()

  try {
    if (auth.accessToken) {
      await logoutRequest()
    }
  } catch {
    // Local session is cleared even if the network request fails.
  } finally {
    logger.auth('User logged out', { userId: auth.user?.user_id })
    auth.resetSession()
    clearAuthSession()
  }
}
