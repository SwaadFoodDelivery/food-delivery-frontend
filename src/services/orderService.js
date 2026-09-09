import { buildPath, request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

function idempotencyKey(prefix) {
  const value = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return `${prefix}-${value}`.slice(0, 64)
}

export function quoteOrder({ cartToken, addressId }) {
  return request(API_URLS.ORDER_QUOTE, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: { cart_token: cartToken, address_id: addressId }
  })
}

export function checkServiceability({ restaurantId, addressId }) {
  return request(API_URLS.ORDER_SERVICEABILITY, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: { restaurant_id: restaurantId, address_id: addressId }
  })
}

export function placeOrder({ cartToken, addressId, paymentMethod = 'upi', instructions = '' }) {
  return request(API_URLS.ORDERS, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    headers: { 'Idempotency-Key': idempotencyKey('order') },
    body: { cart_token: cartToken, address_id: addressId, payment_method: paymentMethod, instructions }
  })
}

export function payForOrder({ orderId, paymentToken = 'demo-token' }) {
  return request(API_URLS.ORDER_PAYMENT, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    params: { orderId },
    headers: { 'Idempotency-Key': idempotencyKey('payment') },
    body: { payment_token: paymentToken }
  })
}

export function listOrders({ limit = 20 } = {}) {
  return request(API_URLS.ORDERS, { authMode: AUTH_MODE.BEARER, query: { limit } })
}

export function getOrderHistory(orderId) {
  return request(buildPath(API_URLS.ORDER_HISTORY, { orderId }), { authMode: AUTH_MODE.BEARER })
}

export function cancelOrder(orderId) {
  return request(buildPath(API_URLS.ORDER_CANCEL, { orderId }), { method: HTTP_METHODS.PATCH, authMode: AUTH_MODE.BEARER })
}
