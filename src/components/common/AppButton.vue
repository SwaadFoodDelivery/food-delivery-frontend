<template>
  <button
    :type="type"
    :class="['app-button', `app-button--${variant}`, { 'app-button--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : 'false'"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true"></span>
    <span :class="{ 'app-button__label--busy': loading }">
      <slot />
    </span>
  </button>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'button' },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost'].includes(value)
  },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 1.25rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-button:focus-visible {
  outline: 3px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}

.app-button--block {
  display: flex;
  width: 100%;
}

.app-button--primary {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.app-button--primary:hover:not(:disabled) {
  background-color: rgb(var(--v-theme-primary-darken-1));
}

.app-button--secondary {
  background-color: transparent;
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.app-button--secondary:hover:not(:disabled) {
  background-color: rgb(var(--v-theme-surface-variant));
}

.app-button--ghost {
  background-color: transparent;
  color: rgb(var(--v-theme-primary));
  padding: 0 0.5rem;
  min-height: 36px;
}

.app-button--ghost:hover:not(:disabled) {
  text-decoration: underline;
}

.app-button__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: app-button-spin 0.7s linear infinite;
}

.app-button__label--busy {
  opacity: 0.85;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-button__spinner {
    animation-duration: 2s;
  }
}
</style>
