import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AUTH_STEPS } from '@/constants/auth'
import { getAccessToken, getStoredFlow, setStoredFlow } from '@/utils/authSession'

const emptyFlow = () => ({
  step: AUTH_STEPS.PHONE,
  phone: '',
  role: 'client',
  name: '',
  email: '',
  referralCode: '',
  registered: null,
  maskedPhone: '',
  otpExpiresAt: '',
  resendAvailableAt: 0
})

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(getAccessToken())
  const user = ref(null)
  const flow = ref({ ...emptyFlow(), ...(getStoredFlow() || {}) })
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value?.user_id))
  const needsEmailVerification = computed(() => Boolean(
    isAuthenticated.value &&
    user.value?.email &&
    user.value?.email_verified === false
  ))
  const resendRemainingSeconds = computed(() => {
    const remaining = Math.ceil((Number(flow.value.resendAvailableAt || 0) - Date.now()) / 1000)
    return Math.max(0, remaining)
  })

  const setAccessToken = (token) => { accessToken.value = token }
  const setUser = (u) => { user.value = u }
  const setLoading = (val) => { loading.value = val }
  const setError = (msg) => { error.value = msg }
  const setNotice = (msg) => { notice.value = msg }

  const setFlow = (patch) => {
    flow.value = { ...flow.value, ...patch }
    setStoredFlow(flow.value)
  }

  const resetMessages = () => {
    error.value = ''
    notice.value = ''
  }

  const resetFlow = () => {
    flow.value = emptyFlow()
    setStoredFlow(null)
    resetMessages()
  }

  return {
    accessToken,
    user,
    flow,
    loading,
    error,
    notice,
    isAuthenticated,
    needsEmailVerification,
    resendRemainingSeconds,
    setAccessToken,
    setUser,
    setLoading,
    setError,
    setNotice,
    setFlow,
    resetMessages,
    resetFlow
  }
})
