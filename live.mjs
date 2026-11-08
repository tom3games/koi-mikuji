import "./mute-auto.mjs"
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
// github.io は tom3games.com へ転送されるので、転送の1行だけ外して Pages の中身を確かめる
import { chromium, webkit } from 'playwright'
import { execSync } from 'node:child_process'
// 個人のアカウント名は公開リポジトリに書かない。実行時に gh から取る（2026-11-02 live.mjs に名前が文字で入ったまま5本公開していた）
const OWNER = (() => { try { return execSync('gh api user -q .login', { encoding: 'utf8' }).trim().toLowerCase() } catch { return '' } })()
const URL0 = 'https://tom3games.github.io/koi-mikuji/'
const out = []
for (const [name, bt, opts] of [['chromium', chromium, {}], ['webkit', webkit, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const b = await bt.launch(bt === chromium ? MUTE_LAUNCH : {}), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('requestfailed', r => errs.push('fail ' + r.url()))
  await p.route(u => u.href.startsWith(URL0) && u.pathname === '/koi-mikuji/', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/<script id="ghMove">[^<]*<\/script>/, '') }) })
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__kmReady, null, { timeout: 15000 })
  const touch = name === 'webkit', tap = async n => { const r = await p.evaluate(n => km.xy(n), n); if (touch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y) }
  await p.waitForTimeout(500); await tap('start'); await p.waitForTimeout(400); await tap('.sit[data-s="kata"]'); await tap('go'); await p.waitForTimeout(300)
  for (let i = 0; i < 3; i++) { await tap('box'); await p.waitForTimeout(600) }
  await p.waitForTimeout(400); await tap('stick'); await p.waitForTimeout(500); await tap('folded'); await p.waitForTimeout(1000)
  const r = await p.evaluate(() => ({ v: [...document.scripts].map(s => s.src).filter(s => /game\.js/.test(s))[0], slip: km.slip() && km.slip().rank, pr: !document.querySelector('#affBox').hidden, mute: window.__muteOk() }))
  out.push(`${name}: ${JSON.stringify(r)}`)
  await p.screenshot({ path: `shots/live-${name}.png` })
  const og = (await p.request.get(URL0 + 'og.png')).status()
  out.push(`${name}: og=${og} errors=${errs.length ? errs.join(' | ') : 'none'}`)
  await b.close()
}
if (process.env.SKIPGH) { console.log(out.join('\n')); process.exit(0) }
// ログアウト状態でリポジトリ・更新履歴に個人のIDが出ていないか
const b = await chromium.launch(MUTE_LAUNCH), p = await b.newPage()
for (const u of ['https://github.com/tom3games/koi-mikuji', 'https://github.com/tom3games/koi-mikuji/commits/main']) {
  const res = await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  out.push(`${u} status=${res.status()} owner=${OWNER && (await p.content()).toLowerCase().includes(OWNER) ? 'FOUND' : 'none'}`)
}
await b.close()
console.log(out.join('\n'))
