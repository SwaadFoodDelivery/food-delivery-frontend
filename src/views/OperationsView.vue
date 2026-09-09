<template>
  <div class="operations-page">
    <header class="operations-page__bar">
      <button type="button" class="operations-page__brand" @click="router.push({ name: ROUTE_NAMES.LANDING })">
        <span class="operations-page__mark" aria-hidden="true">✦</span>
        <span>Swaad</span>
      </button>
      <v-chip color="secondary" variant="tonal">Operations demo</v-chip>
    </header>

    <main class="operations-page__main">
      <section class="operations-page__intro" aria-labelledby="operations-title">
        <div>
          <p class="eyebrow">Restaurant manager workspace</p>
          <h1 id="operations-title">Keep the demo moving</h1>
          <p>See order health, fictional driver coverage, and the one intervention available in this learning build.</p>
        </div>
        <AppButton variant="secondary" :loading="loading" @click="load">Refresh view</AppButton>
      </section>

      <FormAlert :message="errorMessage" />
      <FormAlert v-if="successMessage" :message="successMessage" type="success" />

      <div v-if="loading && !overview" class="operations-skeleton" aria-label="Loading operations overview">
        <v-skeleton-loader v-for="index in 4" :key="index" type="article" />
      </div>
      <template v-else-if="overview">
        <section class="summary-grid" aria-label="Operations summary">
          <v-card v-for="metric in metrics" :key="metric.label" class="summary-card">
            <v-card-text><span class="summary-card__label">{{ metric.label }}</span><strong>{{ metric.value }}</strong><span class="summary-card__hint">{{ metric.hint }}</span></v-card-text>
          </v-card>
        </section>

        <section class="operations-section" aria-labelledby="orders-title">
          <div class="section-heading">
            <div><p class="eyebrow">Order control</p><h2 id="orders-title">Recent orders</h2></div>
            <v-select v-model="statusFilter" :items="statusOptions" label="Filter status" hide-details density="compact" class="status-filter" @update:model-value="load" />
          </div>
          <div v-if="overview.orders.length === 0" class="empty-state"><v-icon icon="mdi-receipt-text-remove-outline" size="42" aria-hidden="true" /><p>No orders match this filter.</p></div>
          <div v-else class="orders-list">
            <v-card v-for="order in overview.orders" :key="order.order_id" class="order-row">
              <v-card-text class="order-row__content">
                <div class="order-row__identity"><strong>{{ shortId(order.order_id) }}</strong><span>{{ order.customer_name }} · {{ order.restaurant_name }}</span><small>{{ formatTime(order.created_at) }}</small></div>
                <div class="order-row__status"><v-chip :color="statusColor(order.status)" size="small" variant="tonal">{{ statusLabel(order.status) }}</v-chip><span v-if="order.delivery_status">{{ statusLabel(order.delivery_status) }}<span v-if="order.partner_name"> · {{ order.partner_name }}</span></span></div>
                <div class="order-row__amount"><strong>{{ money(order.total_amount_minor) }}</strong><AppButton v-if="canCancel(order.status)" variant="ghost" :loading="cancellingOrderId === order.order_id" :disabled="Boolean(cancellingOrderId)" @click="cancelOrder(order)">Cancel demo order</AppButton></div>
              </v-card-text>
            </v-card>
          </div>
        </section>

        <section class="operations-section" aria-labelledby="drivers-title">
          <div class="section-heading"><div><p class="eyebrow">Delivery coverage</p><h2 id="drivers-title">Fictional drivers</h2></div></div>
          <div class="drivers-grid">
            <v-card v-for="driver in overview.drivers" :key="driver.driver_id" class="driver-card">
              <v-card-text><div class="driver-card__heading"><strong>{{ driver.name }}</strong><v-chip :color="driver.is_available ? 'success' : 'secondary'" size="small" variant="tonal">{{ driver.is_available ? 'Available' : 'Offline' }}</v-chip></div><p>{{ driver.current_city || 'City not set' }}</p><small>{{ assignmentLabel(driver) }}</small></v-card-text>
            </v-card>
          </div>
        </section>

        <section class="operations-section" aria-labelledby="onboarding-title">
          <div class="section-heading">
            <div><p class="eyebrow">Authorized support</p><h2 id="onboarding-title">Onboarding review queue</h2></div>
            <v-select v-model="onboardingStatusFilter" :items="onboardingStatusOptions" label="Filter applications" hide-details density="compact" class="status-filter" @update:model-value="load" />
          </div>
          <p class="section-note">This demo queue models document review without a real delivery provider or external verification service.</p>
          <div v-if="onboardingReviews.length === 0" class="empty-state"><v-icon icon="mdi-file-check-outline" size="42" aria-hidden="true" /><p>No onboarding applications match this filter.</p></div>
          <div v-else class="review-list">
            <v-card v-for="item in onboardingReviews" :key="item.onboarding_id" class="review-card">
              <v-card-text class="review-card__content">
                <div class="review-card__identity"><strong>{{ item.user_name }}</strong><span>{{ statusLabel(item.role) }} · {{ item.phone }}</span><small>{{ item.email || 'No email provided' }} · {{ formatTime(item.created_at) }}</small></div>
                <div class="review-card__documents"><v-chip :color="item.uploaded_documents === item.required_documents && item.required_documents > 0 ? 'success' : 'warning'" size="small" variant="tonal">{{ item.uploaded_documents }}/{{ item.required_documents }} documents</v-chip><v-chip :color="statusColor(item.status)" size="small" variant="tonal">{{ statusLabel(item.status) }}</v-chip></div>
                <div v-if="item.status === 'pending_verification'" class="review-card__actions"><v-text-field v-model="rejectionReasons[item.onboarding_id]" label="Rejection feedback (if needed)" density="compact" hide-details /><AppButton variant="secondary" :loading="reviewingOnboardingId === item.onboarding_id" :disabled="Boolean(reviewingOnboardingId)" @click="reviewApplication(item, 'approved')">Approve</AppButton><AppButton variant="ghost" :loading="reviewingOnboardingId === item.onboarding_id" :disabled="Boolean(reviewingOnboardingId)" @click="reviewApplication(item, 'rejected')">Reject</AppButton></div>
                <p v-else-if="item.rejection_reason" class="review-card__reason">Feedback: {{ item.rejection_reason }}</p>
              </v-card-text>
            </v-card>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { cancelOperationsOrder, getOnboardingReviews, getOperationsOverview, reviewOnboarding } from '@/services/operationsService'
import { toErrorMessage } from '@/utils/errors'

const router = useRouter()
const overview = ref(null)
const loading = ref(true)
const statusFilter = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const cancellingOrderId = ref('')
const onboardingReviews = ref([])
const onboardingStatusFilter = ref('pending_verification')
const onboardingStatusOptions = [{ title: 'Pending review', value: 'pending_verification' }, { title: 'Approved', value: 'approved' }, { title: 'Rejected', value: 'rejected' }, { title: 'All applications', value: '' }]
const rejectionReasons = ref({})
const reviewingOnboardingId = ref('')
const statusOptions = [{ title: 'All orders', value: '' }, 'order_created', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'rejected']

const metrics = computed(() => {
  const summary = overview.value?.summary || {}
  return [
    { label: 'Orders tracked', value: summary.total_orders || 0, hint: 'All demo orders' },
    { label: 'Active orders', value: summary.active_orders || 0, hint: 'Needs attention' },
    { label: 'Delivered', value: summary.delivered_orders || 0, hint: 'Completed journeys' },
    { label: 'Drivers ready', value: `${summary.available_drivers || 0}/${overview.value?.drivers?.length || 0}`, hint: `${summary.active_drivers || 0} currently assigned` },
    { label: 'Failed payments', value: summary.failed_payments || 0, hint: 'Mock outcomes needing retry' },
    { label: 'Stalled deliveries', value: summary.stalled_deliveries || 0, hint: 'Due transitions to reconcile' }
  ]
})

function money(minor = 0) { return `₹${(Number(minor) / 100).toFixed(2)}` }
function shortId(id = '') { return id.slice(0, 8).toUpperCase() }
function formatTime(value) { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Recently' }
function statusLabel(value) { return (value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function statusColor(value) { return { order_created: 'warning', confirmed: 'warning', accepted: 'info', preparing: 'primary', ready_for_pickup: 'success', picked_up: 'info', out_for_delivery: 'primary', delivered: 'success', cancelled: 'error', rejected: 'error' }[value] || 'secondary' }
function canCancel(status) { return !['cancelled', 'rejected', 'delivered'].includes(status) }
function assignmentLabel(driver) { return driver.active_order_id ? `Order ${shortId(driver.active_order_id)} · ${statusLabel(driver.delivery_status)}` : 'No active assignment' }
function clearMessages() { errorMessage.value = ''; successMessage.value = '' }

async function load() {
  loading.value = true
  clearMessages()
  try {
    const [nextOverview, nextReviews] = await Promise.all([getOperationsOverview(statusFilter.value), getOnboardingReviews(onboardingStatusFilter.value)])
    overview.value = nextOverview
    onboardingReviews.value = nextReviews.items || []
  } catch (error) { errorMessage.value = toErrorMessage(error, 'The operations workspace could not be loaded.') } finally { loading.value = false }
}

async function cancelOrder(order) {
  cancellingOrderId.value = order.order_id
  clearMessages()
  try { await cancelOperationsOrder(order.order_id); successMessage.value = `Order ${shortId(order.order_id)} was cancelled in the demo.`; await load() } catch (error) { errorMessage.value = toErrorMessage(error, 'That order could not be cancelled.') } finally { cancellingOrderId.value = '' }
}

async function reviewApplication(item, status) {
  const reason = (rejectionReasons.value[item.onboarding_id] || '').trim()
  if (status === 'rejected' && reason.length < 3) {
    errorMessage.value = 'Add at least three characters of feedback before rejecting an application.'
    return
  }
  reviewingOnboardingId.value = item.onboarding_id
  clearMessages()
  try { await reviewOnboarding(item.onboarding_id, status, reason); successMessage.value = `${item.user_name} was ${status === 'approved' ? 'approved' : 'sent back for changes'} in the demo.`; await load() } catch (error) { errorMessage.value = toErrorMessage(error, 'That onboarding decision could not be saved.') } finally { reviewingOnboardingId.value = '' }
}

onMounted(load)
</script>

<style scoped>
.operations-page { min-height: 100vh; background: rgb(var(--v-theme-background)); }
.operations-page__bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(var(--v-theme-on-background), .08); }
.operations-page__brand { display: inline-flex; align-items: center; gap: .45rem; border: 0; background: transparent; color: rgb(var(--v-theme-primary)); font: inherit; font-weight: 800; cursor: pointer; }
.operations-page__mark { font-size: 1.4rem; }
.operations-page__main { width: min(1120px, 100%); margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.operations-page__intro, .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; }
.operations-page__intro h1, .section-heading h2 { margin: 0; color: rgb(var(--v-theme-primary)); }
.operations-page__intro p:not(.eyebrow) { max-width: 680px; margin: .6rem 0 0; color: rgba(var(--v-theme-on-background), .72); }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 2rem; }
.summary-card { border: 1px solid rgba(var(--v-theme-on-background), .08); }
.summary-card__label, .summary-card__hint { display: block; color: rgba(var(--v-theme-on-background), .65); }
.summary-card strong { display: block; margin: .35rem 0; font-size: 1.8rem; color: rgb(var(--v-theme-primary)); }
.summary-card__hint { font-size: .82rem; }
.operations-section { margin-top: 2rem; }
.status-filter { width: 190px; }
.orders-list { display: grid; gap: .65rem; margin-top: 1rem; }
.order-row { border: 1px solid rgba(var(--v-theme-on-background), .08); }
.order-row__content { display: grid; grid-template-columns: 1.4fr 1fr auto; align-items: center; gap: 1rem; }
.order-row__identity, .order-row__status, .order-row__amount { display: flex; flex-direction: column; gap: .25rem; }
.order-row__identity span, .order-row__identity small, .order-row__status span { color: rgba(var(--v-theme-on-background), .65); font-size: .84rem; }
.order-row__amount { align-items: end; }
.drivers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
.driver-card { border: 1px solid rgba(var(--v-theme-on-background), .08); }
.driver-card__heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.driver-card p { margin: .7rem 0 .25rem; color: rgba(var(--v-theme-on-background), .72); }
.driver-card small { color: rgba(var(--v-theme-on-background), .62); }
.empty-state { display: grid; justify-items: center; gap: .5rem; padding: 2rem; color: rgba(var(--v-theme-on-background), .65); }
.section-note { margin: .6rem 0 0; color: rgba(var(--v-theme-on-background), .65); font-size: .9rem; }
.review-list { display: grid; gap: .65rem; margin-top: 1rem; }
.review-card { border: 1px solid rgba(var(--v-theme-on-background), .08); }
.review-card__content { display: grid; grid-template-columns: 1.2fr .8fr 1.8fr; align-items: center; gap: 1rem; }
.review-card__identity, .review-card__documents, .review-card__actions { display: flex; flex-direction: column; gap: .3rem; }
.review-card__identity span, .review-card__identity small, .review-card__reason { color: rgba(var(--v-theme-on-background), .65); font-size: .84rem; }
.review-card__actions { display: grid; grid-template-columns: minmax(180px, 1fr) auto auto; align-items: center; }
.review-card__reason { margin: .75rem 0 0; grid-column: 1 / -1; }
.operations-skeleton { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 2rem; }
@media (max-width: 800px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } .order-row__content, .review-card__content { grid-template-columns: 1fr 1fr; } .order-row__amount { align-items: start; } .review-card__actions { grid-column: 1 / -1; } }
@media (max-width: 600px) { .operations-page__bar, .operations-page__intro, .section-heading { align-items: stretch; flex-direction: column; } .summary-grid, .operations-skeleton { grid-template-columns: 1fr 1fr; } .status-filter { width: 100%; } }
@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; } }
</style>
