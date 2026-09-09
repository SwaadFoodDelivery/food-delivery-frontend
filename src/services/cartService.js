import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

export function addCartItem({ cartToken = '', restaurantId, itemId, quantity = 1, customisations = [] }) {
  return request(API_URLS.CART, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: {
      cart_token: cartToken,
      restaurant_id: restaurantId,
      item_id: itemId,
      quantity,
      customisations
    }
  })
}

export function getCart(cartToken) {
  return request(API_URLS.CART_BY_TOKEN, {
    authMode: AUTH_MODE.BEARER,
    params: { cartToken }
  })
}

export function removeCartItem(cartToken, cartItemId) {
  return request(API_URLS.CART_ITEM, {
    method: HTTP_METHODS.DELETE,
    authMode: AUTH_MODE.BEARER,
    params: { cartToken, cartItemId }
  })
}
