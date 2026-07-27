/** Named routes. Never push a path string — always a name. */
export const ROUTE_NAMES = {
  LOGIN: 'login',
  REGISTER: 'register',
  ONBOARDING: 'onboarding',
  LANDING: 'landing',
  PROFILE: 'profile'
}

export const ROUTE_PATHS = {
  [ROUTE_NAMES.LOGIN]: '/login',
  [ROUTE_NAMES.REGISTER]: '/register',
  [ROUTE_NAMES.ONBOARDING]: '/onboarding',
  [ROUTE_NAMES.LANDING]: '/',
  [ROUTE_NAMES.PROFILE]: '/profile'
}
