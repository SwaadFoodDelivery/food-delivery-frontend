<template>
  <v-app>
    <v-app-bar class="app-layout__bar" color="surface" density="comfortable">
      <v-app-bar-title class="app-layout__brand">
        <v-img :src="logo" alt="" class="app-layout__logo" width="32" height="32" />
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
        <v-btn prepend-icon="mdi-logout" variant="text" :loading="loggingOut" @click="handleLogout">
          Logout
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container class="app-layout__main">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/images/logo.png'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/services/authActions'

const auth = useAuthStore()
const router = useRouter()
const loggingOut = ref(false)

const handleLogout = async () => {
  loggingOut.value = true
  await logout()
  loggingOut.value = false
  router.replace({ name: 'auth-login' })
}
</script>

<style scoped>
.app-layout__bar {
  border-bottom: 1px solid rgba(var(--v-theme-border), 0.72);
}

.app-layout__brand {
  align-items: center;
  display: flex;
  font-weight: 800;
  gap: 10px;
}

.app-layout__logo {
  border-radius: 8px;
}

.app-layout__main {
  max-width: 1180px;
  min-height: calc(100vh - 64px);
  padding-bottom: 40px;
  padding-top: 40px;
}
</style>
