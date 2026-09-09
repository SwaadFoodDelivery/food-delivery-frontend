<template>
  <div class="driver-page">
    <header class="driver-page__bar">
      <button type="button" class="driver-page__brand" @click="router.push({ name: ROUTE_NAMES.LANDING })">
        <span class="driver-page__mark" aria-hidden="true">✦</span>
        <span>Swaad</span>
      </button>
      <v-chip color="secondary" variant="tonal">Demo driver</v-chip>
    </header>

    <main class="driver-page__main">
      <section class="driver-page__intro" aria-labelledby="driver-title">
        <div>
          <p class="eyebrow">Delivery partner workspace</p>
          <h1 id="driver-title">Ready when you are</h1>
          <p>Availability and delivery actions are simulated locally for this learning app.</p>
        </div>
        <v-switch v-model="isAvailable" color="primary" :label="isAvailable ? 'Available' : 'Offline'" :loading="availabilitySaving" hide-details @update:model-value="saveAvailability" />
      </section>

      <FormAlert :message="errorMessage" />
      <FormAlert v-if="successMessage" :message="successMessage" type="success" />

      <section class="driver-settings" aria-labelledby="settings-title">
        <div>
          <p class="eyebrow">Your demo area</p>
          <h2 id="settings-title">Availability settings</h2>
        </div>
        <form class="driver-settings__form" @submit.prevent="saveAvailability">
          <v-text-field v-model="currentCity" label="Current city" hint="Used only by the mock assignment" persistent-hint hide-details="auto" />
          <AppButton type="submit" variant="secondary" :loading="availabilitySaving">Save area</AppButton>
        </form>
      </section>

      <section class="driver-delivery" aria-labelledby="delivery-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Current assignment</p>
            <h2 id="delivery-title">Your delivery</h2>
          </div>
          <AppButton variant="secondary" :loading="loading" @click="load">Refresh</AppButton>
        </div>

        <div v-if="loading" class="driver-delivery__loading" aria-label="Loading driver assignment">
          <v-skeleton-loader type="article" />
        </div>
        <div v-else-if="!delivery" class="driver-delivery__empty" aria-live="polite">
          <v-icon icon="mdi-bike-fast" size="46" aria-hidden="true" />
          <h3>No active delivery</h3>
          <p>{{ isAvailable ? 'You are available and waiting for the next demo assignment.' : 'Switch to available to receive demo assignments.' }}</p>
        </div>
        <v-card v-else class="driver-delivery__card">
          <v-card-item>
            <template #prepend><v-icon icon="mdi-package-variant-closed-check" color="primary" aria-hidden="true" /></template>
            <v-card-title>Order {{ shortId(delivery.order_id) }}</v-card-title>
            <v-card-subtitle>{{ delivery.demo_label }}</v-card-subtitle>
            <template #append><v-chip color="primary" size="small" variant="tonal">{{ statusLabel(delivery.status) }}</v-chip></template>
          </v-card-item>
          <v-card-text>
            <div class="driver-delivery__details">
              <span>Assigned</span><strong>{{ formatTime(delivery.assigned_at) }}</strong>
              <span>Provider</span><strong>{{ delivery.provider }} simulation</strong>
            </div>
            <AppButton v-if="nextAction" block :loading="statusSaving" @click="advanceDelivery">{{ nextAction.label }}</AppButton>
            <p v-else class="muted-copy">This delivery is complete.</p>
          </v-card-text>
        </v-card>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { getDriverDelivery, updateDriverAvailability, updateDriverDeliveryStatus } from '@/services/driverService'
import { toErrorMessage } from '@/utils/errors'

const router = useRouter()
const auth = useAuthStore()
const delivery = ref(null)
const isAvailable = ref(false)
const currentCity = ref('Shamgarh')
const loading = ref(true)
const availabilitySaving = ref(false)
const statusSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const actions = {
  assigned: { status: 'en_route_to_restaurant', label: 'Head to restaurant' },
  en_route_to_restaurant: { status: 'arrived_at_restaurant', label: 'Mark arrived' },
  arrived_at_restaurant: { status: 'picked_up', label: 'Confirm pickup' },
  picked_up: { status: 'out_for_delivery', label: 'Start delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark delivered' }
}

const nextAction = computed(() => actions[delivery.value?.status] || null)

function shortId(id = '') {
  return id.slice(0, 8).toUpperCase()
}

function statusLabel(value) {
  return (value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatTime(value) {
  if (!value) return 'Recently'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function load() {
  loading.value = true
  clearMessages()
  try {
    const profile = await auth.fetchProfile({ force: true })
    isAvailable.value = Boolean(profile?.profile?.is_available)
    currentCity.value = profile?.profile?.current_city || 'Shamgarh'
    try {
      delivery.value = await getDriverDelivery()
    } catch (error) {
      if (error?.errorCode === 'DELIVERY_NOT_FOUND') delivery.value = null
      else throw error
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'The driver workspace could not be loaded.')
  } finally {
    loading.value = false
  }
}

async function saveAvailability() {
  availabilitySaving.value = true
  clearMessages()
  try {
    const updated = await updateDriverAvailability({ isAvailable: isAvailable.value, currentCity: currentCity.value.trim() })
    isAvailable.value = Boolean(updated?.profile?.is_available)
    currentCity.value = updated?.profile?.current_city || currentCity.value
    successMessage.value = isAvailable.value ? 'You are available for demo deliveries.' : 'You are now offline.'
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Availability could not be saved.')
  } finally {
    availabilitySaving.value = false
  }
}

async function advanceDelivery() {
  if (!nextAction.value) return
  statusSaving.value = true
  clearMessages()
  try {
    delivery.value = await updateDriverDeliveryStatus(nextAction.value.status)
    successMessage.value = `Order ${shortId(delivery.value.order_id)} is now ${statusLabel(delivery.value.status).toLowerCase()}.`
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'The delivery update could not be saved.')
  } finally {
    statusSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.driver-page { min-height: 100vh; background: rgb(var(--v-theme-background)); }
.driver-page__bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(var(--v-theme-on-background), .08); }
.driver-page__brand { display: inline-flex; align-items: center; gap: .45rem; border: 0; background: transparent; color: rgb(var(--v-theme-primary)); font: inherit; font-weight: 800; cursor: pointer; }
.driver-page__mark { font-size: 1.4rem; }
.driver-page__main { width: min(900px, 100%); margin: 0 auto; padding: 2rem 1.25rem 4rem; }
.driver-page__intro, .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; }
.driver-page__intro h1, .section-heading h2, .driver-settings h2 { margin: 0; color: rgb(var(--v-theme-primary)); }
.driver-page__intro p:not(.eyebrow) { max-width: 600px; margin: .6rem 0 0; color: rgba(var(--v-theme-on-background), .72); }
.driver-settings, .driver-delivery { margin-top: 2rem; padding: 1.25rem; border: 1px solid rgba(var(--v-theme-on-background), .08); border-radius: 20px; background: rgb(var(--v-theme-surface)); }
.driver-settings__form { display: flex; align-items: end; gap: 1rem; margin-top: 1rem; }
.driver-settings__form .v-input { flex: 1; }
.driver-delivery__loading { margin-top: 1rem; }
.driver-delivery__empty { display: grid; justify-items: center; gap: .6rem; padding: 3rem 1rem 1.5rem; text-align: center; color: rgba(var(--v-theme-on-background), .7); }
.driver-delivery__empty h3 { margin: 0; color: rgb(var(--v-theme-on-background)); }
.driver-delivery__empty p { margin: 0; }
.driver-delivery__card { margin-top: 1rem; border: 1px solid rgba(var(--v-theme-on-background), .08); }
.driver-delivery__details { display: grid; grid-template-columns: 1fr auto; gap: .65rem .8rem; margin-bottom: 1.25rem; color: rgba(var(--v-theme-on-background), .7); }
.driver-delivery__details strong { color: rgb(var(--v-theme-on-background)); }
.muted-copy { margin: 1.25rem 0 0; color: rgba(var(--v-theme-on-background), .64); }
@media (max-width: 650px) { .driver-page__bar, .driver-page__intro, .section-heading, .driver-settings__form { align-items: stretch; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; } }
</style>
