import { request } from '@/services/api'
import { getOrderHistory, listOrders } from '@/services/orderService'

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

  it('loads a single order timeline with bearer auth', async () => {
    await getOrderHistory('order-1')
    expect(request).toHaveBeenCalledWith('/orders/order-1/history', expect.objectContaining({ authMode: 'bearer' }))
  })
})
