/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_GITHUB_REPO: string
  readonly VITE_IS_APP_STORE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
