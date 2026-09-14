import { flushPromises, mount } from '@vue/test-utils'
import OrderHistoryView from '@/views/OrderHistoryView.vue'
import { cancelOrder, getOrderHistory, listOrders } from '@/services/orderService'

jest.mock('@/services/orderService')
jest.mock('vue-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const row = (id, createdAt = '2026-09-13T10:00:00.123456Z') => ({
  order_id: id, created_at: createdAt, restaurant_name: `Kitchen ${id}`,
  status: 'order_created', payment_method: 'cod', total_amount_minor: 12000
})
const event = (status) => ({ to_status: status, changed_at: '2026-09-13T11:00:00Z' })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('OrderHistoryView pagination', () => {
  let wrapper
  const button = (name) => wrapper.findAll('button').find(node => node.text() === name)
  const cards = () => wrapper.findAll('article')
  const titles = () => cards().map(card => card.find('h2').text())
  const click = async (name) => { await button(name).trigger('click'); await flushPromises() }
  const open = async (page = { orders: [row('one')], next_cursor: 'opaque-1' }) => {
    listOrders.mockResolvedValueOnce(page)
    wrapper = mount(OrderHistoryView, { attachTo: document.body })
    await flushPromises()
  }

  beforeEach(() => jest.resetAllMocks())
  afterEach(() => wrapper?.unmount())

  it('appends in server order, deduplicates exact raw identities and hides More at the end', async () => {
    await open()
    listOrders.mockResolvedValueOnce({ orders: [row('one'), row('two')], next_cursor: '' })
    button('Load older orders').element.focus()
    await click('Load older orders')
    expect(listOrders).toHaveBeenNthCalledWith(2, { cursor: 'opaque-1' })
    expect(titles()).toEqual(['Kitchen one', 'Kitchen two'])
    expect(button('Load older orders')).toBeUndefined()
    expect(wrapper.find('[role="status"]').text()).toBe('2 orders shown. No more orders.')
    expect(document.activeElement).toBe(wrapper.find('[role="status"]').element)
  })

  it.each([{}, { next_cursor: '' }])('supports legacy/end responses %j', async (cursorFields) => {
    await open({ orders: [row('one')], ...cursorFields })
    expect(button('Load older orders')).toBeUndefined()
    expect(titles()).toEqual(['Kitchen one'])
  })

  it('preserves distinct microsecond timestamps and blocks observed duplicate-ID actions', async () => {
    const precise = row('same', '2026-09-13T10:00:00.123457Z')
    await open({ orders: [row('same'), row('same')], next_cursor: 'older' })
    listOrders.mockResolvedValueOnce({ orders: [precise, row('other')] })
    await click('Load older orders')
    expect(cards()).toHaveLength(3)
    expect(cards().map(card => card.find('time').attributes('datetime'))).toEqual([row('same').created_at, precise.created_at, row('other').created_at])
    for (const card of cards().slice(0, 2)) {
      expect(card.text()).toContain('multiple loaded orders share this order ID')
      for (const action of card.findAll('button')) {
        expect(action.element.disabled).toBe(true)
        expect(action.attributes('aria-describedby')).toBe(card.find('.history__identity').attributes('id'))
        await action.trigger('click')
      }
    }
    expect(getOrderHistory).not.toHaveBeenCalled()
    expect(cancelOrder).not.toHaveBeenCalled()
    expect(cards()[2].find('button').element.disabled).toBe(false)
  })

  it('Refresh replaces accumulated rows and resets to an omitted cursor', async () => {
    await open()
    listOrders.mockResolvedValueOnce({ orders: [row('two')], next_cursor: 'opaque-2' })
    await click('Load older orders')
    listOrders.mockResolvedValueOnce({ orders: [row('fresh')], next_cursor: 'new-chain' })
    await click('Refresh')
    expect(listOrders).toHaveBeenNthCalledWith(3)
    expect(titles()).toEqual(['Kitchen fresh'])
    listOrders.mockResolvedValueOnce({ orders: [] })
    await click('Load older orders')
    expect(listOrders).toHaveBeenNthCalledWith(4, { cursor: 'new-chain' })
  })

  it('retains rows and cursor on transient continuation failure so retry uses the same cursor', async () => {
    await open()
    listOrders.mockRejectedValueOnce({ status: 503, message: 'Please retry later' })
    await click('Load older orders')
    expect(titles()).toEqual(['Kitchen one'])
    expect(wrapper.find('[role="alert"]').text()).toContain('Please retry later')
    expect(button('Load older orders').element.disabled).toBe(false)
    listOrders.mockResolvedValueOnce({ orders: [row('two')] })
    await click('Load older orders')
    expect(listOrders).toHaveBeenNthCalledWith(3, { cursor: 'opaque-1' })
    expect(titles()).toEqual(['Kitchen one', 'Kitchen two'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('requires explicit restart after continuation 400, preserves rows, and never auto-falls back', async () => {
    await open()
    listOrders.mockRejectedValueOnce({ status: 400, message: 'Invalid cursor' })
    await click('Load older orders')
    expect(listOrders).toHaveBeenCalledTimes(2)
    expect(titles()).toEqual(['Kitchen one'])
    expect(button('Load older orders')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('Restart from the first page')
    listOrders.mockRejectedValueOnce({ status: 503, message: 'Restart unavailable' })
    await click('Restart from first page')
    expect(titles()).toEqual(['Kitchen one'])
    expect(button('Restart from first page')).toBeDefined()
    listOrders.mockResolvedValueOnce({ orders: [row('fresh')], next_cursor: 'fresh-cursor' })
    await click('Restart from first page')
    expect(listOrders).toHaveBeenNthCalledWith(3)
    expect(listOrders).toHaveBeenNthCalledWith(4)
    expect(titles()).toEqual(['Kitchen fresh'])
    expect(button('Restart from first page')).toBeUndefined()
    expect(button('Load older orders')).toBeDefined()
  })

  it('retains rows and continuation after Refresh fails', async () => {
    await open()
    listOrders.mockRejectedValueOnce(new Error('Refresh unavailable'))
    await click('Refresh')
    expect(titles()).toEqual(['Kitchen one'])
    expect(wrapper.text()).toContain('Refresh unavailable')
    listOrders.mockResolvedValueOnce({ orders: [row('two')] })
    await click('Load older orders')
    expect(listOrders).toHaveBeenNthCalledWith(3, { cursor: 'opaque-1' })
  })

  it('shows an initial failure and supports explicit Refresh retry', async () => {
    listOrders.mockRejectedValueOnce(new Error('Unavailable'))
    wrapper = mount(OrderHistoryView)
    await flushPromises()
    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).not.toContain('No orders yet')
    listOrders.mockResolvedValueOnce({ orders: [] })
    await click('Refresh')
    expect(wrapper.text()).toContain('No orders yet')
  })

  it('disables duplicate More and Refresh clicks and announces loading without hiding rows', async () => {
    await open()
    const more = deferred()
    listOrders.mockReturnValueOnce(more.promise)
    await button('Load older orders').trigger('click')
    expect(button('Load older orders').attributes('aria-busy')).toBe('true')
    await button('Load older orders').trigger('click')
    expect(listOrders).toHaveBeenCalledTimes(2)
    expect(titles()).toEqual(['Kitchen one'])
    expect(wrapper.find('[role="status"]').text()).toContain('Loading older orders')
    const fresh = deferred()
    listOrders.mockReturnValueOnce(fresh.promise)
    await button('Refresh').trigger('click')
    await button('Refresh').trigger('click')
    expect(listOrders).toHaveBeenCalledTimes(3)
    expect(button('Refresh').attributes('aria-busy')).toBe('true')
    fresh.resolve({ orders: [row('fresh')] })
    more.resolve({ orders: [row('stale')] })
    await flushPromises()
    expect(titles()).toEqual(['Kitchen fresh'])
  })

  it.each(['success', 'failure'])('ignores late continuation %s after Refresh', async (outcome) => {
    await open()
    const more = deferred()
    listOrders.mockReturnValueOnce(more.promise)
    await button('Load older orders').trigger('click')
    listOrders.mockResolvedValueOnce({ orders: [row('fresh')], next_cursor: 'fresh-next' })
    await click('Refresh')
    if (outcome === 'success') more.resolve({ orders: [row('stale')], next_cursor: 'stale-next' })
    else more.reject({ status: 400 })
    await flushPromises()
    expect(titles()).toEqual(['Kitchen fresh'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    listOrders.mockResolvedValueOnce({ orders: [] })
    await click('Load older orders')
    expect(listOrders).toHaveBeenLastCalledWith({ cursor: 'fresh-next' })
  })

  it('an invalidated More response cannot end a newer More loading state', async () => {
    await open()
    const old = deferred(), latest = deferred()
    listOrders.mockReturnValueOnce(old.promise)
    await button('Load older orders').trigger('click')
    listOrders.mockResolvedValueOnce({ orders: [row('fresh')], next_cursor: 'new' })
    await click('Refresh')
    listOrders.mockReturnValueOnce(latest.promise)
    await button('Load older orders').trigger('click')
    old.resolve({ orders: [row('stale')] })
    await flushPromises()
    expect(button('Load older orders').element.disabled).toBe(true)
    latest.resolve({ orders: [row('older')] })
    await flushPromises()
    expect(titles()).toEqual(['Kitchen fresh', 'Kitchen older'])
  })

  it('switching timelines ignores an older response and blocks repeat requests for the pending row', async () => {
    await open({ orders: [row('one'), row('two')] })
    const first = deferred()
    getOrderHistory.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ order_status: [event('preparing')] })
    await cards()[0].find('button').trigger('click')
    await cards()[0].find('button').trigger('click')
    expect(getOrderHistory).toHaveBeenCalledTimes(1)
    await cards()[1].find('button').trigger('click')
    await flushPromises()
    first.resolve({ order_status: [event('delivered')] })
    await flushPromises()
    expect(cards()[0].find('ol').exists()).toBe(false)
    expect(cards()[1].find('ol').text()).toContain('Preparing')
    expect(wrapper.text()).not.toContain('Delivered')
  })

  it.each(['success', 'failure'])('Refresh invalidates a pending timeline %s', async (outcome) => {
    await open()
    const history = deferred()
    getOrderHistory.mockReturnValueOnce(history.promise)
    await button('View timeline').trigger('click')
    listOrders.mockResolvedValueOnce({ orders: [row('one')] })
    await click('Refresh')
    if (outcome === 'success') history.resolve({ order_status: [event('delivered')] })
    else history.reject(new Error('Stale timeline error'))
    await flushPromises()
    expect(wrapper.find('ol').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('a duplicate ID discovered during pagination clears and invalidates its timeline', async () => {
    await open()
    const history = deferred()
    getOrderHistory.mockReturnValueOnce(history.promise)
    await button('View timeline').trigger('click')
    listOrders.mockResolvedValueOnce({ orders: [row('one', '2026-09-12T10:00:00Z')] })
    await click('Load older orders')
    history.resolve({ order_status: [event('delivered')] })
    await flushPromises()
    expect(wrapper.find('ol').exists()).toBe(false)
    expect(cards()).toHaveLength(2)
    expect(cards().every(card => card.find('button').element.disabled)).toBe(true)
  })

  it('timeline and cancel failures keep the existing rows visible and retryable', async () => {
    await open()
    getOrderHistory.mockRejectedValueOnce(new Error('Timeline unavailable'))
    await click('View timeline')
    expect(titles()).toEqual(['Kitchen one'])
    expect(button('View timeline').element.disabled).toBe(false)
    cancelOrder.mockRejectedValueOnce(new Error('Cancellation unavailable'))
    await click('Cancel demo order')
    expect(titles()).toEqual(['Kitchen one'])
    expect(wrapper.text()).toContain('Cancellation unavailable')
    expect(button('Cancel demo order').element.disabled).toBe(false)
  })

  it.each([
    ['Refresh', 'success'], ['Refresh', 'failure'],
    ['Restart from first page', 'success'], ['Restart from first page', 'failure']
  ])('blocks %s until pending cancellation resolves with %s', async (control, outcome) => {
    await open()
    if (control === 'Restart from first page') {
      listOrders.mockRejectedValueOnce({ status: 400 })
      await click('Load older orders')
    }
    const listCallsBeforeCancel = listOrders.mock.calls.length
    const cancellation = deferred()
    cancelOrder.mockReturnValueOnce(cancellation.promise)
    await button('Cancel demo order').trigger('click')
    await button('Cancel demo order').trigger('click')
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(button('Refresh').element.disabled).toBe(true)
    expect(button(control).element.disabled).toBe(true)
    await click(control)
    // Exercise the handler guard as well as the native disabled button.
    await wrapper.vm.$.setupState.refresh()
    expect(listOrders).toHaveBeenCalledTimes(listCallsBeforeCancel)
    expect(button('Cancel demo order').element.disabled).toBe(true)
    if (outcome === 'success') cancellation.resolve({})
    else cancellation.reject(new Error('Cancellation unavailable'))
    await flushPromises()
    expect(button(control).element.disabled).toBe(false)
    if (outcome === 'success') {
      expect(wrapper.text()).toContain('Cancelled')
      expect(button('Cancel demo order')).toBeUndefined()
    } else {
      expect(wrapper.text()).toContain('Cancellation unavailable')
      expect(button('Cancel demo order').element.disabled).toBe(false)
    }
    listOrders.mockResolvedValueOnce({ orders: [{ ...row('one'), status: outcome === 'success' ? 'cancelled' : 'order_created' }] })
    await click(control)
    expect(listOrders).toHaveBeenCalledTimes(listCallsBeforeCancel + 1)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
  })

  it.each(['', 'next-page'])('restores keyboard focus after successful restart with cursor=%s', async (cursor) => {
    await open()
    listOrders.mockRejectedValueOnce({ status: 400 })
    await click('Load older orders')
    button('Restart from first page').element.focus()
    listOrders.mockResolvedValueOnce({ orders: [row('fresh')], next_cursor: cursor })
    await click('Restart from first page')
    expect(button('Restart from first page')).toBeUndefined()
    expect(document.activeElement).toBe(cursor
      ? button('Load older orders').element
      : wrapper.find('[role="status"]').element)
  })

  it('does not steal focus moved elsewhere during a pending restart', async () => {
    await open()
    listOrders.mockRejectedValueOnce({ status: 400 })
    await click('Load older orders')
    const restart = deferred()
    listOrders.mockReturnValueOnce(restart.promise)
    button('Restart from first page').element.focus()
    await button('Restart from first page').trigger('click')
    button('Order again').element.focus()
    restart.resolve({ orders: [row('fresh')], next_cursor: 'fresh-next' })
    await flushPromises()
    expect(document.activeElement).toBe(button('Order again').element)
  })

  it.each(['list', 'more', 'timeline', 'cancel'])('ignores pending %s results after unmount', async (operation) => {
    const pending = deferred()
    if (operation === 'list') {
      listOrders.mockReturnValueOnce(pending.promise)
      wrapper = mount(OrderHistoryView)
    } else {
      await open()
      if (operation === 'more') { listOrders.mockReturnValueOnce(pending.promise); await button('Load older orders').trigger('click') }
      if (operation === 'timeline') { getOrderHistory.mockReturnValueOnce(pending.promise); await button('View timeline').trigger('click') }
      if (operation === 'cancel') { cancelOrder.mockReturnValueOnce(pending.promise); await button('Cancel demo order').trigger('click') }
    }
    const state = wrapper.vm.$.setupState
    const before = { orders: state.orders, error: state.error, timeline: state.timeline, actionError: state.actionError }
    wrapper.unmount()
    pending.resolve({ orders: [row('stale')], order_status: [event('delivered')] })
    await flushPromises()
    expect(state.orders).toBe(before.orders)
    expect(state.timeline).toBe(before.timeline)
    expect(state.error).toBe(before.error)
    expect(state.actionError).toBe(before.actionError)
  })
})
