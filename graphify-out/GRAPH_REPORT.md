# Graph Report - laryko  (2026-11-25)

## Corpus Check
- 105 files · ~61,527 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 243 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 802 nodes · 1376 edges · 48 communities (30 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `84ccb7f6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Core App Shell & UI
- iOS Capacitor Audio & Bridge
- Offline DB & Calculator
- Tauri Rust Backend & Tray
- Tauri Desktop Configuration
- Android MainActivity & Bridge
- CI Security & Release Workflows
- App Lifecycle & Update Modal
- useMultiSession.ts
- useUserPanel.ts
- useAiAssistant.ts
- Asset Generation Scripts
- TypeScript Configuration
- GitHub Actions Release Steps
- NPM Build & Sync Scripts
- 🛠️ Guía de Desarrollo de Laryko
- Version & Copyright Sync
- iOS AppDelegate Lifecycle
- package.json
- Android Unit & Instrumented Tests
- name Module
- release.yml Module
- name Module
- tsconfig.node.json Module
- default.json Module
- vercel.json Module
- name Module
- publish-release Module
- name Module
- name Module
- name Module
- vite-env.d.ts Module
- Package.swift Module
- laryko Module
- Reglas de Desarrollo para Agentes IA — Laryko
- Registro de Cambios (Changelog)
- CapApp-SPM/README.md

## God Nodes (most connected - your core abstractions)
1. `with` - 25 edges
2. `react` - 24 edges
3. `App()` - 22 edges
4. `triggerNativeHaptic()` - 20 edges
5. `Platform` - 18 edges
6. `scripts` - 18 edges
7. `compilerOptions` - 17 edges
8. `playNotificationSound()` - 15 edges
9. `lucide-react` - 15 edges
10. `NativeIOSBridge` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Añadido (Added)` --references--> `NativeIOSBridge`  [INFERRED]
  CHANGELOG.md → ios/App/App/SceneDelegate.swift
- `Uso estándar:` --references--> `triggerNativeHaptic()`  [INFERRED]
  AGENTS.md → src/utils/nativeIOSBridge.ts
- `🚀 Stack Tecnológico` --references--> `useOnlineStatus()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useOnlineStatus.ts
- `🔄 Sistema Integrado de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useAppUpdater.ts
- `3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  prompt.md → src/hooks/useAppUpdater.ts

## Import Cycles
- None detected.

## Communities (48 total, 18 thin omitted)

### Community 0 - "Core App Shell & UI"
Cohesion: 0.06
Nodes (39): lucide-react, App(), PLATFORM_ICONS, AlarmOverlay(), AlarmOverlayProps, ActiveTool, BottomBar(), BottomBarProps (+31 more)

### Community 1 - "iOS Capacitor Audio & Bridge"
Cohesion: 0.05
Nodes (9): AudioToolbox, Capacitor, MainViewController, MultiSessionPlugin, NativeIOSBridge, SceneDelegate, SessionWebViewController, UIKit (+1 more)

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.07
Nodes (49): dexie-react-hooks, react, PercentageCalculator(), FilterTab, defaultDateTimeLocal(), Reminders(), RemindersProps, toDateTimeLocal() (+41 more)

### Community 3 - "Tauri Rust Backend & Tray"
Cohesion: 0.06
Nodes (27): ai_chat_completion(), AiChatMessageInput, build_models_request(), delete_session_data(), download_and_install_update(), DownloadProgress, ensure_notification_icon_path(), execute_neon_sql() (+19 more)

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "App Lifecycle & Update Modal"
Cohesion: 0.11
Nodes (15): 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First), 2. Identificadores, Dominio y Nombres de Artefactos Fijos, 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`), 4. Entregables para este primer paso ("Hola Mundo"), UpdateModal(), UpdateModalProps, compareVersions(), DownloadProgress (+7 more)

### Community 8 - "useMultiSession.ts"
Cohesion: 0.15
Nodes (13): GlobalToast(), ICONS, ToastCard(), currentToasts, DEFAULT_DURATIONS, emit(), listeners, pushToast() (+5 more)

### Community 9 - "useUserPanel.ts"
Cohesion: 0.10
Nodes (26): UserPanel(), UserPanelProps, UserPanelTab, DEFAULT_PREFS, useUserPanel(), integrationsBridge, NativeIOSBridgePlugin, toast (+18 more)

### Community 10 - "useAiAssistant.ts"
Cohesion: 0.19
Nodes (13): AiAssistant(), AiAssistantProps, QUICK_PROMPTS, AssistantChatMessage, resolveActiveProvider(), useAiAssistant(), UseAiAssistantParams, ALLOWED_RECURRENCE (+5 more)

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
Nodes (21): 💻 Desarrollo Local, Ejecutar en Escritorio con Tauri (macOS/Windows/Linux), Ejecutar en la Web (Vite Dev Server), 🏗️ Estructura del Repositorio, 🛠️ Guía de Desarrollo de Laryko, 🏷️ Identificadores y Dominio, Inicializar y Sincronizar Plataformas Móviles (Capacitor), Instalación (+13 more)

### Community 16 - "Version & Copyright Sync"
Cohesion: 0.12
Nodes (11): args, currentYear, __dirname, isCheck, pkg, pkgPath, rootDir, semverParts (+3 more)

### Community 18 - "package.json"
Cohesion: 0.05
Nodes (49): config, dependencies, @capacitor/android@^8.6.2, @capacitor/app@8.1.2, @capacitor/core@8.6.2, @capacitor/ios@^8.6.2, @capacitor/network@8.0.1, dexie@4.4.7 (+41 more)

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

## Knowledge Gaps
- **4 isolated node(s):** `AudioToolbox`, `WebKit`, `PackageDescription`, `laryko`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 377 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Offline DB & Calculator` to `Core App Shell & UI`, `App Lifecycle & Update Modal`, `useMultiSession.ts`, `useUserPanel.ts`, `useAiAssistant.ts`, `package.json`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `AudioToolbox`, `WebKit`, `PackageDescription` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core App Shell & UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05980861244019139 - nodes in this community are weakly interconnected._
- **Why does `useAppUpdater()` connect `App Lifecycle & Update Modal` to `Core App Shell & UI`, `Offline DB & Calculator`, `package.json`, `🛠️ Guía de Desarrollo de Laryko`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `iOS Capacitor Audio & Bridge` be split into smaller, more focused modules?**
  _Cohesion score 0.05084745762711865 - nodes in this community are weakly interconnected._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.0711849957374254 - nodes in this community are weakly interconnected._
- **Should `Tauri Rust Backend & Tray` be split into smaller, more focused modules?**
  _Cohesion score 0.057329462989840346 - nodes in this community are weakly interconnected._