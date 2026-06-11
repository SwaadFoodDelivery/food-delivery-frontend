export const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || '/api/v1'

export const API_URLS = {
  AUTH_CHECK_PHONE: '/auth/check-phone',
  AUTH_REGISTER: '/auth/register',
  AUTH_SEND_OTP: '/auth/send-otp',
  AUTH_VERIFY_OTP: '/auth/verify-otp',
  AUTH_SEND_EMAIL_OTP: '/auth/send-email-otp',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_LOGOUT: '/auth/logout',
  ME: '/me'
}
