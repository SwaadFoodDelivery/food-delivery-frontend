<template>
  <main class="tracking">
    <section class="tracking__panel" aria-labelledby="tracking-heading">
      <header class="tracking__header">
        <button type="button" class="tracking__back" aria-label="Back to home" @click="goHome">
          <v-icon icon="mdi-arrow-left" size="22" aria-hidden="true" />
        </button>
        <div>
          <p class="tracking__eyebrow">Order tracking</p>
          <h1 id="tracking-heading" class="tracking__title">Your delivery journey</h1>
        </div>
      </header>

      <div v-if="isLoading" class="tracking__state">
        <v-skeleton-loader type="heading, paragraph, list-item-three-line" />
        <p class="tracking__sr" role="status" aria-live="polite">Loading delivery status…</p>
      </div>

      <div v-else-if="error" class="tracking__state">
        <FormAlert :message="error" type="error" />
        <AppButton variant="secondary" @click="load">Try again</AppButton>
      </div>

      <div v-else-if="delivery" class="tracking__content">
        <div class="tracking__demo-note">
          <v-icon icon="mdi-flask-outline" size="20" aria-hidden="true" />
          <span>{{ delivery.demo_label }}</span>
        </div>

        <div class="tracking__summary">
          <div>
            <p class="tracking__label">Current status</p>
            <h2 class="tracking__status">{{ statusLabel }}</h2>
          </div>
          <v-chip color="primary" variant="tonal" size="small">
            {{ delivery.provider }} provider
          </v-chip>
        </div>

        <ol class="tracking__timeline" aria-label="Delivery progress">
          <li
            v-for="(step, index) in STEPS"
            :key="step.value"
            :class="['tracking__step', { 'tracking__step--complete': index <= activeIndex }]"
          >
            <span class="tracking__step-marker" aria-hidden="true">
              <v-icon v-if="index < activeIndex" icon="mdi-check" size="16" />
              <v-icon v-else-if="index === activeIndex" :icon="step.icon" size="18" />
            </span>
            <span>
              <strong>{{ step.label }}</strong>
              <small>{{ step.description }}</small>
            </span>
          </li>
        </ol>

        <div class="tracking__partner">
          <div class="tracking__partner-icon" aria-hidden="true">
            <v-icon icon="mdi-bike-fast" size="24" />
          </div>
          <div>
            <p class="tracking__label">Demo delivery partner</p>
            <p class="tracking__partner-name">{{ delivery.partner_name }}</p>
            <p class="tracking__partner-phone">{{ delivery.partner_phone }}</p>
          </div>
        </div>

        <p class="tracking__updated" role="status" aria-live="polite">
          Updated {{ formatTime(delivery.updated_at) }}<span v-if="isRefreshing"> · refreshing…</span>
        </p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import { getDeliveryStatus } from '@/services/deliveryService'
import { ROUTE_NAMES } from '@/constants/routes'
import { toErrorMessage } from '@/utils/errors'

const STEPS = [
  { value: 'assigned', label: 'Partner assigned', description: 'A demo partner has accepted your order.', icon: 'mdi-account-check-outline' },
  { value: 'en_route_to_restaurant', label: 'Heading to restaurant', description: 'The partner is on the way to collect it.', icon: 'mdi-map-marker-path' },
  { value: 'arrived_at_restaurant', label: 'At the restaurant', description: 'The partner is waiting for pickup.', icon: 'mdi-store-check-outline' },
  { value: 'picked_up', label: 'Picked up', description: 'Your order is with the delivery partner.', icon: 'mdi-bag-personal-outline' },
  { value: 'out_for_delivery', label: 'Out for delivery', description: 'The order is on its way to you.', icon: 'mdi-bike-fast' },
  { value: 'delivered', label: 'Delivered', description: 'Enjoy your meal!', icon: 'mdi-check-circle-outline' }
]

const route = useRoute()
const router = useRouter()
const delivery = ref(null)
const isLoading = ref(true)
const isRefreshing = ref(false)
const error = ref('')
let pollTimer

const activeIndex = computed(() => {
  const index = STEPS.findIndex((step) => step.value === delivery.value?.status)
  return index < 0 ? 0 : index
})

const statusLabel = computed(() => STEPS[activeIndex.value]?.label || 'Preparing update')

function formatTime(value) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function goHome() {
  router.push({ name: ROUTE_NAMES.LANDING })
}

async function load({ initial = false } = {}) {
  if (initial) isLoading.value = true
  else isRefreshing.value = true
  error.value = ''
  try {
    delivery.value = await getDeliveryStatus(route.params.orderId)
    if (delivery.value?.status === 'delivered' && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
  } catch (loadError) {
    error.value = toErrorMessage(loadError, 'Could not load delivery status.')
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

onMounted(async () => {
  await load({ initial: true })
  if (delivery.value?.status !== 'delivered') pollTimer = setInterval(() => load(), 10000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.tracking {
  min-height: 100vh;
  padding: 1.5rem 1rem 3rem;
  background: rgb(var(--v-theme-background));
}

.tracking__panel {
  width: min(100%, 640px);
  margin: 0 auto;
  padding: 1.25rem;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 24px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 16px 40px rgba(43, 35, 25, 0.08);
}

.tracking__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.tracking__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
}

.tracking__back:focus-visible {
  outline: 3px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}

.tracking__eyebrow,
.tracking__label {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tracking__title,
.tracking__status {
  margin: 0.2rem 0 0;
  color: rgb(var(--v-theme-primary));
}

.tracking__title {
  font-size: clamp(1.35rem, 4vw, 1.9rem);
}

.tracking__status {
  font-size: 1.55rem;
}

.tracking__demo-note {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
  padding: 0.8rem;
  border-radius: 14px;
  background: rgba(var(--v-theme-info), 0.1);
  color: rgb(var(--v-theme-info-darken-1));
  font-size: 0.88rem;
}

.tracking__summary,
.tracking__partner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.tracking__timeline {
  position: relative;
  display: grid;
  gap: 0.15rem;
  margin: 1.5rem 0;
  padding: 0;
  list-style: none;
}

.tracking__step {
  position: relative;
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  gap: 0.7rem;
  min-height: 58px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.tracking__step:not(:last-child)::after {
  position: absolute;
  top: 2.25rem;
  left: 1.05rem;
  width: 2px;
  height: calc(100% - 0.5rem);
  background: rgb(var(--v-theme-surface-variant));
  content: '';
}

.tracking__step--complete {
  color: rgb(var(--v-theme-on-surface));
}

.tracking__step--complete:not(:last-child)::after {
  background: rgb(var(--v-theme-primary));
}

.tracking__step-marker {
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border: 2px solid rgb(var(--v-theme-surface-variant));
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.tracking__step--complete .tracking__step-marker {
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.tracking__step strong,
.tracking__step small {
  display: block;
}

.tracking__step strong {
  padding-top: 0.15rem;
  font-size: 0.98rem;
}

.tracking__step small {
  margin-top: 0.18rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  line-height: 1.35;
}

.tracking__partner {
  justify-content: flex-start;
  padding: 1rem;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface-variant));
}

.tracking__partner-icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.tracking__partner-name {
  margin: 0.2rem 0 0;
  font-weight: 700;
}

.tracking__partner-phone,
.tracking__updated {
  margin: 0.15rem 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.85rem;
}

.tracking__updated {
  margin-top: 1rem;
  text-align: right;
}

.tracking__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
