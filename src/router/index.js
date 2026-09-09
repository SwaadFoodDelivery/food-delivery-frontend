import { createRouter, createWebHistory } from 'vue-router'

import { ROLES } from '@/constants/auth'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { resolvePostAuthRoute } from '@/utils/navigation'

const routes = [
  {
    path: ROUTE_PATHS[ROUTE_NAMES.LANDING],
    name: ROUTE_NAMES.LANDING,
    component: () => import('@/views/LandingView.vue')
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.LOGIN],
    name: ROUTE_NAMES.LOGIN,
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.REGISTER],
    name: ROUTE_NAMES.REGISTER,
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.ONBOARDING],
    name: ROUTE_NAMES.ONBOARDING,
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.PROFILE],
    name: ROUTE_NAMES.PROFILE,
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.ORDER],
    name: ROUTE_NAMES.ORDER,
    component: () => import('@/views/CustomerOrderView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.TRACKING],
    name: ROUTE_NAMES.TRACKING,
    component: () => import('@/views/DeliveryTrackingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.RESTAURANT_ORDERS],
    name: ROUTE_NAMES.RESTAURANT_ORDERS,
    component: () => import('@/views/RestaurantOrdersView.vue'),
    meta: { requiresAuth: true, roles: [ROLES.RESTAURANT_OWNER] }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.DRIVER],
    name: ROUTE_NAMES.DRIVER,
    component: () => import('@/views/DriverView.vue'),
    meta: { requiresAuth: true, roles: [ROLES.DRIVER] }
  },
  {
    path: ROUTE_PATHS[ROUTE_NAMES.OPERATIONS],
    name: ROUTE_NAMES.OPERATIONS,
    component: () => import('@/views/OperationsView.vue'),
    meta: { requiresAuth: true, roles: [ROLES.RESTAURANT_MANAGER] }
  },
  { path: '/:pathMatch(.*)*', redirect: { name: ROUTE_NAMES.LANDING } }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

/**
 * Guards, in order:
 *   1. unauthenticated → make sure a guest session exists (this is guest login)
 *   2. protected route without a token → sign in
 *   3. signed in on a guest-only route → forward to where they belong
 *   4. onboarding gate, both directions
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    // Public auth endpoints all require X-Guest-Token, so mint one up front.
    // A failure here is surfaced by the view that needs it, not by the guard.
    try {
      await auth.ensureGuestSession()
    } catch {
      // Intentionally ignored — see above.
    }

    if (to.meta.requiresAuth) {
      return { name: ROUTE_NAMES.LOGIN, query: { redirect: to.fullPath } }
    }
    return true
  }

  // `onboarding_complete` lives on the profile, so the gate needs it loaded.
  try {
    await auth.fetchProfile()
  } catch {
    // Falls back to the first_time_user flag carried on the session.
  }

  if (to.meta.guestOnly) return resolvePostAuthRoute(auth)

  // First-time users cannot leave onboarding…
  if (auth.needsOnboarding && to.name !== ROUTE_NAMES.ONBOARDING) {
    return { name: ROUTE_NAMES.ONBOARDING }
  }

  // …and returning users cannot enter it.
  if (!auth.needsOnboarding && to.name === ROUTE_NAMES.ONBOARDING) {
    return { name: ROUTE_NAMES.LANDING }
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(auth.role)) {
    return { name: ROUTE_NAMES.LANDING }
  }

  return true
})

export default router
