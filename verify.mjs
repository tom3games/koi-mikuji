import './mute-auto.mjs'
// 恋みくじ連打の検証。node verify.mjs  （音は出さない: mute-auto + muteContext）
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium, webkit } from 'playwright'
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 6561
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
const AFF = 'https://ac.cross-system.com/H558ec8Ha0ffaf0N/cl/?bId=ea9Uac13&param4=A3503_00'
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, { keep = false, init } = {}) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  if (!keep) await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('k')) { localStorage.clear(); sessionStorage.setItem('k', 1) } } catch (e) {} })
  if (init) await ctx.addInitScript(init)
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0); await p.waitForFunction(() => window.__kmReady, null, { timeout: 15000 })
  return p
}
const st = p => p.evaluate(() => km.state())
const xy = (p, n) => p.evaluate(n => km.xy(n), n)
// 本物のポインタで、その物の画面上の座標を押す
async function tap(p, n, touch) { const r = await xy(p, n); if (touch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); return r }
async function shake5(p, touch, gap = 240) { for (let i = 0; i < 5; i++) { await tap(p, 'box', touch); await p.waitForTimeout(gap) } }
// 光を決めた状態で止めて抜き、紙を開く
async function drawAt(p, amp, gold, phase, touch) {
  await shake5(p, touch)
  await p.waitForFunction(() => km.state().stick)
  await p.evaluate(([a, g, ph]) => km.holdGlow(a, g, ph), [amp, gold, phase])
  await tap(p, 'stick', touch); await p.evaluate(() => km.pause(false))
  const s = await st(p); if (!s.folded) return s
  await p.waitForTimeout(120); await tap(p, 'folded', touch); await p.waitForTimeout(150)
  return st(p)
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, .ovl:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#leaves') || el.closest('#ex')) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className.baseVal || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) canvas,main:not([hidden]) a,.ovl:not([hidden]) button,#slip:not([hidden])')) { if (!el.offsetParent && el.id !== 'slip') continue; if (el.hidden) continue; const r = el.getBoundingClientRect(); if (!r.height) continue; if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})

// ---- 0. 文言の禁止語（自前のコピーに 当たる・必ず・今だけ・AI・画像生成 を使わない）
await t('禁止語が無い（当たる/必ず/今だけ/AI/画像生成）', async () => {
  const hits = []
  for (const f of ['index.html', 'data.js', 'game.js', 'config.js', 'privacy.html']) { const s = readFileSync(ROOT + '/' + f, 'utf8'); for (const w of ['当たる', '必ず', '今だけ', '画像生成', 'ＡＩ']) if (s.includes(w)) hits.push(f + ':' + w); if (/(^|[^A-Za-z_])AI([^A-Za-z_]|$)/.test(s.replace(/AudioContext|AFF_URL|aria-label/g, ''))) hits.push(f + ':AI') }
  expect(!hits.length, hits.join(',')); return true
})
await t('シミュレーション: 何もしないが最低・連打は詰まる・落ち着いて光を待つのが強い', async () => {
  const o = JSON.parse(execFileSync(process.execPath, ['sim.mjs', '--json'], { cwd: ROOT }).toString().trim().split('\n').pop())
  expect(o.idle.lv === -1 && o.idle.pts === 0, 'idle')
  expect(o.spam.jams >= 8 && o.spam.lv > o.idle.lv, 'spam ' + JSON.stringify(o.spam))
  expect(o.smart.pts > o.spam.pts * 4 && o.smart.pts > o.eager.pts * 4, 'smart vs spam/eager')
  expect(o.tempo22.pts > o.fast15.pts && o.fast15.jams > 3, 'too fast jams')
  expect(o.eagerTie.pts > o.eager.pts, 'tie helps')
  expect(o.repeatable, 'repeat')
  return { idle: o.idle.pts, spam: [o.spam.pts, o.spam.jams], eager: o.eager.pts, eagerTie: o.eagerTie.pts, fast15: [o.fast15.pts, o.fast15.jams], tempo22: o.tempo22.pts, smart: o.smart.pts }
})

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser, { hasTouch: false })
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return true
})
await t('OGP 一式と og.png', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => document.querySelector(`meta[property="${k}"]`)?.content || '').concat(document.querySelector('meta[name="twitter:card"]')?.content || ''))
  expect(r.every(Boolean) && r[2].endsWith('/koi-mikuji/og.png'), JSON.stringify(r))
  const res = await p.request.get(URL0 + 'og.png'); expect(res.status() === 200, 'og.png ' + res.status())
  const b = await res.body(); expect(b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, 'size'); return true
})
await t('タイトルに PR は出ない', async () => { expect(await p.evaluate(() => document.querySelector('#affBox').hidden), 'shown on title') })
await t('ロード画面が消えている', async () => { await p.waitForTimeout(500); expect(await p.evaluate(() => document.querySelector('#loading').hidden), 'loading') })

// ---- 遊びの通し（本物のマウス）
await p.evaluate(() => km.setSeed(11)); await tap(p, 'start'); await p.waitForTimeout(200)
await t('遊び中も PR は出ない', async () => { expect(await p.evaluate(() => document.querySelector('#affBox').hidden), 'shown in play') })
await t('箱を本物のクリックで振ると1回ずつ進み、5回で棒が出る', async () => {
  const seen = []
  for (let i = 0; i < 5; i++) { await tap(p, 'box'); seen.push((await st(p)).prog); await p.waitForTimeout(240) }
  const s = await st(p)
  expect(s.stick && JSON.stringify(seen) === '[1,2,3,4,0]', JSON.stringify(seen) + ' stick=' + s.stick)
  const vis = await p.evaluate(() => document.querySelector('#stick').classList.contains('out'))
  expect(vis, 'stick not shown'); return seen
})
await t('出た棒は光り方が変わる（--g が動く）', async () => {
  const gs = []; for (let i = 0; i < 6; i++) { gs.push(await p.evaluate(() => +getComputedStyle(document.querySelector('#stick')).getPropertyValue('--g'))); await p.waitForTimeout(110) }
  expect(Math.max(...gs) - Math.min(...gs) > 0.15, JSON.stringify(gs)); return gs.map(g => g.toFixed(2))
})
await t('一番光った瞬間に抜くと大吉。金の光なら珍しいくじ', async () => {
  await p.evaluate(() => km.holdGlow(1, true, 0.5)); await tap(p, 'stick'); await p.evaluate(() => km.pause(false))
  let s = await st(p); expect(s.folded && !s.stick, 'not folded')
  await tap(p, 'folded'); await p.waitForTimeout(150); s = await st(p)
  expect(s.cur && s.cur.r === 'dk' && s.cur.rare && s.pts === 3, JSON.stringify(s.cur) + ' pts ' + s.pts)
  const txt = await p.evaluate(() => document.querySelector('#slip').innerText)
  expect(/大吉/.test(txt), txt); return s.cur
})
await t('暗い時に抜くと大凶。結び処に3回で結べば帳消し', async () => {
  const s0 = await drawAt(p, 0.7, false, 0.02)
  expect(s0.cur.r === 'dkyo' && s0.pend, JSON.stringify(s0.cur) + s0.pend)
  expect(await p.evaluate(() => document.querySelector('#rack').classList.contains('want')), 'rack not glowing')
  for (let i = 0; i < 3; i++) { await tap(p, 'rack'); await p.waitForTimeout(120) }
  const s = await st(p); expect(s.tied === 1 && !s.pend && s.pts === s0.pts, JSON.stringify(s)); return { pts: s.pts, tied: s.tied }
})
await t('凶を結ばずに振ると祟り（元恋人は押して帰す・カラスは追い払う）', async () => {
  const s0 = await drawAt(p, 0.7, false, 0.2)
  expect(s0.cur.r === 'kyo' && s0.pend, JSON.stringify(s0.cur))
  await tap(p, 'box'); await p.waitForTimeout(500)
  let s = await st(p)
  if (s.ex) {
    expect(await p.evaluate(() => !document.querySelector('#ex').hidden), 'ex hidden')
    let n = 0; while ((await st(p)).ex && n < 12) { await tap(p, 'ex'); n++; await p.waitForTimeout(90) }
    s = await st(p); expect(!s.ex && n === 6, 'ex taps ' + n); return { curse: 'ex', taps: n }
  }
  expect(s.crow, 'no curse'); let n = 0; while ((await st(p)).crow && n < 6) { await tap(p, 'crow'); n++; await p.waitForTimeout(250) }
  s = await st(p); expect(!s.crow && n === 2, 'crow taps ' + n); return { curse: 'crow', taps: n }
})
await t('カラスを追い払わないと次の一枚を持っていかれる', async () => {
  await p.evaluate(() => { const S = km.raw(); S.pend = 'crow'; }); await tap(p, 'box'); await p.waitForTimeout(500)
  expect((await st(p)).crow, 'crow not in')
  const vis = await p.evaluate(() => { const r = document.querySelector('#crow').getBoundingClientRect(); return r.width > 30 && r.top >= 0 && r.right <= innerWidth })
  expect(vis, 'crow not on screen')
  const s = await drawAt(p, 1, false, 0.5)
  expect(s.stolen === 1 && !s.folded && !s.crow, JSON.stringify(s)); return { stolen: s.stolen }
})
await t('速く振りすぎると詰まり、神主さんが出て少しの間振れない', async () => {
  await p.waitForTimeout(900)
  const r0 = await xy(p, 'box')
  for (let i = 0; i < 9; i++) { await p.mouse.click(r0.x, r0.y); await p.waitForTimeout(25) }
  const s = await st(p); expect(s.jam && s.jams >= 1, JSON.stringify({ jam: s.jam, jams: s.jams, heat: s.heat }))
  const pr = await p.evaluate(() => document.querySelector('#priest').classList.contains('out')); expect(pr, 'priest not out')
  const before = (await st(p)).prog; await tap(p, 'box'); expect((await st(p)).prog === before, 'shook while jammed')
  await p.waitForFunction(() => !km.state().jam, null, { timeout: 4000 }); return { jams: s.jams }
})
await t('チュートリアルの一言と吹き出しは同時に出ない', async () => {
  const both = await p.evaluate(() => !document.querySelector('#hint').hidden && document.querySelector('#bubble').classList.contains('on')); expect(!both, 'both'); return true
})
await t('音を鳴らす操作をしても実際には無音（Chromium）・音は呼ばれている', async () => {
  const r = await p.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls, sfx: window.__sfxCalls }))
  expect(r.ok && r.sfx.shake > 3 && r.sfx.open >= 2 && r.sfx.jam >= 1, JSON.stringify(r)); return { muteOk: r.ok, shake: r.sfx.shake }
})
let endState
await t('45秒で閉門し、結果の紙が出る', async () => {
  await p.evaluate(() => km.setTime(44.6)); await p.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 })
  endState = await st(p)
  expect(await p.evaluate(() => !document.querySelector('#vEnd').hidden && window.__kmCardDone), 'no end')
  await p.screenshot({ path: `${ROOT}/shots/v-end.png` }); return { pts: endState.pts, draws: endState.draws }
})
await t('PR は結果画面だけ。href・rel・target・PR表記・17歳以上', async () => {
  const r = await p.evaluate(() => { const a = document.querySelector('#bAff'), b = document.querySelector('#affBox'), pr = a.querySelector('.pr'); const cs = getComputedStyle(pr), ts = getComputedStyle(document.querySelector('#affTxt')); return { hidden: b.hidden, href: a.getAttribute('href'), rel: a.rel, target: a.target, pr: pr.textContent, prSize: parseFloat(cs.fontSize), txtSize: parseFloat(ts.fontSize), txt: a.textContent, note: document.querySelector('#affNote').textContent, vis: a.getBoundingClientRect().bottom <= innerHeight } })
  expect(!r.hidden && r.href === AFF && /sponsored/.test(r.rel) && /noopener/.test(r.rel) && r.target === '_blank' && r.pr === 'PR' && r.prSize >= r.txtSize - 1 && r.note === '17歳以上' && r.vis, JSON.stringify(r))
  expect(!/当たる|必ず|今だけ/.test(r.txt), r.txt); return { txt: r.txt, rel: r.rel }
})
await t('図鑑に引いたくじが残り、読み直しても消えない', async () => {
  const before = await p.evaluate(() => km.book())
  expect(before.length >= 3, JSON.stringify(before))
  await p.reload(); await p.waitForFunction(() => window.__kmReady)
  const after = await p.evaluate(() => km.book())
  expect(JSON.stringify(after.sort()) === JSON.stringify(before.sort()), JSON.stringify(after))
  await tap(p, '#bBook'); await p.waitForTimeout(150)
  const n = await p.evaluate(() => document.querySelector('#bookN').textContent)
  expect(n.includes(`${before.length} / 50`), n)
  const id = before[0]; const c = await p.evaluate(id => { const r = document.querySelector(`.cell[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, id)
  await p.mouse.click(c.x, c.y); const info = await p.evaluate(() => document.querySelector('#bookInfo').textContent)
  expect(info.length > 6, info); return { n, info }
})
await t('英語に切り替えると文言が英語になり、くじは横書き', async () => {
  await p.evaluate(() => { document.querySelector('#bookClose').click() })
  await tap(p, '#bLang'); await p.waitForTimeout(100)
  const r = await p.evaluate(() => ({ start: document.querySelector('#bStart').textContent, title: document.querySelector('#tTitle').textContent }))
  expect(r.start === 'Go draw' && /Love Fortune/.test(r.title), JSON.stringify(r))
  await p.evaluate(() => km.setSeed(3)); await tap(p, 'start'); await p.waitForTimeout(150)
  const s = await drawAt(p, 1, false, 0.5)
  const sl = await p.evaluate(() => ({ cls: document.querySelector('#slip').className, wm: getComputedStyle(document.querySelector('#slip')).writingMode, txt: document.querySelector('#slip').innerText }))
  expect(/en/.test(sl.cls) && sl.wm === 'horizontal-tb' && /Great Luck/.test(sl.txt), JSON.stringify(sl))
  await p.screenshot({ path: `${ROOT}/shots/v-en-play.png` })
  await p.evaluate(() => km.setLang('ja')); return sl.txt.slice(0, 60)
})
await p.close()

// ---- 何もしない通し: 最低の判定
await t('何もしないと「引いてもいない」で一番下', async () => {
  const q = await open(browser); await tap(q, 'start'); await q.evaluate(() => km.setTime(44.7))
  await q.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 })
  const lv = await q.evaluate(() => km.level()); expect(lv.i === -1 && lv.ja === '引いてもいない', JSON.stringify(lv)); await q.close(); return lv.ja
})
// ---- AFF_URL が空ならボタンも注記も出ない
await t('AFF_URL が空なら PR は隠れる', async () => {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } }); await muteContext(ctx)
  await ctx.route('**/config.js*', r => r.fulfill({ contentType: 'text/javascript', body: "window.AFF_URL = ''" }))
  const q = await ctx.newPage(); await q.goto(URL0); await q.waitForFunction(() => window.__kmReady)
  await q.click('#bStart'); await q.evaluate(() => { km.fast(true); km.setTime(44.8) }); await q.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 })
  const r = await q.evaluate(() => ({ hidden: document.querySelector('#affBox').hidden, href: document.querySelector('#bAff').getAttribute('href') }))
  expect(r.hidden && !r.href, JSON.stringify(r)); await ctx.close(); return r
})
// ---- localStorage が使えなくても遊べる
await t('localStorage が投げても起動して遊べる', async () => {
  const q = await open(browser, {}, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } }) } })
  await tap(q, 'start'); const s = await drawAt(q, 1, false, 0.5)
  await q.evaluate(() => km.setTime(44.8)); await q.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 })
  const errs = q.errs.filter(e => !/blocked/.test(e)); expect(s.draws === 1 && !errs.length, JSON.stringify(s) + errs.join('|')); await q.close(); return true
})

// ---- 3サイズ × 全画面で一画面に収まる・押す物が画面内
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const views = {}
  await q.waitForTimeout(500); views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.evaluate(() => km.setSeed(5)); await tap(q, 'start', true); await q.waitForTimeout(150)
  views.play = await fit(q)
  const targets = {}
  await shake5(q, true)
  targets.box = await xy(q, 'box'); targets.stick = await xy(q, 'stick')
  await q.evaluate(() => km.holdGlow(1, true, 0.5)); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-stick.png` })
  await tap(q, 'stick', true); await q.evaluate(() => km.pause(false)); await q.waitForTimeout(350); targets.folded = await xy(q, 'folded')
  await q.waitForTimeout(100); await tap(q, 'folded', true); await q.waitForTimeout(400)
  views.open = await fit(q); targets.slip = await xy(q, 'slip'); targets.rack = await xy(q, 'rack')
  await q.screenshot({ path: `${ROOT}/shots/fit-${name}-open.png` })
  const s2 = await drawAt(q, 0.7, false, 0.03, true); await q.waitForTimeout(350)
  views.bad = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-bad.png` })
  await q.evaluate(() => { km.raw().pend = 'ex2' }); await tap(q, 'box', true); await q.waitForTimeout(500)
  targets.ex = await xy(q, 'ex'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-ex.png` })
  for (let i = 0; i < 9; i++) { await tap(q, 'ex', true); await q.waitForTimeout(60) }
  await q.evaluate(() => { km.raw().pend = 'crow2' }); await tap(q, 'box', true); await q.waitForTimeout(600)
  targets.crow = await xy(q, 'crow'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-crow.png` })
  await q.evaluate(() => { km.fast(true); km.setTime(44.8) }); await q.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 }); await q.waitForTimeout(600)
  views.end = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-end.png` })
  await q.evaluate(() => document.querySelector('#bBook2').click()); await q.waitForTimeout(100); views.book = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-book.png` })
  await q.evaluate(() => { document.querySelector('#book').hidden = true; document.querySelector('#how').hidden = false }); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: 押す物が全部画面内で指で押せる大きさ`, async () => {
    const bad = Object.entries(targets).filter(([k, r]) => !(r.left >= -1 && r.right <= w + 1 && r.top >= 0 && r.bottom <= h + 1 && r.w >= 40 && r.h >= 40)).map(([k, r]) => k + JSON.stringify([Math.round(r.left), Math.round(r.top), Math.round(r.w), Math.round(r.h)]))
    expect(!bad.length && s2.cur && s2.cur.r === 'dkyo', bad.join(' ') + JSON.stringify(s2.cur)); return Object.keys(targets).length
  })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: タッチで振って抜いて開ける', async () => {
  await tap(wp, 'start', true); await wp.waitForTimeout(150)
  const s = await drawAt(wp, 1, false, 0.5, true)
  expect(s.draws === 1 && s.cur.r === 'dk', JSON.stringify(s)); return { draws: s.draws }
})
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: 実際には無音', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), shake: window.__sfxCalls.shake })); expect(r.ok && r.shake >= 5, JSON.stringify(r)); return r
})
await t('WebKit: 結果まで通してエラーなし', async () => {
  await wp.evaluate(() => { km.fast(true); km.setTime(44.8) }); await wp.waitForFunction(() => window.__kmEnded, null, { timeout: 8000 })
  await wp.screenshot({ path: `${ROOT}/shots/v-webkit-end.png` })
  expect(wp.errs.length === 0, wp.errs.join('|'))
})
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
