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
