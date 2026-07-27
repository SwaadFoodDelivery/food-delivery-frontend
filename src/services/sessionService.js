/**
 * Guest session — the entry point for every unauthenticated flow.
 * internal/services/common/api/handler/session.go
 */
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

/**
 * POST /auth/init-session — headers: X-API-Key, X-Device-ID. Body: {}.
 *
 * The only endpoint that accepts the API key. The returned token is bound to
 * X-Device-ID and scopes pre-registration email verification.
 *
 * @returns {Promise<{guest_token: string, expires_in: number, session_id: string}>}
 */
export async function initSession() {
  return request(API_URLS.INIT_SESSION, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.API_KEY,
    body: {}
  })
}
