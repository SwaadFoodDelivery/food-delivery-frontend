<template>
  <div>
    <div class="auth-page__intro">
      <v-icon class="auth-page__icon" icon="mdi-account-plus-outline" />
      <p class="auth-page__eyebrow">New account</p>
      <h1>Create your profile</h1>
    </div>

    <v-form class="auth-form" @submit.prevent="submit">
      <v-text-field
        :model-value="displayPhone"
        label="Mobile number"
        prepend-inner-icon="mdi-cellphone-lock"
        readonly
      />

      <v-text-field
        v-model.trim="name"
        autocomplete="name"
        label="Full name"
        maxlength="100"
        prepend-inner-icon="mdi-account-outline"
        :error-messages="nameError"
        @blur="touchName = true"
      />

      <v-text-field
        v-model.trim="email"
        autocomplete="email"
        label="Email"
        maxlength="255"
        prepend-inner-icon="mdi-email-outline"
        :error-messages="emailError"
        @blur="touchEmail = true"
      />

      <v-text-field
        v-model.trim="referralCode"
        autocomplete="off"
        label="Referral code"
        maxlength="20"
        prepend-inner-icon="mdi-ticket-percent-outline"
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

      <v-btn
        block
        color="primary"
        :disabled="!canSubmit"
        :loading="loading"
        prepend-icon="mdi-send-check-outline"
        size="large"
        type="submit"
      >
        Send OTP
      </v-btn>

      <v-btn block prepend-icon="mdi-arrow-left" variant="text" @click="emit('back')">
        Back
      </v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isValidEmail } from '@/utils/validators'

const props = defineProps({
  displayPhone: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['done', 'back'])

const name = ref('')
const email = ref('')
const referralCode = ref('')
const touchName = ref(false)
const touchEmail = ref(false)

const nameError = computed(() => {
  if (!touchName.value) return ''
  return name.value.trim() ? '' : 'Enter your name'
})
const emailError = computed(() => {
  if (!touchEmail.value || !email.value) return ''
  return isValidEmail(email.value) ? '' : 'Enter a valid email'
})
const canSubmit = computed(() => name.value.trim() && isValidEmail(email.value) && !props.loading)

const submit = () => {
  touchName.value = true
  touchEmail.value = true
  if (!canSubmit.value) return
  emit('done', { name: name.value, email: email.value, referralCode: referralCode.value })
}
</script>
