import './mute-auto.mjs'
// 恋みくじ v2 の検証。node verify.mjs  （音は出さない: mute-auto + muteContext）
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
const NAME = 'しずく'
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, { init } = {}) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, acceptDownloads: true, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('k')) { localStorage.clear(); sessionStorage.setItem('k', 1) } } catch (e) {} })
  if (init) await ctx.addInitScript(init)
  const p = await ctx.newPage(); p.errs = []; p.reqs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  p.on('request', r => p.reqs.push(decodeURIComponent(r.url()) + ' ' + (r.postData() || '')))
  await p.goto(URL0); await p.waitForFunction(() => window.__kmReady, null, { timeout: 15000 }); await p.waitForTimeout(450)
  return p
}
const xy = (p, n) => p.evaluate(n => km.xy(n), n)
async function tap(p, n, touch) { const r = await xy(p, n); if (touch) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); return r }
// 名前と状況を入れて儀式へ
async function ask(p, sit = 'kata', name = NAME, touch) {
  await tap(p, 'start', touch); await p.waitForTimeout(350)
  if (name) { await tap(p, '#name', touch); await p.keyboard.type(name) }
  await tap(p, `.sit[data-s="${sit}"]`, touch); await tap(p, 'go', touch); await p.waitForTimeout(250)
}
// 振って（間隔 gap）、光を決めて引き、紙を開く
async function draw(p, { gap = 600, amp = 1, phase = 0.5, touch } = {}) {
  for (let i = 0; i < 12 && !(await p.evaluate(() => km.ritual().stick)); i++) { await tap(p, 'box', touch); await p.waitForTimeout(gap) }
  await p.waitForTimeout(300)
  await p.evaluate(([a, ph]) => km.holdGlow(a, ph), [amp, phase])
  await tap(p, 'stick', touch); await p.waitForTimeout(450)
  await tap(p, 'folded', touch); await p.waitForTimeout(900)
  return p.evaluate(() => ({ slip: km.slip(), pull: km.pull(), day: km.day(), font: km.fit() }))
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, .ovl:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#leaves') || el.closest('#counter') || el.closest('#priest') || el.id === 'card') continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className.baseVal || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) a,main:not([hidden]) input,.ovl:not([hidden]) button,#slip')) { if (!el.offsetParent || el.hidden) continue; const r = el.getBoundingClientRect(); if (!r.height) continue; if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})
// 紙の文字が紙の外にはみ出していない
const slipInside = q => q.evaluate(() => {
  const el = document.querySelector('#slip'), R0 = el.getBoundingClientRect(), bad = []
  for (const x of el.querySelectorAll('p,b,span,div')) { const r = x.getBoundingClientRect(); if (!r.width) continue; if (x.matches('p,.sName,.sSo') && (x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2)) bad.push('scroll:' + (x.className || x.tagName)); if (r.left < R0.left - 0.5 || r.right > R0.right + 0.5 || r.top < R0.top - 0.5 || r.bottom > R0.bottom + 0.5) bad.push(x.className || x.tagName) }
  for (const box of el.querySelectorAll('.top,.bot')) { const B = box.getBoundingClientRect(); for (const x of box.querySelectorAll('p,b,span,div')) { const r = x.getBoundingClientRect(); if (r.width && (r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5 || r.left < B.left - 0.5)) bad.push('box:' + (x.className || x.tagName)) } }
  return bad
})

await t('禁止語が無い（当たる/必ず/今だけ/AI/画像生成）', async () => {
  const hits = []
  for (const f of ['index.html', 'data.js', 'game.js', 'config.js', 'privacy.html']) { const s = readFileSync(ROOT + '/' + f, 'utf8'); for (const w of ['当たる', '必ず', '今だけ', '画像生成', 'ＡＩ']) if (s.includes(w)) hits.push(f + ':' + w); if (/(^|[^A-Za-z_])AI([^A-Za-z_]|$)/.test(s.replace(/AudioContext|AFF_URL|aria-label/g, ''))) hits.push(f + ':AI') }
  expect(!hits.length, hits.join(',')); return true
})
await t('シミュレーション: 丁寧に振ると上がり、急ぐと下がる。同じ条件なら同じ紙。文が続かない', async () => {
  const o = JSON.parse(execFileSync(process.execPath, ['sim.mjs', '--json'], { cwd: ROOT }).toString().trim().split('\n').pop())
  expect(o.careful.up > 0.8 && o.rush.down > 0.9 && o.random.up < o.careful.up && o.random.down > o.careful.down, JSON.stringify(o))
  expect(o.repeatable && o.repeatsIn40 <= 2, 'repeat'); return { careful: o.careful, random: o.random, rush: o.rush, rankPct: o.rankPct, repeatsIn40: o.repeatsIn40 }
})

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, fs: parseFloat(getComputedStyle(document.querySelector('#name')).fontSize) }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.fs >= 16, JSON.stringify(r)); return true
})
await t('OGP 一式・og.png・転送と canonical が残っている', async () => {
  const r = await p.evaluate(() => ({ og: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => document.querySelector(`meta[property="${k}"]`)?.content || ''), tw: document.querySelector('meta[name="twitter:card"]')?.content, mv: !!document.querySelector('#ghMove'), can: document.querySelector('link[rel=canonical]')?.href }))
  expect(r.og.every(Boolean) && r.og[2] === 'https://tom3games.com/play/koi-mikuji/og.png' && r.tw && r.mv && r.can === 'https://tom3games.com/play/koi-mikuji/', JSON.stringify(r))
  const res = await p.request.get(URL0 + 'og.png'); const b = await res.body(); expect(res.status() === 200 && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, 'og.png'); return true
})
await t('タイトルに PR は出ない', async () => { expect(await p.evaluate(() => document.querySelector('#affBox').hidden || document.querySelector('#vEnd').hidden), 'shown') })
await t('状況を選ぶまで「箱を振る」は押せない', async () => {
  await tap(p, 'start'); await p.waitForTimeout(350)
  const d0 = await p.evaluate(() => document.querySelector('#bGo').disabled)
  await tap(p, '#name'); await p.keyboard.type(NAME); await tap(p, '.sit[data-s="kata"]')
  const d1 = await p.evaluate(() => document.querySelector('#bGo').disabled)
  expect(d0 && !d1, JSON.stringify([d0, d1])); await tap(p, 'go'); await p.waitForTimeout(250); return true
})
await t('何もしないと何も出ない（箱を振らないと棒は出ない）', async () => {
  await p.waitForTimeout(2500); const r = await p.evaluate(() => ({ r: km.ritual(), slip: km.slip(), n: km.day().n, pr: !document.querySelector('#vEnd').hidden }))
  expect(!r.r.stick && !r.slip && r.n === 0 && !r.pr, JSON.stringify(r)); return true
})
let first
await t('ゆっくり三度振り、光が満ちた時に引くと運が一段上がる（本物のクリック）', async () => {
  const seen = []
  for (let i = 0; i < 3; i++) { await tap(p, 'box'); seen.push((await p.evaluate(() => km.ritual().taps))); await p.waitForTimeout(600) }
  expect(JSON.stringify(seen) === '[1,2,3]', JSON.stringify(seen))
  expect(await p.evaluate(() => document.querySelector('#stick').classList.contains('out')), 'stick')
  const gs = []; for (let i = 0; i < 5; i++) { gs.push(await p.evaluate(() => +getComputedStyle(document.querySelector('#stick')).getPropertyValue('--g'))); await p.waitForTimeout(120) }
  expect(Math.max(...gs) - Math.min(...gs) > 0.1, 'glow static ' + gs)
  await p.evaluate(() => km.holdGlow(1, 0.5)); await tap(p, 'stick'); await p.waitForTimeout(450)
  expect(await p.evaluate(() => !document.querySelector('#folded').hidden), 'folded')
  await tap(p, 'folded'); await p.waitForTimeout(900)
  first = await p.evaluate(() => ({ slip: km.slip(), pull: km.pull(), note: document.querySelector('#ritualNote').textContent, txt: document.querySelector('#slip').innerText }))
  expect(first.pull.shift === 1 && first.slip.idx === Math.max(0, first.slip.base - 1) && /一段上がった/.test(first.note), JSON.stringify(first.pull) + first.note)
  return { rank: first.slip.rank, base: first.slip.base, idx: first.slip.idx }
})
await t('紙は本物の形: 番号・運勢・一句・総評・片思いの項目5つ・名前', async () => {
  const s = first.slip, txt = first.txt.replace(/\s/g, '')
  const labels = ['相手の心', '告白', '待ち人', '願望', '縁の場所']
  expect(labels.every(l => txt.includes(l)) && txt.includes('総評') && txt.includes(NAME + 'さん') && txt.includes('番') && txt.includes(s.waka[0].replace(/\s/g, '').slice(0, 4)), txt.slice(0, 120))
  expect(!(await slipInside(p)).length, 'slip overflow'); return { font: await p.evaluate(() => km.fit()) }
})
await t('名前はどこにも残さず、送らない', async () => {
  const st = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k) } return JSON.stringify(o) })
  expect(!st.includes(NAME), 'in localStorage'); expect(!p.reqs.some(r => r.includes(NAME)), 'in request'); return true
})
await t('結果画面だけに PR。href・rel・target・PR表記・17歳以上', async () => {
  const r = await p.evaluate(() => { const a = document.querySelector('#bAff'), pr = a.querySelector('.pr'); return { hidden: document.querySelector('#affBox').hidden, href: a.getAttribute('href'), rel: a.rel, target: a.target, pr: pr.textContent, prSize: parseFloat(getComputedStyle(pr).fontSize), txtSize: parseFloat(getComputedStyle(document.querySelector('#affTxt')).fontSize), txt: a.textContent, note: document.querySelector('#affNote').textContent, vis: a.getBoundingClientRect().bottom <= innerHeight } })
  expect(!r.hidden && r.href === AFF && /sponsored/.test(r.rel) && /noopener/.test(r.rel) && r.target === '_blank' && r.pr === 'PR' && r.prSize >= r.txtSize - 1 && r.note === '17歳以上' && r.vis, JSON.stringify(r)); return r.txt
})
await t('結び処に結ぶと「結」の印がつき、もう押せない', async () => {
  await tap(p, 'tie'); await p.waitForTimeout(1000)
  const r = await p.evaluate(() => ({ tied: km.slip().tied, knot: !document.querySelector('#knot').hidden, dis: document.querySelector('#bTie').disabled, stamp: document.querySelector('#slip .stamp')?.textContent }))
  expect(r.tied && r.knot && r.dis && r.stamp === '結', JSON.stringify(r)); return true
})
await t('画像で持ち帰る: 縦書きの紙が描けてダウンロードされる', async () => {
  const dl = p.waitForEvent('download', { timeout: 8000 }); await tap(p, '#bSave'); const d = await dl
  const v = await p.evaluate(() => { const c = document.querySelector('#card'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let red = 0, dark = 0; for (let i = 0; i < d.length; i += 4 * 29) { if (d[i] > 170 && d[i + 1] < 90) red++; if (d[i] < 70 && d[i + 1] < 60) dark++ } return { red, dark } })
  expect(d.suggestedFilename() === 'koi-mikuji.png' && v.red > 500 && v.dark > 500, JSON.stringify(v)); return v
})
await t('急いで振ると神主さんに止められ、運が一段下がる', async () => {
  expect(await p.evaluate(() => !document.querySelector('#bAgain').disabled), 'again disabled')
  await tap(p, 'again'); await p.waitForTimeout(300)
  const r0 = await xy(p, 'box'); for (let i = 0; i < 4; i++) { await p.mouse.click(r0.x, r0.y); await p.waitForTimeout(40) }
  const r = await p.evaluate(() => ({ slow: km.ritual().slow, pr: document.querySelector('#priest').classList.contains('out'), bub: document.querySelector('#bubble').textContent }))
  expect(r.slow >= 1 && r.pr && r.bub.length > 0, JSON.stringify(r))
  const s = await draw(p, { gap: 40, amp: 0.6, phase: 0.04 })
  expect(s.pull.shift === -1 && s.slip.idx === Math.min(5, s.slip.base + 1) && s.day.n === 2, JSON.stringify(s.pull) + JSON.stringify(s.day))
  expect(/一段下がった/.test(await p.evaluate(() => document.querySelector('#ritualNote').textContent)), 'note'); return { slow: r.slow, bubble: r.bub }
})
await t('一日二回まで: 「また明日」。どうしても引くと神主さんに見られて「欲」', async () => {
  const r0 = await p.evaluate(() => ({ dis: document.querySelector('#bAgain').disabled, txt: document.querySelector('#bAgain').textContent, g: !document.querySelector('#bGreed').hidden }))
  expect(r0.dis && r0.txt === 'また明日' && r0.g, JSON.stringify(r0))
  await tap(p, '#bGreed'); await p.waitForTimeout(400)
  expect(await p.evaluate(() => document.querySelector('#priest').classList.contains('out')), 'priest')
  const s = await draw(p)
  const st = await p.evaluate(() => ({ stamp: document.querySelector('#slip .stamp')?.textContent, note: document.querySelector('#ritualNote').textContent }))
  expect(s.slip.greed && st.stamp === '欲' && /三度目/.test(st.note), JSON.stringify(st)); return true
})
await t('音を鳴らす操作をしても実際には無音（Chromium）', async () => {
  const r = await p.evaluate(() => ({ ok: window.__muteOk(), sfx: window.__sfxCalls })); expect(r.ok && r.sfx.shake >= 6 && r.sfx.open >= 3, JSON.stringify(r)); return { shake: r.sfx.shake }
})
await t('記録は読み直しても残る（今日の回数・引いた運勢）', async () => {
  await p.reload(); await p.waitForFunction(() => window.__kmReady); await p.waitForTimeout(400)
  const r = await p.evaluate(() => ({ n: km.day().n, book: km.book(), today: document.querySelector('#tToday').textContent }))
  expect(r.n === 3 && r.book.length >= 1 && r.today === '今日はあと0回', JSON.stringify(r))
  await tap(p, '#bBook'); await p.waitForTimeout(150)
  const on = await p.evaluate(() => document.querySelectorAll('#grid .c.on').length); expect(on === r.book.length, 'grid ' + on)
  await p.evaluate(() => document.querySelector('#bookClose').click()); return { n: r.n, book: r.book.length }
})
await t('英語: 紙は横書きで収まる', async () => {
  await tap(p, '#bLang'); await p.evaluate(() => { const v = { d: km.day().d, n: 0 }; localStorage.setItem('km2_day', JSON.stringify(v)) })
  await ask(p, 'deai', '')
  const s = await draw(p)
  const r = await p.evaluate(() => ({ wm: getComputedStyle(document.querySelector('#slip .top')).writingMode, txt: document.querySelector('#slip').innerText, pr: document.querySelector('#affTxt').textContent }))
  expect(r.wm === 'horizontal-tb' && /Meeting/.test(r.txt) && /Overall/.test(r.txt) && !(await slipInside(p)).length && /fortune teller/.test(r.pr), JSON.stringify(r).slice(0, 200))
  await p.screenshot({ path: `${ROOT}/shots/v-en-end.png` }); await p.evaluate(() => km.setLang('ja')); return { font: s.font }
})
await p.close()

await t('AFF_URL が空なら PR は隠れる', async () => {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } }); await muteContext(ctx)
  await ctx.route('**/config.js*', r => r.fulfill({ contentType: 'text/javascript', body: "window.AFF_URL = ''" }))
  const q = await ctx.newPage(); await q.goto(URL0); await q.waitForFunction(() => window.__kmReady); await q.waitForTimeout(450)
  await ask(q, 'tsuki', ''); await draw(q)
  const r = await q.evaluate(() => ({ end: !document.querySelector('#vEnd').hidden, hidden: document.querySelector('#affBox').hidden, href: document.querySelector('#bAff').getAttribute('href') }))
  expect(r.end && r.hidden && !r.href, JSON.stringify(r)); await ctx.close(); return r
})
await t('localStorage が投げても遊べて、二回の上限も効く', async () => {
  const q = await open(browser, {}, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } }) } })
  await ask(q, 'fuku', ''); await draw(q); await tap(q, 'again'); await q.waitForTimeout(300); const s = await draw(q)
  const dis = await q.evaluate(() => document.querySelector('#bAgain').disabled)
  const errs = q.errs.filter(e => !/blocked/.test(e)); expect(s.day.n === 2 && dis && !errs.length, JSON.stringify(s.day) + errs.join('|')); await q.close(); return true
})

// ---- 3サイズ × 全画面
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]
const SITS = ['futa', 'kekkon', 'fuku']
for (const [i, [w, h, name]] of SIZES.entries()) {
  const q = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const views = {}, targets = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await tap(q, 'start', true); await q.waitForTimeout(350); await tap(q, '#name', true); await q.keyboard.type('みさき'); await tap(q, `.sit[data-s="${SITS[i]}"]`, true)
  views.ask = await fit(q); targets.go = await xy(q, 'go'); targets.sit = await xy(q, `.sit[data-s="kekkon"]`); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-ask.png` })
  await tap(q, 'go', true); await q.waitForTimeout(250); views.play = await fit(q); targets.box = await xy(q, 'box'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  for (let k = 0; k < 3; k++) { await tap(q, 'box', true); await q.waitForTimeout(600) }
  await q.waitForTimeout(300); await q.evaluate(() => km.holdGlow(0.95, 0.5)); targets.stick = await xy(q, 'stick'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-stick.png` })
  await tap(q, 'stick', true); await q.waitForTimeout(500); targets.folded = await xy(q, 'folded'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-folded.png` })
  await tap(q, 'folded', true); await q.waitForTimeout(900)
  views.end = await fit(q); targets.again = await xy(q, 'again'); targets.tie = await xy(q, 'tie'); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-end.png` })
  const inside = await slipInside(q), font = await q.evaluate(() => km.fit())
  await q.evaluate(() => document.querySelector('#bBook') && (document.querySelector('#book').hidden = false)); await q.evaluate(() => { document.querySelector('#book').hidden = true });
  await q.evaluate(() => { document.querySelector('#vEnd').hidden = true; document.querySelector('#vTitle').hidden = false }); await tap(q, '#bBook', true); await q.waitForTimeout(100); views.book = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-book.png` })
  await q.evaluate(() => { document.querySelector('#book').hidden = true; document.querySelector('#how').hidden = false }); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: 紙の文字が紙の中に収まり、読める大きさ`, async () => { expect(!inside.length && font >= 12, JSON.stringify(inside) + ' font ' + font); return { font } })
  await t(`${name}: 押す物が全部画面内で指で押せる大きさ`, async () => {
    const bad = Object.entries(targets).filter(([k, r]) => !(r.left >= -1 && r.right <= w + 1 && r.top >= 0 && r.bottom <= h + 1 && r.w >= 40 && r.h >= 40)).map(([k, r]) => k + JSON.stringify([Math.round(r.left), Math.round(r.top), Math.round(r.w), Math.round(r.h)]))
    expect(!bad.length, bad.join(' ')); return Object.keys(targets).length
  })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: タッチで名前・状況・振る・引く・開く', async () => {
  await ask(wp, 'kata', '', true); const s = await draw(wp, { touch: true })
  expect(s.slip && s.day.n === 1 && !(await slipInside(wp)).length, JSON.stringify(s.day)); await wp.screenshot({ path: `${ROOT}/shots/v-webkit-end.png` }); return { rank: s.slip.rank, font: s.font }
})
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: 実際には無音', async () => { const r = await wp.evaluate(() => ({ ok: window.__muteOk(), shake: window.__sfxCalls.shake })); expect(r.ok && r.shake >= 3, JSON.stringify(r)); return r })
await awayTest(wp, { fb: 'snd/bgm.mp3' })
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await awayNavTest(wp)
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

// ---- ページを離れたら音を止める（WebKit。裏に回る→戻る（bfcache の pageshow）で鳴らない、触ると戻る（resume を呼ぶ）。音は出さない。mute.mjs が resume を数えるだけにしているので state は見ない）
async function awayTest(pg, o = {}) {
  await t('WebKit: 裏に回ると BGM と環境音が止まり suspend。戻っても触るまで鳴らない（bfcache の pageshow でも）', async () => {
    const r = await pg.evaluate(async (fb) => {
      const sl = ms => new Promise(r => setTimeout(r, ms))
      if (!Snd.ctx) Snd.init()
      await sl(900); let fbUsed = false
      if (!Snd.playing().length && fb) { fbUsed = true; Snd.loop('__bed', fb, 0.2); for (let i = 0; i < 40 && !Snd.playing().length; i++) await sl(100) }
      const before = Snd.playing().length
      const c = Snd.ctx; let sus = 0; const os = c.suspend.bind(c); c.suspend = () => { sus++; return os() }
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))
      const hid = { away: Snd.away, playing: Snd.playing().length, sus, gain: Snd.master.gain.value }
      const nm = Object.keys(Snd.files)[0], src = nm ? Snd.play(nm) : null; Snd.loop('__q', fb || Object.values(Snd.files)[0][0], 0.2)   // 裏にいる間の音は鳴らさない
      await sl(400); const quiet = Snd.playing().length
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      await sl(400); const back = { away: Snd.away, playing: Snd.playing().length, gain: Snd.master.gain.value }
      Snd.loop('__q', null)
      return { before, fbUsed, hid, src: !!src, quiet, back, calls0: window.__soundCalls || 0 }
    }, o.fb || null)
    const xy = o.tap ? await pg.evaluate(o.tap) : await pg.evaluate(() => ({ x: 8, y: innerHeight * 0.5 }))
    await pg.touchscreen.tap(xy.x, xy.y); await pg.waitForTimeout(800)
    const after = await pg.evaluate(() => ({ away: Snd.away, playing: Snd.playing().length, wake: Snd.life.wake, calls: window.__soundCalls || 0, mute: window.__muteOk() }))
    if (r.fbUsed) await pg.evaluate(() => Snd.loop('__bed', null))
    expect(r.before >= 1 && r.hid.away && r.hid.playing === 0 && r.hid.sus === 1 && r.hid.gain === 0 && !r.src && r.quiet === 0 && r.back.away && r.back.playing === 0 && r.back.gain === 0 && !after.away && after.playing >= r.before && after.wake === 1 && after.calls > r.calls0 && after.mute, JSON.stringify({ r, after }))
    return { before: r.before, after: after.playing, fb: r.fbUsed }
  })
}
async function awayNavTest(pg, o = {}) {
  await t('WebKit: 別のページへ移る（pagehide）と止まり、戻るで戻っても鳴っていない', async () => {
    await pg.evaluate(() => { if (!Snd.ctx) Snd.init(); addEventListener('pagehide', () => { try { sessionStorage.setItem('__awayHide', JSON.stringify({ away: Snd.away, playing: Snd.playing().length, hide: Snd.life.hide })) } catch (e) {} }) })
    const e0 = pg.errs.length
    await pg.goto(o.to || URL0 + 'privacy.html'); await pg.waitForTimeout(300)
    await pg.goBack({ waitUntil: 'commit' }).catch(() => {}); await pg.waitForFunction(() => document.readyState === 'complete' && typeof Snd === 'object', null, { timeout: 15000 }); await pg.waitForTimeout(1000)
    const back = await pg.evaluate(() => ({ playing: Snd.playing().length, ctx: !!Snd.ctx, away: Snd.away, h: JSON.parse(sessionStorage.getItem('__awayHide') || '{}') }))
    expect(back.h.away && back.h.playing === 0 && back.playing === 0 && pg.errs.length === e0, JSON.stringify(back) + pg.errs.slice(e0).join('|')); return back
  })
}
