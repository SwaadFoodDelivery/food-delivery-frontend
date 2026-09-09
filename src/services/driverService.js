import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'
import { request } from '@/services/api'

export function getDriverDelivery() {
  return request(API_URLS.DRIVER_DELIVERY, { authMode: AUTH_MODE.BEARER })
}

export function updateDriverDeliveryStatus(status) {
  return request(API_URLS.DRIVER_DELIVERY_STATUS, {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER,
    body: { status }
  })
}

export function updateDriverAvailability({ isAvailable, currentCity }) {
  return request(API_URLS.PROFILE_ME, {
    method: HTTP_METHODS.PUT,
    authMode: AUTH_MODE.BEARER,
    body: { is_available: isAvailable, current_city: currentCity }
  })
}
