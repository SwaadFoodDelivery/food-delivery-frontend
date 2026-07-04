<template>
  <div>
    <div class="auth-page__intro">
      <v-icon class="auth-page__icon" icon="mdi-lock-check-outline" />
      <p class="auth-page__eyebrow">OTP verification</p>
      <h1>Enter the 6 digit OTP</h1>
      <p v-if="maskedPhone" class="auth-page__subtle">Sent to {{ maskedPhone }}</p>
    </div>

    <v-form class="auth-form" @submit.prevent="submit">
      <v-text-field
        :model-value="otp"
        autocomplete="one-time-code"
        autofocus
        class="auth-form__otp"
        inputmode="numeric"
        label="OTP"
        maxlength="6"
        prepend-inner-icon="mdi-numeric"
        :error-messages="otpError"
        @blur="touchOtp = true"
        @update:model-value="otp = sanitizeOtp($event)"
      />

      <div class="auth-form__meta">
        <span>{{ expiryLabel }}</span>
        <v-btn
          :disabled="resendRemaining > 0 || loading"
          prepend-icon="mdi-refresh"
          size="small"
          variant="text"
          @click="emit('resend')"
        >
          {{ resendLabel }}
        </v-btn>
      </div>

      <v-alert
        v-if="error"
        border="start"
        class="auth-form__alert"
        density="comfortable"
        type="error"
        variant="tonal"
      >
        {{ error }}
      </v-alert>

      <v-alert
        v-else-if="notice"
        border="start"
        class="auth-form__alert"
        density="comfortable"
        type="success"
        variant="tonal"
      >
        {{ notice }}
      </v-alert>

      <v-btn
        block
        color="primary"
        :disabled="!canSubmit"
        :loading="loading"
        prepend-icon="mdi-login-variant"
        size="large"
        type="submit"
      >
        Verify and sign in
      </v-btn>

      <v-btn block prepend-icon="mdi-arrow-left" variant="text" @click="emit('back')">
        Change number
      </v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isValidOtp, sanitizeOtp } from '@/utils/validators'

const props = defineProps({
  maskedPhone: { type: String, default: '' },
  otpExpiresAt: { type: String, default: '' },
  resendAvailableAt: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  notice: { type: String, default: '' }
})

const emit = defineEmits(['done', 'back', 'resend'])

const otp = ref('')
const touchOtp = ref(false)
const now = ref(Date.now())
let timerId

onMounted(() => { timerId = window.setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { window.clearInterval(timerId) })

const isExpired = computed(() => {
  if (!props.otpExpiresAt) return false
  return new Date(props.otpExpiresAt).getTime() <= now.value
})

const otpError = computed(() => {
  if (!touchOtp.value || !otp.value) return ''
  return isValidOtp(otp.value) ? '' : 'Enter the 6 digit OTP'
})
const canSubmit = computed(() => isValidOtp(otp.value) && !props.loading && !isExpired.value)

const resendRemaining = computed(() => {
  const remaining = Math.ceil((Number(props.resendAvailableAt || 0) - now.value) / 1000)
  return Math.max(0, remaining)
})
const resendLabel = computed(() => resendRemaining.value > 0 ? `Resend in ${resendRemaining.value}s` : 'Resend OTP')
const expiryLabel = computed(() => {
  if (!props.otpExpiresAt) return 'OTP expires in 10 minutes'
  const remaining = Math.ceil((new Date(props.otpExpiresAt).getTime() - now.value) / 1000)
  if (remaining <= 0) return 'OTP expired'
  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')
  return `Expires in ${minutes}:${seconds}`
})

const submit = () => {
  touchOtp.value = true
  if (!canSubmit.value) return
  emit('done', { otp: otp.value })
}
</script>
