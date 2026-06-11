<template>
  <section class="auth-page">
    <div class="auth-page__panel">
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
          @click="sendEmailOtp"
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
          :loading="auth.loading && !sending"
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
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidOtp, sanitizeOtp } from '@/utils/validators'

const router = useRouter()
const auth = useAuthStore()

const otp = ref('')
const touchOtp = ref(false)
const localError = ref('')
const sending = ref(false)

const otpError = computed(() => {
  if (!touchOtp.value || !otp.value) {
    return ''
  }

  return isValidOtp(otp.value) ? '' : 'Enter the 6 digit OTP'
})
const displayError = computed(() => localError.value || auth.error)
const canSubmit = computed(() => isValidOtp(otp.value) && !auth.loading)

onMounted(() => {
  if (!auth.needsEmailVerification) {
    router.replace({ name: 'dashboard' })
  }
})

const sendEmailOtp = async () => {
  localError.value = ''
  sending.value = true

  try {
    await auth.requestEmailOtp()
  } catch (error) {
    localError.value = error.message || 'Unable to send email OTP'
  } finally {
    sending.value = false
  }
}

const submit = async () => {
  localError.value = ''
  touchOtp.value = true

  try {
    await auth.completeEmailVerification({ otp: otp.value })
    await router.replace({ name: 'dashboard' })
  } catch (error) {
    localError.value = error.message || 'Unable to verify email'
  }
}
</script>
