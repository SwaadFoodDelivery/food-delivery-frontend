<template>
  <main class="history">
    <header class="history__header">
      <div>
        <p class="history__eyebrow">Swaad demo</p>
        <h1>Your orders</h1>
        <p class="history__subtext">A recipient-scoped view of your mock order and delivery history.</p>
      </div>
      <button type="button" class="history__back" @click="router.push({ name: ROUTE_NAMES.ORDER })">Order again</button>
    </header>

    <p v-if="error" class="history__error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="history__state">Loading order history…</p>
    <p v-else-if="!orders.length" class="history__state">No orders yet. Your next Shamgarh meal will appear here.</p>
    <section v-else class="history__list" aria-label="Order history">
      <article v-for="order in orders" :key="order.order_id" class="history__card">
        <div class="history__card-head">
          <div><h2>{{ order.restaurant_name }}</h2><time :datetime="order.created_at">{{ formatDate(order.created_at) }}</time></div>
          <span :class="['history__status', `history__status--${order.status}`]">{{ label(order.delivery_status || order.status) }}</span>
        </div>
        <div class="history__meta"><span>{{ money(order.total_amount_minor) }}</span><span>{{ order.payment_method }}</span><span v-if="order.delivery_status">{{ label(order.delivery_status) }}</span></div>
        <button type="button" class="history__details" @click="toggle(order)">{{ selectedId === order.order_id ? 'Hide timeline' : 'View timeline' }}</button>
        <ol v-if="selectedId === order.order_id" class="history__timeline">
          <li v-for="event in timeline" :key="`${event.to_status}-${event.changed_at}`"><strong>{{ label(event.to_status) }}</strong><time :datetime="event.changed_at">{{ formatDate(event.changed_at) }}</time></li>
          <li v-if="!timeline.length" class="history__muted">No status transitions recorded yet.</li>
        </ol>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { getOrderHistory, listOrders } from '@/services/orderService'

const router = useRouter()
const orders = ref([])
const timeline = ref([])
const selectedId = ref('')
const loading = ref(true)
const error = ref('')

function money(minor = 0) { return `₹${(Number(minor) / 100).toFixed(2)}` }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function label(value = '') { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

async function load() {
  try {
    const result = await listOrders()
    orders.value = result?.orders || []
  } catch (caught) { error.value = caught?.message || 'Order history could not be loaded.' }
  finally { loading.value = false }
}

async function toggle(order) {
  if (selectedId.value === order.order_id) { selectedId.value = ''; timeline.value = []; return }
  try {
    const result = await getOrderHistory(order.order_id)
    selectedId.value = order.order_id
    timeline.value = result?.order_status || []
  } catch (caught) { error.value = caught?.message || 'Order timeline could not be loaded.' }
}

load()
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
.history__timeline { display: grid; gap: .5rem; margin: 1rem 0 0; padding-left: 1.25rem; }
.history__timeline li { display: flex; justify-content: space-between; gap: 1rem; }
.history__state, .history__error { border-radius: 12px; padding: 1rem; background: rgb(var(--v-theme-surface)); }
.history__error { color: rgb(var(--v-theme-error)); }
@media (max-width: 560px) { .history__header, .history__card-head { align-items: stretch; flex-direction: column; } .history__back { width: 100%; } }
</style>
