# Reglas de Desarrollo para Agentes IA — Laryko

Este documento es la **fuente única de reglas obligatorias** para cualquier agente de IA o desarrollador que trabaje en Laryko (compatible con Antigravity, Gemini, Claude Code, Codex, Cursor, etc.).

---

## 1. Mapeo del Código y Grafo de Conocimiento (Graphify — `graphify-out/`)

> [!IMPORTANT]
> **CONSULTAR EL GRAFO ANTES DE EXPLORAR Y ACTUALIZARLO TRAS EDITAR**:
> Laryko mantiene un grafo de conocimiento estructural del proyecto en `graphify-out/` mediante [Graphify](https://github.com/Graphify-Labs/graphify) para ir directo al grano, ubicar símbolos/dependencias rápidamente y optimizar el uso de contexto.

- **Antes de explorar manualmente:** Cuando necesites entender la arquitectura, relaciones entre archivos, flujo de datos o dónde vive una funcionalidad, consulta primero el grafo existente:
  - `graphify query "<pregunta>"` (recorrido BFS/DFS sobre `graphify-out/graph.json`)
  - `graphify path "<Origen>" "<Destino>"` (ruta más corta entre dos conceptos/módulos)
  - `graphify explain "<Nodo>"` (explicación de un nodo y sus conexiones)
  - `graphify-out/GRAPH_REPORT.md` (nodos principales *God Nodes*, comunidades y conexiones clave)
- **Mantener actualizado en cada edición:** Después de crear, eliminar o modificar archivos de código o arquitectura de forma relevante, actualiza el grafo de manera incremental ejecutando:
  ```bash
  graphify update .
  ```
  (En proyectos solo de código, la extracción AST es determinista, rápida y no requiere API key).

---

## 2. Regla Global de Seguridad Obligatoria: Auditoría Previa a Ediciones (Cloudflare Security Audit)

> [!CRITICAL]
> **REGLA GLOBAL OBLIGATORIA DE SUMA IMPORTANCIA**:
> Antes de realizar cualquier edición, modificación o generación de código, el asistente DEBE aplicar la metodología y criterios de auditoría de seguridad de Cloudflare Security Audit (`security-audit`).

### Verificaciones de Seguridad Previas a Toda Edición de Código:
1. **Revisión de Límites de Confianza (Trust Boundaries) e Insumos Externos:**
   - Identificar si el cambio involucra entradas del usuario, respuestas de APIs, esquemas URL (deep links), almacenamiento local, comunicaciones IPC o variables de entorno.
   - Validar rigurosamente que las entradas sean saneadas y tipadas sin asumir confianza ciega en datos externos o de cliente.
2. **Evaluación de Impacto según el Entorno:**
   - **Web / Frontend:** Prevenir XSS, CSRF, fugas de secretos, problemas de CORS y manipulación indebida de Service Workers o Storage.
   - **Móvil y Escritorio (Capacitor / Tauri):** Auditar puentes IPC, capabilities nativas, esquemas de URL (`custom schemes`) y permisos de sistema antes de modificar código nativo.
   - **Almacenamiento Local (IndexedDB / SQLite / Cache):** Asegurar aislamiento de datos, expiración y no persistir información sensible sin cifrado o protección adecuada.
   - **Cadena de Suministro y Dependencias:** No agregar dependencias de terceros sin verificar su legitimidad y propósito mínimo necesario.
3. **Principio de Cambio Mínimo Seguro:**
   - La modificación debe ser la más pequeña, limpia y segura posible.
   - Prohibido relajar restricciones de seguridad, eludir sandbox o desactivar advertencias de tipo sin justificación explícita documentada.

---

## 3. Sistema Global de Toast Inteligente (`@/utils/toast`) — REGLA REQUERIDA

> [!IMPORTANT]
> **USO OBLIGATORIO DE TOAST GLOBAL EN TODAS LAS VISTAS Y HERRAMIENTAS**:
> Toda retroalimentación transitoria al usuario (éxitos, errores, advertencias, confirmaciones de guardado, pruebas de conexión o avisos de sincronización) DEBE emitirse a través del **Toast Inteligente Global** (`src/utils/toast.ts` + `src/components/GlobalToast/GlobalToast.tsx` montado en `src/App.tsx`).

### Prohibiciones:
- **Prohibido** crear banners locales inline repetidos para mensajes de estado temporales.
- **Prohibido** duplicar `<GlobalToast />` en subcomponentes.
- **Prohibido** usar `window.alert()` o `window.confirm()` nativos del navegador para feedback simple.

### Uso estándar:
```ts
import { toast } from '@/utils/toast'

toast.success('Guardado y sincronizado correctamente.')
toast.error('No se pudo conectar con el servidor.')
toast.warning('Sin conexión: guardado en LocalDB.')
toast.info('Sincronización en progreso.', {
  durationMs: 4000,
  action: { label: 'Ver', onClick: () => {} },
})
```

El bus `toast` gestiona automáticamente deduplicación inteligente, límite de 3 toasts visibles, autocierre con pausa en hover (`3.5s`–`6s`), acciones opcionales y respuesta háptica nativa (`triggerNativeHaptic`) en iOS.

---

## 4. Arquitectura Offline-First y Cifrado

- Toda escritura de datos se guarda primero en `LocalDB` (`src/db/laryko.db.ts`) y sincroniza bidireccionalmente con Neon Postgres al reconectar.
- Credenciales y API keys siempre cifradas E2EE con `AES-GCM-256` (`src/utils/vaultCrypto.ts`).

---

## 5. Sincronización Global de Versión y Copyright (Todas las Plataformas)

> [!IMPORTANT]
> **CONSISTENCIA GLOBAL DE METADATOS (macOS, Windows, Linux, Android, iOS, Web)**:
> En cada incremento, actualización o publicación de versión, la versión y el año de copyright DEBEN mantenerse estrictamente sincronizados en todas las plataformas y ejecutables sin discrepancias.

### Fuente de la Verdad Única:
- **Versión:** `package.json` es la fuente canónica (`version`).
- **Copyright:** El año en curso (`new Date().getFullYear()`).

### Archivos Sincronizados Obligatoriamente:
- **Escritorio (Tauri - macOS, Windows, Linux):** `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- **Android (Capacitor):** `android/app/build.gradle`
- **iOS (Capacitor / Xcode):** `ios/App/App.xcodeproj/project.pbxproj`
- **Web / PWA:** `.env`, `.env.example`, `src/hooks/usePlatform.ts`
- **Legal:** `LICENSE`

### Automatización y Verificación:
- `pnpm run sync:version` (o `node scripts/sync-version.mjs [nueva_version]`)
- `pnpm run prebuild` (sincroniza antes de compilar)
- `pnpm run sync:check` (verifica en CI/CD que no haya versiones ni años desfasados)
