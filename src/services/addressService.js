import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

export function listAddresses() {
  return request(API_URLS.ADDRESSES, {
    authMode: AUTH_MODE.BEARER,
    query: { page: 1, limit: 20 }
  })
}

export function createAddress(address) {
  return request(API_URLS.ADDRESSES, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER,
    body: address
  })
}
