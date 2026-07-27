/**
 * The single HTTP client. Every service goes through `request()`.
 *
 * NOTE ON AXIOS: Clauderules.md specifies Axios, but axios is not a declared
 * dependency in package.json (it is only present transitively, so a clean
 * `npm ci` would not install it) and the rules also forbid adding packages
 * without approval. This module therefore implements the same contract —
 * one configured client, credential injection, error normalisation, timeouts —
 * on top of fetch. Swapping the body of `send()` for an Axios instance is the
 * only change needed if axios is later added to package.json.
 *
 * Envelope (pkg/response/response.go):
 *   { status: "success", data }
 *   { status: "error", error_code, message, details, data? }
 *
 * `POST /auth/check-phone` returns HTTP 200 with status:"error" for a suspended
 * account, so success is decided by the envelope, never by the status code
 * alone.
 */
import { API_URLS } from '@/constants/apis'
import {
  API_BASE_URL,
  AUTH_MODE,
  CLIENT_API_KEY,
  CONTENT_TYPES,
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

function buildQuery(query) {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (entries.length === 0) return ''
  return `?${new URLSearchParams(entries).toString()}`
}

/**
 * Attaches the credential the endpoint expects. The backend is strict here:
 * the API key is accepted only on init-session, and public auth endpoints
 * reject a Bearer token in place of the guest token.
 */
function applyAuthHeaders(headers, authMode) {
  if (authMode === AUTH_MODE.API_KEY && CLIENT_API_KEY) {
    headers[HTTP_HEADERS.API_KEY] = CLIENT_API_KEY
    return
  }
  if (authMode === AUTH_MODE.GUEST) {
    const guestToken = hooks.getGuestToken()
    if (guestToken) headers[HTTP_HEADERS.GUEST_TOKEN] = guestToken
    return
  }
  if (authMode === AUTH_MODE.BEARER) {
    const accessToken = hooks.getAccessToken()
    if (accessToken) headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${accessToken}`
  }
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function toApiError(response, payload) {
  const retryAfterHeader = response.headers.get(HTTP_HEADERS.RETRY_AFTER)
  return new ApiError({
    status: response.status,
    errorCode: payload?.error_code,
    message: payload?.message,
    details: payload?.details,
    data: payload?.data,
    retryAfter: retryAfterHeader ? Number(retryAfterHeader) : null
  })
}

async function send(url, { method, headers, body, timeoutMs }) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await window.fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      // Needed so the HttpOnly refresh cookie set for X-Client-Type: web is stored.
      credentials: 'include'
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError({ status: 0, message: TIMEOUT_ERROR_MESSAGE })
    }
    throw new ApiError({ status: 0, message: NETWORK_ERROR_MESSAGE })
  } finally {
    window.clearTimeout(timer)
  }
}

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

  const url = `${API_BASE_URL}${buildPath(path, params)}${buildQuery(query ?? {})}`
  const headers = {
    [HTTP_HEADERS.ACCEPT]: CONTENT_TYPES.JSON,
    // Required by init-session, register, send-otp and verify-otp; harmless
    // elsewhere and it keeps the guest token's device binding satisfied.
    [HTTP_HEADERS.DEVICE_ID]: getDeviceId(),
    ...extraHeaders
  }
  if (body !== undefined) headers[HTTP_HEADERS.CONTENT_TYPE] = CONTENT_TYPES.JSON
  applyAuthHeaders(headers, authMode)

  const response = await send(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs
  })
  const payload = await parseBody(response)

  if (response.ok && payload?.status !== RESPONSE_STATUS.ERROR) {
    return payload?.data ?? null
  }

  const error = toApiError(response, payload)

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

  // There is no refresh endpoint on this backend, so an expired access token is
  // terminal: drop the session and let the router send the user to sign-in.
  if (error.isSessionExpired && path !== API_URLS.AUTH_LOGOUT) {
    hooks.onSessionExpired(error)
  }

  throw error
}
