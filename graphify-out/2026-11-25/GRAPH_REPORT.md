# Graph Report - laryko  (2026-11-25)

## Corpus Check
- 105 files · ~63,768 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 243 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 830 nodes · 1373 edges · 51 communities (33 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3211ba41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- components/index.ts
- iOS Capacitor Audio & Bridge
- Offline DB & Calculator
- Tauri Rust Backend & Tray
- Tauri Desktop Configuration
- Android MainActivity & Bridge
- CI Security & Release Workflows
- useMultiSession.ts
- toast.ts
- App.tsx
- useUserPanel.ts
- Asset Generation Scripts
- TypeScript Configuration
- GitHub Actions Release Steps
- NPM Build & Sync Scripts
- 🛠️ Guía de Desarrollo de Laryko
- Version & Copyright Sync
- iOS AppDelegate Lifecycle
- dependencies
- Android Unit & Instrumented Tests
- name Module
- release.yml Module
- name Module
- tsconfig.node.json Module
- default.json Module
- vercel.json Module
- name Module
- publish-release Module
- devDependencies
- name Module
- name Module
- name Module
- vite-env.d.ts Module
- Package.swift Module
- laryko Module
- Reglas de Desarrollo para Agentes IA — Laryko
- Registro de Cambios (Changelog)
- CapApp-SPM/README.md
- getVersion
- @capacitor/cli

## God Nodes (most connected - your core abstractions)
1. `with` - 25 edges
2. `react` - 24 edges
3. `triggerNativeHaptic()` - 20 edges
4. `scripts` - 18 edges
5. `compilerOptions` - 17 edges
6. `Platform` - 16 edges
7. `playNotificationSound()` - 15 edges
8. `lucide-react` - 15 edges
9. `NativeIOSBridge` - 14 edges
10. `SessionWebViewController` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Añadido (Added)` --references--> `NativeIOSBridge`  [INFERRED]
  CHANGELOG.md → ios/App/App/SceneDelegate.swift
- `Uso estándar:` --references--> `triggerNativeHaptic()`  [INFERRED]
  AGENTS.md → src/utils/nativeIOSBridge.ts
- `🔄 Sistema Integrado de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useAppUpdater.ts
- `3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  prompt.md → src/hooks/useAppUpdater.ts
- `🚀 Stack Tecnológico` --references--> `useOnlineStatus()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useOnlineStatus.ts

## Import Cycles
- None detected.

## Communities (51 total, 18 thin omitted)

### Community 0 - "components/index.ts"
Cohesion: 0.05
Nodes (32): AiAssistant(), AiAssistantProps, QUICK_PROMPTS, ActiveTool, BottomBar(), BottomBarProps, NAV_ITEMS, NavItemConfig (+24 more)

### Community 1 - "iOS Capacitor Audio & Bridge"
Cohesion: 0.05
Nodes (9): AudioToolbox, Capacitor, MainViewController, MultiSessionPlugin, NativeIOSBridge, SceneDelegate, SessionWebViewController, UIKit (+1 more)

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.08
Nodes (42): 🚀 Stack Tecnológico, dexie-react-hooks, lucide-react, react, AlarmOverlay(), AlarmOverlayProps, FilterTab, NotificationsCenter() (+34 more)

### Community 3 - "Tauri Rust Backend & Tray"
Cohesion: 0.05
Nodes (31): ai_chat_completion(), AiChatMessageInput, build_models_request(), delete_neon_account(), delete_session_data(), download_and_install_update(), DownloadProgress, ensure_notification_icon_path() (+23 more)

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "useMultiSession.ts"
Cohesion: 0.07
Nodes (38): 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First), 2. Identificadores, Dominio y Nombres de Artefactos Fijos, 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`), 4. Entregables para este primer paso ("Hola Mundo"), COLOR_SWATCHES, MultiSessionProps, UpdateModal(), UpdateModalProps (+30 more)

### Community 8 - "toast.ts"
Cohesion: 0.15
Nodes (13): GlobalToast(), ICONS, ToastCard(), currentToasts, DEFAULT_DURATIONS, emit(), listeners, pushToast() (+5 more)

### Community 9 - "App.tsx"
Cohesion: 0.08
Nodes (3): App(), PLATFORM_ICONS, rootElement

### Community 10 - "useUserPanel.ts"
Cohesion: 0.10
Nodes (33): UserPreferences, AssistantChatMessage, resolveActiveProvider(), useAiAssistant(), UseAiAssistantParams, DEFAULT_PREFS, useUserPanel(), ALLOWED_RECURRENCE (+25 more)

### Community 11 - "Asset Generation Scripts"
Cohesion: 0.10
Nodes (16): ANDROID_DENSITIES, ANDROID_SPLASHES, CANDIDATE_FONTS, __dirname, __filename, iosAppIconDir, iosSplashDir, iosUniversalIcon (+8 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 13 - "GitHub Actions Release Steps"
Cohesion: 0.11
Nodes (19): with, args, body_path, cache, distribution, draft, files, java-version (+11 more)

### Community 14 - "NPM Build & Sync Scripts"
Cohesion: 0.11
Nodes (18): scripts, audit, build, build:android, build:android:apk, cap:android, cap:ios, cap:sync (+10 more)

### Community 15 - "🛠️ Guía de Desarrollo de Laryko"
Cohesion: 0.09
Nodes (20): 💻 Desarrollo Local, Ejecutar en Escritorio con Tauri (macOS/Windows/Linux), Ejecutar en la Web (Vite Dev Server), 🏗️ Estructura del Repositorio, 🛠️ Guía de Desarrollo de Laryko, 🏷️ Identificadores y Dominio, Inicializar y Sincronizar Plataformas Móviles (Capacitor), Instalación (+12 more)

### Community 16 - "Version & Copyright Sync"
Cohesion: 0.12
Nodes (11): args, currentYear, __dirname, isCheck, pkg, pkgPath, rootDir, semverParts (+3 more)

### Community 18 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @capacitor/android@^8.6.2, @capacitor/core@8.6.2, @capacitor/ios@^8.6.2, @capacitor/network@8.0.1, dexie@4.4.7, dexie-react-hooks@4.4.0, lucide-react@^1.73.0 (+11 more)

### Community 20 - "name Module"
Cohesion: 0.26
Nodes (12): name, needs, runs-on, steps, steps, steps, steps, build-ios (+4 more)

### Community 21 - "release.yml Module"
Cohesion: 0.18
Nodes (10): env, NODE_VERSION, RUST_VERSION, jobs, name, on, push, permissions (+2 more)

### Community 22 - "name Module"
Cohesion: 0.22
Nodes (9): name, runs-on, steps, GITHUB_TOKEN, VITE_APP_VERSION, VITE_GITHUB_REPO, VITE_IS_APP_STORE, build-web (+1 more)

### Community 25 - "tsconfig.node.json Module"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 26 - "default.json Module"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, webviews

### Community 27 - "vercel.json Module"
Cohesion: 0.33
Nodes (5): cleanUrls, framework, headers, rewrites, version

### Community 28 - "name Module"
Cohesion: 0.40
Nodes (5): name, needs, runs-on, steps, build-android

### Community 29 - "publish-release Module"
Cohesion: 0.40
Nodes (5): publish-release, name, needs, runs-on, steps

### Community 30 - "devDependencies"
Cohesion: 0.13
Nodes (19): devDependencies, @tauri-apps/cli@2.12.4, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@7.0.2, vite@8.3.8, vite-plugin-pwa@2.0.0, @vitejs/plugin-react@6.3.0 (+11 more)

### Community 33 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-linux

### Community 34 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-macos

### Community 35 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-windows

### Community 49 - "Reglas de Desarrollo para Agentes IA — Laryko"
Cohesion: 0.15
Nodes (12): 1. Mapeo del Código y Grafo de Conocimiento (Graphify — `graphify-out/`), 2. Regla Global de Seguridad Obligatoria: Auditoría Previa a Ediciones (Cloudflare Security Audit), 3. Sistema Global de Toast Inteligente (`@/utils/toast`) — REGLA REQUERIDA, 4. Arquitectura Offline-First y Cifrado, 5. Sincronización Global de Versión y Copyright (Todas las Plataformas), Archivos Sincronizados Obligatoriamente:, Automatización y Verificación:, Fuente de la Verdad Única: (+4 more)

### Community 50 - "Registro de Cambios (Changelog)"
Cohesion: 0.17
Nodes (11): [0.1.0] - 2026-11-16, [1.1.0] - 2026-11-18, [1.1.1] - 2026-11-19, [1.1.2] - 2026-11-24, Añadido (Added), Añadido (Added), Añadido (Added), Añadido (Added) (+3 more)

### Community 54 - "getVersion"
Cohesion: 0.40
Nodes (5): @capacitor/app@8.1.2, @tauri-apps/api@2.12.4, @capacitor/app, @tauri-apps/api, getVersion()

### Community 57 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.6.2, @capacitor/cli

## Knowledge Gaps
- **4 isolated node(s):** `AudioToolbox`, `WebKit`, `PackageDescription`, `laryko`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 398 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Offline DB & Calculator` to `components/index.ts`, `useMultiSession.ts`, `toast.ts`, `App.tsx`, `useUserPanel.ts`, `dependencies`, `devDependencies`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `AudioToolbox`, `WebKit`, `PackageDescription` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05060882800608828 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Offline DB & Calculator` to `components/index.ts`, `useMultiSession.ts`, `toast.ts`, `App.tsx`, `dependencies`, `devDependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `iOS Capacitor Audio & Bridge` be split into smaller, more focused modules?**
  _Cohesion score 0.05084745762711865 - nodes in this community are weakly interconnected._
- **Why does `🛠️ Guía de Desarrollo de Laryko` connect `🛠️ Guía de Desarrollo de Laryko` to `Offline DB & Calculator`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.07539682539682539 - nodes in this community are weakly interconnected._