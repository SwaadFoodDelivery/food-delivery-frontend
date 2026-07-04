import axios from 'axios'
import { API_BASE_URL } from '@/constants/apis'
import { getAccessToken, clearAuthSession } from '@/utils/authSession'
import { getDeviceId } from '@/utils/device'
import logger from '@/utils/logger'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

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

  if (isProxyConnectionError) {
    logger.error('Backend unreachable — proxy connection refused', { target: API_BASE_URL })
  }

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

const rejectAPIError = (apiError, url) => {
  if (apiError.status === 401) {
    logger.auth('Session invalid — clearing auth session', { url, code: apiError.code })
    clearAuthSession()
  } else {
    logger.error('API error', { url, code: apiError.code, message: apiError.message, httpStatus: apiError.status })
  }

  return Promise.reject(apiError)
}

api.interceptors.response.use(
  (response) => {
    const body = response.data

    if (body?.status === 'error') {
      return rejectAPIError(new APIError({
        message: body.message || body.data?.message || 'Request failed',
        code: body.error_code || body.code || 'REQUEST_FAILED',
        details: body.details || [],
        status: response.status,
        data: body.data || null
      }), response.config?.url)
    }

    return response
  },
  (error) => rejectAPIError(normalizeAPIError(error), error.config?.url)
)

export const request = async (config) => {
  const response = await api(config)
  return response.data
}

export default api
