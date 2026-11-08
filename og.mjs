import './mute-auto.mjs'
// SNS 用の og.png（1200x630）。遊んでいる場面（凶のくじ・金に光る棒・カラス・のぞく神主）＋右にタイトル
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname, PORT = 6563
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
const ctx = await b.newContext({ viewport: { width: 400, height: 720 }, deviceScaleFactor: 2, locale: 'ja-JP' }); await muteContext(ctx)
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__kmReady); await p.waitForTimeout(400)
await p.click('#bStart'); await p.waitForTimeout(200)
await p.evaluate(() => {
  const S = km.raw(); km.pause(true)
  S.folded = { slip: D.SLIPS.find(s => s.id === 'kyo1'), r: 'kyo', gold: false, no: 44, g: 0.2 }
  KM.tapSlip(S); S.pend = null; S.pts = 17; S.t = 31.2
  S.crow = { hp: 2, two: false }
  S.stick = { t: S.t, no: 8 }; S.heat = 2.9
  km.holdGlow(1, true, 0.5)
  document.querySelector('#stickSvg').innerHTML = ''
})
await p.evaluate(() => km.step(1))
await p.evaluate(() => { const S = km.raw(); S.stick = { t: S.t, no: 8 }; km.holdGlow(1, true, 0.5) })
await p.waitForTimeout(500)
// 棒の番号を描く（pop の出来事を通していないので）
await p.evaluate(() => { const ch = ['八']; document.querySelector('#stickSvg').innerHTML = `<rect x="4" y="0" width="16" height="122" rx="3" fill="#ecd5a6" stroke="#8a6236" stroke-width="1.5"/><rect x="4" y="104" width="16" height="18" rx="2" fill="#c4402a"/><text x="12" y="52" font-size="14" text-anchor="middle" font-family="Shippori Mincho B1, serif" font-weight="800" fill="#2b1d16">八</text>`; document.querySelector('#corner').style.display = 'none'; document.querySelector('#hint').hidden = true; document.querySelector('#finger').hidden = true })
await p.addStyleTag({ content: '#hint,#finger{display:none!important}' })
await p.waitForTimeout(200)
const shot = await p.screenshot({ type: 'png' })
const img = 'data:image/png;base64,' + shot.toString('base64')
const og = await b.newPage({ viewport: { width: 1200, height: 630 } })
await og.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@800&family=Yuji+Syuku&display=swap" rel="stylesheet"><style>
body{margin:0;width:1200px;height:630px;overflow:hidden;background:linear-gradient(#141c31,#2b3a5a 55%,#7d5a4e);position:relative;font-family:"Shippori Mincho B1",serif}
.shot{position:absolute;left:60px;top:-60px;width:400px;height:720px;transform:rotate(-2.5deg);box-shadow:0 20px 50px rgba(0,0,0,.6);background:url(${img}) center/cover;border:6px solid #f8f2e4}
.r{position:absolute;left:520px;right:50px;top:60px;bottom:50px;display:flex;flex-direction:column;justify-content:center;color:#f8f2e4}
h1{font-family:"Yuji Syuku",serif;font-weight:400;font-size:100px;white-space:nowrap;margin:0;line-height:1.05;letter-spacing:.02em}
h1 b{color:#ff8a6a;font-weight:400}
.q{margin-top:26px;display:inline-block;background:#f8f2e4;color:#2b1d16;font-size:40px;padding:14px 26px;border-left:10px solid #c4402a;align-self:flex-start}
.s{margin-top:22px;font-size:30px;color:#f3d9b0}
</style></head><body><div class="shot"></div><div class="r"><h1>恋みくじ<b>連打</b></h1><div class="q">待ち人、来ず。むしろ去る</div><div class="s">閉門まで45秒。光った瞬間に抜け</div></div></body></html>`)
await og.waitForTimeout(1500)
await og.screenshot({ path: `${ROOT}/og.png` })
await b.close(); server.kill()
console.log('og.png')
