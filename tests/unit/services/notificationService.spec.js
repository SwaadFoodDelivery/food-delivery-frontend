import { request } from '@/services/api'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notificationService'

jest.mock('@/services/api', () => ({
  buildPath: (path, params) => path.replace(':notificationId', params.notificationId),
  request: jest.fn()
}))

describe('notificationService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('loads recipient-scoped notifications with unread filters', async () => {
    await listNotifications({ unread: true, limit: 5 })
    expect(request).toHaveBeenCalledWith('/notifications', expect.objectContaining({
      authMode: 'bearer',
      query: { unread: 'true', limit: 5 }
    }))
  })

  it('marks one notification and all notifications read with bearer auth', async () => {
    await markNotificationRead('notification-1')
    await markAllNotificationsRead()
    expect(request).toHaveBeenNthCalledWith(1, '/notifications/notification-1/read', expect.objectContaining({ method: 'PATCH', authMode: 'bearer' }))
    expect(request).toHaveBeenNthCalledWith(2, '/notifications/read-all', expect.objectContaining({ method: 'POST', authMode: 'bearer' }))
  })
})
