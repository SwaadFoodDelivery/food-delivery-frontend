import {
  isValidEmail,
  isValidIndianPhone,
  isValidName,
  isValidOtp,
  normalizeEmail,
  normalizeIndianPhone,
  sanitizeOtpInput,
  sanitizePhoneInput
} from '@/utils/validators'

describe('normalizeIndianPhone', () => {
  it('normalizes +91/91/trunk-0 prefixed numbers to the backend 10-digit value', () => {
    expect(normalizeIndianPhone('+91 79093 38983')).toBe('7909338983')
    expect(normalizeIndianPhone('919876543210')).toBe('9876543210')
    expect(normalizeIndianPhone('09876543210')).toBe('9876543210')
    expect(normalizeIndianPhone('7909338983')).toBe('7909338983')
  })

  // Regression: a bare 10-digit number that happens to start with "91" (a
  // real, allocated range — e.g. 9123456789) must not be mistaken for
  // <country code>+<8 digits>. Mirrors the backend fix in pkg/utils/phone.go.
  it('does not mangle a 10-digit number that starts with 91', () => {
    expect(normalizeIndianPhone('9123456789')).toBe('9123456789')
    expect(normalizeIndianPhone('919123456789')).toBe('9123456789')
    expect(normalizeIndianPhone('+919123456789')).toBe('9123456789')
  })
})

describe('isValidIndianPhone', () => {
  it('accepts valid Indian mobile numbers only', () => {
    expect(isValidIndianPhone('+91 7909338983')).toBe(true)
    expect(isValidIndianPhone('9123456789')).toBe(true)
    expect(isValidIndianPhone('5909338983')).toBe(false)
    expect(isValidIndianPhone('790933898')).toBe(false)
    expect(isValidIndianPhone('79093389831')).toBe(false)
  })
})

describe('isValidOtp', () => {
  it('accepts only a 6-digit code', () => {
    expect(isValidOtp('123456')).toBe(true)
    expect(isValidOtp('12345')).toBe(false)
    expect(isValidOtp('1234567')).toBe(false)
    expect(isValidOtp('12345a')).toBe(false)
    expect(isValidOtp('')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('requires a non-empty, plausible email address', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('customer@swaad.test')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('trims and lower-cases, matching the backend before hashing the OTP', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})

describe('isValidName', () => {
  it('requires a non-empty name within the 100-char backend limit', () => {
    expect(isValidName('Rishabh Jain')).toBe(true)
    expect(isValidName('  ')).toBe(false)
    expect(isValidName('a'.repeat(101))).toBe(false)
    expect(isValidName('a'.repeat(100))).toBe(true)
  })
})

describe('sanitizeOtpInput', () => {
  it('keeps only digits and caps at 6', () => {
    expect(sanitizeOtpInput('12 34-56')).toBe('123456')
    expect(sanitizeOtpInput('123456789')).toBe('123456')
  })
})

describe('sanitizePhoneInput', () => {
  it('normalizes a country-code prefix then caps at 10 digits', () => {
    expect(sanitizePhoneInput('+91 98765 43210')).toBe('9876543210')
    expect(sanitizePhoneInput('9123456789')).toBe('9123456789')
  })
})
