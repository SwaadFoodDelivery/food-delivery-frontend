<template>
  <!--
    aria-live so a message that appears after an async call is announced, since
    nothing moves focus here.
  -->
  <div role="status" aria-live="polite" aria-atomic="true">
    <v-alert
      v-if="message"
      :type="type"
      variant="tonal"
      density="comfortable"
      rounded="lg"
      class="form-alert"
    >
      {{ message }}
    </v-alert>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: '' },
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['error', 'success', 'info', 'warning'].includes(value)
  }
})
</script>

<style scoped>
.form-alert {
  margin-bottom: 1rem;
  font-size: 0.925rem;
}
</style>
