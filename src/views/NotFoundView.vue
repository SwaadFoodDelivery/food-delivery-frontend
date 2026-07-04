<template>
  <v-app>
    <v-main>
      <section class="not-found">
        <v-icon icon="mdi-map-marker-question-outline" />
        <h1>Page not found</h1>
        <v-btn color="primary" :to="homeRoute" prepend-icon="mdi-home-outline">
          Go home
        </v-btn>
      </section>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const homeRoute = computed(() => auth.isAuthenticated ? { name: 'dashboard' } : { name: 'auth-login' })
</script>

<style scoped>
.not-found {
  align-items: center;
  display: grid;
  gap: 18px;
  justify-items: center;
  min-height: 100vh;
  text-align: center;
}

.not-found .v-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 52px;
}

.not-found h1 {
  font-size: clamp(2rem, 6vw, 4rem);
  margin: 0;
}
</style>
