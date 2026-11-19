import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.laryko',
  appName: 'Laryko',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  ios: {
    scheme: 'laryko',
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    App: {
      iosScheme: 'laryko',
    },
  },
}

export default config
