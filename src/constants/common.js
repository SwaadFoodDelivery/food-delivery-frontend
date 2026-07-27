/** Transport-level constants shared by every service. */

/**
 * Unset in local dev — requests go to the relative `/api/v1`, which the webpack
 * dev server proxies to VUE_APP_DEV_PROXY_TARGET (see vue.config.js).
 */
export const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || '/api/v1'

/** Only `POST /auth/init-session` reads this — every other endpoint rejects it. */
export const CLIENT_API_KEY = process.env.VUE_APP_CLIENT_API_KEY || ''

export const REQUEST_TIMEOUT_MS = 10000
export const UPLOAD_TIMEOUT_MS = 60000

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  PRECONDITION_FAILED: 412,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429
}

export const HTTP_HEADERS = {
  ACCEPT: 'Accept',
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  RETRY_AFTER: 'Retry-After',
  API_KEY: 'X-API-Key',
  DEVICE_ID: 'X-Device-ID',
  GUEST_TOKEN: 'X-Guest-Token',
  CLIENT_TYPE: 'X-Client-Type',
  PLATFORM: 'X-Platform'
}

export const CONTENT_TYPES = {
  JSON: 'application/json',
  OCTET_STREAM: 'application/octet-stream'
}

/** Which credential the api layer attaches to a request. */
export const AUTH_MODE = {
  NONE: 'none',
  API_KEY: 'api_key',
  GUEST: 'guest',
  BEARER: 'bearer'
}

/**
 * Sent on verify-otp. `web` makes the backend return the refresh token as an
 * HttpOnly cookie instead of a body field
 * (internal/services/users/api/handler/auth.go).
 */
export const CLIENT_PLATFORM = 'web'

/** Envelope discriminator from pkg/response/response.go. */
export const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error'
}

export const STORAGE_KEYS = {
  DEVICE_ID: 'fd.device_id',
  GUEST_TOKEN: 'fd.guest_token',
  ACCESS_TOKEN: 'fd.access_token',
  USER: 'fd.user',
  ONBOARDING_SUBMITTED: 'fd.onboarding_submitted'
}

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
export const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check your connection and try again.'
export const TIMEOUT_ERROR_MESSAGE = 'The server took too long to respond. Please try again.'
