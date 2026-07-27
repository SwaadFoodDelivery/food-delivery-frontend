<template>
  <div class="profile-field">
    <dt class="profile-field__label">{{ label }}</dt>
    <dd class="profile-field__value">
      <span>{{ displayValue }}</span>
      <slot name="badge" />
    </dd>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PROFILE_EMPTY_VALUE } from '@/constants/profile'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number, Boolean], default: '' }
})

const displayValue = computed(() => {
  const value = props.value
  if (value === '' || value === null || value === undefined) return PROFILE_EMPTY_VALUE
  return String(value)
})
</script>

<style scoped>
.profile-field {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.profile-field:last-child {
  border-bottom: none;
}

.profile-field__label {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.profile-field__value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}
</style>
