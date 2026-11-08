import './mute-auto.mjs'
// SNS 用の og.png（1200x630）。開いた恋みくじの紙（大吉・待ち人 来る。ただし寝癖のまま）＋右にタイトル
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname, PORT = 6563
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
const ctx = await b.newContext({ viewport: { width: 330, height: 760 }, deviceScaleFactor: 2, locale: 'ja-JP' }); await muteContext(ctx)
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__kmReady); await p.waitForTimeout(500)
const tap = async n => { const r = await p.evaluate(n => km.xy(n), n); await p.mouse.click(r.x, r.y) }
await tap('start'); await p.waitForTimeout(400); await p.click('.sit[data-s="kata"]'); await tap('go'); await p.waitForTimeout(300)
for (let i = 0; i < 3; i++) { await tap('box'); await p.waitForTimeout(600) }
await p.evaluate(() => km.holdGlow(1, 0.5)); await tap('stick'); await p.waitForTimeout(450); await tap('folded'); await p.waitForTimeout(900)
await p.evaluate(() => {
  const s = km.slip(); s.idx = 0; s.rank = 'dk'; s.tier = 'g'; s.no = 7; s.name = ''
  s.waka = D.WAKA.g[1]; s.sohyo = D.SOHYO.dk[0]
  s.items = [{ k: 'aite', ja: D.T.aite.g[1][0] }, { k: 'kokuhaku', ja: D.T.kokuhaku.g[1][0] }, { k: 'machi', ja: D.T.machi.g[0][0] }, { k: 'gan', ja: D.T.gan.g[2][0] }, { k: 'place', ja: D.PLACE[2][0] }]
  km.rerender()
})
await p.waitForTimeout(800)
const box = await p.evaluate(() => { const r = document.querySelector('#slip').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height } })
const shot = await p.screenshot({ type: 'png', clip: box })
const img = 'data:image/png;base64,' + shot.toString('base64')
const og = await b.newPage({ viewport: { width: 1200, height: 630 } })
await og.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@800&family=Yuji+Syuku&display=swap" rel="stylesheet"><style>
body{margin:0;width:1200px;height:630px;overflow:hidden;background:linear-gradient(#141c31,#2b3a5a 55%,#7d5a4e);position:relative;font-family:"Shippori Mincho B1",serif}
.shot{position:absolute;left:80px;top:34px;height:570px;transform:rotate(-2deg);box-shadow:0 20px 50px rgba(0,0,0,.6)}
.r{position:absolute;left:540px;right:50px;top:60px;bottom:50px;display:flex;flex-direction:column;justify-content:center;color:#f8f2e4}
h1{font-family:"Yuji Syuku",serif;font-weight:400;font-size:130px;margin:0;line-height:1;color:#ff8a6a;white-space:nowrap}
.q{margin-top:30px;display:inline-block;background:#f8f2e4;color:#2b1d16;font-size:32px;padding:14px 22px;white-space:nowrap;border-left:10px solid #c4402a;align-self:flex-start}
.s{margin-top:22px;font-size:28px;color:#f3d9b0;line-height:1.5}
</style></head><body><img class="shot" src="${img}"><div class="r"><h1>恋みくじ</h1><div class="q">待ち人　来る。ただし寝癖のまま</div><div class="s">いまの恋を選び、箱をゆっくり三度。<br>一日一枚の恋のおみくじ</div></div></body></html>`)
await og.waitForTimeout(1500)
await og.screenshot({ path: `${ROOT}/og.png` })
await b.close(); server.kill()
console.log('og.png')
