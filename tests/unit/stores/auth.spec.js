import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { AUTH_STORAGE_KEYS } from '@/constants/auth'
import { fetchMe, logout } from '@/services/authActions'
import { getMe, logout as logoutRequest } from '@/services/authService'

jest.mock('@/services/authService', () => ({
  checkPhone: jest.fn(),
  getMe: jest.fn(),
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

  it('isAuthenticated is false when token or user is missing', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)

    store.setAccessToken('tok')
    expect(store.isAuthenticated).toBe(false)

    store.setAccessToken('')
    store.setUser(verifiedUser)
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAuthenticated is true when both token and user are set', () => {
    const store = useAuthStore()
    store.setAccessToken('tok')
    store.setUser(verifiedUser)
    expect(store.isAuthenticated).toBe(true)
  })

  it('needsEmailVerification is true when authenticated and email not verified', () => {
    const store = useAuthStore()
    store.setAccessToken('tok')
    store.setUser({ ...verifiedUser, email_verified: false })
    expect(store.needsEmailVerification).toBe(true)
  })

  it('needsEmailVerification is false when email is verified', () => {
    const store = useAuthStore()
    store.setAccessToken('tok')
    store.setUser({ ...verifiedUser, email_verified: true })
    expect(store.needsEmailVerification).toBe(false)
  })

  it('fetchMe restores session from a valid stored token', async () => {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'stored-token')
    getMe.mockResolvedValue({ status: 'success', data: { user: verifiedUser } })

    setActivePinia(createPinia())
    const store = useAuthStore()

    await fetchMe()

    expect(getMe).toHaveBeenCalled()
    expect(store.user).toEqual(verifiedUser)
  })

  it('fetchMe clears session when stored token is invalid', async () => {
    window.sessionStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'bad-token')
    getMe.mockRejectedValue(new Error('Unauthorized'))

    setActivePinia(createPinia())
    const store = useAuthStore()

    await fetchMe()

    expect(store.accessToken).toBe('')
    expect(store.user).toBeNull()
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
  })

  it('logout clears token and user regardless of network outcome', async () => {
    logoutRequest.mockRejectedValue(new Error('Network error'))

    const store = useAuthStore()
    store.setAccessToken('tok')
    store.setUser(verifiedUser)

    await logout()

    expect(store.accessToken).toBe('')
    expect(store.user).toBeNull()
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
  })
})
