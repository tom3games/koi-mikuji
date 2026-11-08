import './mute-auto.mjs'
// 画面を撮って目で見る用。node shot.mjs [幅] [高さ]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname, PORT = 6562
mkdirSync(ROOT + '/shots', { recursive: true })
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [w, h] = [Number(process.argv[2]) || 390, Number(process.argv[3]) || 844]
const b = await chromium.launch(MUTE_LAUNCH)
const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: process.env.LANG2 || 'ja-JP', hasTouch: true, deviceScaleFactor: 2 })
await muteContext(ctx)
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__kmReady); await p.waitForTimeout(500)
const tag = `${w}x${h}`
const tap = async n => { const r = await p.evaluate(n => km.xy(n), n); await p.mouse.click(r.x, r.y) }
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-title.png` })
await tap('start'); await p.waitForTimeout(200)
await tap('#name'); await p.keyboard.type('ゆき'); await p.click('.sit[data-s="kata"]')
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-ask.png` })
await tap('go'); await p.waitForTimeout(300)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-play.png` })
for (let i = 0; i < 3; i++) { await tap('box'); await p.waitForTimeout(600) }
await p.evaluate(() => km.holdGlow(1, 0.5)); await p.waitForTimeout(150)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-stick.png` })
await tap('stick'); await p.waitForTimeout(500)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-folded.png` })
await tap('folded'); await p.waitForTimeout(700)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-end.png` })
await p.evaluate(async () => { await km.drawCard() })
const png = await p.evaluate(() => document.querySelector('#card').toDataURL('image/png'))
writeFileSync(`${ROOT}/shots/s-${tag}-card.png`, Buffer.from(png.split(',')[1], 'base64'))
console.log(JSON.stringify({ pull: await p.evaluate(() => km.pull()), font: await p.evaluate(() => km.fit()), rank: await p.evaluate(() => km.slip().rank) }))
console.log('errs', errs)
await b.close(); server.kill()
