#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Leer package.json como fuente de la verdad
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const args = process.argv.slice(2)
const isCheck = args.includes('--check')
const versionArg = args.find(a => !a.startsWith('--'))

const targetVersion = (versionArg ? versionArg.replace(/^v/, '') : pkg.version).trim()
const currentYear = new Date().getFullYear().toString()

// Cálculo de versionCode / buildNumber para Android e iOS: e.g. 0.1.0 -> 100, 1.2.3 -> 10203
const semverParts = targetVersion.split('.').map(n => parseInt(n, 10) || 0)
const major = semverParts[0] || 0
const minor = semverParts[1] || 0
const patch = semverParts[2] || 0
const versionCode = Math.max(1, major * 10000 + minor * 100 + patch)

console.log(`[sync-version] Sincronizando versión ${targetVersion} (código ${versionCode}) y Copyright © ${currentYear}`)

let hasDiscrepancy = false

function updateFile(filePath, updateFn) {
  const fullPath = path.join(rootDir, filePath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`[sync-version] Archivo no encontrado: ${filePath}`)
    return
  }
  const original = fs.readFileSync(fullPath, 'utf8')
  const updated = updateFn(original)
  if (original !== updated) {
    if (isCheck) {
      console.error(`[sync-version] ❌ Desincronizado: ${filePath}`)
      hasDiscrepancy = true
    } else {
      fs.writeFileSync(fullPath, updated, 'utf8')
      console.log(`[sync-version] ✅ Actualizado: ${filePath}`)
    }
  } else {
    console.log(`[sync-version] 🆗 Al día: ${filePath}`)
  }
}

// 1. package.json
updateFile('package.json', content => {
  const json = JSON.parse(content)
  json.version = targetVersion
  return JSON.stringify(json, null, 2) + '\n'
})

// 2. src-tauri/tauri.conf.json
updateFile('src-tauri/tauri.conf.json', content => {
  const json = JSON.parse(content)
  json.version = targetVersion
  if (json.bundle) {
    json.bundle.copyright = `Copyright © ${currentYear} Laryko`
  }
  return JSON.stringify(json, null, 2) + '\n'
})

// 3. src-tauri/Cargo.toml
updateFile('src-tauri/Cargo.toml', content => {
  return content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${targetVersion}"`)
})

// 4. android/app/build.gradle
updateFile('android/app/build.gradle', content => {
  return content
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${targetVersion}"`)
})

// 5. ios/App/App.xcodeproj/project.pbxproj
updateFile('ios/App/App.xcodeproj/project.pbxproj', content => {
  return content
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${targetVersion};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`)
})

// 6. .env y .env.example
for (const envFile of ['.env', '.env.example']) {
  updateFile(envFile, content => {
    if (/VITE_APP_VERSION=.*/.test(content)) {
      return content.replace(/VITE_APP_VERSION=.*/, `VITE_APP_VERSION=${targetVersion}`)
    }
    return content + `\nVITE_APP_VERSION=${targetVersion}\n`
  })
}

// 7. LICENSE
updateFile('LICENSE', content => {
  return content.replace(/Copyright \(c\) \d{4}/, `Copyright (c) ${currentYear}`)
})

// 8. src/hooks/usePlatform.ts
updateFile('src/hooks/usePlatform.ts', content => {
  return content.replace(/version:\s*'[^']+'/, `version: '${targetVersion}'`)
})

if (isCheck && hasDiscrepancy) {
  console.error('[sync-version] ❌ Error: Existen versiones o años de copyright desincronizados.')
  process.exit(1)
}

console.log('[sync-version] 🎉 Sincronización completada con éxito.')
