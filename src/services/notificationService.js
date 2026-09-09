import { request, buildPath } from '@/services/api'
import { API_URLS } from '@/constants/apis'
import { AUTH_MODE, HTTP_METHODS } from '@/constants/common'

export function listNotifications({ unread = false, limit = 20 } = {}) {
  return request(API_URLS.NOTIFICATIONS, {
    authMode: AUTH_MODE.BEARER,
    query: { unread: unread ? 'true' : 'false', limit }
  })
}

export function markNotificationRead(notificationId) {
  return request(buildPath(API_URLS.NOTIFICATION_READ, { notificationId }), {
    method: HTTP_METHODS.PATCH,
    authMode: AUTH_MODE.BEARER
  })
}

export function markAllNotificationsRead() {
  return request(API_URLS.NOTIFICATIONS_READ_ALL, {
    method: HTTP_METHODS.POST,
    authMode: AUTH_MODE.BEARER
  })
}
