# Registro de Cambios (Changelog)

Todas las modificaciones notables en este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [0.1.1] - 2026-11-18

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
