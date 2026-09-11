import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '@/stores/auth'
import { getProfile } from '@/services/profileService'
import { ROUTE_NAMES } from '@/constants/routes'
import { STORAGE_KEYS } from '@/constants/common'
import { resolvePostAuthRoute } from '@/utils/navigation'
import router from '@/router'

jest.mock('@/services/profileService')
jest.mock('vue-router', () => ({
  createWebHistory: jest.fn(),
  createRouter: jest.fn(() => ({ beforeEach: jest.fn() }))
}))

const guard = router.beforeEach.mock.calls[0][0]
const destination = (name, meta = { requiresAuth: true }) => ({ name, meta, fullPath: `/${name}` })

describe('onboarding routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, JSON.stringify('access-token'))
    window.sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ user_id: 'user-1', role: 'driver', first_time_user: false }))
    window.localStorage.setItem(STORAGE_KEYS.ONBOARDING_SUBMITTED, JSON.stringify({ 'user-1': true }))
    setActivePinia(createPinia())
    getProfile.mockResolvedValue({ role: 'driver', onboarding_complete: false })
  })

  it.each([ROUTE_NAMES.LANDING, ROUTE_NAMES.ORDER, ROUTE_NAMES.DRIVER, ROUTE_NAMES.PROFILE, ROUTE_NAMES.OPERATIONS])('gates returning unapproved applicants on %s despite a legacy submit marker', async (name) => {
    await expect(guard(destination(name))).resolves.toEqual({ name: ROUTE_NAMES.ONBOARDING })
  })

  it('allows returning applicants to resume onboarding', async () => {
    await expect(guard(destination(ROUTE_NAMES.ONBOARDING))).resolves.toBe(true)
  })

  it('does not let a post-login redirect bypass review', async () => {
    const auth = useAuthStore()
    await auth.fetchProfile()
    expect(resolvePostAuthRoute(auth, '/driver')).toEqual({ name: ROUTE_NAMES.ONBOARDING })
    await expect(guard(destination(ROUTE_NAMES.LOGIN, { guestOnly: true }))).resolves.toEqual({ name: ROUTE_NAMES.ONBOARDING })
  })

  it('keeps the gate closed when the profile cannot be loaded', async () => {
    getProfile.mockRejectedValue(new Error('offline'))
    await expect(guard(destination(ROUTE_NAMES.DRIVER))).resolves.toEqual({ name: ROUTE_NAMES.ONBOARDING })
    await expect(guard(destination(ROUTE_NAMES.ONBOARDING))).resolves.toBe(true)
  })

  it('lets approved users proceed and redirects them out of onboarding', async () => {
    getProfile.mockResolvedValue({ role: 'driver', onboarding_complete: true })
    await expect(guard(destination(ROUTE_NAMES.DRIVER, { requiresAuth: true, roles: ['driver'] }))).resolves.toBe(true)
    await expect(guard(destination(ROUTE_NAMES.ONBOARDING))).resolves.toEqual({ name: ROUTE_NAMES.LANDING })
    expect(resolvePostAuthRoute(useAuthStore(), '/driver')).toEqual({ path: '/driver' })
  })

  it('still enforces role restrictions after approval', async () => {
    getProfile.mockResolvedValue({ role: 'driver', onboarding_complete: true })
    await expect(guard(destination(ROUTE_NAMES.OPERATIONS, { requiresAuth: true, roles: ['restaurant_manager'] }))).resolves.toEqual({ name: ROUTE_NAMES.LANDING })
  })

  it('redirects to login if profile loading expires the session', async () => {
    getProfile.mockImplementation(async () => {
      useAuthStore().clearSession()
      throw new Error('expired')
    })
    const target = destination(ROUTE_NAMES.DRIVER)
    await expect(guard(target)).resolves.toEqual({ name: ROUTE_NAMES.LOGIN, query: { redirect: target.fullPath } })
  })
})
