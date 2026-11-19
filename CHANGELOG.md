# Registro de Cambios (Changelog)

Todas las modificaciones notables en este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.1.1] - 2026-11-19

### Añadido (Added)
- **Puente Nativo Swift para iOS (`NativeIOSBridge`):**
  - Conexión nativa con el motor háptico de Apple (Taptic Engine) para feedback físico instantáneo en dígitos, operadores, cálculo final y cambio de pestañas.
  - Gestión nativa de transparencia del lienzo en `WKWebView` para mezcla pura de efectos de fondo translúcidos.
  - Copia al portapapeles con confirmación háptica (`copyToClipboardWithHaptic`).
  - Detección de capacidades del sistema para Liquid Glass (iOS 18+ y VisionOS).
- **Indicador Deslizante Interactivo Liquid Glass (Apple Vision / iOS 18):**
  - **Seguimiento Táctil Continuo 1:1:** La burbuja de cristal líquido sigue físicamente el dedo en tiempo real durante el arrastre sobre el dock (`pointermove` y `setPointerCapture`).
  - Deformación elástica fluida (*gelatinous stretch / squish*) y respuesta de resorte (*spring physics*) al soltar.
  - Pulsación háptica al cruzar el umbral entre pestañas.
  - Refracción óptica y bisel especular optimizados para fondos oscuros.

### Corregido (Fixed)
- **Coloración y Respuesta Táctil en Teclado de Calculadora:**
  - Control determinístico del botón activo mediante estado Reactivo (`activeKey`) y eventos `pointerdown`/`pointerup`/`pointerleave`.
  - Eliminado el bug de WebKit en iOS donde tocar una tecla (como el "7") coloreaba la tecla inferior ("4") por desfase de hit-testing de `:active`.
  - Supresión total de estados `:focus` o teclas congeladas en azul.
- **Scroll / Rebote Elástico Innecesario en iOS:**
  - Eliminado el rebote de pantalla (*rubber-banding*) mediante contención de viewport (`overscroll-behavior: none`, `height: 100dvh`).

## [1.1.0] - 2026-11-18

### Añadido (Added)
- **Herramienta Calculadora Avanzada (`CalculatorTool`):**
  - Motor de cálculo aritmético en tiempo real sin requerir pulsar igual (`=`).
  - Suite integrada de **Calculadora de Porcentajes** con 3 operaciones frecuentes:
    - Cálculo de porcentaje directo ($X\%$ de $Y$).
    - Proporción relativa (qué porcentaje representa $A$ respecto a $B$).
    - Aumento y descuento porcentual con desglose de variación e importe final.
  - Historial de operaciones persistente en almacenamiento local IndexedDB (`Dexie.js`), 100% offline.
  - Soporte completo para entrada por teclado físico (números, operadores aritméticos, `Enter`, `Backspace`, `Escape`).
  - Botón de doble cero (`00`) y formateador de millares para agilizar operaciones numéricas.
- **Barra de Navegación Inferior Flotante (`BottomBar`):**
  - Efecto translúcido de diseño *Liquid Glass* (`GlassEffectContainer`) con soporte adaptativo a temas claro y oscuro.
  - Iconografía moderna provista por `lucide-react`.
  - Botón de comprobación y notificación de estado de actualizaciones (`UpdateCircleButton`).
- **Hub de Herramientas y Navegación:**
  - Sistema de conmutación fluida entre herramientas y vistas de la aplicación.
- **Automatización Multiplataforma:**
  - Script de sincronización estricta de versiones y metadatos de copyright (`scripts/sync-version.mjs`) para todas las plataformas.

## [0.1.0] - 2026-11-16

### Añadido (Added)
- Versión inicial base de **Laryko**, suite de herramientas y sub-apps offline-first.
- Soporte multiplataforma completo:
  - 🌐 **Web:** Aplicación PWA con Service Worker y manifiesto offline.
  - 🍎 **macOS:** Empaquetado DMG universal (Apple Silicon e Intel) con Tauri v2.
  - 🪟 **Windows:** Instalador NSIS ejecutable con Tauri v2.
  - 🐧 **Linux:** Paquete portable AppImage con Tauri v2.
  - 🤖 **Android:** Aplicación nativa y APK distribuible vía Capacitor.
  - 📱 **iOS:** Proyecto Xcode e IPA distribuible vía Capacitor.
- Almacenamiento local seguro offline-first con Dexie.js e IndexedDB.
- Modal y verificador de actualizaciones no intrusivo con integración a GitHub Releases y Tauri Updater.
- Pipeline de integración continua y despliegue (CI/CD) automatizado en GitHub Actions para compilar y publicar en todas las plataformas simultáneamente.
