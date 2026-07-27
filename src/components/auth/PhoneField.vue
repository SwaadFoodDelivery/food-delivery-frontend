<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :error-messages="errorMessage"
    :prefix="PHONE_COUNTRY_CODE"
    inputmode="numeric"
    autocomplete="tel-national"
    :maxlength="PHONE_NATIONAL_LENGTH"
    @update:model-value="onInput"
    @keyup.enter="$emit('submit')"
  />
</template>

<script setup>
import { PHONE_COUNTRY_CODE, PHONE_NATIONAL_LENGTH } from '@/constants/auth'
import { sanitizePhoneInput } from '@/utils/validators'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Mobile number' },
  disabled: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'submit'])

/**
 * Normalises to the 10-digit national form the backend stores, so a pasted
 * `+91 98765 43210` still lands as `9876543210`.
 */
const onInput = (value) => emit('update:modelValue', sanitizePhoneInput(value))
</script>
