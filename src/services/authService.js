import { API_URLS } from '@/constants/apis'
import { request } from '@/services/api'
import { normalizeIndianPhone } from '@/utils/validators'

export const checkPhone = ({ phone, role }) => request({
  method: 'post',
  url: API_URLS.AUTH_CHECK_PHONE,
  data: {
    phone: normalizeIndianPhone(phone),
    role
  }
})

export const register = ({ phone, name, email, referralCode, role }) => request({
  method: 'post',
  url: API_URLS.AUTH_REGISTER,
  data: {
    phone: normalizeIndianPhone(phone),
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    referral_code: String(referralCode || '').trim(),
    role
  }
})

export const sendOtp = ({ phone }) => request({
  method: 'post',
  url: API_URLS.AUTH_SEND_OTP,
  data: {
    phone: normalizeIndianPhone(phone)
  }
})

export const verifyOtp = ({ phone, otp }) => request({
  method: 'post',
  url: API_URLS.AUTH_VERIFY_OTP,
  data: {
    phone: normalizeIndianPhone(phone),
    otp: String(otp || '').trim()
  }
})

export const sendEmailOtp = () => request({
  method: 'post',
  url: API_URLS.AUTH_SEND_EMAIL_OTP
})

export const verifyEmail = ({ otp }) => request({
  method: 'post',
  url: API_URLS.AUTH_VERIFY_EMAIL,
  data: {
    otp: String(otp || '').trim()
  }
})

export const logout = () => request({
  method: 'post',
  url: API_URLS.AUTH_LOGOUT
})

export const getMe = () => request({
  method: 'get',
  url: API_URLS.ME
})
