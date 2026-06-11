import { AUTH_STORAGE_KEYS } from '@/constants/auth'

const randomId = () => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getDeviceId = () => {
  try {
    const existing = window.localStorage.getItem(AUTH_STORAGE_KEYS.DEVICE_ID)
    if (existing) {
      return existing
    }

    const nextId = `web-${randomId()}`
    window.localStorage.setItem(AUTH_STORAGE_KEYS.DEVICE_ID, nextId)
    return nextId
  } catch {
    return `web-${randomId()}`
  }
}
