<template>
  <auth-layout>
    <phone-step
      v-if="step === 'phone'"
      :loading="loading"
      :error="error"
      @done="handlePhone"
    />

    <register-step
      v-else-if="step === 'register'"
      :display-phone="phone"
      :loading="loading"
      :error="error"
      @done="handleRegister"
      @back="goBack"
    />

    <otp-step
      v-else-if="step === 'otp'"
      :masked-phone="maskedPhone"
      :otp-expires-at="otpExpiresAt"
      :resend-available-at="resendAvailableAt"
      :loading="loading"
      :error="error"
      :notice="notice"
      @done="handleOtp"
      @back="goBack"
      @resend="handleResend"
    />
  </auth-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { RESEND_COOLDOWN_SECONDS } from '@/constants/auth'
import {
  checkPhone,
  register,
  sendOtp,
  verifyOtp
} from '@/services/authService'
import { setAccessToken } from '@/utils/authSession'
import { normalizeIndianPhone } from '@/utils/validators'
import { redirectAfterAuth } from '@/utils/authHelpers'
import AuthLayout from '@/components/layouts/AuthLayout.vue'
import PhoneStep from '@/components/auth/PhoneStep.vue'
import RegisterStep from '@/components/auth/RegisterStep.vue'
import OtpStep from '@/components/auth/OtpStep.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// --- local wizard state ---
const step = ref('phone')
const phone = ref('')
const role = ref('client')
const isNewUser = ref(false)
const maskedPhone = ref('')
const otpExpiresAt = ref('')
const resendAvailableAt = ref(0)

const loading = ref(false)
const error = ref('')
const notice = ref('')

const setError = (msg) => { error.value = msg; notice.value = '' }
const setNotice = (msg) => { notice.value = msg; error.value = '' }
const clearMessages = () => { error.value = ''; notice.value = '' }

// --- step handlers ---

const handlePhone = async ({ phone: rawPhone, role: selectedRole }) => {
  clearMessages()
  loading.value = true

  try {
    const normalizedPhone = normalizeIndianPhone(rawPhone)
    phone.value = normalizedPhone
    role.value = selectedRole

    const result = await checkPhone({ phone: normalizedPhone, role: selectedRole })

    if (result.data?.registered) {
      const otp = await sendOtp({ phone: normalizedPhone })
      isNewUser.value = false
      maskedPhone.value = otp.data?.masked_phone || result.data?.masked_phone || ''
      otpExpiresAt.value = otp.data?.otp_expires_at || ''
      resendAvailableAt.value = Date.now() + RESEND_COOLDOWN_SECONDS * 1000
      setNotice(otp.message || otp.data?.message || 'OTP sent')
      step.value = 'otp'
    } else {
      isNewUser.value = true
      setNotice(result.message || result.data?.message || 'Create your account')
      step.value = 'register'
    }
  } catch (err) {
    setError(err.message || 'Unable to continue')
  } finally {
    loading.value = false
  }
}

const handleRegister = async ({ name, email, referralCode }) => {
  clearMessages()
  loading.value = true

  try {
    const result = await register({ phone: phone.value, name, email, referralCode, role: role.value })
    maskedPhone.value = result.data?.masked_phone || ''
    otpExpiresAt.value = result.data?.otp_expires_at || ''
    resendAvailableAt.value = Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    setNotice(result.message || result.data?.message || 'OTP sent')
    step.value = 'otp'
  } catch (err) {
    setError(err.message || 'Unable to create account')
  } finally {
    loading.value = false
  }
}

const handleOtp = async ({ otp }) => {
  clearMessages()
  loading.value = true

  try {
    const result = await verifyOtp({ phone: phone.value, otp })
    auth.setAccessToken(result.data?.access_token || '')
    auth.setUser(result.data?.user || null)
    setAccessToken(result.data?.access_token || '')

    const target = auth.needsEmailVerification
      ? { name: 'auth-email' }
      : redirectAfterAuth(route)
    await router.replace(target)
  } catch (err) {
    setError(err.message || 'Unable to verify OTP')
  } finally {
    loading.value = false
  }
}

const handleResend = async () => {
  clearMessages()
  loading.value = true

  try {
    const result = await sendOtp({ phone: phone.value })
    maskedPhone.value = result.data?.masked_phone || maskedPhone.value
    otpExpiresAt.value = result.data?.otp_expires_at || ''
    resendAvailableAt.value = Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    setNotice(result.message || result.data?.message || 'OTP sent')
  } catch (err) {
    setError(err.message || 'Unable to resend OTP')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  clearMessages()
  step.value = step.value === 'otp' && isNewUser.value ? 'register' : 'phone'
}
</script>
