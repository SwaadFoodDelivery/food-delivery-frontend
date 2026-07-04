import { AUTH_STORAGE_KEYS } from '@/constants/auth'

const storage = () => window.sessionStorage

export const getAccessToken = () => {
  try {
    return storage().getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || ''
  } catch {
    return ''
  }
}

export const setAccessToken = (token) => {
  try {
    if (token) {
      storage().setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, token)
    } else {
      storage().removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    }
  } catch {
    // Session storage can be unavailable in private or locked-down contexts.
  }
}

export const clearAuthSession = () => {
  setAccessToken('')
}
