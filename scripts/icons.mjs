// Renders the PWA icons (full-bleed square, mountain inside the maskable safe zone) with headless Chrome.
import puppeteer from 'puppeteer-core'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" fill="#193D35"/>
<g transform="translate(76 86) scale(0.7)">
<circle cx="352" cy="140" r="44" fill="#C4EAA4"/>
<path d="M40 400 L196 176 L266 274 L322 198 L472 400 Z" fill="#D8EDE1"/>
<path d="M196 176 L236 232 L214 248 L196 224 L174 252 L158 230 Z" fill="#FFFFFF"/>
<path d="M322 198 L356 244 L338 256 L322 236 L304 252 L297 232 Z" fill="#FFFFFF"/>
<rect x="40" y="400" width="432" height="22" rx="11" fill="#3A956C"/>
</g></svg>`
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = await browser.newPage()
for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  await page.setViewport({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`)
  await page.screenshot({ path: `public/${file}`, clip: { x: 0, y: 0, width: size, height: size } })
}
await browser.close()
console.log('icons done')
