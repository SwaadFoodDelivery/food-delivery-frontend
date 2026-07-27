/**
 * Client-side mirrors of the backend validators, so the UI can disable a submit
 * instead of round-tripping for a 400. The backend still validates everything —
 * these only exist to keep the form honest.
 *
 * Source: pkg/utils/phone.go and internal/services/users/validations/auth.go.
 */
import { NAME_MAX_LENGTH, OTP_LENGTH } from '@/constants/auth'

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/
const OTP_PATTERN = /^\d{6}$/
/** Deliberately permissive: Go's net/mail.ParseAddress is the real gate. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/

/**
 * Strips +91 / 91 / leading 0, matching the backend's NormalizeE164.
 *
 * The bare "91"/"0" strips are gated on length: a real 10-digit Indian mobile
 * number may itself start with "91" (e.g. 9123456789), so stripping it
 * unconditionally corrupted such numbers to 8 digits — a bug caught during e2e
 * testing and fixed on the backend (pkg/utils/phone.go); this mirrors that fix
 * so the two never drift back out of sync.
 *
 * @param {string} phone
 * @returns {string} the 10-digit national number, or the input if unrecognised.
 */
export function normalizeIndianPhone(phone) {
  let value = String(phone ?? '').trim().replace(/[\s-]/g, '')
  if (value.startsWith('+91')) value = value.slice(3)
  if (value.length === 12 && value.startsWith('91')) value = value.slice(2)
  if (value.length === 11 && value.startsWith('0')) value = value.slice(1)
  return value
}

/**
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidIndianPhone(phone) {
  return INDIAN_MOBILE_PATTERN.test(normalizeIndianPhone(phone))
}

/**
 * @param {string} otp
 * @returns {boolean}
 */
export function isValidOtp(otp) {
  return OTP_PATTERN.test(String(otp ?? '').trim())
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email ?? '').trim())
}

/**
 * The backend lower-cases and trims the address before hashing the OTP against
 * it, so the UI compares the same way when checking whether the verified
 * address still matches what is in the form.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isValidName(name) {
  const value = String(name ?? '').trim()
  return value.length > 0 && value.length <= NAME_MAX_LENGTH
}

/** Digits only, capped at the OTP length — for use as an input filter. */
export function sanitizeOtpInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH)
}

/** Digits only, capped at 10 — for use as a phone input filter. */
export function sanitizePhoneInput(value) {
  return normalizeIndianPhone(value).replace(/\D/g, '').slice(0, 10)
}
