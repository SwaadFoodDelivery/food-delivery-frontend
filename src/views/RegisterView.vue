<template>
  <AuthCard heading="Create your account" :lead="leadText">
    <template v-if="step === REGISTER_STEPS.DETAILS">
      <FormAlert :message="feedback.message" :type="feedback.type" />

      <form novalidate @submit.prevent="onRegister">
        <RoleSelectField
          v-model="form.role"
          :options="SELF_REGISTRATION_ROLE_OPTIONS"
          :disabled="isBusy"
          :error-message="errors.role"
        />

        <v-text-field
          v-model="form.name"
          label="Full name"
          autocomplete="name"
          :maxlength="NAME_MAX_LENGTH"
          :disabled="isBusy"
          :error-messages="errors.name"
        />

        <PhoneField v-model="form.phone" :disabled="isBusy" :error-message="errors.phone" />

        <!--
          The gate: registration is refused with 403 EMAIL_NOT_VERIFIED unless
          this address was verified on the current guest session first.
        -->
        <EmailVerificationField v-model="form.email" :disabled="isBusy" />

        <v-text-field
          v-model="form.referralCode"
          label="Referral code (optional)"
          :disabled="isBusy"
        />

        <AppButton type="submit" block :disabled="!canSubmit" :loading="isBusy">
          Create account
        </AppButton>

        <p v-if="!isEmailVerified" class="register__gate-note">
          {{ AUTH_MESSAGES.EMAIL_MUST_BE_VERIFIED }}
        </p>
      </form>

      <p class="register__alt">
        Already registered?
        <router-link :to="loginTarget">Sign in</router-link>
      </p>
    </template>

    <OtpVerifyForm
      v-else
      :phone="form.phone"
      :role="form.role"
      :masked-phone="maskedPhone"
      @verified="onVerified"
      @back="onBack"
    />
  </AuthCard>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import EmailVerificationField from '@/components/auth/EmailVerificationField.vue'
import PhoneField from '@/components/auth/PhoneField.vue'
import RoleSelectField from '@/components/auth/RoleSelectField.vue'
import OtpVerifyForm from '@/components/auth/OtpVerifyForm.vue'
import { useAuthStore } from '@/stores/auth'
import {
  AUTH_MESSAGES,
  ERROR_CODES,
  NAME_MAX_LENGTH,
  REGISTER_STEPS,
  ROLES,
  SELF_REGISTRATION_ROLE_OPTIONS
} from '@/constants/auth'
import { ROUTE_NAMES } from '@/constants/routes'
import { isValidEmail, isValidIndianPhone, isValidName, sanitizePhoneInput } from '@/utils/validators'
import { resolvePostAuthRoute } from '@/utils/navigation'
import { hasErrorCode, toErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const registerableRoleValues = SELF_REGISTRATION_ROLE_OPTIONS.map((option) => option.value)

const step = ref(REGISTER_STEPS.DETAILS)
const form = reactive({
  name: '',
  email: '',
  // A deep link with role=restaurant_manager (e.g. from a stale bookmark)
  // must not silently pick that role back up — it isn't offered here.
  phone: sanitizePhoneInput(route.query.phone ?? ''),
  role: registerableRoleValues.includes(route.query.role) ? route.query.role : ROLES.CLIENT,
  referralCode: ''
})
const errors = reactive({ name: '', phone: '', role: '' })
const feedback = reactive({ message: '', type: 'info' })
const maskedPhone = ref('')
const isBusy = ref(false)

const leadText = computed(() =>
  step.value === REGISTER_STEPS.DETAILS
    ? 'Verify your email, then we will text you a code to finish.'
    : ''
)

const isEmailVerified = computed(() => auth.isEmailVerifiedFor(form.email))

/**
 * Register stays disabled until every field is valid AND the email carries a
 * live verification for this guest session — the same condition the backend
 * enforces, checked here so the user is never sent into a guaranteed 403.
 */
const canSubmit = computed(
  () =>
    !isBusy.value &&
    isValidName(form.name) &&
    isValidIndianPhone(form.phone) &&
    isValidEmail(form.email) &&
    Boolean(form.role) &&
    isEmailVerified.value
)

const loginTarget = computed(() => ({
  name: ROUTE_NAMES.LOGIN,
  query: { phone: form.phone || undefined, role: form.role }
}))

function setFeedback(message, type = 'info') {
  feedback.message = message
  feedback.type = type
}

function validate() {
  errors.name = isValidName(form.name)
    ? ''
    : form.name.trim()
      ? AUTH_MESSAGES.NAME_TOO_LONG
      : AUTH_MESSAGES.NAME_REQUIRED
  errors.phone = isValidIndianPhone(form.phone) ? '' : AUTH_MESSAGES.PHONE_INVALID
  errors.role = form.role ? '' : AUTH_MESSAGES.ROLE_REQUIRED
  return !errors.name && !errors.phone && !errors.role
}

/**
 * Creates the account. This does not sign the user in — it sends a phone OTP,
 * and verify-otp is what issues tokens.
 */
async function onRegister() {
  if (!canSubmit.value || !validate()) return

  isBusy.value = true
  setFeedback('')
  try {
    const data = await auth.register({
      phone: form.phone,
      name: form.name,
      email: form.email,
      role: form.role,
      referralCode: form.referralCode
    })
    maskedPhone.value = data?.masked_phone || ''
    step.value = REGISTER_STEPS.OTP
  } catch (error) {
    if (
      hasErrorCode(error, ERROR_CODES.PHONE_ALREADY_REGISTERED) ||
      hasErrorCode(error, ERROR_CODES.EMAIL_ALREADY_REGISTERED)
    ) {
      setFeedback(`${error.message} ${AUTH_MESSAGES.ACCOUNT_EXISTS}`, 'warning')
      return
    }
    if (hasErrorCode(error, ERROR_CODES.EMAIL_NOT_VERIFIED)) {
      // The 30-minute verification window lapsed between verifying and submitting.
      setFeedback(error.message || AUTH_MESSAGES.EMAIL_MUST_BE_VERIFIED, 'error')
      return
    }
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isBusy.value = false
  }
}

function onBack() {
  step.value = REGISTER_STEPS.DETAILS
  setFeedback('')
}

async function onVerified() {
  try {
    await auth.fetchProfile({ force: true })
  } catch {
    // Fall back to the first_time_user flag from verify-otp.
  }
  router.replace(resolvePostAuthRoute(auth))
}
</script>

<style scoped>
/*
 * Vuetify's persistent-hint sits directly under a field with very little
 * clearance, so with no gap here it visually crowds the next field's label
 * the moment that label floats up (focus or a filled value).
 */
form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.register__gate-note {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.register__alt {
  margin: 1.25rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}
</style>
