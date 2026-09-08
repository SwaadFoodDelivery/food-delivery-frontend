<template>
  <div class="landing">
    <header class="landing__bar">
      <!--
        The whole page, per spec: a single profile control in the top bar. For a
        guest it routes to sign-in instead, since there is no profile to show.
      -->
      <button
        type="button"
        class="landing__profile"
        :aria-label="actionLabel"
        :title="actionLabel"
        @click="onOpenProfile"
      >
        <span v-if="initial" class="landing__initial" aria-hidden="true">{{ initial }}</span>
        <v-icon v-else icon="mdi-account-circle-outline" size="28" aria-hidden="true" />
      </button>
    </header>

    <main class="landing__main">
      <template v-if="auth.isPendingManualVerification">
        <h1 class="landing__welcome">Verification pending</h1>
        <p class="landing__subtext">{{ VERIFICATION_STATUS_MESSAGE }}</p>
      </template>
      <h1 v-else class="landing__welcome">Welcome people</h1>
      <div class="landing__actions">
        <button type="button" class="landing__order" @click="onStartOrdering">
          {{ primaryActionLabel }}
          <v-icon icon="mdi-arrow-right" size="18" aria-hidden="true" />
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/constants/auth'
import { ROUTE_NAMES } from '@/constants/routes'
import { VERIFICATION_STATUS_MESSAGE } from '@/constants/profile'

const router = useRouter()
const auth = useAuthStore()

const initial = computed(() => auth.displayName.trim().charAt(0).toUpperCase())

const actionLabel = computed(() => (auth.isAuthenticated ? 'View profile' : 'Sign in'))
const isRestaurantOwner = computed(() => auth.role === ROLES.RESTAURANT_OWNER)
const primaryActionLabel = computed(() => {
  if (!auth.isAuthenticated) return 'Sign in to order'
  return isRestaurantOwner.value ? 'Open restaurant orders' : 'Browse Shamgarh kitchens'
})

function onOpenProfile() {
  router.push({ name: auth.isAuthenticated ? ROUTE_NAMES.PROFILE : ROUTE_NAMES.LOGIN })
}

function onStartOrdering() {
  if (isRestaurantOwner.value) {
    router.push({ name: ROUTE_NAMES.RESTAURANT_ORDERS })
    return
  }
  router.push({ name: auth.isAuthenticated ? ROUTE_NAMES.ORDER : ROUTE_NAMES.LOGIN, query: auth.isAuthenticated ? {} : { redirect: '/order' } })
}
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.landing__bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 1rem 1.25rem;
}

.landing__profile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 50%;
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.landing__profile:hover {
  background-color: rgb(var(--v-theme-surface-variant));
}

.landing__profile:focus-visible {
  outline: 3px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}

.landing__initial {
  font-weight: 700;
  font-size: 1.05rem;
}

.landing__main {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 76px);
  padding: 2rem 1.25rem;
  text-align: center;
}

.landing__welcome {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.landing__subtext {
  margin: 0.75rem 0 0;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.landing__actions {
  margin-top: 1.5rem;
}

.landing__order {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  min-height: 46px;
  padding: 0 1.2rem;
  border: 0;
  border-radius: 14px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.landing__order:focus-visible {
  outline: 3px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}

@media (min-width: 600px) {
  .landing__welcome {
    font-size: 2.75rem;
  }
}
</style>
