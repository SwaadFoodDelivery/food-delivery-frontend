/**
 * X-Device-ID.
 *
 * The backend binds the guest token to this value (GuestTokenMiddleware rejects
 * a mismatch with 401 GUEST_TOKEN_INVALID) and stores it on the session row, so
 * it has to stay stable for the lifetime of the browser profile.
 */
import { STORAGE_KEYS } from '@/constants/common'
import { readValue, writeValue } from '@/utils/storage'

/** @returns {string} RFC-4122 v4 UUID. */
function createDeviceId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()

  // Fallback for non-secure origins, where randomUUID is unavailable.
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Returns this browser's device ID, minting and persisting one on first call.
 * @returns {string}
 */
export function getDeviceId() {
  const existing = readValue(STORAGE_KEYS.DEVICE_ID)
  if (typeof existing === 'string' && existing.length > 0) return existing

  const deviceId = createDeviceId()
  writeValue(STORAGE_KEYS.DEVICE_ID, deviceId)
  return deviceId
}
