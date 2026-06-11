import {
  checkPhone,
  register,
  sendOtp,
  verifyOtp
} from '@/services/authService'
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'

jest.mock('@/services/api', () => ({
  request: jest.fn()
}))

describe('authService', () => {
  beforeEach(() => {
    request.mockResolvedValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('checks phone registration with a normalized phone and selected role', async () => {
    await checkPhone({ phone: '+91 79093 38983', role: 'client' })

    expect(request).toHaveBeenCalledWith({
      method: 'post',
      url: API_URLS.AUTH_CHECK_PHONE,
      data: {
        phone: '7909338983',
        role: 'client'
      }
    })
  })

  it('registers a user with trimmed profile fields and referral code mapping', async () => {
    await register({
      phone: '07909338983',
      name: ' Rishabh Jain ',
      email: ' rishabh@swaad.test ',
      referralCode: ' SWAAD10 ',
      role: 'restaurant_owner'
    })

    expect(request).toHaveBeenCalledWith({
      method: 'post',
      url: API_URLS.AUTH_REGISTER,
      data: {
        phone: '7909338983',
        name: 'Rishabh Jain',
        email: 'rishabh@swaad.test',
        referral_code: 'SWAAD10',
        role: 'restaurant_owner'
      }
    })
  })

  it('sends OTP requests with a normalized phone', async () => {
    await sendOtp({ phone: '+91-7909338983' })

    expect(request).toHaveBeenCalledWith({
      method: 'post',
      url: API_URLS.AUTH_SEND_OTP,
      data: {
        phone: '7909338983'
      }
    })
  })

  it('verifies OTP with trimmed digits and normalized phone', async () => {
    await verifyOtp({ phone: '+91 7909338983', otp: ' 123456 ' })

    expect(request).toHaveBeenCalledWith({
      method: 'post',
      url: API_URLS.AUTH_VERIFY_OTP,
      data: {
        phone: '7909338983',
        otp: '123456'
      }
    })
  })
})
