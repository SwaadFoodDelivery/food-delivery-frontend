import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useAuthStore } from '@/stores/auth'
import './styles/theme.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// The api layer pulls the guest and access tokens through hooks rather than
// importing the store, which would be circular. Wire them up before the router
// installs, so the very first navigation guard already has credentials.
useAuthStore(pinia).registerApiHooks()

app.use(router)
app.use(vuetify)
app.mount('#app')
