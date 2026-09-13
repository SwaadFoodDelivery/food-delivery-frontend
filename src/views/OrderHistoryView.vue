<template>
  <main class="history">
    <header class="history__header">
      <div>
        <p class="history__eyebrow">Swaad demo</p>
        <h1>Your orders</h1>
        <p class="history__subtext">A recipient-scoped view of your mock order and delivery history.</p>
      </div>
      <div class="history__actions">
        <button type="button" class="history__back" :disabled="loading" :aria-busy="loading" @click="refresh">Refresh</button>
        <button type="button" class="history__back" @click="router.push({ name: ROUTE_NAMES.ORDER })">Order again</button>
      </div>
    </header>

    <p v-if="error" class="history__error" role="alert">{{ error }}</p>
    <p v-if="actionError" class="history__error" role="alert">{{ actionError }}</p>
    <p v-if="!loading && !error && !orders.length" class="history__state">No orders yet. Your next Shamgarh meal will appear here.</p>
    <section v-if="orders.length" class="history__list" aria-label="Order history" :aria-busy="loading || loadingMore">
      <article v-for="(order, index) in orders" :key="orderKey(order)" class="history__card">
        <div class="history__card-head">
          <div><h2>{{ order.restaurant_name }}</h2><time :datetime="order.created_at">{{ formatDate(order.created_at) }}</time></div>
          <span :class="['history__status', `history__status--${order.status}`]">{{ label(order.delivery_status || order.status) }}</span>
        </div>
        <div class="history__meta"><span>{{ money(order.total_amount_minor) }}</span><span>{{ order.payment_method }}</span><span v-if="order.delivery_status">{{ label(order.delivery_status) }}</span></div>
        <div class="history__actions">
          <button type="button" class="history__details" :disabled="loading || isAmbiguous(order) || cancellingKey === orderKey(order) || (selectedKey === orderKey(order) && timelineLoading)" :aria-describedby="isAmbiguous(order) ? `history-identity-${index}` : undefined" :aria-expanded="selectedKey === orderKey(order)" :aria-busy="selectedKey === orderKey(order) && timelineLoading" @click="toggle(order)">{{ selectedKey === orderKey(order) ? 'Hide timeline' : 'View timeline' }}</button>
          <button v-if="canCancel(order)" type="button" class="history__cancel" :disabled="loading || Boolean(cancellingKey) || isAmbiguous(order)" :aria-describedby="isAmbiguous(order) ? `history-identity-${index}` : undefined" :aria-busy="cancellingKey === orderKey(order)" @click="cancel(order)">Cancel demo order</button>
        </div>
        <p v-if="isAmbiguous(order)" :id="`history-identity-${index}`" class="history__identity">Timeline and cancellation are unavailable because multiple loaded orders share this order ID. These actions cannot safely identify this order.</p>
        <p v-if="selectedKey === orderKey(order) && timelineLoading" role="status">Loading timeline…</p>
        <ol v-else-if="selectedKey === orderKey(order)" class="history__timeline">
          <li v-for="event in timeline" :key="`${event.to_status}-${event.changed_at}`"><strong>{{ label(event.to_status) }}</strong><time :datetime="event.changed_at">{{ formatDate(event.changed_at) }}</time></li>
          <li v-if="!timeline.length" class="history__muted">No status transitions recorded yet.</li>
        </ol>
      </article>
    </section>
    <div class="history__pagination">
      <p ref="pageStatus" class="history__state" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">{{ pageMessage }}</p>
      <button v-if="invalidCursor" ref="restartButton" type="button" class="history__back" :disabled="loading" @click="refresh">Restart from first page</button>
      <button v-else-if="nextCursor" ref="moreButton" type="button" class="history__back" :disabled="loading || loadingMore" :aria-busy="loadingMore" @click="loadMore">Load older orders</button>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { cancelOrder, getOrderHistory, listOrders } from '@/services/orderService'

const router = useRouter()
const orders = ref([])
const timeline = ref([])
const selectedKey = ref('')
const timelineLoading = ref(false)
const cancellingKey = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const loaded = ref(false)
const nextCursor = ref('')
const invalidCursor = ref(false)
const error = ref('')
const actionError = ref('')
const pageStatus = ref(null)
const moreButton = ref(null)
const restartButton = ref(null)
let generation = 0
let timelineGeneration = 0
let disposed = false

const duplicateIds = computed(() => {
  const seen = new Set()
  const duplicates = new Set()
  orders.value.forEach(order => {
    if (seen.has(order.order_id)) duplicates.add(order.order_id)
    seen.add(order.order_id)
  })
  return duplicates
})
const pageMessage = computed(() => {
  if (loading.value) return 'Loading order history…'
  if (loadingMore.value) return 'Loading older orders…'
  if (invalidCursor.value) return `${orders.value.length} orders shown. Restart from the first page to continue.`
  if (!loaded.value) return 'Order history has not loaded.'
  return `${orders.value.length} orders shown.${nextCursor.value ? '' : ' No more orders.'}`
})

// Preserve database timestamp precision. Date parsing is for display only.
function orderKey(order) { return JSON.stringify([order.created_at, order.order_id]) }
function uniqueOrders(rows) {
  const seen = new Set()
  return rows.filter(order => {
    const key = orderKey(order)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
// These endpoints accept only order_id. Observed collisions are blocked here;
// unseen duplicate IDs still require a future backend composite-identity fix.
function isAmbiguous(order) { return duplicateIds.value.has(order.order_id) }
function isCurrent(requestGeneration) { return !disposed && generation === requestGeneration }
function clearTimeline() {
  timelineGeneration += 1
  selectedKey.value = ''
  timeline.value = []
  timelineLoading.value = false
}

function money(minor = 0) { return `₹${(Number(minor) / 100).toFixed(2)}` }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function label(value = '') { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function canCancel(order) { return !['cancelled', 'rejected', 'delivered'].includes(order.status) }

async function refresh() {
  if (loading.value || disposed) return
  const requestGeneration = ++generation
  loading.value = true
  loadingMore.value = false
  cancellingKey.value = ''
  error.value = ''
  actionError.value = ''
  clearTimeline()
  try {
    const result = await listOrders()
    if (!isCurrent(requestGeneration)) return
    orders.value = uniqueOrders(result?.orders || [])
    nextCursor.value = result?.next_cursor || ''
    invalidCursor.value = false
    loaded.value = true
  } catch (caught) {
    if (isCurrent(requestGeneration)) error.value = caught?.message || 'Order history could not be loaded.'
  } finally {
    if (isCurrent(requestGeneration)) loading.value = false
  }
}

async function loadMore() {
  if (disposed || loading.value || loadingMore.value || invalidCursor.value || !nextCursor.value) return
  const requestGeneration = generation
  const hadFocus = document.activeElement === moreButton.value
  loadingMore.value = true
  error.value = ''
  try {
    const result = await listOrders({ cursor: nextCursor.value })
    if (!isCurrent(requestGeneration)) return
    orders.value = uniqueOrders([...orders.value, ...(result?.orders || [])])
    nextCursor.value = result?.next_cursor || ''
    const selected = orders.value.find(order => orderKey(order) === selectedKey.value)
    if (selected && isAmbiguous(selected)) clearTimeline()
  } catch (caught) {
    if (!isCurrent(requestGeneration)) return
    if (caught?.status === 400) {
      invalidCursor.value = true
      error.value = 'This continuation is no longer valid. Restart from the first page to load more orders.'
    } else {
      error.value = caught?.message || 'Older orders could not be loaded. Try again.'
    }
  } finally {
    if (isCurrent(requestGeneration)) {
      loadingMore.value = false
      await nextTick()
      // If the focused button disappeared, put focus on its replacement/status.
      // Do not steal focus if the user moved elsewhere during the request.
      if (isCurrent(requestGeneration) && hadFocus && document.activeElement === document.body) {
        if (invalidCursor.value) restartButton.value?.focus()
        else if (!nextCursor.value) pageStatus.value?.focus()
      }
    }
  }
}

async function toggle(order) {
  if (disposed || loading.value || isAmbiguous(order) || cancellingKey.value === orderKey(order)) return
  if (selectedKey.value === orderKey(order)) {
    if (!timelineLoading.value) clearTimeline()
    return
  }
  const requestGeneration = generation
  const requestTimeline = ++timelineGeneration
  selectedKey.value = orderKey(order)
  timeline.value = []
  timelineLoading.value = true
  actionError.value = ''
  const current = () => isCurrent(requestGeneration) && timelineGeneration === requestTimeline && !isAmbiguous(order)
  try {
    const result = await getOrderHistory(order.order_id)
    if (!current()) return
    timeline.value = result?.order_status || []
  } catch (caught) {
    if (current()) {
      actionError.value = caught?.message || 'Order timeline could not be loaded.'
      selectedKey.value = ''
    }
  } finally {
    if (current()) timelineLoading.value = false
  }
}

async function cancel(order) {
  if (disposed || loading.value || cancellingKey.value || isAmbiguous(order) || !canCancel(order)) return
  const requestGeneration = generation
  const key = orderKey(order)
  cancellingKey.value = key
  actionError.value = ''
  try {
    await cancelOrder(order.order_id)
    if (!isCurrent(requestGeneration) || isAmbiguous(order)) return
    orders.value = orders.value.map(row => orderKey(row) === key ? { ...row, status: 'cancelled', delivery_status: '' } : row)
    if (selectedKey.value === key) clearTimeline()
  } catch (caught) {
    if (isCurrent(requestGeneration)) actionError.value = caught?.message || 'This order could not be cancelled.'
  } finally {
    if (isCurrent(requestGeneration)) cancellingKey.value = ''
  }
}

onBeforeUnmount(() => { disposed = true; generation += 1; timelineGeneration += 1 })
refresh()
</script>

<style scoped>
.history { min-height: 100vh; max-width: 780px; margin: 0 auto; padding: 2rem 1.25rem 4rem; color: rgb(var(--v-theme-on-background)); }
.history__header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.history__eyebrow { margin: 0 0 .35rem; color: rgb(var(--v-theme-primary)); font-size: .8rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: 0; color: rgb(var(--v-theme-primary)); }
.history__subtext { margin: .5rem 0 0; color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity)); }
.history__back, .history__details { border: 1px solid rgb(var(--v-theme-primary)); border-radius: 10px; background: transparent; color: rgb(var(--v-theme-primary)); cursor: pointer; font: inherit; font-weight: 700; padding: .7rem 1rem; white-space: nowrap; }
.history__list { display: grid; gap: .75rem; }
.history__card { border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 16px; background: rgb(var(--v-theme-surface)); padding: 1rem; }
.history__card-head, .history__meta { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.history__card h2 { margin: 0; font-size: 1.05rem; }
.history__card time, .history__muted { color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity)); font-size: .8rem; }
.history__status { border-radius: 999px; padding: .35rem .65rem; background: rgb(var(--v-theme-secondary)); color: rgb(var(--v-theme-on-secondary)); font-size: .8rem; font-weight: 700; }
.history__status--cancelled, .history__status--rejected { background: rgb(var(--v-theme-error)); color: rgb(var(--v-theme-on-error)); }
.history__meta { justify-content: flex-start; margin: 1rem 0; color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity)); font-size: .9rem; }
.history__details { padding: .45rem .7rem; }
.history__actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.history__cancel { border: 1px solid rgb(var(--v-theme-error)); border-radius: 10px; background: transparent; color: rgb(var(--v-theme-error)); cursor: pointer; font: inherit; font-weight: 700; padding: .45rem .7rem; }
.history__timeline { display: grid; gap: .5rem; margin: 1rem 0 0; padding-left: 1.25rem; }
.history__timeline li { display: flex; justify-content: space-between; gap: 1rem; }
.history__state, .history__error { border-radius: 12px; padding: 1rem; background: rgb(var(--v-theme-surface)); }
.history__error { color: rgb(var(--v-theme-error)); }
.history__identity { font-size: .9rem; margin-bottom: 0; }
.history__pagination { margin-top: 1rem; }
.history button:disabled { opacity: .6; cursor: not-allowed; }
.history button:focus-visible, .history__state:focus { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.history__card, .history__timeline li { overflow-wrap: anywhere; min-width: 0; }
@media (max-width: 560px) { .history__header, .history__card-head { align-items: stretch; flex-direction: column; } .history__back { width: 100%; } }
</style>
