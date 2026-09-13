import { request } from '@/services/api'
import { cancelOrder, getOrderHistory, listOrders } from '@/services/orderService'

jest.mock('@/services/api', () => ({
  buildPath: (path, params) => path.replace(':orderId', params.orderId),
  request: jest.fn()
}))

describe('order history service', () => {
  beforeEach(() => jest.clearAllMocks())

  it('loads recipient-scoped order history', async () => {
    await listOrders({ limit: 10 })
    expect(request).toHaveBeenCalledWith('/orders', expect.objectContaining({ authMode: 'bearer', query: { limit: 10 } }))
  })

  it('forwards opaque cursors unchanged with the requested limit', async () => {
    const cursor = 'opaque+/=._-:2026%09'
    await listOrders({ limit: 7, cursor })
    expect(request).toHaveBeenCalledWith('/orders', expect.objectContaining({ authMode: 'bearer', query: { limit: 7, cursor } }))
  })

  it.each([undefined, '', null])('omits empty cursor %s for first-page/legacy requests', async (cursor) => {
    await listOrders({ cursor })
    expect(request).toHaveBeenCalledWith('/orders', expect.objectContaining({ query: { limit: 20 } }))
  })

  it('loads a single order timeline with bearer auth', async () => {
    await getOrderHistory('order-1')
    expect(request).toHaveBeenCalledWith('/orders/order-1/history', expect.objectContaining({ authMode: 'bearer' }))
  })

  it('cancels an order with the authenticated customer route', async () => {
    await cancelOrder('order-1')
    expect(request).toHaveBeenCalledWith('/orders/order-1/cancel', expect.objectContaining({ method: 'PATCH', authMode: 'bearer' }))
  })
})
