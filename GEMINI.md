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
