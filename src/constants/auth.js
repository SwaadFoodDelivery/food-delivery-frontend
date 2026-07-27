/**
 * Auth-flow constants.
 *
 * ROLES mirrors the `user_role` enum (migrations/000002_create_enums.up.sql) and
 * `validRole()` in internal/services/users/validations/auth.go. Four roles, not
 * three — sending anything else fails validation with 400 VALIDATION_ERROR.
 */
export const ROLES = {
  CLIENT: 'client',
  RESTAURANT_OWNER: 'restaurant_owner',
  RESTAURANT_MANAGER: 'restaurant_manager',
  DRIVER: 'driver'
}

export const ROLE_OPTIONS = [
  { value: ROLES.CLIENT, label: 'Customer', hint: 'Order food for delivery' },
  { value: ROLES.DRIVER, label: 'Delivery partner', hint: 'Deliver orders and earn' },
  { value: ROLES.RESTAURANT_OWNER, label: 'Restaurant owner', hint: 'List and manage your restaurant' },
  { value: ROLES.RESTAURANT_MANAGER, label: 'Restaurant manager', hint: 'Run day-to-day restaurant operations' }
]

export const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

/**
 * Roles selectable at sign-up. Excludes restaurant_manager: that account is
 * provisioned by the restaurant owner, not self-registered — the backend
 * rejects it too (validations/auth.go's ValidateRegisterBody, 400
 * VALIDATION_ERROR). Sign-in still offers every role, since an
 * already-provisioned manager account must still be able to log in.
 */
export const SELF_REGISTRATION_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (option) => option.value !== ROLES.RESTAURANT_MANAGER
)

/** users.account_status — 'deleted' exists in the enum but is never returned. */
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
}

/** error_code values from internal/errors/*.go. */
export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMIT_EXCEEDED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  INVALID_PHONE: 'INVALID_PHONE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_REVOKED: 'SESSION_REVOKED',
  PHONE_ALREADY_REGISTERED: 'PHONE_ALREADY_REGISTERED',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  EMAIL_MISSING: 'EMAIL_MISSING',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  GUEST_TOKEN_MISSING: 'GUEST_TOKEN_MISSING',
  GUEST_TOKEN_INVALID: 'GUEST_TOKEN_INVALID',
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  ONBOARDING_ALREADY_COMPLETED: 'ONBOARDING_ALREADY_COMPLETED',
  ONBOARDING_ALREADY_SUBMITTED: 'ONBOARDING_ALREADY_SUBMITTED',
  ONBOARDING_ALREADY_APPROVED: 'ONBOARDING_ALREADY_APPROVED',
  ONBOARDING_NOT_FOUND: 'ONBOARDING_NOT_FOUND',
  ONBOARDING_NOT_REJECTED: 'ONBOARDING_NOT_REJECTED',
  ONBOARDING_CONFIG_MISSING: 'ONBOARDING_CONFIG_MISSING',
  UPLOADS_INCOMPLETE: 'UPLOADS_INCOMPLETE',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND'
}

/** Guest-token failures we recover from by re-running init-session. */
export const GUEST_TOKEN_ERROR_CODES = [
  ERROR_CODES.GUEST_TOKEN_MISSING,
  ERROR_CODES.GUEST_TOKEN_INVALID
]

/** Access-token failures that mean the local session is dead. */
export const SESSION_ERROR_CODES = [
  ERROR_CODES.TOKEN_EXPIRED,
  ERROR_CODES.INVALID_TOKEN,
  ERROR_CODES.SESSION_NOT_FOUND,
  ERROR_CODES.SESSION_REVOKED,
  ERROR_CODES.UNAUTHORIZED
]

/** `^\d{6}$` — pkg/utils/phone.go. */
export const OTP_LENGTH = 6

/** `^[6-9]\d{9}$` after stripping +91 / 91 / 0 — pkg/utils/phone.go. */
export const PHONE_NATIONAL_LENGTH = 10
export const PHONE_COUNTRY_CODE = '+91'

export const NAME_MAX_LENGTH = 100

/** Step machines for the two entry views. */
export const LOGIN_STEPS = {
  IDENTIFY: 'identify',
  OTP: 'otp'
}

export const REGISTER_STEPS = {
  DETAILS: 'details',
  OTP: 'otp'
}

export const AUTH_MESSAGES = {
  PHONE_INVALID: 'Enter a valid 10-digit Indian mobile number.',
  EMAIL_INVALID: 'Enter a valid email address.',
  NAME_REQUIRED: 'Name is required.',
  NAME_TOO_LONG: `Name must be at most ${NAME_MAX_LENGTH} characters.`,
  ROLE_REQUIRED: 'Select how you want to use the app.',
  OTP_INVALID_FORMAT: `Enter the ${OTP_LENGTH}-digit code.`,
  EMAIL_MUST_BE_VERIFIED: 'Verify your email address to enable registration.',
  EMAIL_CHANGED_AFTER_VERIFY: 'You changed the email address — verify the new one to continue.',
  ACCOUNT_NOT_FOUND: 'No account found for this number and role. Create one to continue.',
  ACCOUNT_EXISTS: 'An account already exists for this number and role. Sign in instead.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Please contact support.'
}

/** Backend TTLs, surfaced so the UI can explain what is about to expire. */
export const EMAIL_VERIFICATION_TTL_MINUTES = 30
export const OTP_TTL_MINUTES = 10
export const OTP_RESEND_COOLDOWN_SECONDS = 30
