/*
 * File:    make-icons.mjs
 * Module:  Android build tools
 * Owner:   Ravindu
 * Purpose: Turns Lucide icons (the same icon set as the web portal) into
 *          Android vector drawables in app/src/main/res/drawable/ic_*.xml.
 *          Each team member adds the icons their screens need to ICONS and
 *          runs:  node android/scripts/make-icons.mjs
 * Source:  AND-06 (Lucide icons, ISC licence; Android VectorDrawable format).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const iconFolder = join(here, '..', '..', 'web', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons')
const drawableFolder = join(here, '..', 'app', 'src', 'main', 'res', 'drawable')

// Lucide icon name -> who added it.
const ICONS = {
  // Ravindu: core, login and operator mode
  'sun': 'Ravindu',
  'log-in': 'Ravindu',
  'log-out': 'Ravindu',
  'scan-line': 'Ravindu',
  'qr-code': 'Ravindu',
  'keyboard': 'Ravindu',
  'shield-check': 'Ravindu',
  'zap': 'Ravindu',
  'circle-check': 'Ravindu',
  'circle-alert': 'Ravindu',
  'triangle-alert': 'Ravindu',
  'user-round': 'Ravindu',
  'key-round': 'Ravindu',
  'house': 'Ravindu',
  'refresh-cw': 'Ravindu',
  'arrow-left': 'Ravindu',
  'wifi-off': 'Ravindu',
  'info': 'Ravindu',
  'chevron-right': 'Ravindu',
  'camera': 'Ravindu',
  'phone': 'Ravindu',
  'clock': 'Ravindu',
  'x': 'Ravindu',
  'construction': 'Ravindu',
  // Tabs of the two shells. The member who builds the screen behind the tab
  // keeps using the same icon.
  'map-pin': 'Ravindu (Nimthara: map)',
  'calendar-days': 'Ravindu (Hamnad: bookings)',
  'list-checks': 'Ravindu (Hamnad: today at the station)',
  'battery-charging': 'Ravindu (Nimthara: battery bays)',
  // Malith: sign-up, profile and account
  'mail': 'Malith',
  'id-card': 'Malith',
  'gauge': 'Malith',
  'pencil': 'Malith',
  'lock': 'Malith',
  'user-x': 'Malith',
  'user-plus': 'Malith',
  'hourglass': 'Malith',
  // Nimthara: map, stations and battery bays
  'map': 'Nimthara',
  'list': 'Nimthara',
  'search': 'Nimthara',
  'minus': 'Nimthara',
  'plus': 'Nimthara',
  'navigation': 'Nimthara',
  'battery': 'Nimthara',
  'locate-fixed': 'Nimthara',
  'sun-medium': 'Nimthara',
  // Hamnad: bookings, the booking form and QR codes
  'funnel': 'Hamnad',
  'ticket': 'Hamnad',
  'arrow-right': 'Hamnad',
  'check': 'Hamnad',
  'calendar-plus': 'Hamnad',
  'ban': 'Hamnad',
  'history': 'Hamnad',
}

/*
 * Android reads path data more strictly than a browser. In SVG the two flags of
 * an arc may be written without separators ("a1.5 1.5 0 00-2.4-1.5"), and
 * Android then counts six numbers instead of seven and refuses to draw the
 * icon. This function reads the path command by command and writes every number
 * back with a space between, which both understand.
 */
function tidyPathData(data) {
  const counts = { m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, a: 7, z: 0 }
  const text = String(data)
  const parts = []
  let at = 0

  // Skips the spaces, tabs, line breaks and commas between numbers.
  const gaps = [32, 44, 9, 10, 13]
  const skipGaps = () => {
    while (at < text.length && gaps.includes(text.charCodeAt(at))) at += 1
  }

  // Reads one number, including forms such as -.5 and 1e-3.
  const readNumber = () => {
    skipGaps()
    const start = at
    if (text[at] === '+' || text[at] === '-') at += 1
    while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    if (text[at] === '.') {
      at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    }
    if (text[at] === 'e' || text[at] === 'E') {
      at += 1
      if (text[at] === '+' || text[at] === '-') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    }
    return text.slice(start, at)
  }

  // An arc flag is a single 0 or 1, even when the next number is glued to it.
  const readFlag = () => {
    skipGaps()
    const flag = text[at]
    at += 1
    return flag
  }

  while (at < text.length) {
    skipGaps()
    if (at >= text.length) break

    let command = text[at]
    at += 1
    const wanted = counts[command.toLowerCase()]
    if (wanted === undefined) {
      throw new Error(`Unknown path command "${command}" in ${text}`)
    }
    if (wanted === 0) {
      parts.push(command)
      continue
    }

    let first = true
    // The same command may carry several sets of numbers one after another.
    while (true) {
      skipGaps()
      const next = text[at]
      if (next === undefined || /[a-zA-Z]/.test(next)) break
      if (!first && (command === 'M' || command === 'm')) {
        // After the first point, "move to" means "line to".
        command = command === 'M' ? 'L' : 'l'
      }
      const numbers = []
      for (let i = 0; i < wanted; i += 1) {
        const isArcFlag = command.toLowerCase() === 'a' && (i === 3 || i === 4)
        numbers.push(isArcFlag ? readFlag() : readNumber())
      }
      parts.push(command + numbers.join(' '))
      first = false
    }
  }
  return parts.join(' ')
}

// Turns one Lucide shape into Android path data.
function toPathData([tag, attrs]) {
  const n = (name) => Number(attrs[name] ?? 0)
  switch (tag) {
    case 'path':
      return attrs.d
    case 'circle': {
      const [cx, cy, r] = [n('cx'), n('cy'), n('r')]
      return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0z`
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = [n('cx'), n('cy'), n('rx'), n('ry')]
      return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0z`
    }
    case 'line':
      return `M${n('x1')},${n('y1')}L${n('x2')},${n('y2')}`
    case 'polyline':
    case 'polygon': {
      const points = String(attrs.points).trim().split(/[\s,]+/).map(Number)
      let d = `M${points[0]},${points[1]}`
      for (let i = 2; i < points.length; i += 2) d += `L${points[i]},${points[i + 1]}`
      return tag === 'polygon' ? `${d}z` : d
    }
    case 'rect': {
      const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')]
      const rx = Math.min(n('rx') || n('ry'), w / 2)
      const ry = Math.min(n('ry') || n('rx'), h / 2)
      if (!rx) return `M${x},${y}h${w}v${h}h${-w}z`
      return (
        `M${x + rx},${y}h${w - 2 * rx}a${rx},${ry} 0 0,1 ${rx},${ry}v${h - 2 * ry}` +
        `a${rx},${ry} 0 0,1 ${-rx},${ry}h${-(w - 2 * rx)}a${rx},${ry} 0 0,1 ${-rx},${-ry}` +
        `v${-(h - 2 * ry)}a${rx},${ry} 0 0,1 ${rx},${-ry}z`
      )
    }
    default:
      throw new Error(`Unsupported shape: ${tag}`)
  }
}

// Loads the drawing of a Lucide icon. A few names are only aliases that point
// to another icon (for example "history" is "rotate-ccw-clock"), so the alias is
// followed to the file that holds the drawing.
async function iconData(name) {
  const file = join(iconFolder, `${name}.mjs`)
  const module = await import(pathToFileURL(file).href)
  if (module.__iconData) return module.__iconData
  const target = /from '\.\/([a-z0-9-]+)\.mjs'/.exec(readFileSync(file, 'utf8'))
  if (!target) throw new Error(`No icon data in ${name}.mjs`)
  return iconData(target[1])
}

// Writes one vector drawable file for a Lucide icon.
async function writeIcon(name, owner) {
  const paths = (await iconData(name)).node
    .map((shape) =>
      [
        '    <path',
        `        android:fillColor="#00000000"`,
        `        android:pathData="${tidyPathData(toPathData(shape))}"`,
        '        android:strokeWidth="2"',
        '        android:strokeColor="#FFFFFFFF"',
        '        android:strokeLineCap="round"',
        '        android:strokeLineJoin="round" />',
      ].join('\n'),
    )
    .join('\n')
  const fileName = `ic_${name.replaceAll('-', '_')}.xml`
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!--
  File:    ${fileName}
  Module:  Icons
  Owner:   ${owner}
  Purpose: Lucide "${name}" icon, converted by scripts/make-icons.mjs.
  Source:  AND-06 (Lucide icons, ISC licence).
-->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:tint="?attr/colorControlNormal"
    android:viewportWidth="24"
    android:viewportHeight="24">
${paths}
</vector>
`
  writeFileSync(join(drawableFolder, fileName), xml)
  return fileName
}

for (const [name, owner] of Object.entries(ICONS)) {
  console.log(await writeIcon(name, owner))
}
