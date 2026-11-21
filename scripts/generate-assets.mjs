import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// Fuentes disponibles en macOS
const CANDIDATE_FONTS = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
  '/Library/Fonts/Arial Bold.ttf',
  '/System/Library/Fonts/SFCompact.ttf',
]

const FONT_PATH = CANDIDATE_FONTS.find((f) => fs.existsSync(f)) || 'Arial'

const TMP_DIR = path.join('/tmp', `laryko-assets-${Date.now()}`)
fs.mkdirSync(TMP_DIR, { recursive: true })

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err) {
    console.error(`Error ejecutando: ${cmd}`)
    if (err.stderr) console.error(err.stderr.toString())
    throw err
  }
}

console.log('🎨 [assets] Iniciando generación de iconos y splash screens de Laryko...')

// 1. Generar Master Icon (1024x1024) y Master Badge (con esquinas redondeadas)
const masterFullIcon = path.join(TMP_DIR, 'master_full_icon.png')
const masterMask = path.join(TMP_DIR, 'master_mask.png')
const masterBadge = path.join(TMP_DIR, 'master_badge.png')

// Fondo degradado diagonal (#3b82f6 -> #8b5cf6) con la letra "L" blanca en el centro
run(
  `magick -size 1448x1448 "gradient:#3b82f6-#8b5cf6" -distort SRT 45 -gravity center -crop 1024x1024+0+0 +repage ` +
  `-font "${FONT_PATH}" -pointsize 540 -fill white -gravity center -annotate +0+25 "L" "${masterFullIcon}"`
)

// Máscara redondeada para el badge (rx = 220px sobre 1024px)
run(
  `magick -size 1024x1024 xc:none -draw "fill white roundrectangle 0,0 1023,1023 220,220" "${masterMask}"`
)

// Badge con transparencia en las esquinas
run(
  `magick "${masterFullIcon}" "${masterMask}" -alpha off -compose CopyOpacity -composite "${masterBadge}"`
)

console.log('✅ [assets] Master icon y badge generados con éxito.')

// 2. Generar iconos de iOS
const iosAppIconDir = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
fs.mkdirSync(iosAppIconDir, { recursive: true })

// iOS AppIcon: 1024x1024 sin transparencia (requerido por App Store y Apple HIG)
const iosUniversalIcon = path.join(iosAppIconDir, 'AppIcon-512@2x.png')
run(`magick "${masterFullIcon}" -alpha off "${iosUniversalIcon}"`)
console.log('📱 [assets] Icono universal de iOS (1024x1024) generado en AppIcon.appiconset.')

// 3. Generar Splash Screen de iOS (2732x2732 para todos los iPhones y iPads)
const iosSplashDir = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset')
fs.mkdirSync(iosSplashDir, { recursive: true })

const splashMaster = path.join(TMP_DIR, 'splash_master.png')
run(
  `magick -size 2732x2732 xc:"#0a0a0a" ` +
  `\\( "${masterBadge}" -resize 440x440 \\) -gravity center -geometry +0-70 -composite ` +
  `-font "${FONT_PATH}" -pointsize 92 -fill white -gravity center -annotate +0+250 "Laryko" ` +
  `"${splashMaster}"`
)

for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  fs.copyFileSync(splashMaster, path.join(iosSplashDir, name))
}
console.log('🌟 [assets] Splash screens de iOS (2732x2732) generados en Splash.imageset.')

// 4. Generar iconos de Android (Adaptive Icons + Legacy Icons)
const ANDROID_DENSITIES = [
  { name: 'mipmap-mdpi', iconSize: 48, fgCanvas: 108, fgBadge: 72 },
  { name: 'mipmap-hdpi', iconSize: 72, fgCanvas: 162, fgBadge: 108 },
  { name: 'mipmap-xhdpi', iconSize: 96, fgCanvas: 216, fgBadge: 144 },
  { name: 'mipmap-xxhdpi', iconSize: 144, fgCanvas: 324, fgBadge: 216 },
  { name: 'mipmap-xxxhdpi', iconSize: 192, fgCanvas: 432, fgBadge: 288 },
]

for (const density of ANDROID_DENSITIES) {
  const dir = path.join(ROOT, 'android/app/src/main/res', density.name)
  fs.mkdirSync(dir, { recursive: true })

  // Adaptive Icon Foreground (safe zone ~66% dentro de 108dp canvas)
  const fgPath = path.join(dir, 'ic_launcher_foreground.png')
  run(
    `magick -size ${density.fgCanvas}x${density.fgCanvas} xc:none ` +
    `\\( "${masterBadge}" -resize ${density.fgBadge}x${density.fgBadge} \\) -gravity center -composite "${fgPath}"`
  )

  // Legacy Square/Rounded Icon
  const iconPath = path.join(dir, 'ic_launcher.png')
  run(`magick "${masterBadge}" -resize ${density.iconSize}x${density.iconSize} "${iconPath}"`)

  // Legacy Round Icon
  const r = Math.floor(density.iconSize / 2)
  const roundMask = path.join(TMP_DIR, `round_mask_${density.iconSize}.png`)
  run(`magick -size ${density.iconSize}x${density.iconSize} xc:none -draw "fill white circle ${r},${r} ${r},0" "${roundMask}"`)
  const roundPath = path.join(dir, 'ic_launcher_round.png')
  run(
    `magick \\( "${masterFullIcon}" -resize ${density.iconSize}x${density.iconSize} \\) "${roundMask}" -alpha off -compose CopyOpacity -composite "${roundPath}"`
  )
}
console.log('🤖 [assets] Iconos adaptativos y legacy de Android generados en todas las densidades.')

// 5. Generar Splash Screens de Android (Android 12+ SplashScreen Icon + Drawables)
const ANDROID_SPLASHES = [
  { dir: 'drawable', width: 480, height: 320 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
]

for (const splash of ANDROID_SPLASHES) {
  const dir = path.join(ROOT, 'android/app/src/main/res', splash.dir)
  fs.mkdirSync(dir, { recursive: true })

  const minDim = Math.min(splash.width, splash.height)
  const badgeSize = Math.max(80, Math.min(320, Math.round(minDim * 0.28)))
  const textSize = Math.max(20, Math.round(badgeSize * 0.22))
  const badgeOffset = -Math.round(badgeSize * 0.16)
  const textOffset = Math.round(badgeSize * 0.65)

  const outPath = path.join(dir, 'splash.png')
  run(
    `magick -size ${splash.width}x${splash.height} xc:"#0a0a0a" ` +
    `\\( "${masterBadge}" -resize ${badgeSize}x${badgeSize} \\) -gravity center -geometry +0${badgeOffset} -composite ` +
    `-font "${FONT_PATH}" -pointsize ${textSize} -fill white -gravity center -annotate +0+${textOffset} "Laryko" ` +
    `"${outPath}"`
  )
}

// Icono centrado para Android 12+ Theme.SplashScreen (windowSplashScreenAnimatedIcon)
const splashIconPath = path.join(ROOT, 'android/app/src/main/res/drawable/splash_icon.png')
run(`magick "${masterBadge}" -resize 288x288 "${splashIconPath}"`)
console.log('🚀 [assets] Splash screens de Android (drawables y splash_icon) generados con éxito.')

// 6. Generar Web/PWA apple-touch-icon
const webPublicDir = path.join(ROOT, 'public')
run(`magick "${masterBadge}" -resize 180x180 "${path.join(webPublicDir, 'apple-touch-icon.png')}"`)
console.log('🌐 [assets] apple-touch-icon.png web/PWA generado con éxito.')

// Limpieza de directorio temporal
fs.rmSync(TMP_DIR, { recursive: true, force: true })
console.log('✨ [assets] ¡Todos los iconos y pantallas splash de iOS y Android se generaron correctamente!')
