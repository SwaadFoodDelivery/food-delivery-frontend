import { OTP_LENGTH } from '@/constants/auth'

export const normalizeIndianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }

  return digits
}

export const isValidIndianPhone = (value) => /^[6-9]\d{9}$/.test(normalizeIndianPhone(value))

export const isValidOtp = (value) => new RegExp(`^\\d{${OTP_LENGTH}}$`).test(String(value || '').trim())

export const isValidEmail = (value) => {
  const email = String(value || '').trim()
  return email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const isOptionalEmail = (value) => {
  const email = String(value || '').trim()
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const sanitizeOtp = (value) => String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
