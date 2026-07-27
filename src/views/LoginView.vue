<template>
  <AuthCard heading="Sign in" :lead="leadText">
    <template v-if="step === LOGIN_STEPS.IDENTIFY">
      <!-- The unregistered case gets its own alert so "Register" can be a real
           link rather than plain text inside the backend's message string. -->
      <FormAlert v-if="isUnregistered" type="warning">
        Account not found.
        <router-link :to="registerTarget">Register</router-link>
        to create one.
      </FormAlert>
      <FormAlert v-else :message="feedback.message" :type="feedback.type" />

      <form novalidate @submit.prevent="onContinue">
        <RoleSelectField v-model="form.role" :disabled="isBusy" :error-message="errors.role" />
        <PhoneField
          v-model="form.phone"
          :disabled="isBusy"
          :error-message="errors.phone"
          @submit="onContinue"
        />

        <AppButton type="submit" block :loading="isBusy">Continue</AppButton>
      </form>

      <div class="login__alt">
        <p class="login__alt-text">
          New here?
          <router-link :to="registerTarget">Create an account</router-link>
        </p>
      </div>
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
import PhoneField from '@/components/auth/PhoneField.vue'
import RoleSelectField from '@/components/auth/RoleSelectField.vue'
import OtpVerifyForm from '@/components/auth/OtpVerifyForm.vue'
import { useAuthStore } from '@/stores/auth'
import { AUTH_MESSAGES, ERROR_CODES, LOGIN_STEPS, ROLES } from '@/constants/auth'
import { ROUTE_NAMES } from '@/constants/routes'
import { isValidIndianPhone, sanitizePhoneInput } from '@/utils/validators'
import { resolvePostAuthRoute } from '@/utils/navigation'
import { hasErrorCode, toErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const step = ref(LOGIN_STEPS.IDENTIFY)
const form = reactive({
  phone: sanitizePhoneInput(route.query.phone ?? ''),
  role: Object.values(ROLES).includes(route.query.role) ? route.query.role : ROLES.CLIENT
})
const errors = reactive({ phone: '', role: '' })
const feedback = reactive({ message: '', type: 'info' })
const maskedPhone = ref('')
const isBusy = ref(false)
const isUnregistered = ref(false)

const leadText = computed(() =>
  step.value === LOGIN_STEPS.IDENTIFY
    ? 'Accounts are per role, so pick the one you signed up with.'
    : ''
)

const registerTarget = computed(() => ({
  name: ROUTE_NAMES.REGISTER,
  query: { phone: form.phone || undefined, role: form.role }
}))

function setFeedback(message, type = 'info') {
  feedback.message = message
  feedback.type = type
}

function validate() {
  errors.phone = isValidIndianPhone(form.phone) ? '' : AUTH_MESSAGES.PHONE_INVALID
  errors.role = form.role ? '' : AUTH_MESSAGES.ROLE_REQUIRED
  return !errors.phone && !errors.role
}

/**
 * check-phone first, so an unregistered number is pointed at sign-up instead of
 * burning one of the four hourly send-otp attempts on a 404.
 */
async function onContinue() {
  if (isBusy.value || !validate()) return

  isBusy.value = true
  setFeedback('')
  isUnregistered.value = false
  try {
    const status = await auth.checkPhone({ phone: form.phone, role: form.role })
    if (!status?.registered) {
      isUnregistered.value = true
      return
    }
    const data = await auth.sendLoginOtp({ phone: form.phone, role: form.role })
    maskedPhone.value = data?.masked_phone || ''
    step.value = LOGIN_STEPS.OTP
  } catch (error) {
    // A suspended account arrives as HTTP 200 with status:"error".
    if (hasErrorCode(error, ERROR_CODES.ACCOUNT_SUSPENDED)) {
      setFeedback(error.message || AUTH_MESSAGES.ACCOUNT_SUSPENDED, 'error')
      return
    }
    setFeedback(toErrorMessage(error), 'error')
  } finally {
    isBusy.value = false
  }
}

function onBack() {
  step.value = LOGIN_STEPS.IDENTIFY
  setFeedback('')
}

/**
 * Loads the profile before routing so the onboarding gate reads the backend's
 * `onboarding_complete` rather than inferring it from the token alone.
 */
async function onVerified() {
  try {
    await auth.fetchProfile({ force: true })
  } catch {
    // Never strand a user who just authenticated — needsOnboarding falls back to
    // the first_time_user flag that verify-otp already returned.
  }
  router.replace(resolvePostAuthRoute(auth, String(route.query.redirect ?? '')))
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

.login__alt {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.login__alt-text {
  margin: 0;
}
</style>
