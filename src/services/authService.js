/**
 * Auth endpoints.
 * internal/services/users/api/{routes,handler}/auth.go
 *
 * Public calls carry X-Guest-Token + X-Device-ID; logout carries the Bearer
 * token. Phone numbers are normalised to the 10-digit national form the
 * backend's own NormalizeE164 produces, so what we send is what it stores.
 */
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, CLIENT_PLATFORM, HTTP_HEADERS, HTTP_METHODS } from '@/constants/common'
import { normalizeEmail, normalizeIndianPhone } from '@/utils/validators'

/**
 * POST /auth/check-phone — body: { phone, role }.
 *
 * Both fields are required: uniqueness is scoped to (phone, role), so the same
 * number can be registered for one role and not another.
 *
 * A suspended account comes back as HTTP 200 with status:"error" and
 * error_code ACCOUNT_SUSPENDED — the api layer turns that into an ApiError
 * whose `.data` still holds the payload below.
 *
 * @returns {Promise<{registered: boolean, account_status?: string, message?: string, captcha_required?: boolean}>}
 */
export async function checkPhone({ phone, role }) {
  return request(API_URLS.AUTH_CHECK_PHONE, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    body: { phone: normalizeIndianPhone(phone), role }
  })
}

/**
 * POST /auth/send-email-otp — body: { email }.
 *
 * Step 2 of registration. Runs before an account exists, so the address goes in
 * the body and the call is authorised by the guest token. Limited to 3 burst /
 * 5 per hour per guest session.
 *
 * @returns {Promise<{otp_sent: boolean, otp_expires_at: string, masked_email: string, message: string}>}
 */
export async function sendEmailOtp({ email }) {
  return request(API_URLS.AUTH_SEND_EMAIL_OTP, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    body: { email: normalizeEmail(email) }
  })
}

/**
 * POST /auth/verify-email — body: { email, otp }.
 *
 * Step 3. Records the verification against this guest session for 30 minutes;
 * register consumes it. Errors: 401 OTP_INVALID · 410 OTP_EXPIRED ·
 * 429 OTP_MAX_ATTEMPTS.
 *
 * @returns {Promise<{email_verified: boolean, masked_email: string, message: string}>}
 */
export async function verifyEmail({ email, otp }) {
  return request(API_URLS.AUTH_VERIFY_EMAIL, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    body: { email: normalizeEmail(email), otp }
  })
}

/**
 * POST /auth/register — body: { phone, name, email, role, referral_code }.
 *
 * Step 4. Creates the account and sends a PHONE OTP; it does not return tokens.
 * `email` is mandatory and must already be verified on this guest session,
 * otherwise 403 EMAIL_NOT_VERIFIED.
 *
 * Errors: 403 EMAIL_NOT_VERIFIED · 409 PHONE_ALREADY_REGISTERED ·
 * 409 EMAIL_ALREADY_REGISTERED · 429 RATE_LIMIT_EXCEEDED.
 *
 * @returns {Promise<{otp_sent: boolean, otp_expires_at: string, masked_phone: string, message: string}>}
 */
export async function register({ phone, name, email, role, referralCode = '' }) {
  return request(API_URLS.AUTH_REGISTER, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    body: {
      phone: normalizeIndianPhone(phone),
      name: String(name ?? '').trim(),
      email: normalizeEmail(email),
      role,
      referral_code: String(referralCode ?? '').trim()
    }
  })
}

/**
 * POST /auth/send-otp — body: { phone, role }.
 *
 * Login OTP for an existing account. 404 USER_NOT_FOUND when the (phone, role)
 * pair has no account.
 *
 * @returns {Promise<{otp_sent: boolean, otp_expires_at: string, masked_phone: string, message: string}>}
 */
export async function sendOtp({ phone, role }) {
  return request(API_URLS.AUTH_SEND_OTP, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    body: { phone: normalizeIndianPhone(phone), role }
  })
}

/**
 * POST /auth/verify-otp — body: { phone, role, otp }.
 *
 * Terminates both login and registration. `user.first_time_user` is the
 * backend's first-time signal (true when this is the account's first verified
 * OTP — business/auth.go computes it as CountVerifiedOTPs == 1).
 *
 * X-Client-Type: web makes the backend return the refresh token as an HttpOnly
 * cookie and blank `refresh_token` in the body.
 *
 * @returns {Promise<{access_token: string, refresh_token?: string, token_type: string, expires_in: number, user: object}>}
 */
export async function verifyOtp({ phone, role, otp }) {
  return request(API_URLS.AUTH_VERIFY_OTP, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.GUEST,
    headers: {
      [HTTP_HEADERS.PLATFORM]: CLIENT_PLATFORM,
      [HTTP_HEADERS.CLIENT_TYPE]: CLIENT_PLATFORM
    },
    body: { phone: normalizeIndianPhone(phone), role, otp }
  })
}

/**
 * POST /auth/logout — Bearer. Revokes the session server-side.
 * @returns {Promise<{message: string}>}
 */
export async function logout() {
  return request(API_URLS.AUTH_LOGOUT, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: {}
  })
}
