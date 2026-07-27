/**
 * Every backend path the app talks to.
 *
 * Verified against food-delivery-backend @ origin/profile/addressApi:
 *   internal/services/common/api/routes/routes.go
 *   internal/services/users/api/routes/{auth,onboarding,profile}.go
 *
 * Paths are relative to the versioned base (`/api/v1`) — see API_BASE_URL.
 */
export const API_URLS = {
  // Session — the only endpoint that takes X-API-Key.
  INIT_SESSION: '/auth/init-session',

  // Auth (public) — require X-Guest-Token + X-Device-ID.
  AUTH_CHECK_PHONE: '/auth/check-phone',
  AUTH_SEND_EMAIL_OTP: '/auth/send-email-otp',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_REGISTER: '/auth/register',
  AUTH_SEND_OTP: '/auth/send-otp',
  AUTH_VERIFY_OTP: '/auth/verify-otp',

  // Auth (protected) — require Authorization: Bearer.
  AUTH_LOGOUT: '/auth/logout',

  // Profile (protected).
  PROFILE_ME: '/users/me/profile',

  // Onboarding (protected, except the upload callback which is public).
  ONBOARDING_INIT: '/onboarding/role/init',
  ONBOARDING_SUBMIT: '/onboarding/:id/submit',
  ONBOARDING_RESUBMIT: '/onboarding/:id/resubmit',
  ONBOARDING_DOCUMENT_UPLOADED: '/onboarding/documents/uploaded'
}
