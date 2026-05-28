export const THEME_NAME = 'foodDeliveryTheme'

export const appTheme = {
  dark: false,
  colors: {
    primary: '#E85D04',
    'primary-darken-1': '#C2410C',
    secondary: '#2A9D8F',
    accent: '#FFB703',
    background: '#FFF8F2',
    surface: '#FFFFFF',
    'surface-variant': '#F3EDE8',
    success: '#2E7D32',
    warning: '#ED6C02',
    error: '#D32F2F',
    info: '#0288D1',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#1F2937',
    'on-surface': '#1F2937'
  },
  variables: {
    'border-color': '#E5E7EB',
    'high-emphasis-opacity': 0.92,
    'medium-emphasis-opacity': 0.72,
    'disabled-opacity': 0.42
  }
}

export const appDefaults = {
  global: {
    ripple: true
  },
  VAppBar: {
    flat: true,
    elevation: 0
  },
  VBtn: {
    rounded: 'lg',
    style: 'text-transform: none; font-weight: 600; letter-spacing: 0;'
  },
  VCard: {
    rounded: 'xl',
    elevation: 0
  },
  VTextField: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'primary'
  },
  VChip: {
    rounded: 'lg'
  }
}
