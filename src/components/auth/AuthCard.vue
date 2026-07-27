<template>
  <main class="auth-page">
    <section class="auth-card" :aria-labelledby="headingId">
      <h1 :id="headingId" class="auth-card__heading">{{ heading }}</h1>
      <p v-if="lead" class="auth-card__lead">{{ lead }}</p>
      <slot />
    </section>
  </main>
</template>

<script setup>
import { nextDomId } from '@/utils/domId'

defineProps({
  heading: { type: String, required: true },
  lead: { type: String, default: '' }
})

// Unique per instance so the aria-labelledby link stays valid if two cards ever
// render together.
const headingId = nextDomId('auth-heading')
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}

.auth-card {
  width: 100%;
  max-width: 28rem;
  align-self: flex-start;
  background-color: rgb(var(--v-theme-surface));
  border-radius: 20px;
  padding: 1.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.auth-card__heading {
  margin: 0 0 0.35rem;
  font-size: 1.6rem;
}

.auth-card__lead {
  margin: 0 0 1.25rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (min-width: 600px) {
  .auth-page {
    padding: 4rem 1rem;
  }
}
</style>
