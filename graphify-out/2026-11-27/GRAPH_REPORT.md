# Graph Report - laryko  (2026-11-27)

## Corpus Check
- 115 files · ~76,119 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 253 files seen (22%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1005 nodes · 1777 edges · 83 communities (40 shown, 43 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c365867`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MainActivity.java
- Offline DB & Calculator
- lib.rs
- Tauri Desktop Configuration
- CI Security & Release Workflows
- types/index.ts
- useMultiSession.ts
- App.tsx
- NativeIOSBridge
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
- devDependencies
- useAiAssistant.ts
- tsconfig.node.json Module
- default.json Module
- vercel.json Module
- name Module
- publish-release Module
- SessionWebViewController
- name Module
- name Module
- name Module
- vite-env.d.ts Module
- Package.swift Module
- laryko Module
- Reglas de Desarrollo para Agentes IA — Laryko
- Registro de Cambios (Changelog)
- CapApp-SPM/README.md
- com.getcapacitor.PluginCall
- LarykoRootViewController
- NativeAndroidBridge.java
- NativeIOSBridgePlugin
- MultiSessionPlugin
- neon.rs
- MultiSessionPlugin
- ai.rs
- @capacitor/cli
- AppState
- MultiSession.tsx
- UserPanel.tsx
- BottomBar.tsx
- sessions.rs
- SceneDelegate.swift
- LarykoNotificationDelegate
- vite.config.ts
- updater.rs
- components/index.ts
- toast.ts
- NativeAndroidBridgePlugin
- notifications.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 35 edges
2. `with` - 25 edges
3. `NativeIOSBridge` - 24 edges
4. `react` - 24 edges
5. `SessionWebViewController` - 21 edges
6. `triggerNativeHaptic()` - 20 edges
7. `UserPanel()` - 19 edges
8. `scripts` - 18 edges
9. `LarykoRootViewController` - 17 edges
10. `compilerOptions` - 17 edges

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

## Communities (83 total, 43 thin omitted)

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.05
Nodes (54): 🚀 Stack Tecnológico, dexie-react-hooks@4.4.0, @capacitor/core, dexie-react-hooks, react, AlarmOverlay(), AlarmOverlayProps, Calculator() (+46 more)

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "types/index.ts"
Cohesion: 0.09
Nodes (25): @capacitor/app@8.1.2, @tauri-apps/api@2.12.4, 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First), 2. Identificadores, Dominio y Nombres de Artefactos Fijos, 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`), 4. Entregables para este primer paso ("Hola Mundo"), @capacitor/app, @tauri-apps/api (+17 more)

### Community 8 - "useMultiSession.ts"
Cohesion: 0.18
Nodes (17): COLOR_SWATCHES, MultiSessionProps, QuickTemplate, SESSION_TEMPLATES, useMultiSession(), multiSessionBridge, MultiSessionCapacitor, SessionBounds (+9 more)

### Community 9 - "App.tsx"
Cohesion: 0.10
Nodes (9): AiAssistant, App(), Calculator, MultiSession, NotificationsCenter, PLATFORM_ICONS, Reminders, rootElement (+1 more)

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
Cohesion: 0.12
Nodes (17): dependencies, @capacitor/android@^8.6.2, @capacitor/core@8.6.2, @capacitor/ios@^8.6.2, @capacitor/network@8.0.1, dexie@4.4.7, lucide-react@^1.73.0, react@19.3.1 (+9 more)

### Community 20 - "name Module"
Cohesion: 0.26
Nodes (12): name, needs, runs-on, steps, steps, steps, steps, build-ios (+4 more)

### Community 21 - "release.yml Module"
Cohesion: 0.18
Nodes (10): env, NODE_VERSION, RUST_VERSION, jobs, name, on, push, permissions (+2 more)

### Community 22 - "name Module"
Cohesion: 0.22
Nodes (9): name, runs-on, steps, GITHUB_TOKEN, VITE_APP_VERSION, VITE_GITHUB_REPO, VITE_IS_APP_STORE, build-web (+1 more)

### Community 23 - "devDependencies"
Cohesion: 0.19
Nodes (13): devDependencies, @tauri-apps/cli@2.12.4, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@7.0.2, name, private, type (+5 more)

### Community 24 - "useAiAssistant.ts"
Cohesion: 0.18
Nodes (14): AiAssistant(), AiAssistantProps, QUICK_PROMPTS, ReminderRecurrence, AssistantChatMessage, resolveActiveProvider(), useAiAssistant(), UseAiAssistantParams (+6 more)

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

### Community 57 - "neon.rs"
Cohesion: 0.33
Nodes (9): delete_neon_account(), execute_neon_sql(), fetch_neon_account(), NeonAccountRecord, parse_neon_host(), pull_vault_from_neon(), register_neon_account(), sync_vault_to_neon() (+1 more)

### Community 59 - "ai.rs"
Cohesion: 0.36
Nodes (6): ai_chat_completion(), AiChatMessageInput, build_models_request(), format_reqwest_error(), list_ai_models(), test_ai_provider()

### Community 60 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.6.2, @capacitor/cli

### Community 61 - "AppState"
Cohesion: 0.21
Nodes (6): send_email_internal(), send_resend_email(), test_r2_endpoint(), test_resend_connection(), set_idle_sleep_minutes(), AppState

### Community 62 - "MultiSession.tsx"
Cohesion: 0.22
Nodes (6): MultiSession(), KEYPAD, PinLock(), PinLockProps, MultiSessionNativePlugin, triggerNativeHaptic()

### Community 63 - "UserPanel.tsx"
Cohesion: 0.09
Nodes (43): UserPanel, MediaThumbPreview(), UserPanel(), UserPanelProps, UserPanelTab, MediaCategory, UserPreferences, DEFAULT_PREFS (+35 more)

### Community 64 - "BottomBar.tsx"
Cohesion: 0.25
Nodes (7): lucide-react, ActiveTool, BottomBar(), BottomBarProps, BottomBarSessionControls, NAV_ITEMS, NavItemConfig

### Community 65 - "sessions.rs"
Cohesion: 0.15
Nodes (15): control_session_webview(), delete_session_data(), extract_unread_count_from_title(), get_active_session_uuids(), hide_all_session_webviews(), open_external_url(), open_session_webview(), resolve_viewport_bounds() (+7 more)

### Community 70 - "SceneDelegate.swift"
Cohesion: 0.29
Nodes (6): AudioToolbox, AVFoundation, Capacitor, UIKit, UserNotifications, WebKit

### Community 72 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): vite@8.3.8, vite-plugin-pwa@2.0.0, @vitejs/plugin-react@6.3.0, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 74 - "components/index.ts"
Cohesion: 0.21
Nodes (6): CalculatorProps, NotificationsCenterProps, StatusBadge(), StatusBadgeProps, UpdateCircleButton(), UpdateCircleButtonProps

### Community 81 - "toast.ts"
Cohesion: 0.15
Nodes (14): GlobalToast(), ICONS, ToastCard(), currentToasts, DEFAULT_DURATIONS, emit(), listeners, pushToast() (+6 more)

## Knowledge Gaps
- **6 isolated node(s):** `PackageDescription`, `laryko`, `AudioToolbox`, `AVFoundation`, `UserNotifications` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 451 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionWebViewController` connect `SessionWebViewController` to `MultiSessionPlugin`, `LarykoRootViewController`, `SceneDelegate.swift`, `LarykoNotificationDelegate`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `laryko`, `AudioToolbox` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.05495151337055539 - nodes in this community are weakly interconnected._
- **Why does `resolve_macos_user_agent()` connect `SessionWebViewController` to `sessions.rs`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Tauri Desktop Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Offline DB & Calculator` to `BottomBar.tsx`, `types/index.ts`, `useMultiSession.ts`, `App.tsx`, `toast.ts`, `dependencies`, `devDependencies`, `useAiAssistant.ts`, `MultiSession.tsx`, `UserPanel.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `MultiSessionPlugin.java` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._