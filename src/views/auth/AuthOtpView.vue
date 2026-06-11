<template>
  <section class="auth-page">
    <div class="auth-page__panel">
      <div class="auth-page__intro">
        <v-icon class="auth-page__icon" icon="mdi-lock-check-outline" />
        <p class="auth-page__eyebrow">OTP verification</p>
        <h1>Enter the 6 digit OTP</h1>
        <p v-if="auth.flow.maskedPhone" class="auth-page__subtle">
          Sent to {{ auth.flow.maskedPhone }}
        </p>
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
            :disabled="resendRemaining > 0 || auth.loading"
            prepend-icon="mdi-refresh"
            size="small"
            variant="text"
            @click="resend"
          >
            {{ resendLabel }}
          </v-btn>
        </div>

        <v-alert
          v-if="displayError"
          border="start"
          class="auth-form__alert"
          density="comfortable"
          type="error"
          variant="tonal"
        >
          {{ displayError }}
        </v-alert>

        <v-alert
          v-else-if="auth.notice"
          border="start"
          class="auth-form__alert"
          density="comfortable"
          type="success"
          variant="tonal"
        >
          {{ auth.notice }}
        </v-alert>

        <v-btn
          block
          color="primary"
          :disabled="!canSubmit"
          :loading="auth.loading"
          prepend-icon="mdi-login-variant"
          size="large"
          type="submit"
        >
          Verify and sign in
        </v-btn>

        <v-btn block :to="{ name: 'auth-login' }" prepend-icon="mdi-arrow-left" variant="text">
          Change number
        </v-btn>
      </v-form>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidOtp, sanitizeOtp } from '@/utils/validators'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const otp = ref('')
const localError = ref('')
const touchOtp = ref(false)
const now = ref(Date.now())
let timerId

const otpError = computed(() => {
  if (!touchOtp.value || !otp.value) {
    return ''
  }

  return isValidOtp(otp.value) ? '' : 'Enter the 6 digit OTP'
})
const displayError = computed(() => localError.value || auth.error)
const canSubmit = computed(() => isValidOtp(otp.value) && !auth.loading)
const resendRemaining = computed(() => {
  const remaining = Math.ceil((Number(auth.flow.resendAvailableAt || 0) - now.value) / 1000)
  return Math.max(0, remaining)
})
const resendLabel = computed(() => resendRemaining.value > 0 ? `Resend in ${resendRemaining.value}s` : 'Resend OTP')
const expiryLabel = computed(() => {
  if (!auth.flow.otpExpiresAt) {
    return 'OTP expires in 10 minutes'
  }

  const remaining = Math.ceil((new Date(auth.flow.otpExpiresAt).getTime() - now.value) / 1000)
  if (remaining <= 0) {
    return 'OTP expired'
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')
  return `Expires in ${minutes}:${seconds}`
})

onMounted(() => {
  if (!auth.flow.phone) {
    router.replace({ name: 'auth-login', query: route.query })
    return
  }

  timerId = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
})

const submit = async () => {
  localError.value = ''
  touchOtp.value = true

  try {
    await auth.completeOtpVerification({ otp: otp.value })
    const target = auth.needsEmailVerification
      ? { name: 'auth-email' }
      : auth.redirectAfterAuth(route)
    await router.replace(target)
  } catch (error) {
    localError.value = error.message || 'Unable to verify OTP'
  }
}

const resend = async () => {
  localError.value = ''

  try {
    await auth.resendPhoneOtp()
  } catch (error) {
    localError.value = error.message || 'Unable to resend OTP'
  }
}
</script>
