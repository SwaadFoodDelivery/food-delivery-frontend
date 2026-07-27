<template>
  <fieldset class="email-verify">
    <legend class="email-verify__legend">Email address</legend>

    <v-text-field
      :model-value="modelValue"
      label="Email"
      type="email"
      autocomplete="email"
      :disabled="disabled || isVerified"
      :error-messages="emailError"
      :hint="isVerified ? 'Verified — you can now create your account.' : verifyHint"
      persistent-hint
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <div class="email-verify__actions">
      <AppButton
        v-if="!isVerified"
        variant="secondary"
        :disabled="disabled || !isEmailValid || !canSend"
        :loading="isSending"
        @click="onSendCode"
      >
        {{ sendButtonLabel }}
      </AppButton>

      <p v-else class="email-verify__verified">
        <span aria-hidden="true">✓</span> {{ maskedEmail || modelValue }} verified
      </p>
    </div>

    <div v-if="codeSent && !isVerified" class="email-verify__otp">
      <OtpField
        v-model="otp"
        label="Email verification code"
        :hint="`Sent to ${maskedEmail || modelValue}. Valid for ${OTP_TTL_MINUTES} minutes.`"
        :disabled="disabled"
        :error-message="otpError"
        @submit="onVerify"
      />
      <AppButton :disabled="disabled || !isValidOtp(otp)" :loading="isVerifying" @click="onVerify">
        Verify email
      </AppButton>
    </div>

    <FormAlert :message="feedback.message" :type="feedback.type" />
  </fieldset>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import OtpField from '@/components/common/OtpField.vue'
import { useAuthStore } from '@/stores/auth'
import {
  AUTH_MESSAGES,
  EMAIL_VERIFICATION_TTL_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES
} from '@/constants/auth'
import { isValidEmail, isValidOtp } from '@/utils/validators'
import { toErrorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'verified'])

const auth = useAuthStore()

const otp = ref('')
const codeSent = ref(false)
const maskedEmail = ref('')
const isSending = ref(false)
const isVerifying = ref(false)
const emailError = ref('')
const otpError = ref('')
const feedback = reactive({ message: '', type: 'info' })

// Cooldown only applies to *resending* — the first send (codeSent still
// false) is never gated by it.
const cooldown = ref(0)
let cooldownTimerId = null

function startCooldown() {
  cooldown.value = OTP_RESEND_COOLDOWN_SECONDS
  window.clearInterval(cooldownTimerId)
  cooldownTimerId = window.setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (cooldown.value === 0) window.clearInterval(cooldownTimerId)
  }, 1000)
}

onBeforeUnmount(() => window.clearInterval(cooldownTimerId))

const isEmailValid = computed(() => isValidEmail(props.modelValue))
const canSend = computed(() => !codeSent.value || cooldown.value === 0)
const sendButtonLabel = computed(() => {
  if (!codeSent.value) return 'Send verification code'
  return cooldown.value > 0 ? `Resend code in ${cooldown.value}s` : 'Resend code'
})

/**
 * The gate. `auth.isEmailVerifiedFor` compares against the exact address the
 * backend recorded against this guest session, so editing the field after
 * verifying drops the account straight back to unverified.
 */
const isVerified = computed(() => auth.isEmailVerifiedFor(props.modelValue))

const verifyHint = computed(() =>
  codeSent.value
    ? `Enter the code we emailed you. Verification lasts ${EMAIL_VERIFICATION_TTL_MINUTES} minutes.`
    : 'We will email you a code to confirm this address.'
)

function setFeedback(message, type = 'info') {
  feedback.message = message
  feedback.type = type
}

async function onSendCode() {
  emailError.value = ''
  otpError.value = ''
  if (!isEmailValid.value) {
    emailError.value = AUTH_MESSAGES.EMAIL_INVALID
    return
  }

  isSending.value = true
  setFeedback('')
  try {
    const data = await auth.sendEmailOtp({ email: props.modelValue })
    maskedEmail.value = data?.masked_email || ''
    codeSent.value = true
    otp.value = ''
    startCooldown()
    setFeedback(data?.message || 'Verification code sent.', 'success')
  } catch (error) {
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isSending.value = false
  }
}

async function onVerify() {
  otpError.value = ''
  if (!isValidOtp(otp.value)) {
    otpError.value = AUTH_MESSAGES.OTP_INVALID_FORMAT
    return
  }

  isVerifying.value = true
  setFeedback('')
  try {
    const data = await auth.verifyEmail({ email: props.modelValue, otp: otp.value })
    maskedEmail.value = data?.masked_email || maskedEmail.value
    setFeedback(data?.message || 'Email verified.', 'success')
  } catch (error) {
    otpError.value = toErrorMessage(error)
  } finally {
    isVerifying.value = false
  }
}

// Editing the address after a successful verification invalidates it — reset the
// step so the user cannot submit against a stale confirmation.
watch(
  () => props.modelValue,
  () => {
    if (!isVerified.value && codeSent.value) {
      codeSent.value = false
      otp.value = ''
      maskedEmail.value = ''
      window.clearInterval(cooldownTimerId)
      cooldown.value = 0
      setFeedback(AUTH_MESSAGES.EMAIL_CHANGED_AFTER_VERIFY, 'warning')
    }
  }
)

watch(isVerified, (verified) => emit('verified', verified), { immediate: true })
</script>

<style scoped>
.email-verify {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 16px;
  padding: 1rem 1rem 0.25rem;
  margin-bottom: 1rem;
}

.email-verify__legend {
  padding: 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.email-verify__actions {
  display: flex;
  justify-content: flex-start;
  margin: 0.75rem 0;
}

.email-verify__verified {
  margin: 0;
  font-weight: 600;
  color: rgb(var(--v-theme-success));
}

.email-verify__otp {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.email-verify__otp > :first-child {
  width: 100%;
}
</style>
