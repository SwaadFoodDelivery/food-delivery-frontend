<template>
  <div class="owner-page">
    <header class="owner-page__bar">
      <button type="button" class="owner-page__brand" @click="router.push({ name: ROUTE_NAMES.LANDING })">
        <span class="owner-page__mark" aria-hidden="true">✦</span>
        <span>Swaad</span>
      </button>
      <v-chip color="secondary" variant="tonal">Restaurant operations</v-chip>
    </header>

    <main class="owner-page__main">
      <section class="owner-page__intro" aria-labelledby="owner-orders-title">
        <div>
          <p class="eyebrow">Owner workspace</p>
          <h1 id="owner-orders-title">{{ restaurant?.name || 'Your order queue' }}</h1>
          <p>Move demo orders through the kitchen so customers can follow the simulated delivery.</p>
        </div>
        <AppButton variant="secondary" :loading="loading" @click="loadOrders">Refresh queue</AppButton>
      </section>

      <FormAlert :message="errorMessage" />
      <FormAlert v-if="successMessage" :message="successMessage" type="success" />

      <div v-if="loading" class="owner-orders-grid" aria-label="Loading restaurant orders">
        <v-skeleton-loader v-for="index in 3" :key="index" type="article" />
      </div>
      <section v-else-if="orders.length === 0" class="empty-state" aria-live="polite">
        <v-icon icon="mdi-receipt-text-clock-outline" size="46" aria-hidden="true" />
        <h2>No demo orders yet</h2>
        <p>Customer orders will appear here as soon as the demo checkout is completed.</p>
      </section>
      <section v-else class="owner-orders-grid" aria-label="Restaurant orders">
        <v-card v-for="order in orders" :key="order.order_id" class="owner-order-card">
          <v-card-item>
            <template #prepend><v-icon icon="mdi-receipt-text-outline" color="primary" aria-hidden="true" /></template>
            <v-card-title>Order {{ shortId(order.order_id) }}</v-card-title>
            <v-card-subtitle>{{ formatDate(order.created_at) }}</v-card-subtitle>
            <template #append><v-chip :color="statusColor(order.status)" size="small" variant="tonal">{{ statusLabel(order.status) }}</v-chip></template>
          </v-card-item>
          <v-card-text>
            <div class="owner-order-card__summary">
              <span>Total</span><strong>{{ money(order.total_amount_minor) }}</strong>
              <span>Payment</span><span>{{ paymentLabel(order.payment_method) }}</span>
            </div>
            <div v-if="nextActions(order.status).length" class="owner-order-card__actions">
              <AppButton
                v-for="action in nextActions(order.status)"
                :key="action.status"
                :variant="action.status === 'rejected' ? 'ghost' : 'primary'"
                :loading="updatingOrderId === order.order_id && updatingStatus === action.status"
                :disabled="Boolean(updatingOrderId)"
                @click="changeStatus(order, action)"
              >{{ action.label }}</AppButton>
            </div>
            <p v-else class="muted-copy">This order is no longer waiting for a restaurant action.</p>
          </v-card-text>
        </v-card>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { getOwnedRestaurant, listOwnerOrders, updateOwnerOrderStatus } from '@/services/restaurantOwnerService'
import { toErrorMessage } from '@/utils/errors'

const router = useRouter()
const restaurant = ref(null)
const orders = ref([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const updatingOrderId = ref('')
const updatingStatus = ref('')

const actionMap = {
  order_created: [{ status: 'accepted', label: 'Accept order' }, { status: 'rejected', label: 'Reject' }],
  confirmed: [{ status: 'accepted', label: 'Accept order' }, { status: 'rejected', label: 'Reject' }],
  accepted: [{ status: 'preparing', label: 'Start preparing' }, { status: 'rejected', label: 'Reject' }],
  preparing: [{ status: 'ready_for_pickup', label: 'Mark ready' }]
}

function money(minor = 0) {
  return `₹${(Number(minor) / 100).toFixed(2)}`
}

function shortId(id = '') {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Recently'
}

function paymentLabel(value) {
  return value === 'cod' ? 'Cash on delivery' : 'Demo payment'
}

function statusLabel(value) {
  return (value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusColor(value) {
  return { order_created: 'warning', confirmed: 'warning', accepted: 'info', preparing: 'primary', ready_for_pickup: 'success', rejected: 'error', delivered: 'success' }[value] || 'secondary'
}

function nextActions(status) {
  return actionMap[status] || []
}

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadOrders() {
  loading.value = true
  clearMessages()
  try {
    if (!restaurant.value) restaurant.value = await getOwnedRestaurant()
    const result = await listOwnerOrders(restaurant.value.restaurant_id)
    orders.value = result?.orders || []
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'The restaurant order queue could not be loaded.')
  } finally {
    loading.value = false
  }
}

async function changeStatus(order, action) {
  updatingOrderId.value = order.order_id
  updatingStatus.value = action.status
  clearMessages()
  try {
    const updated = await updateOwnerOrderStatus({ restaurantId: restaurant.value.restaurant_id, orderId: order.order_id, status: action.status })
    orders.value = orders.value.map((candidate) => candidate.order_id === order.order_id ? updated : candidate)
    successMessage.value = `Order ${shortId(order.order_id)} is now ${statusLabel(action.status).toLowerCase()}.`
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'That order update could not be saved.')
  } finally {
    updatingOrderId.value = ''
    updatingStatus.value = ''
  }
}

onMounted(loadOrders)
</script>

<style scoped>
.owner-page { min-height: 100vh; background: rgb(var(--v-theme-background)); }
.owner-page__bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(var(--v-theme-on-background), .08); }
.owner-page__brand { display: inline-flex; align-items: center; gap: .45rem; border: 0; background: transparent; color: rgb(var(--v-theme-primary)); font: inherit; font-weight: 800; cursor: pointer; }
.owner-page__mark { font-size: 1.4rem; }
.owner-page__main { width: min(1100px, 100%); margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.owner-page__intro { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin-bottom: 2rem; }
.owner-page__intro h1 { margin: 0; color: rgb(var(--v-theme-primary)); }
.owner-page__intro p:not(.eyebrow) { max-width: 620px; margin: .6rem 0 0; color: rgba(var(--v-theme-on-background), .72); }
.owner-orders-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
.owner-order-card { border: 1px solid rgba(var(--v-theme-on-background), .08); }
.owner-order-card__summary { display: grid; grid-template-columns: 1fr auto; gap: .6rem .8rem; color: rgba(var(--v-theme-on-background), .7); }
.owner-order-card__summary strong { color: rgb(var(--v-theme-on-background)); }
.owner-order-card__actions { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1.25rem; }
.empty-state { display: grid; justify-items: center; gap: .6rem; padding: 4rem 1rem; text-align: center; color: rgba(var(--v-theme-on-background), .7); }
.empty-state h2 { margin: 0; color: rgb(var(--v-theme-on-background)); }
.empty-state p { margin: 0; }
.muted-copy { margin: 1.25rem 0 0; color: rgba(var(--v-theme-on-background), .64); }
@media (max-width: 650px) { .owner-page__intro { align-items: stretch; flex-direction: column; } .owner-page__bar { align-items: flex-start; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
