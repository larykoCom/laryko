# Regla Global de Seguridad Obligatoria: Auditoría Previa a Ediciones (Cloudflare Security Audit)

> [!CRITICAL]
> **REGLA GLOBAL OBLIGATORIA DE SUMA IMPORTANCIA**:
> Antes de realizar cualquier edición, modificación o generación de código en cualquier proyecto, el asistente DEBE aplicar la metodología y criterios de auditoría de seguridad del skill `security-audit` (Cloudflare Security Audit).

## Verificaciones de Seguridad Previas a Toda Edición de Código:

1. **Revisión de Límites de Confianza (Trust Boundaries) e Insumos Externos:**
   - Identificar si el cambio involucra entradas del usuario, respuestas de APIs, esquemas URL (deep links), almacenamiento local, comunicaciones IPC o variables de entorno.
   - Validar rigurosamente que las entradas sean saneadas y tipadas sin asumir confianza ciega en datos externos o de cliente.

2. **Evaluación de Impacto según el Entorno (Referencia `security-audit`):**
   - **Web / Frontend:** Prevenir XSS, CSRF, fugas de secretos, problemas de CORS y manipulación indebida de Service Workers o Storage (ref: `CLIENT-SIDE.md`, `WEB-PROTOCOL-AND-AUTH.md`).
   - **Móvil y Escritorio (Capacitor / Tauri / Electron):** Auditar puentes IPC, capabilities nativas, esquemas de URL (`custom schemes`) y permisos de sistema antes de modificar código nativo (ref: `DESKTOP-MOBILE-AND-LOCAL-IPC.md`).
   - **Almacenamiento Local (IndexedDB / SQLite / Cache):** Asegurar aislamiento de datos, expiración y no persistir información sensible sin cifrado o protección adecuada (ref: `DATA-ISOLATION-AND-LIFECYCLE.md`).
   - **Cadena de Suministro y Dependencias:** No agregar dependencias de terceros sin verificar su legitimidad y propósito mínimo necesario (ref: `SUPPLY-CHAIN-AND-RELEASE.md`).

3. **Principio de Cambio Mínimo Seguro:**
   - La modificación debe ser la más pequeña, limpia y segura posible.
   - Prohibido relajar restricciones de seguridad, eludir sandbox o desactivar advertencias de tipo sin justificación explícita documentada.

---

# Regla Obligatoria de Sincronización Global de Versión y Copyright (Todas las Plataformas)

> [!IMPORTANT]
> **CONSISTENCIA GLOBAL DE METADATOS (macOS, Windows, Linux, Android, iOS, Web)**:
> En cada incremento, actualización o publicación de versión, la versión y el año de copyright DEBEN mantenerse estrictamente sincronizados en todas las plataformas y ejecutables sin discrepancias.

## 1. Fuente de la Verdad Única:
- **Versión:** `package.json` es la fuente canónica para la versión de la app (`version`).
- **Copyright:** El año en curso (`new Date().getFullYear()`) es la fuente canónica para el año de copyright en toda la suite de aplicaciones.

## 2. Archivos Sincronizados Obligatoriamente:
- **Escritorio (Tauri - macOS, Windows, Linux):**
  - `src-tauri/tauri.conf.json` (`version` y `bundle.copyright = "Copyright © <AÑO> Laryko"`).
  - `src-tauri/Cargo.toml` (`[package] version = "<VER>"`).
- **Android (Capacitor):**
  - `android/app/build.gradle` (`versionName "<VER>"` y `versionCode <CODE>`).
- **iOS (Capacitor / Xcode):**
  - `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION = <VER>;` y `CURRENT_PROJECT_VERSION = <CODE>;`).
- **Web / PWA:**
  - `.env` y `.env.example` (`VITE_APP_VERSION=<VER>`).
  - `src/hooks/usePlatform.ts` (fallback por defecto).
- **Legal:**
  - `LICENSE` (`Copyright (c) <AÑO> Laryko`).

## 3. Automatización y Verificación:
- **Ejecutar sincronización:** `pnpm run sync:version` (o `node scripts/sync-version.mjs [nueva_version]`).
- **Prebuild automático:** `pnpm run prebuild` ejecuta la sincronización antes de compilar.
- **Verificación en CI/CD:** `pnpm run sync:check` (`--check`) verifica que ningún archivo contenga versiones o años desfasados antes de generar artefactos de release.

