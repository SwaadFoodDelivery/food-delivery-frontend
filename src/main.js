import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { fetchMe } from './services/authActions'
import logger from './utils/logger'
import './styles/theme.scss'

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = (err, instance, info) => {
  logger.error('Unhandled Vue error', {
    message: err?.message,
    info,
    component: instance?.$options?.name || 'unknown'
  })
}

app.use(pinia)
app.use(router)
app.use(vuetify)

await fetchMe()

app.mount('#app')
