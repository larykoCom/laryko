# Graph Report - laryko  (2026-11-25)

## Corpus Check
- 188 files · ~60,185 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .css 19, .xml 13, (none) 8)
- WARNING: 55 of 243 files seen (23%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 740 nodes · 1316 edges · 49 communities (31 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core App Shell & UI
- iOS Capacitor Audio & Bridge
- Offline DB & Calculator
- Tauri Rust Backend & Tray
- Tauri Desktop Configuration
- Android MainActivity & Bridge
- CI Security & Release Workflows
- App Lifecycle & Update Modal
- Multi-Session Containers
- User Panel & Vault Integrations
- Package DevDependencies
- Asset Generation Scripts
- TypeScript Configuration
- GitHub Actions Release Steps
- NPM Build & Sync Scripts
- Global Smart Toast System
- Version & Copyright Sync
- iOS AppDelegate Lifecycle
- Capacitor Runtime Dependencies
- Android Unit & Instrumented Tests
- name Module
- release.yml Module
- name Module
- @capacitor/app@8.1.2 Module
- NativeIOSBridgePlugin Module
- tsconfig.node.json Module
- default.json Module
- vercel.json Module
- name Module
- publish-release Module
- react-dom@19.3.1 Module
- capacitor.config.ts Module
- name Module
- name Module
- name Module
- vite-env.d.ts Module
- Package.swift Module
- laryko Module

## God Nodes (most connected - your core abstractions)
1. `with` - 25 edges
2. `react` - 24 edges
3. `Platform` - 24 edges
4. `App()` - 22 edges
5. `triggerNativeHaptic()` - 19 edges
6. `scripts` - 18 edges
7. `compilerOptions` - 17 edges
8. `lucide-react` - 15 edges
9. `playNotificationSound()` - 15 edges
10. `SessionWebViewController` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `GlobalToast()`  [EXTRACTED]
  src/App.tsx → src/components/GlobalToast/GlobalToast.tsx
- `App()` --calls--> `NotificationsCenter()`  [EXTRACTED]
  src/App.tsx → src/components/NotificationsCenter/NotificationsCenter.tsx
- `App()` --calls--> `UpdateModal()`  [EXTRACTED]
  src/App.tsx → src/components/UpdateModal/UpdateModal.tsx
- `App()` --calls--> `useAppUpdater()`  [EXTRACTED]
  src/App.tsx → src/hooks/useAppUpdater.ts
- `App()` --calls--> `useMultiSession()`  [EXTRACTED]
  src/App.tsx → src/hooks/useMultiSession.ts

## Import Cycles
- None detected.

## Communities (49 total, 18 thin omitted)

### Community 0 - "Core App Shell & UI"
Cohesion: 0.05
Nodes (53): lucide-react, App(), PLATFORM_ICONS, AiAssistant(), AiAssistantProps, QUICK_PROMPTS, AlarmOverlay(), AlarmOverlayProps (+45 more)

### Community 1 - "iOS Capacitor Audio & Bridge"
Cohesion: 0.05
Nodes (9): AudioToolbox, Capacitor, MainViewController, MultiSessionPlugin, NativeIOSBridge, SceneDelegate, SessionWebViewController, UIKit (+1 more)

### Community 2 - "Offline DB & Calculator"
Cohesion: 0.08
Nodes (36): dexie-react-hooks, react, PercentageCalculator(), FilterTab, NotificationsCenter(), NotificationsCenterProps, UserPanelTab, AppNotification (+28 more)

### Community 3 - "Tauri Rust Backend & Tray"
Cohesion: 0.06
Nodes (23): ai_chat_completion(), AiChatMessageInput, delete_session_data(), download_and_install_update(), DownloadProgress, ensure_notification_icon_path(), execute_neon_sql(), get_active_session_uuids() (+15 more)

### Community 4 - "Tauri Desktop Configuration"
Cohesion: 0.04
Nodes (44): app, security, windows, bundleMediaFramework, build, beforeBuildCommand, beforeDevCommand, devUrl (+36 more)

### Community 6 - "CI Security & Release Workflows"
Cohesion: 0.08
Nodes (31): name, runs-on, steps, name, runs-on, steps, name, runs-on (+23 more)

### Community 7 - "App Lifecycle & Update Modal"
Cohesion: 0.14
Nodes (11): UpdateModal(), UpdateModalProps, compareVersions(), DownloadProgress, getUpdateAction(), useAppUpdater(), AppInfo, GitHubRelease (+3 more)

### Community 8 - "Multi-Session Containers"
Cohesion: 0.17
Nodes (17): COLOR_SWATCHES, SessionGroup, WebSession, QuickTemplate, SESSION_TEMPLATES, useMultiSession(), multiSessionBridge, MultiSessionCapacitor (+9 more)

### Community 9 - "User Panel & Vault Integrations"
Cohesion: 0.19
Nodes (19): DEFAULT_PREFS, useUserPanel(), integrationsBridge, decodePairingToken(), decryptSyncBundle(), decryptVault(), deriveAesKey(), EMPTY_VAULT (+11 more)

### Community 10 - "Package DevDependencies"
Cohesion: 0.13
Nodes (19): devDependencies, @tauri-apps/cli@2.12.4, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@7.0.2, vite@8.3.8, vite-plugin-pwa@2.0.0, @vitejs/plugin-react@6.3.0 (+11 more)

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

### Community 15 - "Global Smart Toast System"
Cohesion: 0.15
Nodes (14): GlobalToast(), ICONS, ToastCard(), currentToasts, DEFAULT_DURATIONS, emit(), listeners, pushToast() (+6 more)

### Community 16 - "Version & Copyright Sync"
Cohesion: 0.12
Nodes (11): args, currentYear, __dirname, isCheck, pkg, pkgPath, rootDir, semverParts (+3 more)

### Community 18 - "Capacitor Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @capacitor/android@^8.6.2, @capacitor/ios@^8.6.2, @capacitor/network@8.0.1, dexie@4.4.7, dexie-react-hooks@4.4.0, lucide-react@^1.73.0, react@19.3.1 (+7 more)

### Community 20 - "name Module"
Cohesion: 0.26
Nodes (12): name, needs, runs-on, steps, steps, steps, steps, build-ios (+4 more)

### Community 21 - "release.yml Module"
Cohesion: 0.18
Nodes (10): env, NODE_VERSION, RUST_VERSION, jobs, name, on, push, permissions (+2 more)

### Community 22 - "name Module"
Cohesion: 0.22
Nodes (9): name, runs-on, steps, GITHUB_TOKEN, VITE_APP_VERSION, VITE_GITHUB_REPO, VITE_IS_APP_STORE, build-web (+1 more)

### Community 23 - "@capacitor/app@8.1.2 Module"
Cohesion: 0.22
Nodes (9): @capacitor/app@8.1.2, @capacitor/core@8.6.2, @tauri-apps/api@2.12.4, @capacitor/app, @capacitor/core, @tauri-apps/api, detectPlatform(), getVersion() (+1 more)

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

### Community 30 - "react-dom@19.3.1 Module"
Cohesion: 0.40
Nodes (3): react-dom@19.3.1, react-dom, rootElement

### Community 32 - "capacitor.config.ts Module"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@8.6.2, @capacitor/cli

### Community 33 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-linux

### Community 34 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-macos

### Community 35 - "name Module"
Cohesion: 0.50
Nodes (4): name, needs, runs-on, build-tauri-windows

## Knowledge Gaps
- **4 isolated node(s):** `AudioToolbox`, `WebKit`, `PackageDescription`, `laryko`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 340 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Offline DB & Calculator` to `Core App Shell & UI`, `App Lifecycle & Update Modal`, `Multi-Session Containers`, `User Panel & Vault Integrations`, `Package DevDependencies`, `Global Smart Toast System`, `Capacitor Runtime Dependencies`, `react-dom@19.3.1 Module`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `AudioToolbox`, `WebKit`, `PackageDescription` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `Core App Shell & UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05422838031533684 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Core App Shell & UI` to `Offline DB & Calculator`, `App Lifecycle & Update Modal`, `Multi-Session Containers`, `Package DevDependencies`, `Global Smart Toast System`, `Capacitor Runtime Dependencies`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `iOS Capacitor Audio & Bridge` be split into smaller, more focused modules?**
  _Cohesion score 0.05084745762711865 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Build & Sync Scripts` to `Package DevDependencies`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `Offline DB & Calculator` be split into smaller, more focused modules?**
  _Cohesion score 0.08116883116883117 - nodes in this community are weakly interconnected._