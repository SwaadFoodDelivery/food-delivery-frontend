import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
    return {
      name: 'auth-login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresAuthFlow === 'register' && auth.flow.step !== 'register') {
    return { name: 'auth-login', query: to.query }
  }

  if (to.meta.requiresPendingPhone && !auth.flow.phone) {
    return { name: 'auth-login', query: to.query }
  }

  return true
})

export default router
