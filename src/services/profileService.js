/**
 * Profile endpoints.
 * internal/services/users/api/{routes,handler}/profile.go
 */
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

/**
 * GET /users/me/profile — Bearer.
 *
 * Core user fields plus a role-specific `profile` object:
 *   client → { date_of_birth, gender }
 *   driver → { is_available, current_city }
 *   restaurant_owner / restaurant_manager → absent
 *
 * `onboarding_complete` is the backend's durable first-time-user signal and the
 * same flag RequireOnboardingAccess gates on.
 *
 * @returns {Promise<{
 *   user_id: string, name: string, phone: string, email?: string,
 *   email_verified: boolean, phone_verified: boolean, role: string,
 *   account_status: string, onboarding_complete: boolean,
 *   profile_image_s3_key?: string, profile?: object,
 *   created_at: string, updated_at: string
 * }>}
 */
export async function getProfile() {
  return request(API_URLS.PROFILE_ME, {
    method: HTTP_METHODS.GET,
    authMode: AUTH_MODE.BEARER
  })
}

/**
 * PUT /users/me/profile — Bearer.
 *
 * `date_of_birth`/`gender` are only persisted when the authenticated user's
 * role is client (business/profile.go gates the upsert on that role
 * server-side) — sending them for any other role is silently a no-op.
 * `email` is rejected outright (400) if present; this function never sends it.
 *
 * @param {{dateOfBirth?: string, gender?: string}} params dateOfBirth as YYYY-MM-DD
 * @returns {Promise<object>} the updated profile, same shape as getProfile()
 */
export async function updateClientProfile({ dateOfBirth, gender } = {}) {
  const body = {}
  if (dateOfBirth) body.date_of_birth = dateOfBirth
  if (gender) body.gender = gender
  return request(API_URLS.PROFILE_ME, {
    method: HTTP_METHODS.PUT,
    authMode: AUTH_MODE.BEARER,
    body
  })
}
