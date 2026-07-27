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
      <h1 class="landing__sr-only">Home</h1>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { ROUTE_NAMES } from '@/constants/routes'

const router = useRouter()
const auth = useAuthStore()

const initial = computed(() => auth.displayName.trim().charAt(0).toUpperCase())

const actionLabel = computed(() => (auth.isAuthenticated ? 'View profile' : 'Sign in'))

function onOpenProfile() {
  router.push({ name: auth.isAuthenticated ? ROUTE_NAMES.PROFILE : ROUTE_NAMES.LOGIN })
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

.landing__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
