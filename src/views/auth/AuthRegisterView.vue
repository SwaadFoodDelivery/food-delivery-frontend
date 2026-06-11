<template>
  <section class="auth-page">
    <div class="auth-page__panel">
      <div class="auth-page__intro">
        <v-icon class="auth-page__icon" icon="mdi-account-plus-outline" />
        <p class="auth-page__eyebrow">New account</p>
        <h1>Create your profile</h1>
      </div>

      <v-form class="auth-form" @submit.prevent="submit">
        <v-text-field
          :model-value="auth.flow.phone"
          label="Mobile number"
          prepend-inner-icon="mdi-cellphone-lock"
          readonly
        />

        <v-text-field
          v-model.trim="form.name"
          autocomplete="name"
          label="Full name"
          maxlength="100"
          prepend-inner-icon="mdi-account-outline"
          :error-messages="nameError"
          @blur="touchName = true"
        />

        <v-text-field
          v-model.trim="form.email"
          autocomplete="email"
          label="Email"
          maxlength="255"
          prepend-inner-icon="mdi-email-outline"
          :error-messages="emailError"
          @blur="touchEmail = true"
        />

        <v-text-field
          v-model.trim="form.referralCode"
          autocomplete="off"
          label="Referral code"
          maxlength="20"
          prepend-inner-icon="mdi-ticket-percent-outline"
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

        <v-btn
          block
          color="primary"
          :disabled="!canSubmit"
          :loading="auth.loading"
          prepend-icon="mdi-send-check-outline"
          size="large"
          type="submit"
        >
          Send OTP
        </v-btn>

        <v-btn block :to="{ name: 'auth-login' }" prepend-icon="mdi-arrow-left" variant="text">
          Back
        </v-btn>
      </v-form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validators'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  name: auth.flow.name || '',
  email: auth.flow.email || '',
  referralCode: auth.flow.referralCode || ''
})
const localError = ref('')
const touchName = ref(false)
const touchEmail = ref(false)

const nameError = computed(() => {
  if (!touchName.value) {
    return ''
  }

  return form.name.trim() ? '' : 'Enter your name'
})
const emailError = computed(() => {
  if (!touchEmail.value || !form.email) {
    return ''
  }

  return isValidEmail(form.email) ? '' : 'Enter a valid email'
})
const displayError = computed(() => localError.value || auth.error)
const canSubmit = computed(() => form.name.trim() && isValidEmail(form.email) && !auth.loading)

onMounted(() => {
  if (!auth.flow.phone) {
    router.replace({ name: 'auth-login', query: route.query })
  }
})

const submit = async () => {
  localError.value = ''
  touchName.value = true
  touchEmail.value = true

  try {
    await auth.completeRegistration(form)
    await router.push({ name: 'auth-otp', query: route.query })
  } catch (error) {
    localError.value = error.message || 'Unable to create account'
  }
}
</script>
