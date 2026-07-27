<template>
  <section class="details-card" aria-labelledby="details-heading">
    <h2 id="details-heading" class="details-card__title">Your details</h2>
    <p class="details-card__hint">We need these to complete your customer profile.</p>

    <template v-if="!saved">
      <v-text-field
        v-model="dateOfBirth"
        type="date"
        label="Date of birth"
        :max="maxDate"
        :disabled="disabled || isSaving"
        :error-messages="errors.dateOfBirth"
      />
      <v-select
        v-model="gender"
        :items="GENDER_OPTIONS"
        item-title="label"
        item-value="value"
        label="Gender"
        variant="outlined"
        density="comfortable"
        :disabled="disabled || isSaving"
        :error-messages="errors.gender"
      />

      <AppButton variant="secondary" :disabled="disabled" :loading="isSaving" @click="onSave">
        Save details
      </AppButton>
    </template>

    <p v-else class="details-card__saved">
      <span aria-hidden="true">✓</span> Details saved
    </p>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'

import AppButton from '@/components/common/AppButton.vue'
import { GENDER_OPTIONS } from '@/constants/profile'

defineProps({
  saved: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['save'])

const maxDate = new Date().toISOString().slice(0, 10)

const dateOfBirth = ref('')
const gender = ref('')
const errors = reactive({ dateOfBirth: '', gender: '' })

function validate() {
  errors.dateOfBirth = dateOfBirth.value ? '' : 'Date of birth is required.'
  errors.gender = gender.value ? '' : 'Select a gender.'
  return !errors.dateOfBirth && !errors.gender
}

function onSave() {
  if (!validate()) return
  emit('save', { dateOfBirth: dateOfBirth.value, gender: gender.value })
}
</script>

<style scoped>
.details-card {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 16px;
  padding: 1.25rem;
  background-color: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.details-card__title {
  margin: 0;
  font-size: 1.05rem;
}

.details-card__hint {
  margin: -0.5rem 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.details-card__saved {
  margin: 0;
  font-weight: 600;
  color: rgb(var(--v-theme-success));
}
</style>
