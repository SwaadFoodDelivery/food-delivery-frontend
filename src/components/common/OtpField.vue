<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :error-messages="errorMessage"
    :hint="hint"
    persistent-hint
    inputmode="numeric"
    autocomplete="one-time-code"
    maxlength="6"
    class="otp-field"
    @update:model-value="onInput"
    @keyup.enter="$emit('submit')"
  />
</template>

<script setup>
import { OTP_LENGTH } from '@/constants/auth'
import { sanitizeOtpInput } from '@/utils/validators'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: `${OTP_LENGTH}-digit code` },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'submit'])

/** Strips non-digits as the user types so the field can never hold junk. */
const onInput = (value) => emit('update:modelValue', sanitizeOtpInput(value))
</script>

<style scoped>
.otp-field :deep(input) {
  letter-spacing: 0.4em;
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}
</style>
