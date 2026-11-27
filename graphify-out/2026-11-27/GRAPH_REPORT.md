# Graph Report - laryko  (2026-11-27)

## Corpus Check
- 115 files · ~70,903 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 253 files seen (22%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 987 nodes · 1713 edges · 87 communities (46 shown, 41 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b82cc3b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- MainActivity.java
- Offline DB & Calculator
- lib.rs
- Tauri Desktop Configuration
- CI Security & Release Workflows
- types/index.ts
- MultiSession.tsx
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
- package.json
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
- nativeIOSBridge.ts
- MultiSessionPlugin
- neon.rs
- MultiSessionPlugin
- ai.rs
- @capacitor/cli
- AppState
- useMultiSession.ts
- toast.ts
- BottomBar.tsx
- sessions.rs
- SceneDelegate.swift
- LarykoNotificationDelegate
- vite.config.ts
- updater.rs
- usePlatform.ts
- MultiSession
- react
- StatusBadge.tsx
- multiSessionBridge.ts
- useOnlineStatus.ts
- Platform
- prompt.md
- notifications.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 35 edges
2. `with` - 25 edges
3. `NativeIOSBridge` - 24 edges
4. `react` - 24 edges
5. `SessionWebViewController` - 21 edges
6. `triggerNativeHaptic()` - 20 edges
7. `scripts` - 18 edges
8. `LarykoRootViewController` - 17 edges
9. `compilerOptions` - 17 edges
10. `MultiSessionPlugin` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Añadido (Added)` --references--> `NativeIOSBridge`  [INFERRED]
  CHANGELOG.md → ios/App/App/SceneDelegate.swift
- `🔄 Sistema Integrado de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useAppUpdater.ts
- `3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  prompt.md → src/hooks/useAppUpdater.ts
- `Uso estándar:` --references--> `triggerNativeHaptic()`  [INFERRED]
  AGENTS.md → src/utils/nativeIOSBridge.ts
- `🚀 Stack Tecnológico` --references--> `useOnlineStatus()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useOnlineStatus.ts

## Import Cycles
- None detected.

## Communities (87 total, 41 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.38
Nodes (4): lucide-react@^1.73.0, lucide-react, UpdateCircleButton(), UpdateCircleButtonProps

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.06
Nodes (60): dexie-react-hooks, Reminders, FilterTab, NotificationsCenter(), NotificationsCenterProps, defaultDateTimeLocal(), Reminders(), RemindersProps (+52 more)

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "types/index.ts"
Cohesion: 0.22
Nodes (10): UpdateModal(), UpdateModalProps, compareVersions(), DownloadProgress, getUpdateAction(), useAppUpdater(), AppInfo, GitHubRelease (+2 more)

### Community 8 - "MultiSession.tsx"
Cohesion: 0.24
Nodes (8): COLOR_SWATCHES, MultiSessionProps, KEYPAD, PinLock(), PinLockProps, WebSession, SESSION_TEMPLATES, triggerNativeHaptic()

### Community 9 - "App.tsx"
Cohesion: 0.09
Nodes (8): @tauri-apps/api@2.12.4, @tauri-apps/api, App(), MultiSession, NotificationsCenter, PLATFORM_ICONS, UserPanel, rootElement

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
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@^8.6.2, @capacitor/ios@^8.6.2, dexie@4.4.7, dexie-react-hooks@4.4.0, react@19.3.1, react-dom@19.3.1, @tauri-apps/plugin-updater@2.14.1 (+9 more)

### Community 20 - "name Module"
Cohesion: 0.26
Nodes (12): name, needs, runs-on, steps, steps, steps, steps, build-ios (+4 more)

### Community 21 - "release.yml Module"
Cohesion: 0.18
Nodes (10): env, NODE_VERSION, RUST_VERSION, jobs, name, on, push, permissions (+2 more)

### Community 22 - "name Module"
Cohesion: 0.22
Nodes (9): name, runs-on, steps, GITHUB_TOKEN, VITE_APP_VERSION, VITE_GITHUB_REPO, VITE_IS_APP_STORE, build-web (+1 more)

### Community 23 - "package.json"
Cohesion: 0.22
Nodes (9): devDependencies, @tauri-apps/cli@2.12.4, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@7.0.2, @tauri-apps/cli, @types/react, @types/react-dom (+1 more)

### Community 24 - "useAiAssistant.ts"
Cohesion: 0.13
Nodes (17): AiAssistant, AiAssistant(), AiAssistantProps, QUICK_PROMPTS, ReminderRecurrence, AssistantChatMessage, resolveActiveProvider(), useAiAssistant() (+9 more)

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

### Community 55 - "nativeIOSBridge.ts"
Cohesion: 0.06
Nodes (9): @capacitor/core@8.6.2, @capacitor/core, HapticType, LiquidGlassCapabilities, NativeAndroidBridge, NativeAndroidBridgePlugin, NativeIOSBridge, NativeIOSBridgePlugin (+1 more)

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
Cohesion: 0.22
Nodes (5): send_resend_email(), send_resend_internal(), test_r2_endpoint(), test_resend_connection(), AppState

### Community 62 - "useMultiSession.ts"
Cohesion: 0.38
Nodes (11): QuickTemplate, useMultiSession(), bytesToHex(), constantTimeEqual(), derivePinHash(), generateSaltHex(), generateSessionUuid(), hexToBytes() (+3 more)

### Community 63 - "toast.ts"
Cohesion: 0.15
Nodes (14): GlobalToast(), ICONS, ToastCard(), currentToasts, DEFAULT_DURATIONS, emit(), listeners, pushToast() (+6 more)

### Community 64 - "BottomBar.tsx"
Cohesion: 0.21
Nodes (9): AlarmOverlay(), AlarmOverlayProps, ActiveTool, BottomBar(), BottomBarProps, BottomBarSessionControls, NAV_ITEMS, NavItemConfig (+1 more)

### Community 65 - "sessions.rs"
Cohesion: 0.14
Nodes (17): control_session_webview(), delete_session_data(), extract_unread_count_from_title(), get_active_session_uuids(), hide_all_session_webviews(), open_external_url(), open_session_webview(), resolve_macos_user_agent() (+9 more)

### Community 70 - "SceneDelegate.swift"
Cohesion: 0.29
Nodes (6): AudioToolbox, AVFoundation, Capacitor, UIKit, UserNotifications, WebKit

### Community 72 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): vite@8.3.8, vite-plugin-pwa@2.0.0, @vitejs/plugin-react@6.3.0, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 74 - "usePlatform.ts"
Cohesion: 0.28
Nodes (6): @capacitor/app@8.1.2, @capacitor/app, detectPlatform(), getVersion(), usePlatform(), detect()

### Community 76 - "react"
Cohesion: 0.26
Nodes (8): react, Calculator, Calculator(), CalculatorProps, PercentageCalculator(), formatNumberWithCommas(), roundResult(), useCalculator()

### Community 80 - "multiSessionBridge.ts"
Cohesion: 0.25
Nodes (3): multiSessionBridge, MultiSessionCapacitor, SessionBounds

### Community 81 - "useOnlineStatus.ts"
Cohesion: 0.29
Nodes (5): 🚀 Stack Tecnológico, @capacitor/network@8.0.1, @capacitor/network, useOnlineStatus(), setupCapacitorNetwork()

### Community 82 - "Platform"
Cohesion: 0.53
Nodes (3): GlassEffectContainer, GlassEffectContainerProps, Platform

### Community 83 - "prompt.md"
Cohesion: 0.40
Nodes (4): 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First), 2. Identificadores, Dominio y Nombres de Artefactos Fijos, 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`), 4. Entregables para este primer paso ("Hola Mundo")

## Knowledge Gaps
- **6 isolated node(s):** `PackageDescription`, `laryko`, `AudioToolbox`, `AVFoundation`, `UserNotifications` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 449 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionWebViewController` connect `SessionWebViewController` to `sessions.rs`, `SceneDelegate.swift`, `LarykoNotificationDelegate`, `LarykoRootViewController`, `MultiSessionPlugin`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `laryko`, `AudioToolbox` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.06424050632911392 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `BottomBar.tsx`, `Offline DB & Calculator`, `types/index.ts`, `MultiSession.tsx`, `App.tsx`, `usePlatform.ts`, `useOnlineStatus.ts`, `dependencies`, `Platform`, `useAiAssistant.ts`, `useMultiSession.ts`, `toast.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `Tauri Desktop Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `MultiSessionPlugin.java` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `CI Security & Release Workflows` be split into smaller, more focused modules?**
  _Cohesion score 0.07661290322580645 - nodes in this community are weakly interconnected._