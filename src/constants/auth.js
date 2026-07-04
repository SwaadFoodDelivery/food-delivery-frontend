export const AUTH_ROLES = [
  { label: 'Customer', value: 'client' },
  { label: 'Restaurant owner', value: 'restaurant_owner' },
  { label: 'Driver', value: 'driver' }
]

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'fd.access_token',
  DEVICE_ID: 'fd.device_id'
}

export const AUTH_ERROR_CODES = {
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  RATE_LIMITED: 'RATE_LIMITED',
  PHONE_ALREADY_REGISTERED: 'PHONE_ALREADY_REGISTERED',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED'
}

export const OTP_LENGTH = 6
export const RESEND_COOLDOWN_SECONDS = 30
export const DEFAULT_AUTH_REDIRECT = '/dashboard'
