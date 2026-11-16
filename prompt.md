Diseña e inicializa la arquitectura base ("Hola Mundo") para la aplicación multiplataforma y offline-first llamada **Laryko**, que se publicará en `git@github.com:larykoCom/laryko.git` (`https://github.com/larykoCom/laryko`) y tendrá su versión web desplegada en Vercel bajo el dominio `https://laryko.com`.

### 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First)

- **Core UI & Web (PWA en Vercel):** **Vite + React + TypeScript** usando exclusivamente **CSS Nativo** (CSS Modules `*.module.css` y Custom Properties CSS; sin Tailwind ni frameworks CSS externos).
- **Móvil Nativo (iOS `.ipa` / App Store y Android `.apk`):** **Capacitor.js** envolviendo la compilación `dist/` de Vite.
- **Escritorio Nativo (Windows, macOS, Linux):** **Tauri v2** envolviendo la misma compilación `dist/` de Vite.
- **Motor Offline-First:** **Dexie.js (IndexedDB)** como almacenamiento local reactivo persistente en todas las plataformas + detección de red (`@capacitor/network` / `navigator.onLine`).

### 2. Identificadores, Dominio y Nombres de Artefactos Fijos

Configura metadatos consistentes en `capacitor.config.ts`, `tauri.conf.json` y `vercel.json`:

- **Nombre de la app:** `Laryko`
- **Bundle ID / Application ID (Reverse-DNS):** `com.laryko`
- **Dominio Web (Vercel):** `https://laryko.com`
- **Esquema URL personalizado:** `laryko://` (y preparación para Universal Links / App Links asociados a `laryko.com`)
- **Nombres fijos de binarios en GitHub Releases (sin número de versión en el archivo):**
  - iOS (SideStore/AltStore): `Laryko-iOS.ipa`
  - Android: `Laryko-Android.apk`
  - Windows: `Laryko-Windows.exe`
  - macOS: `Laryko-macOS.dmg`
  - Linux: `Laryko-Linux.AppImage`

### 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`)

Al iniciar **Laryko**, consulta `https://api.github.com/repos/larykoCom/laryko/releases/latest`, compara `tag_name` contra la versión local (`package.json` / `@capacitor/app` / `@tauri-apps/api/app`) y, si hay una versión superior, muestra un modal en CSS nativo con las notas del release y ejecuta la acción correspondiente:

- **Web / PWA (`https://laryko.com`):** Actualiza el Service Worker y recarga la página.
- **iOS (Sideload vía SideStore):** Abre `sidestore://install?url=https://github.com/larykoCom/laryko/releases/latest/download/Laryko-iOS.ipa` (con bandera `IS_APP_STORE` preparada para cambiar en el futuro a `itms-apps://itunes.apple.com/app/id{APP_ID}`).
- **Android:** Descarga `https://github.com/larykoCom/laryko/releases/latest/download/Laryko-Android.apk` y lanza la instalación del paquete.
- **Windows / macOS / Linux:** Descarga el binario fijo desde `https://github.com/larykoCom/laryko/releases/latest/download/` o dispara el updater nativo de Tauri v2.

### 4. Entregables para este primer paso ("Hola Mundo")

1. Estructura de proyecto unificada donde `src/` comparte el 100% de la interfaz y lógica entre Web (Vercel), Capacitor (`ios/`, `android/`) y Tauri (`src-tauri/`).
2. Archivo `vercel.json` configurado con rewrites para SPA (`/(.*)` -> `/index.html`), headers de caché óptimos para PWA/Service Worker y rutas reservadas en `/.well-known/` (`apple-app-site-association` y `assetlinks.json`) vinculadas a `com.laryko`.
3. Pantalla inicial "Hola Mundo - Laryko" estilizada con CSS nativo limpio (modo claro/oscuro automático con `prefers-color-scheme`) que muestre:
   - Plataforma detectada (Web, iOS, Android, Windows, macOS, Linux), dominio/origen y versión (`v0.1.0`).
   - Indicador de estado Online/Offline y un contador/nota rápida guardado en Dexie.js que persiste sin conexión.
   - Botón **"Buscar actualizaciones"** conectado a `larykoCom/laryko`.
4. Scripts en `package.json` y un workflow de GitHub Actions (`.github/workflows/release.yml`) para compilar y publicar los artefactos con nombre fijo al crear un Tag `v*` (incluyendo exportación `.ipa` sin firmar para SideStore).
