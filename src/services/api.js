/**
 * The single HTTP client. Every service goes through `request()`.
 *
 * Envelope (pkg/response/response.go):
 *   { status: "success", data }
 *   { status: "error", error_code, message, details, data? }
 *
 * `POST /auth/check-phone` returns HTTP 200 with status:"error" for a suspended
 * account, so success is decided by the envelope, never by the status code
 * alone.
 */
import axios from 'axios'

import { API_URLS } from '@/constants/apis'
import {
  API_BASE_URL,
  AUTH_MODE,
  CLIENT_API_KEY,
  GENERIC_ERROR_MESSAGE,
  HTTP_HEADERS,
  HTTP_METHODS,
  HTTP_STATUS,
  NETWORK_ERROR_MESSAGE,
  REQUEST_TIMEOUT_MS,
  RESPONSE_STATUS,
  TIMEOUT_ERROR_MESSAGE
} from '@/constants/common'
import { GUEST_TOKEN_ERROR_CODES, SESSION_ERROR_CODES } from '@/constants/auth'
import { getDeviceId } from '@/utils/device'
import logger from '@/utils/logger'

/** Normalised failure. Every rejected service call throws one of these. */
export class ApiError extends Error {
  constructor({ status, errorCode, message, details, data, retryAfter }) {
    super(message || GENERIC_ERROR_MESSAGE)
    this.name = 'ApiError'
    this.status = status ?? 0
    this.errorCode = errorCode ?? ''
    this.details = Array.isArray(details) ? details : []
    this.data = data ?? null
    this.retryAfter = retryAfter ?? null
  }

  /** True when the local access token / session is no longer usable. */
  get isSessionExpired() {
    return this.status === HTTP_STATUS.UNAUTHORIZED && SESSION_ERROR_CODES.includes(this.errorCode)
  }

  get isRateLimited() {
    return this.status === HTTP_STATUS.TOO_MANY_REQUESTS
  }

  /**
   * Field-level messages from RequestValidator, flattened for display.
   * @returns {string[]}
   */
  get fieldMessages() {
    return this.details
      .map((detail) =>
        typeof detail === 'string' ? detail : [detail?.field, detail?.message].filter(Boolean).join(': ')
      )
      .filter(Boolean)
  }
}

/**
 * Credential providers, registered by the auth store at boot. Keeps this module
 * free of a store import, which would otherwise be circular.
 */
const hooks = {
  getGuestToken: () => '',
  getAccessToken: () => '',
  refreshGuestToken: async () => '',
  onSessionExpired: () => {}
}

/** @param {Partial<typeof hooks>} overrides */
export function configureApi(overrides) {
  Object.assign(hooks, overrides)
}

/**
 * Substitutes `:param` placeholders in a path template.
 * @param {string} template e.g. '/onboarding/:id/submit'
 * @param {Record<string, string>} params
 * @returns {string}
 */
export function buildPath(template, params = {}) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    template
  )
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // Needed so the HttpOnly refresh cookie set for X-Client-Type: web is stored.
  withCredentials: true,
  headers: { [HTTP_HEADERS.ACCEPT]: 'application/json' }
})

/**
 * Attaches the credential the endpoint expects. The backend is strict here:
 * the API key is accepted only on init-session, and public auth endpoints
 * reject a Bearer token in place of the guest token.
 */
http.interceptors.request.use((config) => {
  config.headers[HTTP_HEADERS.DEVICE_ID] = getDeviceId()

  const authMode = config.authMode ?? AUTH_MODE.NONE
  if (authMode === AUTH_MODE.API_KEY && CLIENT_API_KEY) {
    config.headers[HTTP_HEADERS.API_KEY] = CLIENT_API_KEY
  } else if (authMode === AUTH_MODE.GUEST) {
    const guestToken = hooks.getGuestToken()
    if (guestToken) config.headers[HTTP_HEADERS.GUEST_TOKEN] = guestToken
  } else if (authMode === AUTH_MODE.BEARER) {
    const accessToken = hooks.getAccessToken()
    if (accessToken) config.headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${accessToken}`
  }

  return config
})

/** Turns an axios success/error into either the envelope's `data` or a thrown ApiError. */
function toApiError(error) {
  const response = error.response
  if (!response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    logger.error('Network request failed', { url: error.config?.url, code: error.code })
    return new ApiError({ status: 0, message: isTimeout ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE })
  }

  const payload = response.data
  const retryAfterHeader = response.headers?.[HTTP_HEADERS.RETRY_AFTER.toLowerCase()]
  return new ApiError({
    status: response.status,
    errorCode: payload?.error_code,
    message: payload?.message,
    details: payload?.details,
    data: payload?.data,
    retryAfter: retryAfterHeader ? Number(retryAfterHeader) : null
  })
}

http.interceptors.response.use(
  (response) => {
    // Some endpoints (e.g. a suspended account on check-phone) answer HTTP 200
    // with status:"error" — the envelope, not the status code, decides success.
    if (response.data?.status === RESPONSE_STATUS.ERROR) {
      return Promise.reject(
        new ApiError({
          status: response.status,
          errorCode: response.data.error_code,
          message: response.data.message,
          details: response.data.details,
          data: response.data.data
        })
      )
    }
    return response
  },
  (error) => Promise.reject(error instanceof ApiError ? error : toApiError(error))
)

/**
 * Performs one request and unwraps the response envelope.
 *
 * @param {string} path path template from API_URLS
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body] JSON-serialised when present
 * @param {string} [options.authMode] one of AUTH_MODE
 * @param {Record<string,string>} [options.params] `:param` substitutions
 * @param {Record<string,string|number>} [options.query]
 * @param {Record<string,string>} [options.headers] extra headers
 * @param {number} [options.timeoutMs]
 * @param {boolean} [options.retryOnGuestTokenFailure] internal re-entry guard
 * @returns {Promise<*>} the `data` field of the envelope
 * @throws {ApiError}
 */
export async function request(path, options = {}) {
  const {
    method = HTTP_METHODS.GET,
    body,
    authMode = AUTH_MODE.NONE,
    params,
    query,
    headers: extraHeaders,
    timeoutMs = REQUEST_TIMEOUT_MS,
    retryOnGuestTokenFailure = true
  } = options

  try {
    const response = await http.request({
      url: buildPath(path, params),
      method,
      data: body,
      params: query,
      timeout: timeoutMs,
      headers: extraHeaders,
      authMode
    })
    return response.data?.data ?? null
  } catch (thrown) {
    const error = thrown instanceof ApiError ? thrown : toApiError(thrown)

    // A guest token lives 60 minutes. Rather than surfacing an expiry as a form
    // error, mint a fresh one and replay the request exactly once.
    if (
      authMode === AUTH_MODE.GUEST &&
      retryOnGuestTokenFailure &&
      GUEST_TOKEN_ERROR_CODES.includes(error.errorCode)
    ) {
      const refreshed = await hooks.refreshGuestToken()
      if (refreshed) {
        return request(path, { ...options, retryOnGuestTokenFailure: false })
      }
    }

    // There is no refresh endpoint on this backend, so an expired access token
    // is terminal: drop the session and let the router send the user to sign-in.
    if (error.isSessionExpired && path !== API_URLS.AUTH_LOGOUT) {
      logger.auth('Session invalid — clearing auth session', { path, code: error.errorCode })
      hooks.onSessionExpired(error)
    }

    throw error
  }
}

export default http
