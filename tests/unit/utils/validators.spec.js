import {
  isOptionalEmail,
  isValidEmail,
  isValidIndianPhone,
  isValidOtp,
  normalizeIndianPhone,
  sanitizeOtp
} from '@/utils/validators'

describe('validators', () => {
  describe('normalizeIndianPhone', () => {
    it('normalizes Indian phone formats to the backend 10 digit value', () => {
      expect(normalizeIndianPhone('+91 79093 38983')).toBe('7909338983')
      expect(normalizeIndianPhone('09123456789')).toBe('9123456789')
      expect(normalizeIndianPhone('7909338983')).toBe('7909338983')
    })
  })

  describe('isValidIndianPhone', () => {
    it('accepts valid Indian mobile numbers only', () => {
      expect(isValidIndianPhone('+91 7909338983')).toBe(true)
      expect(isValidIndianPhone('5909338983')).toBe(false)
      expect(isValidIndianPhone('790933898')).toBe(false)
      expect(isValidIndianPhone('79093389831')).toBe(false)
    })
  })

  describe('isValidOtp', () => {
    it('accepts only the configured six digit OTP', () => {
      expect(isValidOtp('123456')).toBe(true)
      expect(isValidOtp('12345')).toBe(false)
      expect(isValidOtp('1234567')).toBe(false)
      expect(isValidOtp('12345a')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('requires a non-empty valid email address', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('customer@swaad.test')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
    })
  })

  describe('isOptionalEmail', () => {
    it('allows empty but validates populated values', () => {
      expect(isOptionalEmail('')).toBe(true)
      expect(isOptionalEmail('customer@swaad.test')).toBe(true)
      expect(isOptionalEmail('invalid-email')).toBe(false)
    })
  })

  describe('sanitizeOtp', () => {
    it('keeps only digits and limits the OTP length', () => {
      expect(sanitizeOtp('12 34-56')).toBe('123456')
      expect(sanitizeOtp('123456789')).toBe('123456')
    })
  })
})
