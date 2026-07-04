import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
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

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.ready) {
    await new Promise((resolve) => {
      if (auth.ready) { resolve(); return }
      const unwatch = watch(() => auth.ready, (ready) => {
        if (ready) { unwatch(); resolve() }
      })
    })
  }

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

  return true
})

export default router
