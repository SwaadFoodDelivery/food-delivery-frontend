<template>
  <section class="auth-page">
    <div class="auth-page__panel">
      <div class="auth-page__intro">
        <v-img :src="logo" alt="" class="auth-page__logo" width="52" height="52" />
        <p class="auth-page__eyebrow">Secure sign in</p>
        <h1>Continue with your mobile number</h1>
      </div>

      <v-form class="auth-form" @submit.prevent="submit">
        <div class="auth-form__field">
          <label class="auth-form__label" for="role">Account type</label>
          <v-btn-toggle
            id="role"
            v-model="form.role"
            class="auth-role-toggle"
            color="primary"
            divided
            mandatory
            variant="outlined"
          >
            <v-btn
              v-for="role in AUTH_ROLES"
              :key="role.value"
              :value="role.value"
              class="auth-role-toggle__button"
            >
              {{ role.label }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <v-text-field
          v-model.trim="form.phone"
          autocomplete="tel"
          autofocus
          inputmode="tel"
          label="Mobile number"
          maxlength="16"
          prepend-inner-icon="mdi-cellphone"
          :error-messages="phoneError"
          @blur="touchPhone = true"
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
          :loading="auth.loading"
          prepend-icon="mdi-shield-key-outline"
          size="large"
          type="submit"
        >
          Continue
        </v-btn>
      </v-form>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@/assets/logo.png'
import { AUTH_ROLES, AUTH_STEPS } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'
import { isValidIndianPhone } from '@/utils/validators'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  phone: auth.flow.phone || '',
  role: auth.flow.role || 'client'
})
const localError = ref('')
const touchPhone = ref(false)

const phoneError = computed(() => {
  if (!touchPhone.value || !form.phone) {
    return ''
  }

  return isValidIndianPhone(form.phone) ? '' : 'Enter a valid Indian mobile number'
})
const displayError = computed(() => localError.value || auth.error)
const canSubmit = computed(() => isValidIndianPhone(form.phone) && Boolean(form.role) && !auth.loading)

const submit = async () => {
  localError.value = ''
  touchPhone.value = true

  try {
    const nextStep = await auth.beginPhoneCheck(form)
    if (nextStep === AUTH_STEPS.REGISTER) {
      await router.push({ name: 'auth-register', query: route.query })
      return
    }

    await router.push({ name: 'auth-otp', query: route.query })
  } catch (error) {
    localError.value = error.message || 'Unable to continue'
  }
}
</script>
