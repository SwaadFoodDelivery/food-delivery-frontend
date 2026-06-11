<template>
  <v-app>
    <v-app-bar class="app-shell__bar" color="surface" density="comfortable">
      <v-app-bar-title class="app-shell__brand">
        <v-img :src="logo" alt="" class="app-shell__logo" width="32" height="32" />
        <span>Swaad</span>
      </v-app-bar-title>

      <template v-if="auth.isAuthenticated">
        <v-btn
          v-if="auth.needsEmailVerification"
          :to="{ name: 'auth-email' }"
          color="warning"
          prepend-icon="mdi-email-check-outline"
          variant="text"
        >
          Verify email
        </v-btn>
        <v-btn :to="{ name: 'dashboard' }" prepend-icon="mdi-view-dashboard-outline" variant="text">
          Dashboard
        </v-btn>
        <v-btn prepend-icon="mdi-logout" variant="text" @click="auth.logout">
          Logout
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container class="app-shell__main">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import logo from '@/assets/logo.png'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<style scoped>
.app-shell__bar {
  border-bottom: 1px solid rgba(var(--v-theme-border), 0.72);
}

.app-shell__brand {
  align-items: center;
  display: flex;
  font-weight: 800;
  gap: 10px;
}

.app-shell__logo {
  border-radius: 8px;
}

.app-shell__main {
  max-width: 1180px;
  min-height: calc(100vh - 64px);
  padding-bottom: 40px;
  padding-top: 40px;
}
</style>
