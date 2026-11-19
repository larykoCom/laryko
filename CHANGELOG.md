# Registro de Cambios (Changelog)

Todas las modificaciones notables en este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.1.2] - 2026-11-18

### Corregido (Fixed)
- **Animación y Material Liquid Glass Nativo en Tabs:**
  - Sustituida la cápsula estática por un **indicador deslizante fluido (`.activeIndicator`)** con curva de transición elástica Apple (`cubic-bezier(0.25, 1, 0.35, 1)`).
  - Material translúcido ultra-refinado libre de bordes blancos artificiales o fondos oscuros pesados, alineado con el diseño nativo de iOS 18 y VisionOS.
- **Coloración y Respuesta Táctil en Teclado de Calculadora:**
  - Control determinístico del botón activo mediante estado Reactivo (`activeKey`) y eventos `pointerdown`/`pointerup`/`pointerleave`.
  - Eliminado el bug de WebKit en iOS donde tocar una tecla (como el "7") coloreaba la tecla inferior ("4") por desfase de hit-testing de `:active`.
  - Supresión de estados `:focus` o congelamientos de color en azul al levantar el dedo.

## [1.1.1] - 2026-11-18

### Añadido (Added)
- **Puente Nativo Swift para iOS (`NativeIOSBridge`):**
  - Conexión nativa con el motor háptico de Apple (Taptic Engine) para feedback físico instantáneo en dígitos, operadores, cálculo final y cambio de pestañas.
  - Gestión nativa de transparencia del lienzo en `WKWebView` para mezcla pura de efectos de fondo translúcidos.
  - Copia al portapapeles con confirmación háptica (`copyToClipboardWithHaptic`).
  - Detección de capacidades del sistema para Liquid Glass (iOS 18+ y VisionOS).
- **Perfeccionamiento Visual y Óptico Liquid Glass (Estilo Apple Vision / iOS):**
  - Lente de cristal líquido convexo en tabs activos con refracción multicapa.
  - Borde con aberración cromática e iridiscencia prismática (`-webkit-mask-composite: xor`).
  - Reflejo especular convexo superior simulando curvatura física tridimensional.
- **Feedback Táctil y de Color Inmediato:**
  - Iluminación en alto contraste al pulsar teclas (azul eléctrico en números, destello blanco en operadores y cian en funciones).
  - Activación sin latencia táctil en iOS WebKit mediante detector de toques pasivo.

### Corregido (Fixed)
- **Desfase Táctil en Teclado de Calculadora:**
  - Corregido el desplazamiento vertical involuntario que provocaba que pulsar "4" interceptara la fila "1" en iOS.
  - Aislamiento de toques con `touch-action: manipulation` y eliminación de retrasos de 300ms con `maximum-scale=1.0, user-scalable=no`.
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
