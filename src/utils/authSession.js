import { AUTH_STORAGE_KEYS } from '@/constants/auth'

const safeParse = (raw, fallback = null) => {
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

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

export const getStoredFlow = () => {
  try {
    return safeParse(storage().getItem(AUTH_STORAGE_KEYS.FLOW), null)
  } catch {
    return null
  }
}

export const setStoredFlow = (flow) => {
  try {
    if (flow) {
      storage().setItem(AUTH_STORAGE_KEYS.FLOW, JSON.stringify(flow))
    } else {
      storage().removeItem(AUTH_STORAGE_KEYS.FLOW)
    }
  } catch {
    // Ignore storage write failures; the user can restart the flow.
  }
}

export const clearAuthSession = () => {
  setAccessToken('')
  setStoredFlow(null)
}
