import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getAccessToken } from '@/utils/authSession'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(getAccessToken())
  const user = ref(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value?.user_id))
  const needsEmailVerification = computed(() => Boolean(
    isAuthenticated.value &&
    user.value?.email &&
    user.value?.email_verified === false
  ))

  const setAccessToken = (token) => { accessToken.value = token }
  const setUser = (u) => { user.value = u }
  const setReady = () => { ready.value = true }
  const resetSession = () => {
    accessToken.value = ''
    user.value = null
    ready.value = false
  }

  return {
    accessToken,
    user,
    ready,
    isAuthenticated,
    needsEmailVerification,
    setAccessToken,
    setUser,
    setReady,
    resetSession
  }
})
