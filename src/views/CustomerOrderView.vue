<template>
  <div class="order-page">
    <header class="order-page__bar">
      <button type="button" class="order-page__brand" @click="router.push({ name: ROUTE_NAMES.LANDING })">
        <span class="order-page__mark" aria-hidden="true">✦</span>
        <span>Swaad</span>
      </button>
      <v-chip color="secondary" variant="tonal">Shamgarh demo</v-chip>
    </header>

    <main class="order-page__main">
      <section class="order-page__intro" aria-labelledby="order-title">
        <p class="eyebrow">A little joy, delivered</p>
        <h1 id="order-title">What are you craving today?</h1>
        <p>Explore fictional Shamgarh kitchens, build a cart, and place a safe demo order.</p>
      </section>

      <nav class="order-steps" aria-label="Order progress">
        <span v-for="(label, index) in stepLabels" :key="label" :class="['order-step', { 'order-step--active': step === index + 1 }]">
          <span class="order-step__number">{{ index + 1 }}</span>{{ label }}
        </span>
      </nav>

      <FormAlert :message="errorMessage" />
      <FormAlert v-if="successMessage" :message="successMessage" type="success" />

      <section v-if="pendingPayment" aria-labelledby="payment-retry-title" class="checkout-card">
        <h2 id="payment-retry-title">Complete your demo payment</h2>
        <p>Your order is saved. Retrying pays this same order; it does not place another one.</p>
        <p>Order {{ pendingPayment.orderId }} · {{ money(pendingPayment.totalAmount) }}</p>
        <v-radio-group v-model="paymentMode" :disabled="placingOrder" hide-details>
          <v-radio label="Demo payment succeeds" value="success" />
          <v-radio label="Simulate a declined payment" value="decline" />
        </v-radio-group>
        <AppButton :loading="placingOrder" :disabled="placingOrder" @click="placeDemoOrder">Retry demo payment</AppButton>
        <AppButton variant="secondary" :disabled="placingOrder" @click="cancelPendingPayment">Cancel saved order</AppButton>
        <AppButton variant="ghost" @click="router.push({ name: ROUTE_NAMES.ORDER_HISTORY })">View order history</AppButton>
      </section>
      <section v-else-if="step === 1" aria-labelledby="restaurants-title">
        <div class="discovery-hero">
          <div class="discovery-hero__copy">
            <p class="eyebrow">Shamgarh on a plate</p>
            <h2>Warm food, thoughtful delivery.</h2>
            <p>A small fictional food world for learning, tasting, and exploring safely in demo mode.</p>
          </div>
          <div class="food-scene" role="img" aria-label="A stylized bowl of food floating above a warm saffron plate">
            <div class="food-scene__halo" aria-hidden="true"></div>
            <div class="food-scene__plate" aria-hidden="true"><span class="food-scene__rice"></span><span class="food-scene__leaf food-scene__leaf--one"></span><span class="food-scene__leaf food-scene__leaf--two"></span><span class="food-scene__spice"></span></div>
            <span class="food-scene__steam food-scene__steam--one" aria-hidden="true"></span>
            <span class="food-scene__steam food-scene__steam--two" aria-hidden="true"></span>
          </div>
        </div>
        <div class="section-heading">
          <div>
            <p class="eyebrow">Near you</p>
            <h2 id="restaurants-title">Fictional kitchens of Shamgarh</h2>
          </div>
          <v-select v-model="cuisine" :items="cuisineOptions" label="Cuisine" hide-details density="compact" class="cuisine-select" />
        </div>

        <div v-if="loading" class="restaurant-grid" aria-label="Loading restaurants">
          <v-skeleton-loader v-for="index in 3" :key="index" type="card" class="restaurant-skeleton" />
        </div>
        <div v-else-if="restaurants.length === 0" class="empty-state">
          <v-icon icon="mdi-store-search-outline" size="42" aria-hidden="true" />
          <h3>No kitchens found</h3>
          <p>Try another cuisine or refresh the demo catalog.</p>
          <AppButton variant="secondary" @click="loadRestaurants">Refresh kitchens</AppButton>
        </div>
        <div v-else class="restaurant-grid">
          <v-card v-for="restaurant in restaurants" :key="restaurant.restaurant_id" class="restaurant-card" @click="selectRestaurant(restaurant)">
            <div class="restaurant-card__visual" aria-hidden="true">
              <span>{{ restaurant.name.charAt(0) }}</span>
            </div>
            <v-card-item>
              <v-card-title>{{ restaurant.name }}</v-card-title>
              <v-card-subtitle>{{ restaurant.cuisine_types.join(' · ') }}</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <p class="restaurant-card__description">{{ restaurant.description }}</p>
              <div class="restaurant-card__meta">
                <span><v-icon icon="mdi-star" size="16" aria-hidden="true" /> {{ restaurant.rating.toFixed(1) }}</span>
                <span><v-icon icon="mdi-clock-outline" size="16" aria-hidden="true" /> {{ restaurant.delivery_time_min }} min</span>
                <span>{{ restaurant.is_open ? 'Open now' : 'Closed' }}</span>
              </div>
            </v-card-text>
            <v-card-actions>
              <AppButton block :disabled="!restaurant.is_open" @click.stop="selectRestaurant(restaurant)">
                {{ restaurant.is_open ? 'View menu' : 'Currently closed' }}
              </AppButton>
            </v-card-actions>
          </v-card>
        </div>
      </section>

      <section v-else-if="step === 2" aria-labelledby="menu-title">
        <button type="button" class="back-link" @click="step = 1">← Back to kitchens</button>
        <div class="section-heading section-heading--menu">
          <div>
            <p class="eyebrow">{{ selectedRestaurant?.cuisine_types?.join(' · ') }}</p>
            <h2 id="menu-title">{{ selectedRestaurant?.name }}</h2>
            <p>{{ selectedRestaurant?.description }}</p>
          </div>
          <v-chip color="primary" variant="tonal">{{ cartItemCount }} items · {{ money(cart?.subtotal_minor || 0) }}</v-chip>
        </div>

        <div v-if="loading" class="menu-loading"><v-progress-circular indeterminate color="primary" aria-label="Loading menu" /></div>
        <div v-else class="menu-list">
          <v-card v-for="category in menu.categories" :key="category.category_id" class="menu-category">
            <v-card-title>{{ category.category }}</v-card-title>
            <v-card-text>
              <article v-for="item in category.items" :key="item.item_id" class="menu-item">
                <div class="menu-item__copy">
                  <div class="menu-item__title"><span :class="['veg-dot', { 'veg-dot--nonveg': !item.is_veg }]" aria-label="Vegetarian indicator" />{{ item.name }}</div>
                  <p>{{ item.description }}</p>
                  <div class="menu-item__meta"><strong>{{ money(item.price_minor) }}</strong><span v-for="tag in item.tags" :key="tag">{{ tag }}</span></div>
                </div>
                <AppButton variant="secondary" :disabled="!item.is_available || cartMutating || placingOrder" @click="addItem(item)">{{ item.is_available ? 'Add' : 'Unavailable' }}</AppButton>
              </article>
            </v-card-text>
          </v-card>
        </div>

        <v-card v-if="cartItemCount" class="cart-dock">
          <div><strong>Your cart</strong><span>{{ cartItemCount }} items · {{ money(cart.subtotal_minor) }}</span></div>
          <AppButton @click="openCheckout">Review cart</AppButton>
        </v-card>
      </section>

      <section v-else aria-labelledby="checkout-title">
        <button type="button" class="back-link" @click="step = 2">← Back to menu</button>
        <div class="section-heading">
          <div><p class="eyebrow">Almost there</p><h2 id="checkout-title">Checkout</h2></div>
          <v-chip color="secondary" variant="tonal">Demo mode</v-chip>
        </div>
        <div class="checkout-grid">
          <div class="checkout-column">
            <v-card class="checkout-card">
              <v-card-title>Delivery address</v-card-title>
              <v-card-text>
                <div v-if="addresses.length" class="address-list">
                  <button v-for="address in addresses" :key="address.address_id" type="button" :class="['address-option', { 'address-option--selected': selectedAddressId === address.address_id }]" @click="selectAddress(address)">
                    <span><strong>{{ address.label || 'Saved address' }}</strong><br />{{ address.line1 }}, {{ address.city }} {{ address.pincode }}</span>
                    <v-icon v-if="selectedAddressId === address.address_id" icon="mdi-check-circle" color="primary" aria-label="Selected" />
                  </button>
                </div>
                <p v-else class="muted-copy">Add a Shamgarh address to continue.</p>
                <AppButton variant="ghost" @click="showAddressForm = !showAddressForm">{{ showAddressForm ? 'Hide address form' : '+ Add another address' }}</AppButton>
                <form v-if="showAddressForm" class="address-form" @submit.prevent="saveAddress">
                  <v-text-field v-model="addressForm.line1" label="House / street" required />
                  <v-text-field v-model="addressForm.area" label="Area" />
                  <div class="form-row"><v-text-field v-model="addressForm.city" label="City" required /><v-text-field v-model="addressForm.pincode" label="Pincode" required /></div>
                  <v-text-field v-model="addressForm.contact_phone" label="Contact phone (optional)" />
                  <AppButton type="submit" :loading="savingAddress">Save address</AppButton>
                </form>
              </v-card-text>
            </v-card>

            <v-card class="checkout-card">
              <v-card-title>Payment</v-card-title>
              <v-card-text>
                <v-radio-group v-model="paymentMode" hide-details>
                  <v-radio label="Demo payment succeeds" value="success" />
                  <v-radio label="Simulate a declined payment" value="decline" />
                </v-radio-group>
                <p class="muted-copy">No real payment is processed. The backend persists the mock outcome.</p>
              </v-card-text>
            </v-card>
          </div>

          <v-card class="checkout-card checkout-summary">
            <v-card-title>Order summary</v-card-title>
            <v-card-text>
              <div v-for="item in cart?.items || []" :key="item.cart_item_id" class="summary-line">
                <span>{{ item.quantity }} × {{ item.name }}</span><strong>{{ money(item.line_total_minor) }}</strong>
                <button type="button" class="remove-link" :disabled="cartMutating || placingOrder" @click="removeItem(item.cart_item_id)">Remove</button>
              </div>
              <div v-if="serviceability && !serviceability.serviceable" class="serviceability-warning" role="alert"><strong>We can’t deliver to this address</strong><p>{{ serviceability.reason }}</p></div>
              <p v-else-if="serviceability" class="serviceability-note">{{ serviceability.reason }} · {{ serviceability.estimated_delivery_min }} min · {{ money(serviceability.delivery_fee_minor) }} delivery</p>
              <div v-if="quote" class="summary-total"><span>Subtotal</span><strong>{{ money(quote.subtotal_minor) }}</strong><span>Taxes</span><strong>{{ money(quote.taxes_minor) }}</strong><span>Delivery</span><strong>{{ money(quote.delivery_fee_minor) }}</strong><span class="summary-total__grand">Total</span><strong class="summary-total__grand">{{ money(quote.total_amount_minor) }}</strong></div>
              <p v-else-if="quoteLoading" class="muted-copy">Calculating delivery for this address…</p>
              <p v-else-if="!serviceability" class="muted-copy">Choose an address to calculate your total.</p>
              <AppButton block :loading="placingOrder" :disabled="cartMutating || placingOrder || quoteLoading || !selectedAddressId || !quote || !cartItemCount" @click="placeDemoOrder">Place demo order</AppButton>
            </v-card-text>
          </v-card>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/common/AppButton.vue'
import FormAlert from '@/components/common/FormAlert.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { listRestaurants, getRestaurantMenu } from '@/services/catalogService'
import { addCartItem, getCart, removeCartItem } from '@/services/cartService'
import { listAddresses, createAddress } from '@/services/addressService'
import { checkServiceability, quoteOrder, placeOrder, payForOrder, cancelOrder, getOrderHistory } from '@/services/orderService'
import { toErrorMessage } from '@/utils/errors'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { readSessionValue, writeSessionValue, removeSessionValue } from '@/utils/storage'

const router = useRouter()
const auth = useAuthStore()
const pendingPaymentKey = `swaad.pending_payment.${auth.userId}`
const pendingPayment = ref(readSessionValue(pendingPaymentKey, null))
const shamgarh = { latitude: 24.1874, longitude: 75.6396 }
const stepLabels = ['Discover', 'Build cart', 'Checkout']
const step = ref(1)
const loading = ref(false)
const savingAddress = ref(false)
const placingOrder = ref(false)
const cartMutating = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const cuisine = ref('')
const restaurants = ref([])
const selectedRestaurant = ref(null)
const menu = ref({ categories: [] })
const cart = ref(null)
const cartToken = ref(sessionStorage.getItem('swaad.cart_token') || '')
const addresses = ref([])
const selectedAddressId = ref('')
const quote = ref(null)
const serviceability = ref(null)
const quoteLoading = ref(false)
let quoteRequestSequence = 0
const showAddressForm = ref(false)
const paymentMode = ref('success')
const addressForm = reactive({ line1: '', area: '', city: 'Shamgarh', state: 'Madhya Pradesh', pincode: '458883', contact_phone: '' })

const cuisineOptions = computed(() => ['All cuisines', ...new Set(restaurants.value.flatMap((restaurant) => restaurant.cuisine_types || []))])
const cartItemCount = computed(() => (cart.value?.items || []).reduce((total, item) => total + item.quantity, 0))

function money(minor = 0) {
  return `₹${(Number(minor) / 100).toFixed(2)}`
}

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function invalidateQuote() {
  ++quoteRequestSequence
  quote.value = null
  serviceability.value = null
  quoteLoading.value = false
}

async function loadRestaurants() {
  loading.value = true
  clearMessages()
  try {
    const result = await listRestaurants({ ...shamgarh, cuisine: cuisine.value === 'All cuisines' ? '' : cuisine.value })
    restaurants.value = result?.restaurants || []
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'We could not load the Shamgarh kitchens.')
  } finally {
    loading.value = false
  }
}

async function selectRestaurant(restaurant) {
  loading.value = true
  clearMessages()
  try {
    selectedRestaurant.value = restaurant
    menu.value = await getRestaurantMenu(restaurant.restaurant_id)
    step.value = 2
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'This menu could not be opened.')
  } finally {
    loading.value = false
  }
}

async function refreshCart() {
  if (!cartToken.value) return
  try {
    cart.value = await getCart(cartToken.value)
  } catch (error) {
    cart.value = null
    invalidateQuote()
    errorMessage.value = toErrorMessage(error, 'Your cart could not be refreshed.')
  }
}

async function addItem(item) {
  if (cartMutating.value || placingOrder.value) return
  cartMutating.value = true
  invalidateQuote()
  clearMessages()
  try {
    const result = await addCartItem({ cartToken: cartToken.value, restaurantId: selectedRestaurant.value.restaurant_id, itemId: item.item_id })
    cartToken.value = result.cart_token
    sessionStorage.setItem('swaad.cart_token', cartToken.value)
    await refreshCart()
    successMessage.value = `${item.name} added to your cart.`
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'That item could not be added.')
  } finally {
    cartMutating.value = false
  }
}

async function removeItem(cartItemId) {
  if (cartMutating.value || placingOrder.value) return
  cartMutating.value = true
  invalidateQuote()
  clearMessages()
  try {
    await removeCartItem(cartToken.value, cartItemId)
    await refreshCart()
    cartMutating.value = false
    if (cartItemCount.value && selectedAddressId.value) {
      await loadQuote()
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'That item could not be removed.')
  } finally {
    cartMutating.value = false
  }
}

async function openCheckout() {
  step.value = 3
  clearMessages()
  try {
    const result = await listAddresses()
    addresses.value = result?.addresses || []
    selectedAddressId.value = addresses.value.find((address) => address.is_default)?.address_id || addresses.value[0]?.address_id || ''
    showAddressForm.value = addresses.value.length === 0
    await loadQuote()
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Addresses could not be loaded.')
  }
}

async function loadQuote() {
  const requestSequence = ++quoteRequestSequence
  const addressId = selectedAddressId.value
  const restaurantId = selectedRestaurant.value?.restaurant_id
  const currentCartToken = cartToken.value
  quote.value = null
  serviceability.value = null
  errorMessage.value = ''
  if (cartMutating.value || !cartItemCount.value || !addressId || !currentCartToken || !restaurantId) {
    quoteLoading.value = false
    return
  }
  quoteLoading.value = true
  try {
    const nextServiceability = await checkServiceability({ restaurantId, addressId })
    if (requestSequence !== quoteRequestSequence) return
    serviceability.value = nextServiceability
    if (!nextServiceability.serviceable) {
      errorMessage.value = nextServiceability.reason
      return
    }
    const nextQuote = await quoteOrder({ cartToken: currentCartToken, addressId })
    if (requestSequence !== quoteRequestSequence) return
    quote.value = nextQuote
  } catch (error) {
    if (requestSequence !== quoteRequestSequence) return
    quote.value = null
    serviceability.value = null
    errorMessage.value = toErrorMessage(error, 'We could not calculate delivery for this address.')
  } finally {
    if (requestSequence === quoteRequestSequence) quoteLoading.value = false
  }
}

function selectAddress(address) {
  selectedAddressId.value = address.address_id
  loadQuote()
}

async function saveAddress() {
  savingAddress.value = true
  clearMessages()
  try {
    const result = await createAddress({ ...addressForm, latitude: shamgarh.latitude, longitude: shamgarh.longitude, is_default: addresses.value.length === 0 })
    const address = result?.address
    if (address) {
      addresses.value = [...addresses.value, address]
      selectedAddressId.value = address.address_id
      showAddressForm.value = false
      await loadQuote()
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'This address could not be saved.')
  } finally {
    savingAddress.value = false
  }
}

async function placeDemoOrder() {
  if (placingOrder.value) return
  if (!pendingPayment.value && (cartMutating.value || quoteLoading.value || !quote.value || !cartItemCount.value)) return
  placingOrder.value = true
  clearMessages()
  try {
    if (!pendingPayment.value) {
      const order = await placeOrder({ cartToken: cartToken.value, addressId: selectedAddressId.value })
      pendingPayment.value = { orderId: order.order_id, totalAmount: order.total_amount_minor }
      writeSessionValue(pendingPaymentKey, pendingPayment.value)
      // Placement consumed the backend cart, even when payment later declines.
      sessionStorage.removeItem('swaad.cart_token')
      cartToken.value = ''
      cart.value = null
      invalidateQuote()
    }
    const orderId = pendingPayment.value.orderId
    const payment = await payForOrder({ orderId, paymentToken: paymentMode.value === 'decline' ? 'mock_fail' : 'demo-token' })
    if (payment.status !== 'success') throw new ApiError({ status: 402, message: 'Payment has not succeeded. Please retry.' })
    pendingPayment.value = null
    removeSessionValue(pendingPaymentKey)
    router.push({ name: ROUTE_NAMES.TRACKING, params: { orderId } })
  } catch (error) {
    if (error.status !== 409 || !await reconcilePendingPayment()) {
      errorMessage.value = toErrorMessage(error, 'The demo order could not be completed.')
    }
  } finally {
    placingOrder.value = false
  }
}

async function cancelPendingPayment() {
  if (placingOrder.value || !pendingPayment.value) return
  placingOrder.value = true
  clearMessages()
  try {
    await cancelOrder(pendingPayment.value.orderId)
    pendingPayment.value = null
    removeSessionValue(pendingPaymentKey)
    step.value = 1
    successMessage.value = 'Your saved order was cancelled. You can start a new cart.'
  } catch (error) {
    if (error.status !== 409 || !await reconcilePendingPayment()) {
      errorMessage.value = toErrorMessage(error, 'The saved order could not be cancelled.')
    }
  } finally {
    placingOrder.value = false
  }
}

async function reconcilePendingPayment() {
  const orderId = pendingPayment.value?.orderId
  if (!orderId) return false
  try {
    const history = await getOrderHistory(orderId)
    const status = history.status || history.order_status?.at(-1)?.to_status
    if (pendingPayment.value?.orderId !== orderId || !['cancelled', 'rejected', 'delivered'].includes(status)) return false
    pendingPayment.value = null
    removeSessionValue(pendingPaymentKey)
    step.value = 1
    successMessage.value = `Your saved order is already ${status}. You can start a new cart.`
    return true
  } catch {
    // A failed status read is not evidence that a saved order can be discarded.
    return false
  }
}

watch(cuisine, loadRestaurants)
onMounted(async () => {
  placingOrder.value = true
  await loadRestaurants()
  await refreshCart()
  await reconcilePendingPayment()
  placingOrder.value = false
})
</script>

<style scoped>
.order-page { min-height: 100vh; background: rgb(var(--v-theme-background)); color: rgb(var(--v-theme-on-background)); }
.order-page__bar { display: flex; justify-content: space-between; align-items: center; max-width: 1180px; margin: 0 auto; padding: 1rem 1.25rem; }
.order-page__brand { display: inline-flex; align-items: center; gap: .45rem; border: 0; background: transparent; color: rgb(var(--v-theme-primary)); font-size: 1.2rem; font-weight: 800; cursor: pointer; }
.order-page__mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: rgb(var(--v-theme-primary)); color: white; }
.order-page__main { max-width: 1180px; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
.order-page__intro { max-width: 680px; margin-bottom: 1.5rem; }
.order-page__intro h1, .section-heading h2 { margin: .25rem 0 .5rem; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.05; color: rgb(var(--v-theme-primary-darken-1)); }
.order-page__intro p:last-child, .section-heading p { margin: 0; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }
.eyebrow { margin: 0; color: rgb(var(--v-theme-secondary)); font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.order-steps { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1.5rem 0 2rem; }
.order-step { display: inline-flex; align-items: center; gap: .45rem; padding: .45rem .7rem; border-radius: 999px; background: rgb(var(--v-theme-surface-variant)); color: rgba(var(--v-theme-on-surface), .65); font-size: .85rem; }
.order-step--active { background: rgb(var(--v-theme-primary)); color: white; }
.order-step__number { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,.25); font-weight: 800; }
.discovery-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, .65fr); align-items: center; gap: 1rem; min-height: 230px; margin-bottom: 2rem; padding: 1.5rem 2rem; overflow: hidden; border: 1px solid rgba(232, 93, 4, .18); border-radius: 28px; background: linear-gradient(110deg, rgba(255, 237, 213, .96), rgba(255, 247, 237, .98)); }
.discovery-hero__copy { max-width: 540px; }
.discovery-hero__copy h2 { margin: .35rem 0 .55rem; color: rgb(var(--v-theme-primary-darken-1)); font-size: clamp(1.75rem, 4vw, 3rem); line-height: 1.05; }
.discovery-hero__copy p:last-child { max-width: 440px; margin: 0; color: rgba(var(--v-theme-on-surface), .72); }
.food-scene { position: relative; min-height: 190px; perspective: 700px; isolation: isolate; }
.food-scene__halo { position: absolute; inset: 20% 8% 8%; z-index: -1; border-radius: 50%; background: radial-gradient(circle, rgba(255, 186, 8, .38), rgba(255, 186, 8, 0) 68%); filter: blur(3px); }
.food-scene__plate { position: absolute; top: 34%; left: 50%; width: 170px; height: 92px; transform: translate(-50%, -50%) rotateX(62deg) rotateZ(-12deg); border: 8px solid rgba(255, 255, 255, .72); border-radius: 50%; background: radial-gradient(ellipse at 48% 42%, #f97316 0 28%, #fb923c 29% 42%, #fed7aa 43% 58%, #ea580c 59% 66%, #fff7ed 67%); box-shadow: 0 24px 20px rgba(124, 45, 18, .2), inset 0 -10px 0 rgba(124, 45, 18, .15); animation: food-float 5s ease-in-out infinite; }
.food-scene__rice { position: absolute; top: 23%; left: 31%; width: 48px; height: 30px; border-radius: 50%; background: #fff7ed; box-shadow: 12px -4px 0 #fffbeb, 20px 8px 0 #fff7ed, -10px 8px 0 #fffbeb; }
.food-scene__leaf { position: absolute; width: 19px; height: 10px; border-radius: 100% 0 100% 0; background: #65a30d; }
.food-scene__leaf--one { top: 28%; left: 67%; transform: rotate(28deg); }
.food-scene__leaf--two { top: 47%; left: 22%; transform: rotate(-22deg); }
.food-scene__spice { position: absolute; top: 43%; left: 55%; width: 10px; height: 10px; border-radius: 50%; background: #dc2626; box-shadow: 15px 4px 0 #facc15, -16px -4px 0 #facc15; }
.food-scene__steam { position: absolute; top: 8%; width: 18px; height: 58px; border-left: 3px solid rgba(255, 255, 255, .75); border-radius: 50%; filter: blur(.2px); animation: steam-rise 3.5s ease-in-out infinite; }
.food-scene__steam--one { left: 43%; transform: rotate(12deg); }
.food-scene__steam--two { left: 58%; height: 45px; animation-delay: -1.3s; transform: rotate(-12deg); }
@keyframes food-float { 0%, 100% { margin-top: 0; } 50% { margin-top: -9px; } }
@keyframes steam-rise { 0%, 100% { opacity: .1; transform: translateY(8px) scale(.8) rotate(12deg); } 50% { opacity: .8; transform: translateY(-6px) scale(1) rotate(-8deg); } }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 1.25rem; }
.section-heading h2 { font-size: clamp(1.7rem, 4vw, 2.5rem); }
.cuisine-select { max-width: 190px; }
.restaurant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.restaurant-card { overflow: hidden; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease; }
.restaurant-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(94, 48, 24, .12); }
.restaurant-card__visual { display: grid; place-items: center; height: 132px; background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-accent))); color: white; font-size: 4rem; font-weight: 900; }
.restaurant-card__description { min-height: 44px; margin: 0 0 1rem; color: rgba(var(--v-theme-on-surface), .72); }
.restaurant-card__meta, .menu-item__meta { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; color: rgba(var(--v-theme-on-surface), .7); font-size: .82rem; }
.restaurant-card__meta span { display: inline-flex; align-items: center; gap: .2rem; }
.back-link, .remove-link { border: 0; background: transparent; color: rgb(var(--v-theme-primary)); font: inherit; cursor: pointer; }
.back-link { margin-bottom: 1rem; font-weight: 700; }
.section-heading--menu { align-items: center; }
.menu-list { display: grid; gap: 1rem; }
.menu-category .v-card-title { color: rgb(var(--v-theme-primary-darken-1)); }
.menu-item { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-top: 1px solid rgb(var(--v-theme-surface-variant)); }
.menu-item:first-child { border-top: 0; }
.menu-item__title { display: flex; align-items: center; gap: .45rem; font-size: 1.05rem; font-weight: 800; }
.menu-item__copy p { margin: .35rem 0 .6rem; color: rgba(var(--v-theme-on-surface), .68); }
.menu-item__meta strong { color: rgb(var(--v-theme-primary-darken-1)); }
.menu-item__meta span { padding: .2rem .45rem; border-radius: 5px; background: rgb(var(--v-theme-surface-variant)); }
.veg-dot { width: 10px; height: 10px; border: 2px solid rgb(var(--v-theme-success)); border-radius: 3px; }
.veg-dot--nonveg { border-color: rgb(var(--v-theme-error)); }
.cart-dock { display: flex; justify-content: space-between; align-items: center; gap: 1rem; position: sticky; bottom: 1rem; margin-top: 1.5rem; padding: 1rem 1.25rem; background: rgb(var(--v-theme-primary-darken-1)); color: white; }
.cart-dock div { display: grid; gap: .2rem; }
.cart-dock span { opacity: .85; font-size: .9rem; }
.checkout-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 1rem; align-items: start; }
.checkout-column { display: grid; gap: 1rem; }
.checkout-card { padding: .35rem; }
.address-list { display: grid; gap: .6rem; }
.address-option { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: .8rem; border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 12px; background: white; text-align: left; cursor: pointer; }
.address-option--selected { border: 2px solid rgb(var(--v-theme-primary)); background: rgba(232, 93, 4, .05); }
.address-form { margin-top: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.muted-copy { color: rgba(var(--v-theme-on-surface), .68); font-size: .9rem; }
.serviceability-note { margin: .75rem 0; padding: .7rem; border-radius: 10px; background: rgba(34, 197, 94, .1); color: rgb(var(--v-theme-success-darken-1)); font-size: .86rem; }
.serviceability-warning { margin: .75rem 0; padding: .8rem; border: 1px solid rgba(220, 38, 38, .25); border-radius: 10px; background: rgba(220, 38, 38, .08); color: rgb(var(--v-theme-error-darken-1)); }
.serviceability-warning p { margin: .25rem 0 0; font-size: .86rem; }
.summary-line { display: grid; grid-template-columns: 1fr auto; gap: .3rem .75rem; padding: .65rem 0; border-bottom: 1px solid rgb(var(--v-theme-surface-variant)); }
.remove-link { grid-column: 1 / -1; justify-self: start; font-size: .8rem; }
.summary-total { display: grid; grid-template-columns: 1fr auto; gap: .6rem; padding: 1rem 0 1.25rem; }
.summary-total__grand { padding-top: .65rem; border-top: 2px solid rgb(var(--v-theme-surface-variant)); font-size: 1.1rem; color: rgb(var(--v-theme-primary-darken-1)); }
.empty-state, .menu-loading { display: grid; place-items: center; gap: .7rem; min-height: 240px; padding: 2rem; text-align: center; }
.empty-state h3 { margin: 0; }
.empty-state p { margin: 0 0 .5rem; color: rgba(var(--v-theme-on-surface), .68); }
@media (max-width: 700px) {
  .discovery-hero { grid-template-columns: 1fr; padding: 1.25rem; }
  .food-scene { min-height: 150px; }
  .food-scene__plate { transform: translate(-50%, -50%) scale(.85) rotateX(62deg) rotateZ(-12deg); }
  .section-heading, .checkout-grid { display: block; }
  .cuisine-select { max-width: none; margin-top: 1rem; }
  .checkout-summary { margin-top: 1rem; }
  .menu-item { align-items: start; }
  .menu-item .app-button { flex: 0 0 auto; }
}
@media (prefers-reduced-motion: reduce) { .restaurant-card { transition: none; } .restaurant-card:hover { transform: none; } .food-scene__plate, .food-scene__steam { animation: none; } }
</style>
