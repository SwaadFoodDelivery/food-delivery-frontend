import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { AUTH_STEPS, AUTH_STORAGE_KEYS } from '@/constants/auth'
import {
  checkPhone,
  register,
  sendOtp,
  verifyOtp
} from '@/services/authService'

jest.mock('@/services/authService', () => ({
  checkPhone: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  sendEmailOtp: jest.fn(),
  sendOtp: jest.fn(),
  verifyEmail: jest.fn(),
  verifyOtp: jest.fn()
}))

const verifiedUser = {
  user_id: 'user-1',
  name: 'Rishabh Jain',
  role: 'client',
  phone: '7909338983',
  email: 'rishabh@swaad.test',
  phone_verified: true,
  email_verified: false,
  account_status: 'active'
}

describe('auth store', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    jest.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('moves registered users from phone check to OTP with backend-safe payloads', async () => {
    checkPhone.mockResolvedValue({
      registered: true,
      masked_phone: '+91 ******8983'
    })
    sendOtp.mockResolvedValue({
      masked_phone: '+91 ******8983',
      otp_expires_at: '2026-06-11T13:30:00.000Z',
      message: 'OTP sent'
    })

    const store = useAuthStore()
    const nextStep = await store.beginPhoneCheck({
      phone: '+91 79093 38983',
      role: 'client'
    })

    expect(nextStep).toBe(AUTH_STEPS.OTP)
    expect(checkPhone).toHaveBeenCalledWith({
      phone: '7909338983',
      role: 'client'
    })
    expect(sendOtp).toHaveBeenCalledWith({ phone: '7909338983' })
    expect(store.flow.phone).toBe('7909338983')
    expect(store.flow.step).toBe(AUTH_STEPS.OTP)
    expect(store.flow.registered).toBe(true)
    expect(store.notice).toBe('OTP sent')
  })

  it('moves unregistered users to the registration step without sending OTP', async () => {
    checkPhone.mockResolvedValue({
      registered: false,
      message: 'Create your account'
    })

    const store = useAuthStore()
    const nextStep = await store.beginPhoneCheck({
      phone: '7909338983',
      role: 'driver'
    })

    expect(nextStep).toBe(AUTH_STEPS.REGISTER)
    expect(sendOtp).not.toHaveBeenCalled()
    expect(store.flow.step).toBe(AUTH_STEPS.REGISTER)
    expect(store.flow.role).toBe('driver')
    expect(store.flow.registered).toBe(false)
  })

  it('registers a new user and starts OTP verification', async () => {
    register.mockResolvedValue({
      masked_phone: '+91 ******8983',
      otp_expires_at: '2026-06-11T13:30:00.000Z',
      message: 'OTP sent'
    })

    const store = useAuthStore()
    store.setFlow({
      phone: '7909338983',
      role: 'restaurant_owner',
      step: AUTH_STEPS.REGISTER
    })

    const result = await store.completeRegistration({
      name: ' Rishabh Jain ',
      email: ' rishabh@swaad.test ',
      referralCode: ' SWAAD10 '
    })

    expect(register).toHaveBeenCalledWith({
      phone: '7909338983',
      name: ' Rishabh Jain ',
      email: ' rishabh@swaad.test ',
      referralCode: ' SWAAD10 ',
      role: 'restaurant_owner'
    })
    expect(result.message).toBe('OTP sent')
    expect(store.flow.step).toBe(AUTH_STEPS.OTP)
    expect(store.flow.name).toBe('Rishabh Jain')
    expect(store.flow.email).toBe('rishabh@swaad.test')
    expect(store.flow.referralCode).toBe('SWAAD10')
  })

  it('stores the verified session after successful OTP verification', async () => {
    verifyOtp.mockResolvedValue({
      access_token: 'access-token-1',
      user: verifiedUser
    })

    const store = useAuthStore()
    store.setFlow({
      phone: '7909338983',
      role: 'client',
      step: AUTH_STEPS.OTP
    })

    const result = await store.completeOtpVerification({ otp: '123456' })

    expect(verifyOtp).toHaveBeenCalledWith({
      phone: '7909338983',
      otp: '123456'
    })
    expect(result.user).toEqual(verifiedUser)
    expect(store.isAuthenticated).toBe(true)
    expect(store.flow.step).toBe(AUTH_STEPS.AUTHENTICATED)
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)).toBe('access-token-1')
    expect(JSON.parse(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.USER))).toEqual(verifiedUser)
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.FLOW)).toBeNull()
  })
})
