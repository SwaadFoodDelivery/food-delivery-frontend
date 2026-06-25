import { DEFAULT_AUTH_REDIRECT } from '@/constants/auth'

export const normalizedMessage = (error, fallback) =>
  error?.message || fallback || 'Something went wrong'

export const redirectAfterAuth = (route) => {
  const redirect = route?.query?.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : DEFAULT_AUTH_REDIRECT
}
