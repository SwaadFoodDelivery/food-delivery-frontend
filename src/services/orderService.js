import { request } from '@/services/api'
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
