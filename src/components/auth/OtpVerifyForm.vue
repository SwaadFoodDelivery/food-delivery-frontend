<template>
  <form class="otp-form" novalidate @submit.prevent="onVerify">
    <h2 class="otp-form__title">Enter the code</h2>
    <p class="otp-form__subtitle">
      We sent a {{ OTP_LENGTH }}-digit code to {{ maskedPhone || `${PHONE_COUNTRY_CODE} ${phone}` }}.
    </p>

    <FormAlert :message="feedback.message" :type="feedback.type" />

    <OtpField
      v-model="otp"
      :disabled="isVerifying"
      :error-message="otpError"
      :hint="`The code is valid for ${OTP_TTL_MINUTES} minutes.`"
      @submit="onVerify"
    />

    <AppButton type="submit" block :disabled="!isValidOtp(otp)" :loading="isVerifying">
      Verify and continue
    </AppButton>

    <div class="otp-form__footer">
      <AppButton variant="ghost" :disabled="!canResend || isResending" @click="onResend">
        {{ resendLabel }}
      </AppButton>
      <AppButton variant="ghost" :disabled="isVerifying" @click="$emit('back')">
        Change details
      </AppButton>
    </div>
  </form>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import OtpField from '@/components/common/OtpField.vue'
import { useAuthStore } from '@/stores/auth'
import {
  AUTH_MESSAGES,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES,
  PHONE_COUNTRY_CODE
} from '@/constants/auth'
import { isValidOtp } from '@/utils/validators'
import { toErrorMessage } from '@/utils/errors'

const props = defineProps({
  phone: { type: String, required: true },
  role: { type: String, required: true },
  maskedPhone: { type: String, default: '' }
})

const emit = defineEmits(['verified', 'back', 'resent'])

const auth = useAuthStore()

const otp = ref('')
const otpError = ref('')
const isVerifying = ref(false)
const isResending = ref(false)
const cooldown = ref(OTP_RESEND_COOLDOWN_SECONDS)
const feedback = reactive({ message: '', type: 'info' })

const canResend = computed(() => cooldown.value === 0 && !isVerifying.value)
const resendLabel = computed(() =>
  cooldown.value > 0 ? `Resend code in ${cooldown.value}s` : 'Resend code'
)

let timerId = null

function startCooldown() {
  cooldown.value = OTP_RESEND_COOLDOWN_SECONDS
  window.clearInterval(timerId)
  timerId = window.setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (cooldown.value === 0) window.clearInterval(timerId)
  }, 1000)
}

startCooldown()
onBeforeUnmount(() => window.clearInterval(timerId))

function setFeedback(message, type = 'info') {
  feedback.message = message
  feedback.type = type
}

async function onVerify() {
  otpError.value = ''
  if (!isValidOtp(otp.value)) {
    otpError.value = AUTH_MESSAGES.OTP_INVALID_FORMAT
    return
  }
  // Guard against a double submit burning an OTP attempt — the backend blocks
  // the code after 5 wrong tries.
  if (isVerifying.value) return

  isVerifying.value = true
  setFeedback('')
  try {
    const data = await auth.verifyOtp({ phone: props.phone, role: props.role, otp: otp.value })
    emit('verified', data)
  } catch (error) {
    otpError.value = toErrorMessage(error)
  } finally {
    isVerifying.value = false
  }
}

async function onResend() {
  if (!canResend.value) return
  isResending.value = true
  setFeedback('')
  try {
    const data = await auth.sendLoginOtp({ phone: props.phone, role: props.role })
    otp.value = ''
    startCooldown()
    setFeedback(data?.message || 'A new code is on its way.', 'success')
    emit('resent', data)
  } catch (error) {
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isResending.value = false
  }
}
</script>

<style scoped>
.otp-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.otp-form__title {
  margin: 0;
  font-size: 1.25rem;
}

.otp-form__subtitle {
  margin: 0 0 0.5rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.otp-form__footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
