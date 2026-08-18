import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'

const SystemDate = Date
globalThis.Date = class extends SystemDate {
  constructor(...args) {
    super(...(args.length > 0 ? args : [0]))
  }

  static now() {
    return 0
  }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputPath = resolve(root, 'test/browser-parity/assets/fonts/deterministic-layout.otf')
const metadataPath = resolve(root, 'test/browser-parity/assets/fonts/METADATA.json')
const check = process.argv.includes('--check')

const patterns = getPatterns()

function addRect(path, x, y, width, height) {
  path.moveTo(x, y)
  path.lineTo(x + width, y)
  path.lineTo(x + width, y + height)
  path.lineTo(x, y + height)
  path.close()
}

function glyphPath(character) {
  const path = new opentype.Path()
  if (character === ' ') return path
  const uppercase = character >= 'a' && character <= 'z'
  const pattern = patterns[uppercase ? character.toUpperCase() : character]
  if (!pattern) throw new Error(`Missing pattern for ${JSON.stringify(character)}`)
  for (const [row, cells] of pattern.entries()) {
    for (const [column, cell] of [...cells].entries()) {
      if (cell === '*') addRect(path, 80 + column * 68, 710 - row * 92, 52, 76)
    }
  }
  if (uppercase) addRect(path, 430, -120, 35, 35)
  return path
}

const notdef = new opentype.Path()
addRect(notdef, 70, -170, 360, 40)
addRect(notdef, 70, 730, 360, 40)
addRect(notdef, 70, -130, 40, 860)
addRect(notdef, 390, -130, 40, 860)

const glyphs = [new opentype.Glyph({ name: '.notdef', advanceWidth: 500, path: notdef })]
for (let codePoint = 0x20; codePoint <= 0x7e; codePoint += 1) {
  const character = String.fromCodePoint(codePoint)
  glyphs.push(new opentype.Glyph({
    name: character === ' ' ? 'space' : `uni${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    unicode: codePoint,
    advanceWidth: 500,
    path: glyphPath(character),
  }))
}

const font = new opentype.Font({
  familyName: 'DOM Layout Shim Deterministic',
  styleName: 'Regular',
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  createdTimestamp: 1,
  glyphs,
})
// Chromium consults OS/2 Windows metrics on Windows but typographic metrics on
// Linux and macOS when sizing inline boxes. opentype.js derives the former from
// glyph bounds, which made this 20px font expose an 18px inline box only on
// Windows. Keep both metric families aligned so the repository-owned font is a
// deterministic geometry oracle on every parity runner.
font.tables.os2.usWinAscent = 800
font.tables.os2.usWinDescent = 200
font.tables.os2.fsSelection |= 1 << 7
const bytes = Buffer.from(font.toArrayBuffer())
const checksum = createHash('sha256').update(bytes).digest('hex')
const metadata = `${JSON.stringify({
  family: 'DOM Layout Shim Deterministic',
  version: '1.0.0',
  license: 'Unlicense',
  generator: 'scripts/generate-test-font.mjs',
  generatorDependency: 'opentype.js@2.0.0',
  unitsPerEm: 1000,
  advanceWidth: 500,
  ascender: 800,
  descender: -200,
  windowsAscent: 800,
  windowsDescent: 200,
  useTypographicMetrics: true,
  coverage: 'U+0020-U+007E',
  sha256: checksum,
}, null, 2)}\n`

if (check) {
  if (!readFileSync(outputPath).equals(bytes) || readFileSync(metadataPath, 'utf8') !== metadata) {
    throw new Error('Generated deterministic test font is out of date')
  }
  console.log(`Deterministic test font is current (${checksum}).`)
} else {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, bytes)
  writeFileSync(metadataPath, metadata)
  console.log(`Generated ${outputPath} (${checksum}).`)
}

function getPatterns() {
  return {
    A: glyph`
      _***_
      *___*
      *___*
      *****
      *___*
      *___*
      *___*
    `,
    B: glyph`
      ****_
      *___*
      *___*
      ****_
      *___*
      *___*
      ****_
    `,
    C: glyph`
      _****
      *____
      *____
      *____
      *____
      *____
      _****
    `,
    D: glyph`
      ****_
      *___*
      *___*
      *___*
      *___*
      *___*
      ****_
    `,
    E: glyph`
      *****
      *____
      *____
      ****_
      *____
      *____
      *****
    `,
    F: glyph`
      *****
      *____
      *____
      ****_
      *____
      *____
      *____
    `,
    G: glyph`
      _****
      *____
      *____
      *_***
      *___*
      *___*
      _****
    `,
    H: glyph`
      *___*
      *___*
      *___*
      *****
      *___*
      *___*
      *___*
    `,
    I: glyph`
      *****
      __*__
      __*__
      __*__
      __*__
      __*__
      *****
    `,
    J: glyph`
      __***
      ___*_
      ___*_
      ___*_
      *__*_
      *__*_
      _**__
    `,
    K: glyph`
      *___*
      *__*_
      *_*__
      **___
      *_*__
      *__*_
      *___*
    `,
    L: glyph`
      *____
      *____
      *____
      *____
      *____
      *____
      *****
    `,
    M: glyph`
      *___*
      **_**
      *_*_*
      *_*_*
      *___*
      *___*
      *___*
    `,
    N: glyph`
      *___*
      **__*
      *_*_*
      *__**
      *___*
      *___*
      *___*
    `,
    O: glyph`
      _***_
      *___*
      *___*
      *___*
      *___*
      *___*
      _***_
    `,
    P: glyph`
      ****_
      *___*
      *___*
      ****_
      *____
      *____
      *____
    `,
    Q: glyph`
      _***_
      *___*
      *___*
      *___*
      *_*_*
      *__*_
      _**_*
    `,
    R: glyph`
      ****_
      *___*
      *___*
      ****_
      *_*__
      *__*_
      *___*
    `,
    S: glyph`
      _****
      *____
      *____
      _***_
      ____*
      ____*
      ****_
    `,
    T: glyph`
      *****
      __*__
      __*__
      __*__
      __*__
      __*__
      __*__
    `,
    U: glyph`
      *___*
      *___*
      *___*
      *___*
      *___*
      *___*
      _***_
    `,
    V: glyph`
      *___*
      *___*
      *___*
      *___*
      *___*
      _*_*_
      __*__
    `,
    W: glyph`
      *___*
      *___*
      *___*
      *_*_*
      *_*_*
      *_*_*
      _*_*_
    `,
    X: glyph`
      *___*
      *___*
      _*_*_
      __*__
      _*_*_
      *___*
      *___*
    `,
    Y: glyph`
      *___*
      *___*
      _*_*_
      __*__
      __*__
      __*__
      __*__
    `,
    Z: glyph`
      *****
      ____*
      ___*_
      __*__
      _*___
      *____
      *****
    `,
    0: glyph`
      _***_
      *__**
      *_*_*
      *_*_*
      **__*
      *___*
      _***_
    `,
    1: glyph`
      __*__
      _**__
      __*__
      __*__
      __*__
      __*__
      _***_
    `,
    2: glyph`
      _***_
      *___*
      ____*
      ___*_
      __*__
      _*___
      *****
    `,
    3: glyph`
      ****_
      ____*
      ____*
      _***_
      ____*
      ____*
      ****_
    `,
    4: glyph`
      ___*_
      __**_
      _*_*_
      *__*_
      *****
      ___*_
      ___*_
    `,
    5: glyph`
      *****
      *____
      *____
      ****_
      ____*
      ____*
      ****_
    `,
    6: glyph`
      _***_
      *____
      *____
      ****_
      *___*
      *___*
      _***_
    `,
    7: glyph`
      *****
      ____*
      ___*_
      __*__
      _*___
      _*___
      _*___
    `,
    8: glyph`
      _***_
      *___*
      *___*
      _***_
      *___*
      *___*
      _***_
    `,
    9: glyph`
      _***_
      *___*
      *___*
      _****
      ____*
      ____*
      _***_
    `,
    '!': glyph`
      __*__
      __*__
      __*__
      __*__
      __*__
      _____
      __*__
    `,
    '"': glyph`
      _*_*_
      _*_*_
      _*_*_
      _____
      _____
      _____
      _____
    `,
    '#': glyph`
      _*_*_
      *****
      _*_*_
      _*_*_
      *****
      _*_*_
      _____
    `,
    '$': glyph`
      __*__
      _****
      *_*__
      _***_
      __*_*
      ****_
      __*__
    `,
    '%': glyph`
      **__*
      **_*_
      __*__
      _*___
      *_**_
      __**_
      _____
    `,
    '&': glyph`
      _**__
      *__*_
      *_*__
      _*___
      *_*_*
      *__*_
      _**_*
    `,
    "'": glyph`
      __*__
      __*__
      _*___
      _____
      _____
      _____
      _____
    `,
    '(': glyph`
      ___*_
      __*__
      _*___
      _*___
      _*___
      __*__
      ___*_
    `,
    ')': glyph`
      _*___
      __*__
      ___*_
      ___*_
      ___*_
      __*__
      _*___
    `,
    '*': glyph`
      _____
      *_*_*
      _***_
      *****
      _***_
      *_*_*
      _____
    `,
    '+': glyph`
      _____
      __*__
      __*__
      *****
      __*__
      __*__
      _____
    `,
    ',': glyph`
      _____
      _____
      _____
      _____
      __**_
      __*__
      _*___
    `,
    '-': glyph`
      _____
      _____
      _____
      *****
      _____
      _____
      _____
    `,
    '.': glyph`
      _____
      _____
      _____
      _____
      _____
      __**_
      __**_
    `,
    '/': glyph`
      ____*
      ___*_
      ___*_
      __*__
      _*___
      _*___
      *____
    `,
    ':': glyph`
      _____
      __**_
      __**_
      _____
      __**_
      __**_
      _____
    `,
    ';': glyph`
      _____
      __**_
      __**_
      _____
      __**_
      __*__
      _*___
    `,
    '<': glyph`
      ___*_
      __*__
      _*___
      *____
      _*___
      __*__
      ___*_
    `,
    '=': glyph`
      _____
      _____
      *****
      _____
      *****
      _____
      _____
    `,
    '>': glyph`
      _*___
      __*__
      ___*_
      ____*
      ___*_
      __*__
      _*___
    `,
    '?': glyph`
      _***_
      *___*
      ____*
      ___*_
      __*__
      _____
      __*__
    `,
    '@': glyph`
      _***_
      *___*
      *_***
      *_*_*
      *_***
      *____
      _***_
    `,
    '[': glyph`
      _***_
      _*___
      _*___
      _*___
      _*___
      _*___
      _***_
    `,
    '\\': glyph`
      *____
      _*___
      _*___
      __*__
      ___*_
      ___*_
      ____*
    `,
    ']': glyph`
      _***_
      ___*_
      ___*_
      ___*_
      ___*_
      ___*_
      _***_
    `,
    '^': glyph`
      __*__
      _*_*_
      *___*
      _____
      _____
      _____
      _____
    `,
    '_': glyph`
      _____
      _____
      _____
      _____
      _____
      _____
      *****
    `,
    '`': glyph`
      _*___
      __*__
      ___*_
      _____
      _____
      _____
      _____
    `,
    '{': glyph`
      ___*_
      __*__
      __*__
      _*___
      __*__
      __*__
      ___*_
    `,
    '|': glyph`
      __*__
      __*__
      __*__
      __*__
      __*__
      __*__
      __*__
    `,
    '}': glyph`
      _*___
      __*__
      __*__
      ___*_
      __*__
      __*__
      _*___
    `,
    '~': glyph`
      _____
      _____
      _*__*
      *_**_
      _____
      _____
      _____
    `,
  }
}

function glyph(strings) {
  return strings[0].trim().split('\n').map((row) => row.trim())
}
