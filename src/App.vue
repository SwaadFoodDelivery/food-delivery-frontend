<template>
  <v-app v-if="auth.ready">
    <router-view />
  </v-app>

  <v-app v-else>
    <v-main>
      <div class="app-loading">
        <v-progress-circular color="primary" indeterminate size="48" />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchMe } from '@/services/authActions'

const auth = useAuthStore()

onMounted(async () => {
  await fetchMe()
  auth.setReady()
})
</script>

<style scoped>
.app-loading {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
}
</style>
