import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.laryko',
  appName: 'Laryko',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#0a0a0a',
  server: {
    androidScheme: 'https',
  },
  ios: {
    scheme: 'laryko',
    contentInset: 'never',
    backgroundColor: '#0a0a0a',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    App: {
      iosScheme: 'laryko',
    },
  },
}

export default config
