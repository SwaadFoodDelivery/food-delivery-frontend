/**
 * Every backend path the app talks to.
 *
 * Verified against food-delivery-backend @ origin/profile/addressApi:
 *   internal/services/common/api/routes/routes.go
 *   internal/services/users/api/routes/{auth,onboarding,profile}.go
 *
 * Paths are relative to the versioned base (`/api/v1`) — see API_BASE_URL.
 */
export const API_URLS = {
  // Session — the only endpoint that takes X-API-Key.
  INIT_SESSION: '/auth/init-session',

  // Auth (public) — require X-Guest-Token + X-Device-ID.
  AUTH_CHECK_PHONE: '/auth/check-phone',
  AUTH_SEND_EMAIL_OTP: '/auth/send-email-otp',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_REGISTER: '/auth/register',
  AUTH_SEND_OTP: '/auth/send-otp',
  AUTH_VERIFY_OTP: '/auth/verify-otp',

  // Auth (protected) — require Authorization: Bearer.
  AUTH_LOGOUT: '/auth/logout',

  // Profile (protected).
  PROFILE_ME: '/users/me/profile',

  // Mock delivery tracking (protected). The backend labels this simulation
  // explicitly; it does not represent live courier GPS or dispatch.
  ORDER_DELIVERY: '/orders/:orderId/delivery',
  DRIVER_DELIVERY: '/driver/delivery',
  DRIVER_DELIVERY_STATUS: '/driver/delivery/status',

  // Restaurant-manager operations workspace.
  OPERATIONS_OVERVIEW: '/operations/overview',
  OPERATIONS_AUDIT: '/operations/audit',
  OPERATIONS_CANCEL_ORDER: '/operations/orders/:orderId/cancel',
  OPERATIONS_ONBOARDING: '/operations/onboarding',
  OPERATIONS_ONBOARDING_REVIEW: '/operations/onboarding/:id',

  // Recipient-scoped in-app notifications.
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: '/notifications/:notificationId/read',
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',

  // Customer ordering journey.
  RESTAURANTS: '/restaurants',
  RESTAURANT_MENU: '/restaurants/:restaurantId/menu',
  CART: '/cart',
  CART_BY_TOKEN: '/cart/:cartToken',
  CART_ITEM: '/cart/:cartToken/items/:cartItemId',
  ORDER_QUOTE: '/orders/quote',
  ORDER_SERVICEABILITY: '/orders/serviceability',
  ORDERS: '/orders',
  ORDER_HISTORY: '/orders/:orderId/history',
  ORDER_CANCEL: '/orders/:orderId/cancel',
  ORDER_PAYMENT: '/orders/:orderId/payment',
  ADDRESSES: '/users/me/addresses',

  // Restaurant-owner operations.
  OWNER_RESTAURANT: '/owner/restaurant',
  OWNER_RESTAURANT_ORDERS: '/restaurants/:restaurantId/orders',
  OWNER_ORDER_STATUS: '/restaurants/:restaurantId/orders/:orderId/status',

  // Onboarding (protected, except the upload callback which is public).
  ONBOARDING_INIT: '/onboarding/role/init',
  ONBOARDING_SUBMIT: '/onboarding/:id/submit',
  ONBOARDING_RESUBMIT: '/onboarding/:id/resubmit',
  ONBOARDING_DOCUMENT_UPLOADED: '/onboarding/documents/uploaded'
}
