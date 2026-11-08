import './mute-auto.mjs'
// 画面を撮って目で見る用。node shot.mjs [幅] [高さ]
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
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
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__kmReady)
await p.waitForTimeout(500)
const tag = `${w}x${h}`
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-title.png` })
await p.evaluate(() => km.setSeed(7)); await p.click('#bStart'); await p.waitForTimeout(300)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-play0.png` })
const tapAt = async n => { const r = await p.evaluate(n => km.xy(n), n); await p.mouse.click(r.x, r.y) }
for (let i = 0; i < 5; i++) { await tapAt('box'); await p.waitForTimeout(260) }
await p.evaluate(() => km.holdGlow(1, true, 0.5)); await p.waitForTimeout(100)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-stick.png` })
await tapAt('stick'); await p.evaluate(() => km.pause(false)); await p.waitForTimeout(350)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-folded.png` })
await tapAt('folded'); await p.waitForTimeout(500)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-open.png` })
// 凶を出す
for (let i = 0; i < 5; i++) { await tapAt('box'); await p.waitForTimeout(260) }
await p.evaluate(() => km.holdGlow(0.7, false, 0.04)); await tapAt('stick'); await p.evaluate(() => km.pause(false)); await p.waitForTimeout(300); await tapAt('folded'); await p.waitForTimeout(500)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-bad.png` })
await tapAt('box'); await p.waitForTimeout(700)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-curse.png` })
console.log(JSON.stringify(await p.evaluate(() => km.state())))
await p.evaluate(() => km.setTime(44.5)); await p.waitForTimeout(2600)
await p.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 }).catch(() => {})
await p.waitForTimeout(700)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-end.png` })
await p.evaluate(() => document.querySelector('#bBook2').click()); await p.waitForTimeout(200)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-book.png` })
console.log('errs', errs)
await b.close(); server.kill()
