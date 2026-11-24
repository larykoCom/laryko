# Registro de Cambios (Changelog)

Todas las modificaciones notables en este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.1.2] - 2026-11-24

### Añadido (Added)
- **Iconos y Splash Screen para Android e iOS:**
  - Actualización completa de los assets de branding (íconos de app y pantallas de splash) para Android e iOS.
- **Despliegue en Vercel:**
  - Configuración de reglas de ignorado de deploy (`vercel.json`) y exclusión del caché de build local.
  - Corrección de escape de punto en la expresión regular de enrutamiento de `vercel.json`.

### Corregido (Fixed)
- **Resolución de paquetes en iOS:**
  - Añadida resolución explícita de paquetes para evitar conflictos de versión en el entorno de iOS.
- **Color del icono de herramienta:**
  - Actualizado el color del icono de herramienta en los estilos globales para mayor coherencia visual.

## [1.1.1] - 2026-11-19

### Añadido (Added)
- **Liquid Glass Nativo Oficial de Apple en iOS (`UITabBar` UIKit):**
  - Barra de navegación inferior implementada con `UITabBar` nativo de UIKit y material translúcido `.systemUltraThinMaterial` de Apple.
  - Símbolos nativos de Apple SF Symbols (`house.fill` y `plus.forwardslash.minus`).
  - Sincronización bidireccional mediante `NativeIOSBridge` y eventos personalizados con la interfaz web.
- **Puente Nativo Swift para iOS (`NativeIOSBridge`):**
  - Conexión nativa con el motor háptico de Apple (Taptic Engine) para feedback físico instantáneo (`UIImpactFeedbackGenerator`, `UISelectionFeedbackGenerator`, `UINotificationFeedbackGenerator`).
  - Gestión nativa de visibilidad y pestaña activa del `UITabBar`.
  - Copia al portapapeles con confirmación háptica (`copyToClipboardWithHaptic`).
- **Fuente Oficial para SideStore / AltStore (`apps.json`):**
  - Publicación del manifiesto oficial `public/apps.json` vinculado al Bundle ID canónico `com.laryko` para instalación directa sin conflictos de origen.
- **Actualizador de Escritorio In-App con Progreso en Tiempo Real:**
  - Descarga nativa y barra de progreso que refleja megabytes descargados respecto al total y porcentaje en macOS, Windows y Linux.

### Corregido (Fixed)
- **Barra Oscura Inferior y Desfase de Pantalla en iOS:**
  - Configurado `UIWindow` y controlador raíz con `.systemBackground` para eliminar el fondo negro por defecto de UIKit.
  - Establecido `contentInset: 'never'` y contención de layout para evitar scroll fantasma y solapamiento del safe area inferior.
- **Coloración y Respuesta Táctil en Teclado de Calculadora:**
  - Control determinístico del botón activo mediante estado Reactivo (`activeKey`) y eventos `pointerdown`/`pointerup`/`pointerleave`.
  - Eliminado el bug de WebKit en iOS donde tocar una tecla (como el "7") coloreaba la tecla inferior ("4") por desfase de hit-testing de `:active`.
  - Supresión total de estados `:focus` o teclas congeladas en azul.

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
