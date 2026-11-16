# 🛠️ Guía de Desarrollo de Laryko

Documentación técnica y de arquitectura para desarrolladores y colaboradores del proyecto.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología | Descripción |
|------|-----------|-------------|
| **Core UI & Web (PWA)** | **Vite + React 18 + TypeScript** | Código 100% compartido en `src/`, PWA con autoUpdate via `vite-plugin-pwa` |
| **Estilos** | **CSS Nativo** | CSS Modules (`*.module.css`) + CSS Custom Properties con detección automática de tema claro/oscuro (`prefers-color-scheme`). Sin Tailwind ni librerías CSS pesadas |
| **Móvil Nativo** | **Capacitor.js v6** | Envoltorio nativo para iOS (`.ipa` / App Store) y Android (`.apk` / Play Store) |
| **Escritorio Nativo** | **Tauri v2** | Binarios ligeros nativos en Rust para Windows (`.exe`), macOS (`.dmg`), Linux (`.AppImage`) |
| **Persistencia Offline-First** | **Dexie.js (IndexedDB)** | Almacenamiento reactivo local que funciona 100% offline en todas las plataformas |
| **Detección de Red** | **`useOnlineStatus`** | Capacitor Network + `navigator.onLine` |
| **Hosting Web** | **Vercel** | Desplegado en `https://laryko.com` con rewrites SPA y cabeceras de caché óptimas |

---

## 🏷️ Identificadores y Dominio

- **Nombre:** `Laryko`
- **Application ID / Bundle ID:** `com.laryko`
- **Dominio Oficial:** `https://laryko.com`
- **Custom URL Scheme:** `laryko://`
- **Rutas reservadas:**
  - Universal Links (iOS): `https://laryko.com/.well-known/apple-app-site-association`
  - Android App Links: `https://laryko.com/.well-known/assetlinks.json`

---

## 📦 Nombres Fijos de Binarios en GitHub Releases

Para facilitar la distribución directa y sideloading sin cambiar URLs en cada release, todos los artefactos usan nombres fijos sin número de versión:

| Plataforma | Nombre de Artefacto | Canal de Distribución |
|------------|---------------------|-----------------------|
| **iOS** | `Laryko-iOS.ipa` | SideStore / AltStore (unsigned) |
| **Android** | `Laryko-Android.apk` | Sideload directo APK |
| **Windows** | `Laryko-Windows.exe` | Instalador NSIS / Standalone |
| **macOS** | `Laryko-macOS.dmg` | Imagen de disco macOS (Universal) |
| **Linux** | `Laryko-Linux.AppImage` | AppImage portable para Linux x86_64 |

---

## 🔄 Sistema Integrado de Actualizaciones (`useAppUpdater`)

Al iniciar la app o presionar **"Buscar actualizaciones"**:
1. Consulta `https://api.github.com/repos/larykoCom/laryko/releases/latest`.
2. Compara el `tag_name` del último release contra la versión local (`v0.1.0`).
3. Si existe una versión más reciente, despliega el modal interactivo con las notas del release y ejecuta la acción adecuada por plataforma:
   - **Web / PWA:** Activa el Service Worker pendiente (`SKIP_WAITING`) y recarga la página.
   - **iOS (SideStore):** Lanza el esquema de instalación directa en SideStore: `sidestore://install?url=https://github.com/larykoCom/laryko/releases/latest/download/Laryko-iOS.ipa` (con flag `IS_APP_STORE` listo para alternar a App Store).
   - **Android:** Descarga el APK fijo `Laryko-Android.apk`.
   - **Windows / macOS / Linux:** Descarga el binario directo o dispara el updater nativo de Tauri v2.

---

## 💻 Desarrollo Local

### Requisitos previos
- **Node.js** >= 20.x
- **pnpm**
- **Rust** >= 1.77.2 (para Tauri)
- **Xcode** (para iOS, solo macOS)
- **Android Studio** (para Android)

### Instalación
```bash
# 1. Instalar dependencias con pnpm
pnpm install

# 2. Configurar hooks de seguridad en git (ejecutado automáticamente en postinstall)
pnpm run prepare
```

### Ejecutar en la Web (Vite Dev Server)
```bash
pnpm run dev
# Abre http://localhost:5173
```

### Ejecutar en Escritorio con Tauri (macOS/Windows/Linux)
```bash
pnpm run tauri dev
```

### Inicializar y Sincronizar Plataformas Móviles (Capacitor)
```bash
# Inicializar iOS
pnpm dlx @capacitor/cli add ios
pnpm run cap:ios

# Inicializar Android
pnpm dlx @capacitor/cli add android
pnpm run cap:android

# Sincronizar cambios de frontend con las apps nativas
pnpm run build
pnpm run cap:sync
```

---

## 🏗️ Estructura del Repositorio

```text
laryko/
├── .github/
│   └── workflows/
│       ├── release.yml          # CI/CD multi-runner: compila y publica los 5 binarios
│       └── security-audit.yml   # Auditoría continua de seguridad y tipos en GitHub Actions
├── .githooks/
│   └── pre-commit               # Hook de pre-commit para tipos y prevención de fugas
├── public/
│   ├── .well-known/
│   │   ├── apple-app-site-association # Universal Links iOS
│   │   └── assetlinks.json            # App Links Android
│   ├── favicon.svg
│   └── robots.txt
├── src-tauri/                   # Configuración y código Rust para Tauri v2
│   ├── capabilities/
│   │   └── default.json
│   ├── src/
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── src/                         # 100% de la UI y lógica compartida
│   ├── components/
│   │   ├── StatusBadge/         # Indicador Online / Offline
│   │   └── UpdateModal/         # Modal de actualización y notas de release
│   ├── db/
│   │   └── laryko.db.ts         # Dexie.js (IndexedDB) para persistencia offline
│   ├── hooks/
│   │   ├── useAppUpdater.ts     # Verificador y disparador de releases GitHub
│   │   ├── useCounter.ts        # Contador reactivo offline
│   │   ├── useOnlineStatus.ts   # Estado de red Capacitor / Web
│   │   ├── usePlatform.ts       # Detección de plataforma (Web, iOS, Android, Win, Mac, Linux)
│   │   └── useQuickNote.ts      # Notas rápidas offline en Dexie
│   ├── styles/
│   │   ├── animations.css       # Keyframes y animaciones nativas
│   │   ├── global.css           # Tokens de diseño y reset (dark/light theme)
│   │   └── index.css
│   ├── types/                   # Tipos TypeScript comunes
│   ├── App.tsx                  # Pantalla Hola Mundo principal con footer dinámico
│   └── main.tsx                 # Entrada React
├── capacitor.config.ts          # Configuración Capacitor (com.laryko, laryko://)
├── GEMINI.md                    # Regla estricta de auditoría de seguridad previa a ediciones
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vercel.json                  # Rewrites SPA y headers de caché para PWA y .well-known
└── vite.config.ts               # Vite + VitePWA + alias '@/' moderno
```

---

## 🛡️ Seguridad y Auditoría Continua

El proyecto implementa la metodología de auditoría de seguridad de [Cloudflare Security Audit](https://github.com/cloudflare/security-audit-skill) tanto localmente como en CI/CD:

1. **Pre-commit Hook Local (`.githooks/pre-commit`):**
   - Intercepta cada commit antes de registrarse.
   - Bloquea intentos de commitear archivos sensibles (`.env`, `.pem`, `.key`).
   - Verifica la integridad estricta de tipos en TypeScript (`tsc --noEmit`).

2. **GitHub Actions Workflow (`.github/workflows/security-audit.yml`):**
   - **Supply Chain:** Ejecuta `pnpm audit` para bloquear paquetes vulnerables.
   - **Type & Build Integrity:** Compila y verifica consistencia de tipos en cada PR o Push.
   - **Límites de Confianza:** Verifica que no existan credenciales versionadas y valida la consistencia de los App IDs (`com.laryko`) en Capacitor y Tauri.

Comandos de auditoría rápida:
```bash
# Auditar vulnerabilidades de dependencias
pnpm run audit

# Auditoría completa de dependencias y tipos
pnpm run security:check

# Sincronizar versión y año de copyright en todas las plataformas
pnpm run sync:version

# Verificar si alguna plataforma tiene versiones o fechas desfasadas
pnpm run sync:check
```

---

## 🔄 Sincronización Multiplataforma de Versión y Copyright

Para garantizar que todas las aplicaciones (macOS, Windows, Linux, Android, iOS, Web) muestren la misma versión y fecha de copyright:

1. Modifica la versión en `package.json` (o pasa la nueva versión a `pnpm run sync:version 0.2.0`).
2. El script sincroniza automáticamente:
   - `src-tauri/tauri.conf.json` (`version` y `bundle.copyright = "Copyright © <AÑO> Laryko"`)
   - `src-tauri/Cargo.toml` (`version = "..."`)
   - `android/app/build.gradle` (`versionCode` y `versionName`)
   - `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION` y `CURRENT_PROJECT_VERSION`)
   - `.env` y `.env.example` (`VITE_APP_VERSION=...`)
   - `LICENSE` (`Copyright (c) <AÑO> Laryko`)
   - `src/hooks/usePlatform.ts` (fallback)
3. La tarea `prebuild` ejecuta esta sincronización antes de cada `pnpm run build`.

---

## 🚀 Publicación y Release Automático

Para compilar y publicar los binarios de todas las plataformas simultáneamente:

```bash
git tag v0.1.0 -m "Release v0.1.0 - Versión inicial Hola Mundo"
git push origin v0.1.0
```

GitHub Actions compilará en matrices independientes (Ubuntu, Windows, macOS) y generará la release en GitHub con los 5 archivos fijos:
- `Laryko-iOS.ipa`
- `Laryko-Android.apk`
- `Laryko-Windows.exe`
- `Laryko-macOS.dmg`
- `Laryko-Linux.AppImage`
