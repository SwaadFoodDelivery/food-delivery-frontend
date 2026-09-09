import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'
import { buildPath, request } from '@/services/api'

export function getOperationsOverview(status = '') {
  return request(API_URLS.OPERATIONS_OVERVIEW, {
    authMode: AUTH_MODE.BEARER,
    query: status ? { status } : {}
  })
}

export function cancelOperationsOrder(orderId) {
  return request(API_URLS.OPERATIONS_CANCEL_ORDER, {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER,
    params: { orderId }
  })
}

export function getOnboardingReviews(status = '') {
  return request(API_URLS.OPERATIONS_ONBOARDING, {
    authMode: AUTH_MODE.BEARER,
    query: status ? { status } : {}
  })
}

export function reviewOnboarding(onboardingId, status, rejectionReason = '') {
  return request(buildPath(API_URLS.OPERATIONS_ONBOARDING_REVIEW, { id: onboardingId }), {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER,
    body: { status, rejection_reason: rejectionReason }
  })
}
