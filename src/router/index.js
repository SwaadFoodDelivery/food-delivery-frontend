import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logger from '@/utils/logger'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/auth/login',
    name: 'auth-login',
    component: () => import('@/views/auth/AuthLoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/auth/register',
    name: 'auth-register',
    component: () => import('@/views/auth/AuthRegisterView.vue'),
    meta: { guestOnly: true, requiresAuthFlow: 'register' }
  },
  {
    path: '/auth/verify',
    name: 'auth-otp',
    component: () => import('@/views/auth/AuthOtpView.vue'),
    meta: { guestOnly: true, requiresPendingPhone: true }
  },
  {
    path: '/auth/verify-email',
    name: 'auth-email',
    component: () => import('@/views/auth/AuthEmailVerificationView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/app/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    logger.auth('Unauthenticated access blocked — redirecting to login', { attempted: to.fullPath })
    return {
      name: 'auth-login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    logger.auth('Authenticated user redirected away from guest route', { route: to.name })
    return { name: 'dashboard' }
  }

  if (to.meta.requiresAuthFlow === 'register' && auth.flow.step !== 'register') {
    logger.warn('Register route accessed without valid auth flow — redirecting', { route: to.name })
    return { name: 'auth-login', query: to.query }
  }

  if (to.meta.requiresPendingPhone && !auth.flow.phone) {
    logger.warn('OTP route accessed without pending phone — redirecting', { route: to.name })
    return { name: 'auth-login', query: to.query }
  }

  return true
})

export default router
