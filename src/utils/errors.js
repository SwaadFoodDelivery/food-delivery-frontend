/** Turns an ApiError into something worth showing a user. */
import { ApiError } from '@/services/api'
import { GENERIC_ERROR_MESSAGE } from '@/constants/common'

/**
 * Prefers the backend's own message, then its field-level validation details.
 *
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function toErrorMessage(error, fallback = GENERIC_ERROR_MESSAGE) {
  if (!(error instanceof ApiError)) return fallback

  if (error.isRateLimited && error.retryAfter) {
    return `Too many attempts. Try again in ${error.retryAfter} second${error.retryAfter === 1 ? '' : 's'}.`
  }

  const fieldMessages = error.fieldMessages
  if (fieldMessages.length > 0) return fieldMessages.join(' · ')

  return error.message || fallback
}

/**
 * @param {unknown} error
 * @param {string} code an ERROR_CODES value
 * @returns {boolean}
 */
export function hasErrorCode(error, code) {
  return error instanceof ApiError && error.errorCode === code
}
