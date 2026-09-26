// Génère les PNG sources des icônes (assets/) à partir de public/logo.svg.
// Ensuite, en CI, `npx capacitor-assets generate --android` produit toutes
// les tailles Android. À relancer seulement si le logo change : npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

// Carré plein (sans coins arrondis) : c'est Android qui applique son masque.
const svg = Buffer.from(readFileSync('public/logo.svg', 'utf8').replace('rx="112"', 'rx="0"'))
const bg = '#1c1f2a'

await sharp(svg).resize(1024, 1024).png().toFile('assets/icon-only.png')
// Avant-plan de l'icône adaptative : logo réduit (zone de sécurité ~66 %).
const fg = await sharp(svg).resize(640, 640).png().toBuffer()
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg, gravity: 'center' }]).png().toFile('assets/icon-foreground.png')
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } }).png().toFile('assets/icon-background.png')
const logo = await sharp(svg).resize(600, 600).png().toBuffer()
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
  .composite([{ input: logo, gravity: 'center' }]).png().toFile('assets/splash.png')
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
  .composite([{ input: logo, gravity: 'center' }]).png().toFile('assets/splash-dark.png')
console.log('Icônes générées dans assets/')
