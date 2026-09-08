import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'
import { request } from '@/services/api'

export function getOwnedRestaurant() {
  return request(API_URLS.OWNER_RESTAURANT, { authMode: AUTH_MODE.BEARER })
}

export function listOwnerOrders(restaurantId) {
  return request(API_URLS.OWNER_RESTAURANT_ORDERS, {
    authMode: AUTH_MODE.BEARER,
    params: { restaurantId }
  })
}

export function updateOwnerOrderStatus({ restaurantId, orderId, status }) {
  return request(API_URLS.OWNER_ORDER_STATUS, {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER,
    params: { restaurantId, orderId },
    body: { status }
  })
}
