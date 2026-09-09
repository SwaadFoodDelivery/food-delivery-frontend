/** Customer-facing access to the backend-owned mock delivery simulation. */
import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE } from '@/constants/common'

export function getDeliveryStatus(orderId) {
  return request(API_URLS.ORDER_DELIVERY, {
    authMode: AUTH_MODE.BEARER,
    params: { orderId }
  })
}
