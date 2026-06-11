import axios from 'axios'
import { API_BASE_URL } from '@/constants/apis'
import { AUTH_ERROR_CODES } from '@/constants/auth'
import { getAccessToken, clearAuthSession } from '@/utils/authSession'
import { getDeviceId } from '@/utils/device'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

const authFailureCodes = new Set([
  AUTH_ERROR_CODES.UNAUTHORIZED,
  AUTH_ERROR_CODES.TOKEN_EXPIRED,
  AUTH_ERROR_CODES.SESSION_NOT_FOUND,
  AUTH_ERROR_CODES.SESSION_REVOKED
])

export class APIError extends Error {
  constructor({ message, code, details, status, data }) {
    super(message || 'Request failed')
    this.name = 'APIError'
    this.code = code || 'REQUEST_FAILED'
    this.details = details || []
    this.status = status || 0
    this.data = data || null
  }
}

export const normalizeAPIError = (error) => {
  if (error instanceof APIError) {
    return error
  }

  const response = error.response
  const payload = response?.data || {}
  const plainTextPayload = typeof payload === 'string' ? payload : ''
  const isProxyConnectionError = plainTextPayload.includes('Proxy error') || plainTextPayload.includes('ECONNREFUSED')

  return new APIError({
    message: isProxyConnectionError
      ? 'Backend API is not reachable on port 8080. Start or restart the backend, then retry.'
      : payload.message || plainTextPayload || error.message || 'Request failed',
    code: payload.error_code || payload.code || 'REQUEST_FAILED',
    details: payload.details || [],
    status: response?.status || 0,
    data: payload.data || null
  })
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  config.headers['X-Device-ID'] = getDeviceId()
  config.headers['X-Platform'] = 'web'
  config.headers['X-Client-Type'] = 'web'

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => {
    const body = response.data

    if (body?.status === 'error') {
      throw new APIError({
        message: body.message || body.data?.message || 'Request failed',
        code: body.error_code || body.code || 'REQUEST_FAILED',
        details: body.details || [],
        status: response.status,
        data: body.data || null
      })
    }

    return response
  },
  (error) => {
    const normalized = normalizeAPIError(error)

    if (normalized.status === 401 || authFailureCodes.has(normalized.code)) {
      clearAuthSession()
    }

    return Promise.reject(normalized)
  }
)

export const request = async (config) => {
  const response = await api(config)
  return response.data?.data ?? response.data
}

export default api
