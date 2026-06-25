<template>
  <app-layout>
    <section class="not-found">
      <v-icon icon="mdi-map-marker-question-outline" />
      <h1>Page not found</h1>
      <v-btn color="primary" :to="{ name: 'dashboard' }" prepend-icon="mdi-home-outline">
        Go home
      </v-btn>
    </section>
  </app-layout>
</template>

<script setup>
import AppLayout from '@/components/layouts/AppLayout.vue'
</script>

<style scoped>
.not-found {
  align-items: center;
  display: grid;
  gap: 18px;
  justify-items: center;
  min-height: 60vh;
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
