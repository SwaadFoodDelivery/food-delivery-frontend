# 🍔 Food Delivery App — Claude Rules

> **Claude must read and follow ALL rules in this file before responding to any task in this project.**
> This is a production-ready application built for a large user base. Every decision must prioritize performance, accessibility, and scalability.

---

## 📌 Project Overview

This is a **Vue 3 food delivery web application** that allows users to browse restaurants, view menus, add items to a cart, and place orders. The app is built for **production scale with a large user base** — performance, accessibility, and code quality are non-negotiable.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 |
| Build Tool | Vite |
| Routing | Vue Router 4 |
| State Management | Pinia |
| HTTP Client | Axios |
| UI Component Library | Vuetify (selective use — see rules below) |
| Styling | CSS / Scoped styles |
| Language | JavaScript (no TypeScript) |

---

## 📁 Folder Structure

Follow this structure strictly. Do not deviate without being asked:

```
src/
├── assets/              # Images, fonts, global CSS
├── components/          # Reusable UI components (dumb/presentational)
│   ├── common/          # Shared across the app (Button, Modal, Spinner, etc.)
│   ├── cart/            # Cart-related components
│   ├── menu/            # Menu and food item components
│   └── restaurant/      # Restaurant listing/detail components
├── views/               # Page-level components (tied to routes)
├── router/              # Vue Router config (index.js)
├── stores/              # Pinia stores (one file per domain)
│   ├── cart.js
│   ├── restaurant.js
│   ├── order.js
│   └── user.js
├── services/            # Axios API service files (one per resource)
│   ├── api.js           # Axios instance + interceptors
│   ├── cache.js         # API caching utility
│   ├── restaurantService.js
│   ├── orderService.js
│   └── userService.js
├── composables/         # Reusable composition functions (useX.js)
│   ├── useDebounce.js
│   ├── useThrottle.js
│   └── useApiCache.js
├── constants/           # All app-wide and page-level constants (NO constants in .vue files)
│   ├── apis.js          # All API endpoint URLs
│   ├── home.js          # Constants specific to the Home page
│   ├── menu.js          # Constants specific to the Menu page
│   ├── cart.js          # Constants specific to the Cart page
│   └── ...              # One file per page/domain as needed
├── utils/               # Pure helper functions
└── App.vue
```

---

## ✍️ Coding Style & Conventions

### Vue Components
- Always use **`<script setup>`** (Composition API) — never Options API
- Use **Single File Components (SFC)** with this order:
  ```vue
  <template>
    <!-- markup -->
  </template>

  <script setup>
  // imports, props, emits, composables, state, computed, methods
  </script>

  <style scoped>
  /* styles */
  </style>
  ```
- Component filenames: **PascalCase** (e.g., `FoodCard.vue`, `CartSidebar.vue`)
- Props: always define with `defineProps()`, include type and default where applicable
- Emits: always declare with `defineEmits()`
- Keep components **small and focused** — if a component exceeds ~150 lines, split it

### JavaScript
- Use **`const`** by default; use `let` only when reassignment is needed
- Use **arrow functions** for callbacks and composables
- Use **async/await** (never raw `.then()` chains)
- Use **named exports** for services and utilities; **default export** for components and stores
- No `console.log` left in production code — use `// TODO: remove` comments if needed during dev

### Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Component files | PascalCase | `RestaurantCard.vue` |
| View files | PascalCase + "View" | `HomeView.vue`, `CartView.vue` |
| Pinia stores | camelCase, domain noun | `useCartStore`, `useRestaurantStore` |
| Composables | camelCase, "use" prefix | `useAuth.js`, `useDebounce.js` |
| Services | camelCase + "Service" | `restaurantService.js` |
| CSS classes | kebab-case | `.food-card`, `.cart-item` |

---

## 🗂️ Pinia Store Rules

- One store file per domain (cart, user, restaurant, order)
- Use the **Setup Store syntax** (not Options syntax):
  ```js
  import { defineStore } from 'pinia'
  import { ref, computed } from 'vue'

  export const useCartStore = defineStore('cart', () => {
    const items = ref([])
    const total = computed(() => items.value.reduce((sum, i) => sum + i.price * i.qty, 0))

    function addItem(item) { /* ... */ }
    function removeItem(id) { /* ... */ }

    return { items, total, addItem, removeItem }
  })
  ```
- Never mutate store state directly from components — always call store actions
- Persist cart and user auth state using `pinia-plugin-persistedstate` if persistence is needed

---

## 🌐 Axios & API Service Rules

- All Axios logic lives in `src/services/` — never write raw Axios calls inside components or stores
- `src/services/api.js` exports a **single configured Axios instance**:
  ```js
  import axios from 'axios'

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  })

  // Add auth token interceptor here
  export default api
  ```
- Each service file exports async functions that use the shared `api` instance
- Always handle errors in services with try/catch and return structured responses
- Use `import.meta.env.VITE_*` for all environment variables — never hardcode URLs or keys

---

## 📐 Constants Rules

**Never declare constants inside `.vue` files.** All constants live in `src/constants/` — one file per page or domain.

### Structure
```
src/constants/
├── apis.js       # All API endpoint URL strings
├── home.js       # Constants for HomeView
├── menu.js       # Constants for MenuView
├── cart.js       # Constants for CartView
├── order.js      # Constants for order-related pages
└── common.js     # Shared constants used across multiple pages (e.g. pagination limits, status labels)
```

### `apis.js` — API Endpoint Constants
All API URL paths must be defined here. Service files must import from this file — **never write URL strings directly in a service file**:

```js
// src/constants/apis.js
export const API_URLS = {
  // Restaurants
  RESTAURANTS_LIST:        '/restaurants',
  RESTAURANT_DETAIL:       '/restaurants/:id',
  RESTAURANT_MENU:         '/restaurants/:id/menu',

  // Categories
  CATEGORIES_LIST:         '/categories',

  // Cart
  CART_GET:                '/cart',
  CART_ADD_ITEM:           '/cart/items',
  CART_REMOVE_ITEM:        '/cart/items/:id',
  CART_CLEAR:              '/cart/clear',

  // Orders
  ORDER_PLACE:             '/orders',
  ORDER_DETAIL:            '/orders/:id',
  ORDER_HISTORY:           '/orders/history',

  // User
  USER_PROFILE:            '/user/profile',
  USER_LOGIN:              '/auth/login',
  USER_LOGOUT:             '/auth/logout',
  USER_REGISTER:           '/auth/register',

  // Search
  SEARCH:                  '/search',

  // Banners / Promotions
  BANNERS_FEATURED:        '/banners/featured',
}
```

Usage in a service file:
```js
// src/services/restaurantService.js
import api from './api.js'
import { API_URLS } from '@/constants/apis.js'

export async function getRestaurants() {
  const { data } = await api.get(API_URLS.RESTAURANTS_LIST)
  return data
}

export async function getRestaurantDetail(id) {
  const url = API_URLS.RESTAURANT_DETAIL.replace(':id', id)
  const { data } = await api.get(url)
  return data
}
```

### Page-Level Constants
Define magic values, labels, config numbers, and static option lists in the corresponding page constant file:

```js
// src/constants/menu.js
export const SORT_OPTIONS = [
  { label: 'Relevance',    value: 'relevance' },
  { label: 'Price: Low',   value: 'price_asc' },
  { label: 'Price: High',  value: 'price_desc' },
  { label: 'Rating',       value: 'rating' },
]

export const ITEMS_PER_PAGE = 20
export const MAX_QUANTITY_PER_ITEM = 10
```

```js
// src/constants/common.js
export const ORDER_STATUS = {
  PLACED:     'placed',
  CONFIRMED:  'confirmed',
  PREPARING:  'preparing',
  ON_THE_WAY: 'on_the_way',
  DELIVERED:  'delivered',
  CANCELLED:  'cancelled',
}

export const DEFAULT_PAGE_SIZE = 10
export const DEBOUNCE_DELAY_MS  = 300
export const CACHE_TTL_MS       = 5 * 60 * 1000  // 5 minutes
```

### Rules Summary
- ✅ All constants go in `src/constants/` — one file per page/domain
- ✅ All API URL strings go in `src/constants/apis.js`
- ✅ Service files import URL constants from `apis.js`
- ✅ Components import page constants from the matching constants file
- ❌ Never hardcode a URL string in a service file
- ❌ Never declare `const SOME_CONSTANT = ...` at the top of a `.vue` file
- ❌ Never use magic numbers/strings inline — always name them in a constants file

---

## 🔀 Vue Router Rules

- All routes defined in `src/router/index.js`
- Use **lazy-loading** for ALL route components (no exceptions):
  ```js
  { path: '/menu/:id', component: () => import('@/views/MenuView.vue') }
  ```
- Use **named routes** — never hardcode path strings in `<router-link>` or `router.push()`
- Route guards for auth-protected pages go in the router file using `beforeEach`

---

## 🎨 Styling Rules

- Use **scoped styles** (`<style scoped>`) in all components
- Global styles only in `src/assets/styles/`
- Follow a **mobile-first** approach for responsive design
- Use CSS variables for colors, spacing, and typography — define in `:root` in global CSS
- No inline styles unless absolutely necessary (e.g., dynamic widths)
- **Defer non-critical CSS** — load above-the-fold styles inline/eagerly; load secondary styles (animations, rarely-seen modals) lazily

---

## 🧩 Vuetify Usage Rules

Vuetify is available and **selectively allowed** — use it for rich interactive UI components but **never for layout/structure**.

### ✅ USE Vuetify for:
- Autocomplete / Combobox (`v-autocomplete`, `v-combobox`)
- Tabs (`v-tabs`, `v-tab`, `v-window`)
- Dialogs / Modals (`v-dialog`)
- Snackbars / Toasts (`v-snackbar`)
- Date pickers, time pickers
- Steppers for checkout flows (`v-stepper`)
- Skeleton loaders (`v-skeleton-loader`)
- Rating components (`v-rating`)
- Menus and dropdowns (`v-menu`)

### ❌ DO NOT use Vuetify for:
- **Layout and grid** — no `v-row`, `v-col`, `v-container` — use custom CSS/flexbox/grid instead
- **Typography** — no `v-card-title` as a heading, use semantic HTML (`<h1>`–`<h6>`)
- **Buttons** for primary CTAs — use your own `<AppButton>` common component
- **Basic lists** — use semantic `<ul>`, `<ol>`, `<li>`

### Vuetify Theming:
- Customize Vuetify theme tokens to match the app's design system — don't override with scoped CSS unless necessary

---

## ⚡ Performance & Optimization Rules

This app targets a **large user base** — performance is a first-class requirement.

### 🔁 Parallel API Calls
- When a page/component needs multiple independent API calls, **always use `Promise.all()`** — never await them sequentially:
  ```js
  // ✅ Correct — parallel
  const [restaurants, categories, banners] = await Promise.all([
    restaurantService.getAll(),
    categoryService.getAll(),
    bannerService.getFeatured()
  ])

  // ❌ Wrong — sequential (slow)
  const restaurants = await restaurantService.getAll()
  const categories = await categoryService.getAll()
  ```
- Use `Promise.allSettled()` when partial failure is acceptable and the UI can handle missing data gracefully

### 🔍 Debounce & Throttle
- **Search inputs**: always debounce API calls — minimum **300ms** delay:
  ```js
  // composables/useDebounce.js
  import { ref, watch } from 'vue'

  export function useDebounce(value, delay = 300) {
    const debouncedValue = ref(value.value)
    let timer
    watch(value, (newVal) => {
      clearTimeout(timer)
      timer = setTimeout(() => { debouncedValue.value = newVal }, delay)
    })
    return debouncedValue
  }
  ```
- **Scroll events, resize handlers, drag events**: always throttle — use a shared `useThrottle` composable
- **Button clicks** that trigger API calls (e.g., "Place Order"): debounce or disable after first click to prevent duplicate submissions
- Identify and apply debounce/throttle proactively — do not wait to be asked

### 🗄️ API Response Caching
Cache API responses for data that does **not** change frequently. Use a simple in-memory cache with TTL in `src/services/cache.js`:

```js
// src/services/cache.js
const cache = new Map()

export function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.data
}

export function setCache(key, data, ttlMs = 5 * 60 * 1000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}
```

**Cache these APIs** (stable/slow-changing data):
- Restaurant listings
- Menu categories
- Restaurant details / menu items
- Promotional banners
- City/location lists
- Cuisine type filters

**Never cache these APIs** (frequently changing / user-specific):
- Cart contents
- Order status / order history
- User profile
- Real-time delivery tracking
- Stock/availability updates
- Payment and checkout endpoints

### ✂️ Code Splitting & Lazy Loading
- **All route-level components** must be lazy-loaded via dynamic `import()` (already in router rules)
- **Heavy components** not on the critical render path must also be lazy-loaded using `defineAsyncComponent`:
  ```js
  import { defineAsyncComponent } from 'vue'

  const OrderTrackingMap = defineAsyncComponent(() =>
    import('@/components/order/OrderTrackingMap.vue')
  )
  ```
- Apply `defineAsyncComponent` for: maps, image carousels, review sections, complex modals, analytics dashboards
- Always provide a `loadingComponent` and `errorComponent` when using `defineAsyncComponent` in user-facing flows

### 📦 Defer Non-Critical Resources
- **Non-critical JS**: use dynamic `import()` for feature modules not needed on initial load (e.g., chat widget, analytics, promo popups)
- **Non-critical CSS**: load secondary stylesheets lazily via JS when needed, not in `<head>`
- **Third-party scripts** (analytics, maps SDK, payment SDKs): load with `defer` or `async` attributes, or inject dynamically after the app mounts

### 🚀 Preload Critical Resources
In `index.html` or via Vite plugin, **preload**:
- App fonts (`<link rel="preload" as="font">`)
- Critical icons / icon font
- Hero images on the landing page (`<link rel="preload" as="image">`)
- The main JS chunk
- Use `rel="prefetch"` for routes the user is likely to visit next (e.g., menu page after restaurant list)

---

## ♿ Accessibility Rules

Accessibility is a **core requirement**, not an afterthought.

### Semantic HTML First
- Always use the correct HTML element for its purpose **before** reaching for ARIA:
  - Navigation → `<nav>`
  - Main content → `<main>`
  - Buttons that do actions → `<button>`
  - Links that navigate → `<a href>`
  - Lists → `<ul>` / `<ol>` / `<li>`
  - Forms → `<form>`, `<label>`, `<input>`, `<fieldset>`, `<legend>`
  - Headings → `<h1>` through `<h6>` in logical order (no skipping levels)
  - Article/section content → `<article>`, `<section>`
- Never use `<div>` or `<span>` for interactive elements

### Keyboard Support
- Every interactive element must be **fully operable via keyboard**
- Tab order must be **logical and follow visual order**
- Custom interactive components (dropdowns, modals, carousels) must implement:
  - `Tab` / `Shift+Tab` for focus navigation
  - `Enter` / `Space` for activation
  - `Escape` to close/dismiss
  - Arrow keys for list/menu navigation (where appropriate)
- Always **trap focus inside modals/dialogs** when open — release on close
- Provide **visible focus indicators** — never use `outline: none` without a custom replacement
- Test keyboard navigation when building any interactive component

### ARIA — Use Only When Needed
- **Do not add ARIA if semantic HTML already conveys the meaning** — ARIA is a supplement, not a replacement
- Use ARIA when:
  - A custom component replaces a native element (e.g., custom dropdown → `role="listbox"`)
  - Dynamic content updates need to be announced (`aria-live`, `aria-atomic`)
  - An element's state must be communicated (`aria-expanded`, `aria-selected`, `aria-checked`)
  - Labeling is not possible via `<label>` (`aria-label`, `aria-labelledby`)
- Common patterns to follow:
  ```html
  <!-- Loading state announcement -->
  <div aria-live="polite" aria-atomic="true">{{ statusMessage }}</div>

  <!-- Icon-only button -->
  <button aria-label="Add to cart">🛒</button>

  <!-- Expandable section -->
  <button :aria-expanded="isOpen" @click="toggle">Filters</button>

  <!-- Modal dialog -->
  <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">Order Summary</h2>
  </div>
  ```
- Always add `alt` text to images:
  - Meaningful images: descriptive alt (`alt="Butter Chicken - ₹280"`)
  - Decorative images: empty alt (`alt=""`)

---

## ⚙️ General Development Rules

1. **Always check existing code** before creating a new component or store — avoid duplication
2. **Reuse components** from `src/components/common/` before building new ones
3. **No business logic in templates** — move complex logic to `<script setup>` or composables
4. **Error handling**: all async operations must show appropriate loading, error, and empty states in the UI
5. **Comments**: add JSDoc comments for composables and service functions; inline comments for non-obvious logic only
6. **Imports**: always use the `@/` alias for `src/` — never use relative paths like `../../`
7. **Images**: always specify `width` and `height` on `<img>` tags to prevent layout shift (CLS)
8. **Fonts**: use `font-display: swap` to avoid invisible text during font load

---

## 🚫 Things Claude Must NOT Do

- Use Options API — Composition API with `<script setup>` only
- Install new packages without mentioning it and getting approval first
- Hardcode API URLs, secrets, or credentials
- Use `v-row`, `v-col`, or `v-container` from Vuetify for layout
- Add ARIA attributes where semantic HTML already handles it
- Use `<div>` for buttons, links, or other interactive elements
- Skip debounce/throttle on search inputs or scroll handlers
- Cache API results for cart, orders, user profile, or real-time data
- Await sequential API calls when they can be parallel
- Leave unused imports, variables, or `console.log` statements
- Skip loading, error, and empty states for async operations
- Use `outline: none` without providing a visible focus replacement
- Declare constants inside `.vue` files — all constants go in `src/constants/`
- Write API URL strings directly in service files — always import from `src/constants/apis.js`

---

## ✅ Claude's Checklist Before Every Task

Before writing any code, Claude must:
1. Re-read this `CLAUDE.md`
2. Check if relevant components, composables, or services already exist
3. Check if any constants are needed — create/use the appropriate file in `src/constants/` and never declare them in the `.vue` file
4. Identify if the task involves:
   - API calls → apply caching rules + parallel calls + import URL from `apis.js`
   - Search/input → apply debounce/throttle
   - Heavy components → apply lazy loading / `defineAsyncComponent`
   - Interactive UI → verify keyboard support and accessibility
   - New Vuetify usage → verify it's not for layout/structure
   - Any constant values → define in `src/constants/`, never inline in `.vue`
5. Follow folder structure, naming conventions, and coding style
6. Ask for clarification if the task is ambiguous — do not assume

---

*Last updated: 2026-05-25*