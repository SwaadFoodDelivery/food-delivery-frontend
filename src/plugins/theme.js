export const THEME_NAME = 'foodDeliveryTheme'

export const appTheme = {
  dark: false,
  colors: {
    primary: '#0F766E',
    'primary-darken-1': '#115E59',
    secondary: '#F97316',
    accent: '#2563EB',
    background: '#F6FAF8',
    surface: '#FFFFFF',
    'surface-variant': '#E8F1EE',
    border: '#D8E2DE',
    success: '#15803D',
    warning: '#B45309',
    error: '#B91C1C',
    info: '#0369A1',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#14211F',
    'on-surface': '#14211F',
    'on-surface-variant': '#5B6865'
  },
  variables: {
    'border-color': '#D8E2DE',
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
    rounded: 'lg',
    elevation: 0
  },
  VSheet: {
    rounded: 'lg',
    elevation: 0
  },
  VTextField: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'primary'
  },
  VChip: {
    rounded: 'lg'
  },
  VAlert: {
    rounded: 'lg'
  }
}
