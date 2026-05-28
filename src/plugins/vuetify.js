import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { appDefaults, appTheme, THEME_NAME } from './theme'

export default createVuetify({
  components,
  directives,
  defaults: appDefaults,
  theme: {
    defaultTheme: THEME_NAME,
    themes: {
      [THEME_NAME]: appTheme
    }
  }
})
