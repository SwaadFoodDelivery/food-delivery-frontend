<template>
  <div>
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
          v-model="role"
          class="auth-role-toggle"
          color="primary"
          divided
          mandatory
          variant="outlined"
        >
          <v-btn
            v-for="r in AUTH_ROLES"
            :key="r.value"
            :value="r.value"
            class="auth-role-toggle__button"
          >
            {{ r.label }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-text-field
        v-model.trim="phone"
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
        prepend-icon="mdi-shield-key-outline"
        size="large"
        type="submit"
      >
        Continue
      </v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import logo from '@/assets/images/logo.png'
import { AUTH_ROLES } from '@/constants/auth'
import { isValidIndianPhone } from '@/utils/validators'

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['done'])

const phone = ref('')
const role = ref('client')
const touchPhone = ref(false)

const phoneError = computed(() => {
  if (!touchPhone.value || !phone.value) return ''
  return isValidIndianPhone(phone.value) ? '' : 'Enter a valid Indian mobile number'
})
const canSubmit = computed(() => isValidIndianPhone(phone.value) && Boolean(role.value) && !props.loading)

const submit = () => {
  touchPhone.value = true
  if (!canSubmit.value) return
  emit('done', { phone: phone.value, role: role.value })
}
</script>
