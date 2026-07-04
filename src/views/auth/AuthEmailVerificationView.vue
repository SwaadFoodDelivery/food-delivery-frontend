<template>
  <auth-layout>
    <div class="auth-page__intro">
      <v-icon class="auth-page__icon" icon="mdi-email-check-outline" />
      <p class="auth-page__eyebrow">Email verification</p>
      <h1>Verify your email</h1>
      <p v-if="auth.user?.email" class="auth-page__subtle">
        {{ auth.user.email }}
      </p>
    </div>

    <v-form class="auth-form" @submit.prevent="submit">
      <v-btn
        block
        color="secondary"
        :loading="sending"
        prepend-icon="mdi-email-fast-outline"
        size="large"
        variant="tonal"
        @click="handleSendOtp"
      >
        Send email OTP
      </v-btn>

      <v-text-field
        :model-value="otp"
        autocomplete="one-time-code"
        inputmode="numeric"
        label="Email OTP"
        maxlength="6"
        prepend-inner-icon="mdi-numeric"
        :error-messages="otpError"
        @blur="touchOtp = true"
        @update:model-value="otp = sanitizeOtp($event)"
      />

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
        :loading="verifying"
        prepend-icon="mdi-check-decagram-outline"
        size="large"
        type="submit"
      >
        Verify email
      </v-btn>

      <v-btn block :to="{ name: 'dashboard' }" prepend-icon="mdi-arrow-right" variant="text">
        Continue
      </v-btn>
    </v-form>
  </auth-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { completeEmailVerification, requestEmailOtp } from '@/services/authActions'
import { isValidOtp, sanitizeOtp } from '@/utils/validators'
import AuthLayout from '@/components/layouts/AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()

const otp = ref('')
const touchOtp = ref(false)
const sending = ref(false)
const verifying = ref(false)
const error = ref('')
const notice = ref('')

const otpError = computed(() => {
  if (!touchOtp.value || !otp.value) return ''
  return isValidOtp(otp.value) ? '' : 'Enter the 6 digit OTP'
})
const canSubmit = computed(() => isValidOtp(otp.value) && !verifying.value)

onMounted(() => {
  if (!auth.needsEmailVerification) {
    router.replace({ name: 'dashboard' })
  }
})

const handleSendOtp = async () => {
  error.value = ''
  notice.value = ''
  sending.value = true

  try {
    const result = await requestEmailOtp()
    notice.value = result.message || result.data?.message || 'OTP sent'
  } catch (err) {
    error.value = err.message || 'Unable to send email OTP'
  } finally {
    sending.value = false
  }
}

const submit = async () => {
  error.value = ''
  touchOtp.value = true

  try {
    verifying.value = true
    const result = await completeEmailVerification({ otp: otp.value })
    notice.value = result.message || result.data?.message || 'Email verified'
    await router.replace({ name: 'dashboard' })
  } catch (err) {
    error.value = err.message || 'Unable to verify email'
  } finally {
    verifying.value = false
  }
}
</script>
