/**
 * Direct-to-S3 upload for onboarding documents.
 *
 * This does NOT go through the api layer: the target is a presigned S3 URL on
 * another origin, it carries no app credentials, and it returns no JSON
 * envelope.
 */
import { ApiError } from '@/services/api'
import {
  CONTENT_TYPES,
  HTTP_HEADERS,
  HTTP_METHODS,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  UPLOAD_TIMEOUT_MS
} from '@/constants/common'
import { ONBOARDING_MESSAGES, UPLOAD_CONTENT_TYPE } from '@/constants/onboarding'

/**
 * PUTs a file to a presigned URL.
 *
 * The URL from `POST /onboarding/role/init` is signed with
 * `content-type: application/octet-stream` as a signed header, so that exact
 * value must be sent back — a browser-guessed `image/jpeg` invalidates the
 * SigV4 signature and S3 answers 403.
 *
 * @param {{file: File, uploadUrl: string, method?: string, contentType?: string}} params
 * @returns {Promise<void>}
 * @throws {ApiError}
 */
export async function uploadToPresignedUrl({
  file,
  uploadUrl,
  method = HTTP_METHODS.PUT,
  contentType = UPLOAD_CONTENT_TYPE
}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  let response
  try {
    response = await window.fetch(uploadUrl, {
      method,
      headers: { [HTTP_HEADERS.CONTENT_TYPE]: contentType || CONTENT_TYPES.OCTET_STREAM },
      body: file,
      signal: controller.signal
    })
  } catch (error) {
    throw new ApiError({
      status: 0,
      message: error?.name === 'AbortError' ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE
    })
  } finally {
    window.clearTimeout(timer)
  }

  if (!response.ok) {
    throw new ApiError({ status: response.status, message: ONBOARDING_MESSAGES.UPLOAD_FAILED })
  }
}
