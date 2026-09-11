/** Where a user belongs, given the current auth state. */
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * Resolves the landing target after a successful verify-otp.
 *
 * Onboarding wins over any `redirect` until the profile confirms approval,
 * including when an applicant signs in again while waiting for review.
 *
 * @param {{needsOnboarding: boolean}} auth the auth store
 * @param {string} [redirect] a path captured by the auth guard
 * @returns {{name: string}|{path: string}} a router target
 */
export function resolvePostAuthRoute(auth, redirect = '') {
  if (auth.needsOnboarding) return { name: ROUTE_NAMES.ONBOARDING }
  if (redirect) return { path: redirect }
  return { name: ROUTE_NAMES.LANDING }
}
