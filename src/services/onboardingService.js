/**
 * Onboarding endpoints.
 * internal/services/users/api/{routes,handler}/onboarding.go
 *
 * Every call except the upload callback is Bearer-authenticated and passes
 * through RequireOnboardingAccess, which rejects with 403 ACCOUNT_NOT_ACTIVE or
 * 409 ONBOARDING_ALREADY_COMPLETED before the handler runs.
 */
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'
import { DEFAULT_COUNTRY } from '@/constants/onboarding'

/**
 * POST /onboarding/role/init — body: { role, country }.
 *
 * Creates a draft and returns one entry per required document for the role,
 * each with its own presigned S3 PUT URL. The document set comes from the
 * `document_type_definitions` table — the frontend must not assume it.
 *
 * `role` must equal the role in the access token or the handler returns
 * 403 ROLE_MISMATCH, so always pass the authenticated role.
 *
 * @param {{role: string, country?: string}} params
 * @returns {Promise<{onboarding_id: string, status: string, role: string, documents: Array<{
 *   document_id: string, document_type: string, s3_key: string,
 *   upload_url: string, method: string, expires_at: string, upload_status: string
 * }>}>}
 */
export async function initOnboarding({ role, country = DEFAULT_COUNTRY }) {
  return request(API_URLS.ONBOARDING_INIT, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: { role, country }
  })
}

/**
 * POST /onboarding/documents/uploaded — body: { s3_key }.
 *
 * Flips a document to `uploaded` after a successful PUT to its presigned URL.
 * Public on this backend — it takes no credential at all.
 *
 * @param {{s3Key: string}} params the exact s3_key returned by init
 * @returns {Promise<{updated: boolean}>}
 */
export async function markDocumentUploaded({ s3Key }) {
  return request(API_URLS.ONBOARDING_DOCUMENT_UPLOADED, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.NONE,
    body: { s3_key: s3Key }
  })
}

/**
 * PATCH /onboarding/:id/submit — no body.
 *
 * Moves the onboarding to `pending_verification`. 412 UPLOADS_INCOMPLETE while
 * any required document is still pending.
 *
 * @param {{onboardingId: string}} params
 * @returns {Promise<{onboarding_id: string, status: string, message: string}>}
 */
export async function submitOnboarding({ onboardingId }) {
  return request(API_URLS.ONBOARDING_SUBMIT, {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER,
    params: { id: onboardingId },
    body: {}
  })
}

/**
 * POST /onboarding/:id/resubmit — no body.
 *
 * Returns a rejected onboarding to `draft`. Valid only from `rejected`,
 * otherwise 400 ONBOARDING_NOT_REJECTED.
 *
 * @param {{onboardingId: string}} params
 * @returns {Promise<{onboarding_id: string, status: string, message: string}>}
 */
export async function resubmitOnboarding({ onboardingId }) {
  return request(API_URLS.ONBOARDING_RESUBMIT, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    params: { id: onboardingId },
    body: {}
  })
}
