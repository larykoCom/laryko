# Graph Report - laryko  (2026-11-25)

## Corpus Check
- 105 files · ~64,175 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 243 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 836 nodes · 1386 edges · 62 communities (38 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c36b450`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- components/index.ts
- SessionWebViewController
- Offline DB & Calculator
- lib.rs
- Tauri Desktop Configuration
- Android MainActivity & Bridge
- CI Security & Release Workflows
- types/index.ts
- useMultiSession.ts
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
- package.json
- NativeIOSBridgePlugin
- tsconfig.node.json Module
- default.json Module
- vercel.json Module
- name Module
- publish-release Module
- devDependencies
- AppHandle
- name Module
- name Module
- name Module
- vite-env.d.ts Module
- Package.swift Module
- laryko Module
- Reglas de Desarrollo para Agentes IA — Laryko
- Registro de Cambios (Changelog)
- CapApp-SPM/README.md
- MainViewController
- NativeIOSBridge
- usePlatform.ts
- MultiSessionPlugin
- .scene
- execute_neon_sql
- SceneDelegate.swift
- build_models_request
- @capacitor/cli
- ai_chat_completion

## God Nodes (most connected - your core abstractions)
1. `with` - 25 edges
2. `react` - 24 edges
3. `triggerNativeHaptic()` - 20 edges
4. `scripts` - 18 edges
5. `compilerOptions` - 17 edges
6. `Platform` - 15 edges
7. `playNotificationSound()` - 15 edges
8. `lucide-react` - 15 edges
9. `SessionWebViewController` - 14 edges
10. `NativeIOSBridge` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Añadido (Added)` --references--> `NativeIOSBridge`  [INFERRED]
  CHANGELOG.md → ios/App/App/SceneDelegate.swift
- `Uso estándar:` --references--> `triggerNativeHaptic()`  [INFERRED]
  AGENTS.md → src/utils/nativeIOSBridge.ts
- `🔄 Sistema Integrado de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useAppUpdater.ts
- `🚀 Stack Tecnológico` --references--> `useOnlineStatus()`  [INFERRED]
  DEVELOPMENT.md → src/hooks/useOnlineStatus.ts
- `3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`)` --references--> `useAppUpdater()`  [INFERRED]
  prompt.md → src/hooks/useAppUpdater.ts

## Import Cycles
- None detected.

## Communities (62 total, 24 thin omitted)

### Community 0 - "components/index.ts"
Cohesion: 0.06
Nodes (34): lucide-react@^1.73.0, lucide-react, AiAssistant(), AiAssistantProps, QUICK_PROMPTS, AlarmOverlay(), AlarmOverlayProps, ActiveTool (+26 more)

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.08
Nodes (40): dexie-react-hooks, react, FilterTab, NotificationsCenter(), NotificationsCenterProps, defaultDateTimeLocal(), Reminders(), RemindersProps (+32 more)

### Community 3 - "lib.rs"
Cohesion: 0.08
Nodes (5): DownloadProgress, ensure_notification_icon_path(), send_native_notification(), send_resend_email(), test_resend_connection()

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "types/index.ts"
Cohesion: 0.10
Nodes (18): 1. Stack Tecnológico (Single Web Codebase + CSS Nativo + Offline-First), 2. Identificadores, Dominio y Nombres de Artefactos Fijos, 3. Sistema Integrado de Verificación de Actualizaciones (`useAppUpdater`), 4. Entregables para este primer paso ("Hola Mundo"), GlassEffectContainer, GlassEffectContainerProps, UpdateModal(), UpdateModalProps (+10 more)

### Community 8 - "useMultiSession.ts"
Cohesion: 0.18
Nodes (16): COLOR_SWATCHES, WebSession, QuickTemplate, SESSION_TEMPLATES, useMultiSession(), multiSessionBridge, MultiSessionCapacitor, SessionBounds (+8 more)

### Community 9 - "App.tsx"
Cohesion: 0.05
Nodes (19): @tauri-apps/api@2.12.4, @tauri-apps/api, App(), PLATFORM_ICONS, GlobalToast(), ICONS, ToastCard(), rootElement (+11 more)

### Community 10 - "useUserPanel.ts"
Cohesion: 0.11
Nodes (32): ReminderRecurrence, AssistantChatMessage, resolveActiveProvider(), useAiAssistant(), DEFAULT_PREFS, useUserPanel(), ALLOWED_RECURRENCE, ALLOWED_TOOLS (+24 more)

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

### Community 18 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @capacitor/ios@^8.6.2, @capacitor/network@8.0.1, dexie@4.4.7, dexie-react-hooks@4.4.0, react@19.3.1, react-dom@19.3.1, @tauri-apps/plugin-updater@2.14.1 (+6 more)

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
Cohesion: 0.18
Nodes (10): @capacitor/android@^8.6.2, @types/react@19.3.0, typescript@7.0.2, name, private, type, version, @capacitor/android (+2 more)

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
Cohesion: 0.18
Nodes (11): devDependencies, @tauri-apps/cli@2.12.4, @types/react-dom@19.3.0, vite@8.3.8, vite-plugin-pwa@2.0.0, @vitejs/plugin-react@6.3.0, @tauri-apps/cli, @types/react-dom (+3 more)

### Community 32 - "AppHandle"
Cohesion: 0.16
Nodes (12): delete_session_data(), download_and_install_update(), get_active_session_uuids(), hide_all_session_webviews(), open_external_url(), open_session_webview(), resolve_viewport_bounds(), set_session_bounds() (+4 more)

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

### Community 54 - "usePlatform.ts"
Cohesion: 0.25
Nodes (8): @capacitor/app@8.1.2, @capacitor/core@8.6.2, @capacitor/app, @capacitor/core, detectPlatform(), getVersion(), usePlatform(), detect()

### Community 57 - "execute_neon_sql"
Cohesion: 0.20
Nodes (9): delete_neon_account(), execute_neon_sql(), fetch_neon_account(), NeonAccountRecord, parse_neon_host(), pull_vault_from_neon(), register_neon_account(), sync_vault_to_neon() (+1 more)

### Community 58 - "SceneDelegate.swift"
Cohesion: 0.40
Nodes (4): AudioToolbox, Capacitor, UIKit, WebKit

### Community 59 - "build_models_request"
Cohesion: 0.40
Nodes (3): build_models_request(), list_ai_models(), test_ai_provider()

### Community 60 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.6.2, @capacitor/cli

### Community 61 - "ai_chat_completion"
Cohesion: 0.67
Nodes (3): ai_chat_completion(), AiChatMessageInput, format_reqwest_error()

## Knowledge Gaps
- **4 isolated node(s):** `PackageDescription`, `laryko`, `AudioToolbox`, `WebKit`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 402 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Offline DB & Calculator` to `components/index.ts`, `types/index.ts`, `useMultiSession.ts`, `App.tsx`, `useUserPanel.ts`, `dependencies`, `package.json`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `laryko`, `AudioToolbox` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05827505827505827 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `components/index.ts` to `Offline DB & Calculator`, `types/index.ts`, `useMultiSession.ts`, `App.tsx`, `package.json`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.07923497267759563 - nodes in this community are weakly interconnected._
- **Why does `useAppUpdater()` connect `types/index.ts` to `App.tsx`, `Offline DB & Calculator`, `🛠️ Guía de Desarrollo de Laryko`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._