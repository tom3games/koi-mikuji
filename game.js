// 恋みくじ連打: 画面・音・入力。中身の計算は logic.js（KM）
;(function () {
  window.__jsUp = true
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
  let lang = store.get('km_lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
  const U = () => D.UI[lang], tx = o => (o ? (o[lang] ?? o.ja) : '')
  const touch = matchMedia('(pointer:coarse)').matches
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const tcy = t => t.replace(/(\d{1,2})/g, '<span class="tcy">$1</span>')
  const KAN = '〇一二三四五六七八九'
  const kanji = n => n >= 100 ? '百' : (n >= 20 ? KAN[Math.floor(n / 10)] : '') + (n >= 10 ? '十' : '') + (n % 10 ? KAN[n % 10] : '')
  const slipLine = s => lang === 'ja' ? `${tx(D.C[s.c])}、${s.t.ja}` : `${tx(D.C[s.c])}: ${s.t.en}`

  // ---- 音（全部録音素材。出所は CREDITS.md）
  Snd.muted = store.get('km_mute') === '1'
  Snd.def({
    shake: ['snd/shake1.mp3', 'snd/shake2.mp3', 'snd/shake3.mp3'], pop: ['snd/pop1.mp3', 'snd/pop2.mp3', 'snd/pop3.mp3'], pull: ['snd/pull1.mp3', 'snd/pull2.mp3'],
    slip: ['snd/slip1.mp3', 'snd/slip2.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3', 'snd/paper3.mp3', 'snd/paper4.mp3'], bell: ['snd/bell1.mp3', 'snd/bell2.mp3', 'snd/bell3.mp3'],
    bellrare: 'snd/bellrare.mp3', bellend: 'snd/bellend.mp3', bad: ['snd/bad1.mp3', 'snd/bad2.mp3'], tie: ['snd/tie1.mp3', 'snd/tie2.mp3', 'snd/tie3.mp3'], jam: 'snd/jam.mp3',
    clap: ['snd/clap1.mp3', 'snd/clap2.mp3'], crow: ['snd/crow1.mp3', 'snd/crow2.mp3'], flap: 'snd/flap.mp3', step: ['snd/step1.mp3', 'snd/step2.mp3', 'snd/step3.mp3'],
    push: 'snd/push.mp3', jgood: 'snd/jgood.mp3', jmeh: 'snd/jmeh.mp3', click: 'snd/click.mp3',
  })
  const CUE = {
    shake: [['shake', { vol: 0.75 }]], rattle: [['shake', { vol: 0.4, rate: 1.25 }]], jam: [['jam', { vol: 1 }], ['clap', { vol: 0.9, delay: 0.28 }], ['clap', { vol: 0.8, delay: 0.42 }]],
    locked: [['pop', { vol: 0.3, rate: 0.7 }]], pop: [['pop', { vol: 0.85 }]], retract: [['pop', { vol: 0.4, rate: 0.8 }]], pull: [['pull', { vol: 0.9 }], ['slip', { vol: 0.6, delay: 0.12 }]],
    open: [['paper', { vol: 0.85 }]], dk: [['bell', { vol: 0.75, delay: 0.08 }]], ki: [['bell', { vol: 0.45, delay: 0.08, rate: 1.1 }]], rare: [['bellrare', { vol: 0.85, delay: 0.1 }]],
    bad: [['bad', { vol: 0.7, delay: 0.05 }]], tie: [['tie', { vol: 0.8 }]], tied: [['tie', { vol: 0.7 }], ['bell', { vol: 0.25, rate: 1.35, delay: 0.1 }]],
    crowIn: [['crow', { vol: 0.9 }], ['flap', { vol: 0.6 }]], exIn: [['step', { vol: 0.7 }], ['step', { vol: 0.6, delay: 0.16 }], ['step', { vol: 0.6, delay: 0.32 }]],
    push: [['push', { vol: 0.75 }]], exGone: [['step', { vol: 0.6 }], ['step', { vol: 0.5, delay: 0.18 }]], shoo: [['flap', { vol: 0.55, rate: 1.2 }]],
    crowGone: [['crow', { vol: 0.75 }], ['flap', { vol: 0.5 }]], stolen: [['flap', { vol: 0.75 }], ['crow', { vol: 0.95, delay: 0.15 }]],
    end: [['bellend', { vol: 1 }]], good: [['jgood', { vol: 0.8 }]], meh: [['jmeh', { vol: 0.8 }]], click: [['click', { vol: 0.5, jitter: 0 }]],
  }
  window.__sfxCalls = {}
  const Sfx = n => { window.__sfxCalls[n] = (window.__sfxCalls[n] || 0) + 1; for (const [k, o] of CUE[n] || []) Snd.play(k, o) }
  function bed(mode) {
    Snd.loop('amb', 'snd/amb_birds.mp3', mode === 'play' ? 0.16 : 0.2)
    Snd.loop('crows', 'snd/amb_crows.mp3', 0.06)
    Snd.loop('bgm', 'snd/bgm.mp3', mode === 'play' ? 0.12 : 0.08)
  }
  const muteIcon = () => { $('#icoWave').style.display = Snd.muted ? 'none' : '' }
  const unlock = () => { Snd.init(); if (!Snd.__bed) { Snd.__bed = 1; bed('title') } }

  // ---- 状態
  let S = null, run = false, paused = false, acc = 0, lastT = 0, seedNext = null, ending = false
  const book = new Set((store.get('km_book') || '').split(',').filter(id => D.SLIPS.some(s => s.id === id)))
  let best = Number(store.get('km_best')) || 0, played = Number(store.get('km_played')) || 0
  const taught = { tie: store.get('km_t_tie') === '1', gold: store.get('km_t_gold') === '1' }
  let tutOn = false
  const show = id => { for (const v of $$('main.view')) v.hidden = v.id !== id }

  // ---- 背景の落ち葉
  $('#leaves').innerHTML = Array.from({ length: 7 }, (_, i) => `<i style="left:${8 + i * 14 + Math.random() * 8}%;animation-duration:${10 + Math.random() * 7}s;animation-delay:${-Math.random() * 14}s;transform:scale(${0.7 + Math.random() * 0.6})"></i>`).join('')

  // ---- 結び処: ほかの人が結んだくじ（飾り）
  function rackDecor() {
    const r = $('#rack'); for (const k of $$('#rack .knot')) k.remove()
    const ropes = [26, 46, 66]; let html = ''
    for (let i = 0; i < 13; i++) html += `<span class="knot old" style="top:${ropes[i % 3]}%;left:${16 + ((i * 37) % 70)}%;--r:${(i * 23) % 30 - 15}deg"></span>`
    r.insertAdjacentHTML('afterbegin', html)
  }
  let myKnots = 0
  function addKnot() { const ropes = [26, 46, 66], i = myKnots++; $('#rack').insertAdjacentHTML('afterbegin', `<span class="knot mine" style="top:${ropes[i % 3]}%;left:${22 + ((i * 29 + 11) % 60)}%;--r:${(i * 17) % 24 - 12}deg"></span>`) }

  // ---- 赤い糸（縁の目盛り）
  const MAXP = D.LV[D.LV.length - 1].min
  function buildThread() {
    const knots = D.LV.slice(1).map((l, i) => { const x = 14 + (l.min / MAXP) * 372; return `<g class="kn" data-i="${i + 1}"><circle cx="${x}" cy="15" r="5" fill="none" stroke="rgba(255,230,210,.35)" stroke-width="2"/></g>` }).join('')
    $('#threadSvg').innerHTML = `<path d="M6 15 C60 5 110 25 160 15 S260 5 310 15 S370 22 394 15" fill="none" stroke="rgba(255,230,210,.25)" stroke-width="2" stroke-dasharray="3 4"/>
      <path id="thFill" d="M6 15 C60 5 110 25 160 15 S260 5 310 15 S370 22 394 15" fill="none" stroke="#d8382a" stroke-width="3.2" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>${knots}`
  }
  let shownLv = 0
  function renderThread() {
    const p = Math.max(0, S.pts), f = Math.min(1, p / MAXP)
    $('#thFill').setAttribute('stroke-dasharray', `${(f * 100).toFixed(1)} 100`)
    const lv = KM.level(D, S).i
    for (const g of $$('#threadSvg .kn')) { const on = +g.dataset.i <= lv, c = g.firstElementChild; c.setAttribute('fill', on ? '#d8382a' : 'none'); c.setAttribute('stroke', on ? '#ffd8c8' : 'rgba(255,230,210,.35)') }
    if (lv > shownLv && lv > 0) { const el = $('#lvFlash'); el.textContent = tx(D.LV[lv]); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1600) }
    shownLv = Math.max(shownLv, lv)
  }

  // ---- 吹き出し（同時に1つだけ）
  let bubT = 0
  function say(text, el, ms) {
    const b = $('#bubble'); b.textContent = text; b.classList.add('on')
    const r = el.getBoundingClientRect(), W = innerWidth
    b.style.left = '0px'; b.style.top = '0px'
    const bw = b.offsetWidth, bh = b.offsetHeight
    let x = r.left + r.width / 2 - bw / 2; x = Math.max(8, Math.min(W - bw - 8, x))
    b.style.left = x + 'px'; b.style.top = Math.max(60, r.top - bh - 4) + 'px'
    clearTimeout(bubT); bubT = setTimeout(() => b.classList.remove('on'), ms || (900 + 90 * [...text].length))
    $('#hint').hidden = true
  }
  const bubbleOn = () => $('#bubble').classList.contains('on')
  const pickLine = (k, i) => { const a = D.LINES[k][lang]; return a[i == null ? Math.floor(Math.random() * a.length) : i % a.length] }

  // ---- 棒
  function stickSvg(no) {
    const ch = [...kanji(no)]
    $('#stickSvg').innerHTML = `<rect x="4" y="0" width="16" height="122" rx="3" fill="#ecd5a6" stroke="#8a6236" stroke-width="1.5"/><path d="M8 4 V100 M15 6 V98" stroke="#b9925e" stroke-opacity=".35"/><rect x="4" y="104" width="16" height="18" rx="2" fill="#c4402a"/>` +
      ch.map((c, i) => `<text x="12" y="${48 + i * 17}" font-size="14" text-anchor="middle" font-family="Shippori Mincho B1, serif" font-weight="800" fill="#2b1d16">${c}</text>`).join('')
  }

  // ---- くじ
  function renderSlip(f) {
    const el = $('#slip'), u = U(), r = D.R[f.r], bad = KM.isBad(f.r)
    el.className = (lang === 'en' ? 'en ' : '') + (bad ? 'bad' : '')
    const no = lang === 'ja' ? `第${kanji(f.no)}番` : `No. ${f.no}`
    const txt = lang === 'ja' ? tcy(esc(f.slip.t.ja)) : esc(f.slip.t.en)
    el.innerHTML = `<div class="sHead"><span class="sNo">${no}</span><b class="sRank">${tx(r)}</b></div><div class="sBody"><span class="sCat" style="display:block">${tx(D.C[f.slip.c])}</span><p class="sText">${txt}</p></div>` +
      (f.slip.rare ? `<span class="stamp gold">${u.rare}</span>` : f.fresh ? `<span class="stamp">${lang === 'ja' ? '初' : 'New'}</span>` : '')
    el.hidden = false; $('#slipEmpty').hidden = true
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in')
  }

  // ---- 毎フレームの見た目
  function render() {
    if (!S) return
    const u = U(), left = Math.max(0, Math.ceil(KM.CFG.T - S.t - 1e-6))
    $('#clockNum').textContent = left; $('#clock').classList.toggle('low', left <= 10)
    $('#emaNum').textContent = S.pts
    renderThread()
    const jam = S.jamUntil > 0
    $$('#prog i').forEach((d, i) => d.classList.toggle('on', i < S.prog))
    $('#boxArt').classList.toggle('hot', S.heat > KM.CFG.HEAT_WARN && !jam)
    const pr = $('#priest'); pr.classList.toggle('out', jam || ending); pr.classList.toggle('peek', !jam && !ending && S.heat > KM.CFG.HEAT_WARN)
    $('#jamTag').hidden = !jam
    const st = $('#stick')
    st.classList.toggle('out', !!S.stick)
    if (S.stick) { st.style.setProperty('--g', KM.glow(S).toFixed(3)); st.classList.toggle('gold', S.cyc.gold) } else st.style.setProperty('--g', 0)
    $('#folded').hidden = !S.folded
    const cr = $('#crow'); if (!cr.classList.contains('steal') && !cr.classList.contains('leave')) { cr.hidden = !S.crow; if (S.crow) cr.classList.toggle('two', S.crow.two) }
    const ex = $('#ex'); ex.hidden = !S.ex
    if (S.ex) { ex.classList.toggle('plus', S.ex.plus); ex.classList.toggle('k1', !!S.ex.kind); $('#exTag').textContent = S.ex.plus ? u.exTag[S.ex.kind] + ' / ' + u.newTag : u.exTag[S.ex.kind]; $('#exHp').innerHTML = '<i></i>'.repeat(S.ex.hp) }
    const rk = $('#rack'); rk.classList.toggle('want', !!S.pend)
    const tc = $('#rack .tieCount'); tc.hidden = !S.pend; if (S.pend) [...tc.children].forEach((d, i) => d.classList.toggle('on', i < S.tieN))
    $('#rackSign').textContent = S.pend ? u.tieHere : u.rack
    const cu = $('#curseTag'); cu.hidden = !S.pend; if (S.pend) cu.innerHTML = u.curse[S.pend].split('|').map(esc).join('<br>')
    tut()
  }

  // ---- チュートリアル（指で次の場所を示す。文字は1行）
  function tut() {
    const h = $('#hint'), fg = $('#finger'), u = U()
    let k = null, el = null
    if (S && run && !S.over) {
      if (S.pend && !taught.tie) { k = 'tie'; el = $('#rack') }
      else if (S.stick && S.cyc.gold && !taught.gold) { k = 'gold'; el = $('#stick') }
      else if (tutOn && !S.ex && S.jamUntil < 0) {
        if (S.folded) { k = 'open'; el = $('#folded') }
        else if (S.stick) { k = 'pull'; el = $('#stick') }
        else if (S.draws < 2 && !S.pend) { k = 'shake'; el = $('#boxBtn') }
      }
    }
    if (!k || bubbleOn()) { h.hidden = true; fg.hidden = true; return }
    let t = u.tut[k]; if (k === 'open' && lang === 'ja') t = touch ? '紙をタップして開く' : '紙をクリックして開く'
    if (h.textContent !== t) h.textContent = t
    h.hidden = false
    const r = el.getBoundingClientRect(); fg.hidden = false
    // 張り紙は指している物のすぐ上（入らなければ下）
    const hw = h.offsetWidth, hh = h.offsetHeight
    h.style.left = Math.max(8, Math.min(innerWidth - hw - 8, r.left + r.width / 2 - hw / 2)) + 'px'
    h.style.top = (r.top - hh - 8 > 60 ? r.top - hh - 8 : r.bottom + 8) + 'px'
    fg.style.left = (r.left + r.width * 0.62) + 'px'; fg.style.top = (r.top + r.height * (k === 'shake' ? 0.5 : 0.45)) + 'px'
  }

  // ---- 出来事から音と動きへ
  let shakeSide = 0
  function anim(el, cls, ms) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_' + cls]); el['_' + cls] = setTimeout(() => el.classList.remove(cls), ms) }
  function handle(e) {
    const u = U()
    switch (e.name) {
      case 'shake': case 'rattle': Sfx(e.name); anim($('#boxArt'), (shakeSide++ % 2) ? 'shL' : 'shR', 220); break
      case 'jam': Sfx('jam'); anim($('#boxArt'), 'jam', 520); $('#jamTag').textContent = u.jam; setTimeout(() => say(pickLine('priest'), $('#priest'), 1900), 120); break
      case 'unjam': $('#bubble').classList.remove('on'); break
      case 'locked': Sfx('locked'); anim($('#boxArt'), 'nope', 260); break
      case 'needOpen': anim($('#folded'), 'wait', 360); break
      case 'pop': Sfx('pop'); stickSvg(S.stick.no); break
      case 'retract': Sfx('retract'); break
      case 'pull': Sfx('pull'); break
      case 'stolen': {
        Sfx('stolen'); const cr = $('#crow'); cr.hidden = false; cr.classList.toggle('two', !!e.data.two)
        const a = cr.getBoundingClientRect(), b = $('#slipZone').getBoundingClientRect()
        cr.style.setProperty('--dx', Math.round(a.left - (b.left + b.width / 2 - a.width / 2)) + 'px'); cr.style.setProperty('--dy', Math.round(b.top + b.height / 2 - a.top - a.height / 2) + 'px')
        cr.classList.add('steal'); setTimeout(() => { cr.classList.remove('steal'); cr.hidden = !S || !S.crow }, 720)
        setTimeout(() => say(u.stolen, $('#slipZone'), 1300), 300); break
      }
      case 'open': {
        const f = e.data; renderSlip(f); Sfx('open')
        if (f.slip.rare) Sfx('rare'); else if (f.r === 'dk') Sfx('dk'); else if (f.r === 'ki') Sfx('ki'); else if (KM.isBad(f.r)) Sfx('bad')
        if (D.R[f.r].p) anim($('#ema'), 'up', 520)
        if (tutOn && S.draws >= 3) tutOn = false
        break
      }
      case 'tie': Sfx('tie'); anim($('#slip'), 'tug', 200); break
      case 'tied': Sfx('tied'); addKnot(); { const s = $('#slip'); s.classList.add('gone'); setTimeout(() => { s.hidden = true; s.classList.remove('gone') }, 500) } if (!taught.tie) { taught.tie = true; store.set('km_t_tie', '1') } break
      case 'curse': {
        const s = $('#slip'); s.classList.add('pocket'); setTimeout(() => { s.hidden = true; s.classList.remove('pocket') }, 420)
        if (/crow/.test(e.data)) { Sfx('crowIn'); const cr = $('#crow'); cr.hidden = false; anim(cr, 'in', 480); setTimeout(() => say(pickLine('crow'), cr, 900), 300) }
        else { Sfx('exIn'); const ex = $('#ex'); ex.hidden = false; render(); anim(ex, 'walk', 380); setTimeout(() => say(pickLine(S.ex && S.ex.plus ? 'ex2' : 'ex', 0), ex, 1400), 200) }
        if (e.data === 'ex2' || e.data === 'crow2') anim($('#ema'), 'up', 520)
        if (!taught.tie) { taught.tie = true; store.set('km_t_tie', '1') }
        break
      }
      case 'push': { Sfx('push'); const ex = $('#ex'); anim(ex, 'push', 190); const n = e.data.max - e.data.hp; if (e.data.hp > 0 && n % 2 === 0) say(pickLine(e.data.plus ? 'ex2' : 'ex', n / 2), ex, 1100); break }
      case 'exGone': Sfx('exGone'); $('#bubble').classList.remove('on'); break
      case 'shoo': Sfx('shoo'); anim($('#crow'), 'shoo', 220); break
      case 'crowGone': Sfx('crowGone'); break
      case 'end': endSeq(); break
    }
  }
  function drain() { if (!S) return; const evs = S.ev.splice(0); for (const e of evs) handle(e) }

  // ---- ループ（固定60Hz）
  function frame(now) {
    if (!run) return
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now
    if (!paused) { acc += dt; while (acc >= 1 / 60 && !S.over) { KM.step(S, 1 / 60); acc -= 1 / 60 } }
    drain(); render()
    if (S && S.stick && S.cyc.gold) taughtGold()
    requestAnimationFrame(frame)
  }
  let goldSeen = 0
  function taughtGold() { if (taught.gold) return; goldSeen += 1 / 60; if (goldSeen > 1.4) { taught.gold = true; store.set('km_t_gold', '1') } }

  function act(fn) { return e => { e.preventDefault(); unlock(); if (!S || !run || S.over || ending) return; fn(S); drain(); render() } }
  $('#boxBtn').addEventListener('pointerdown', act(KM.tapBox))
  $('#stick').addEventListener('pointerdown', act(KM.tapStick))
  $('#folded').addEventListener('pointerdown', act(KM.tapSlip))
  $('#rack').addEventListener('pointerdown', act(KM.tapRack))
  $('#ex').addEventListener('pointerdown', act(KM.tapEx))
  $('#crow').addEventListener('pointerdown', act(KM.tapCrow))

  function start() {
    unlock(); bed('play')
    const seed = seedNext != null ? seedNext : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0)
    seedNext = null
    S = KM.create(D, seed, [...book]); window.__kmSeed = seed
    tutOn = played === 0; ending = false; shownLv = 0; myKnots = 0; rackDecor()
    $('#slip').hidden = true; $('#slipEmpty').hidden = false; $('#bubble').classList.remove('on'); $('#crow').className = ''; $('#ex').className = 'char'
    $('#curtain').classList.remove('on'); $('#closeTxt').hidden = true
    show('vPlay'); render()
    window.TM && TM.start()
    run = true; paused = false; acc = 0; lastT = performance.now(); requestAnimationFrame(frame)
  }

  const wait = ms => new Promise(r => setTimeout(r, ms))
  async function endSeq() {
    if (ending) return; ending = true
    Sfx('end'); render()
    $('#curtain').classList.add('on'); const ct = $('#closeTxt'); ct.textContent = D.LINES.end[lang]; ct.hidden = false
    ct.style.writingMode = lang === 'ja' ? 'vertical-rl' : 'horizontal-tb'
    // 記録
    for (const id of S.got) book.add(id)
    store.set('km_book', [...book].join(','))
    played++; store.set('km_played', String(played))
    const isBest = S.pts > best && S.draws > 0; if (isBest) { best = S.pts; store.set('km_best', String(best)) }
    S.isBest = isBest
    window.TM && TM.end(S.pts, S.pts > 0)
    await wait(window.__kmFast ? 50 : 1500)
    run = false
    await drawCard()
    $('#curtain').classList.remove('on'); ct.hidden = true
    show('vEnd'); aff()
    const lv = KM.level(D, S); Sfx(lv.i >= 4 ? 'good' : 'meh')
    window.__kmEnded = (window.__kmEnded || 0) + 1
  }

  // ---- 結果の1枚（おみくじの紙）
  function wrap(x, text, maxW) {
    const out = []; let line = ''
    const toks = lang === 'ja' ? [...text] : text.split(/(\s+)/)
    for (const t of toks) { const test = line + t; if (x.measureText(test).width > maxW && line) { out.push(line.trim()); line = t.trimStart() } else line = test }
    if (line.trim()) out.push(line.trim()); return out
  }
  async function fontsFor(text) {
    try { await Promise.race([Promise.all([document.fonts.load(`80px "Yuji Syuku"`, text), document.fonts.load(`800 40px "Shippori Mincho B1"`, text), document.fonts.load(`600 40px "Shippori Mincho B1"`, text)]), wait(1500)]) } catch (e) {}
  }
  async function drawCard() {
    const c = $('#card'), x = c.getContext('2d'), W = 1080, H = 1350, u = U(), lv = KM.level(D, S)
    const BR = '"Yuji Syuku","Shippori Mincho B1",serif', MI = '"Shippori Mincho B1","Hiragino Mincho ProN",serif'
    const b = S.best, lvName = tx(lv), sub = lang === 'ja' ? lv.sja : lv.sen
    await fontsFor(lvName + sub + (b ? slipLine(b.slip) + tx(D.R[b.r]) : '') + u.title + u.result + u.drew + u.tied + u.cost + u.bestSlip + '0123456789回円大吉第番')
    // 1枚まるごとおみくじの紙
    x.fillStyle = '#f8f2e4'; x.fillRect(0, 0, W, H)
    x.strokeStyle = 'rgba(120,90,50,.05)'; x.lineWidth = 2; for (let i = -H; i < W; i += 9) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H * 0.14, H); x.stroke() }
    x.strokeStyle = '#c4402a'; x.lineWidth = 8; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 2.5; x.strokeRect(58, 58, W - 116, H - 116)
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'
    x.fillStyle = '#c4402a'; x.font = `800 40px ${MI}`; x.fillText(u.title, W / 2, 170)
    x.fillStyle = '#6d5a44'; x.font = `600 30px ${MI}`; x.fillText(u.result, W / 2, 220)
    // 段位
    let fs = 108; x.font = `${fs}px ${BR}`; while (x.measureText(lvName).width > 820 && fs > 56) { fs -= 4; x.font = `${fs}px ${BR}` }
    x.fillStyle = '#2b1d16'; x.fillText(lvName, W / 2, 350)
    x.fillStyle = '#6d5a44'; x.font = `600 34px ${MI}`; x.fillText(sub, W / 2, 412)
    // 赤い糸と結び目
    x.strokeStyle = '#d8382a'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(170, 490)
    x.bezierCurveTo(330, 450, 420, 530, 540, 490); x.bezierCurveTo(660, 450, 760, 530, 910, 490); x.stroke()
    const nK = D.LV.length - 1
    for (let i = 1; i <= nK; i++) { const px = 170 + (740 / (nK + 1)) * i, on = i <= lv.i; x.beginPath(); x.arc(px, 490 + Math.sin(i * 1.3) * 10, on ? 15 : 11, 0, 7); x.fillStyle = on ? '#d8382a' : '#f8f2e4'; x.fill(); x.lineWidth = 3; x.strokeStyle = on ? '#9c2e1d' : '#d8b0a6'; x.stroke() }
    // 数字
    const stats = [[u.drew, S.draws + u.times], [tx(D.R.dk), String(S.ranks.dk)], [u.tied, String(S.tied)], [u.cost, (lang === 'ja' ? '' : '¥') + (S.money).toLocaleString('ja-JP') + u.yen]]
    stats.forEach(([k, v], i) => { const cx = 210 + i * 220; x.fillStyle = '#7a6550'; x.font = `600 28px ${MI}`; x.fillText(k, cx, 600); x.fillStyle = '#2b1d16'; x.font = `800 ${v.length > 6 ? 40 : 52}px ${MI}`; x.fillText(v, cx, 666) })
    // いちばんの一枚
    x.fillStyle = '#fffaf0'; x.fillRect(160, 730, 760, 440); x.strokeStyle = '#c4402a'; x.lineWidth = 3; x.strokeRect(160, 730, 760, 440)
    x.textAlign = 'left'; x.fillStyle = '#7a6550'; x.font = `600 28px ${MI}`; x.fillText(u.bestSlip, 190, 778)
    if (b) {
      const r = D.R[b.r]
      x.textAlign = 'center'; x.fillStyle = KM.isBad(b.r) ? '#2b3a55' : '#c4402a'
      const rk = tx(r); let rs = lang === 'ja' ? 120 : 64; x.font = `${rs}px ${lang === 'ja' ? BR : MI}`
      if (lang === 'ja' && [...rk].length === 2) { x.fillText(rk[0], 280, 920); x.fillText(rk[1], 280, 1050) } else if (lang === 'ja') x.fillText(rk, 280, 990)
      else { x.font = `800 52px ${MI}`; x.fillText(rk, W / 2, 850) }
      const tx0 = lang === 'ja' ? 390 : 200, tw = lang === 'ja' ? 500 : 680
      x.textAlign = 'left'; x.fillStyle = '#6d5a44'; x.font = `800 34px ${MI}`; x.fillText(tx(D.C[b.slip.c]), tx0, lang === 'ja' ? 860 : 920)
      x.fillStyle = '#2b1d16'; let ts = 50; x.font = `800 ${ts}px ${MI}`
      let lines = wrap(x, b.slip.t[lang], tw); while (lines.length > 4 && ts > 34) { ts -= 4; x.font = `800 ${ts}px ${MI}`; lines = wrap(x, b.slip.t[lang], tw) }
      lines.slice(0, 4).forEach((l, i) => x.fillText(l, tx0, (lang === 'ja' ? 940 : 990) + i * ts * 1.4))
      if (b.slip.rare) { x.save(); x.translate(860, 790); x.rotate(-0.2); x.strokeStyle = '#b8862a'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 40, 0, 7); x.stroke(); x.fillStyle = '#b8862a'; x.textAlign = 'center'; x.font = `${lang === 'ja' ? 40 : 22}px ${BR}`; x.fillText(u.rare, 0, lang === 'ja' ? 14 : 8); x.restore() }
    } else { x.textAlign = 'center'; x.fillStyle = '#6d5a44'; x.font = `800 40px ${MI}`; x.fillText(lang === 'ja' ? '一枚も引いていない' : 'Not a single slip.', W / 2, 960) }
    x.textAlign = 'center'; x.fillStyle = '#9a8566'; x.font = `600 26px ${MI}`
    x.fillText((S.isBest ? u.best + ' ' : '') + 'tom3games.github.io/koi-mikuji', W / 2, 1228)
    window.__kmCardDone = true
  }

  // ---- 結果画面だけに出す PR ボタン（config.js の AFF_URL が空なら何も出さない）
  function aff() {
    const box = $('#affBox'), url = window.AFF_URL || '', u = U()
    if (!url) { box.hidden = true; $('#bAff').removeAttribute('href'); return }
    $('#bAff').href = url; $('#affTxt').textContent = u.affBtn; $('#affNote').textContent = u.affNote
    box.hidden = false
  }

  // ---- 図鑑
  function openBook() {
    const u = U(), g = $('#grid')
    $('#bookH').textContent = u.book; $('#bookN').textContent = u.got(book.size, D.SLIPS.length); $('#bookClose').textContent = u.back
    g.innerHTML = D.SLIPS.map(s => {
      const has = book.has(s.id), r = tx(D.R[s.r]), short = lang === 'ja' ? r : r.split(' ')[0]
      return `<button class="cell${has ? '' : ' lock'}${s.rare ? ' rare' : ''}${KM.isBad(s.r) && has ? ' bad' : ''}" data-id="${s.id}" style="flex-direction:column">${has ? `${short}<small>${tx(D.C[s.c])}</small>` : `${short}<small>?</small>`}</button>`
    }).join('')
    $('#bookInfo').textContent = ''
    $('#book').hidden = false
  }
  function info(id) {
    const s = D.SLIPS.find(x => x.id === id), u = U(); if (!s) return
    for (const c of $$('.cell')) c.classList.toggle('sel', c.dataset.id === id)
    const head = tx(D.R[s.r]) + (s.rare ? ` (${u.rare})` : '')
    $('#bookInfo').textContent = book.has(id) ? `${head}  ${slipLine(s)}` : `${head}  ${u.locked}${s.rare ? (lang === 'ja' ? '。金の光で出る' : '. Comes with the gold glow.') : ''}`
  }

  function applyLang() {
    const u = U(); document.documentElement.lang = lang
    document.title = lang === 'ja' ? '恋みくじ連打（45秒で引けるだけ引く）' : 'Love Fortune Frenzy'
    $('#tTitle').innerHTML = lang === 'ja' ? '恋みくじ<b>連打</b>' : 'Love Fortune<br><b>Frenzy</b>'
    $('#tSlip').classList.toggle('en', lang !== 'ja')
    $('#tSub').textContent = u.sub; $('#bStart').textContent = u.start; $('#bHow').textContent = u.how; $('#bBook').textContent = u.book
    $('#tBest').textContent = best ? `${u.best} ${u.en} ${best}` : ''
    $('#bLang').textContent = lang === 'ja' ? 'EN' : 'JA'
    $('#clockLab').textContent = u.close; $('#emaLab').textContent = u.en
    $('#price').textContent = lang === 'ja' ? '一回 百円' : '100 yen each'
    $('#slipEmpty').textContent = lang === 'ja' ? '恋みくじ' : ''
    $('#bSave').textContent = u.save; $('#bPost').textContent = u.post; $('#bAgain').textContent = u.again; $('#bBook2').textContent = u.book
    $('#loadTxt').textContent = u.load
    $('#howH').textContent = u.how; $('#howClose').textContent = u.back
    $('#howBody').innerHTML = u.howBody.map(t => `<p>${t}</p>`).join('') + `<small>${u.credits}<br><a href="privacy.html" target="_blank" rel="noopener">${u.privacy}</a></small>`
    if (S && S.cur && !$('#slip').hidden) renderSlip(S.cur)
    if (S && !$('#vPlay').hidden) render()
    if (S && !$('#vEnd').hidden) { drawCard(); aff() }
  }

  // ---- 画面のボタン
  function on(sel, fn) { $(sel).addEventListener('click', e => { unlock(); fn(e) }) }
  on('#bStart', () => { Sfx('click'); start() })
  on('#bAgain', () => { Sfx('click'); start() })
  on('#bHow', () => { $('#how').hidden = false })
  on('#howClose', () => { $('#how').hidden = true })
  on('#bBook', () => openBook()); on('#bBook2', () => openBook()); on('#bookClose', () => { $('#book').hidden = true })
  $('#grid').addEventListener('click', e => { const c = e.target.closest('.cell'); if (c) info(c.dataset.id) })
  on('#bAff', () => { window.TM && TM.aff && TM.aff() })
  on('#bLang', () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('km_lang', lang); applyLang() })
  on('#bMute', () => { Snd.setMute(!Snd.muted); store.set('km_mute', Snd.muted ? '1' : '0'); muteIcon() })
  on('#bSave', () => { window.TM && TM.share('save'); $('#card').toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'koi-mikuji.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000) }) })
  on('#bPost', () => {
    window.TM && TM.share('x')
    const lv = KM.level(D, S), text = U().postText(tx(lv), S.draws, S.best ? slipLine(S.best.slip) : '-')
    open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.github.io/koi-mikuji/'), '_blank')
  })
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#tmSupport')) window.TM && TM.support() })
  document.addEventListener('touchend', unlock, { passive: true })

  // ---- 検証用の窓口
  const XY = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right } }
  window.km = {
    state: () => S && { t: S.t, pts: S.pts, draws: S.draws, prog: S.prog, heat: S.heat, jam: S.jamUntil > 0, stick: !!S.stick, folded: !!S.folded, pend: S.pend, tieN: S.tieN, ex: S.ex && { ...S.ex }, crow: S.crow && { ...S.crow }, tied: S.tied, stolen: S.stolen, jams: S.jams, ranks: { ...S.ranks }, over: S.over, cur: S.cur && { r: S.cur.r, id: S.cur.slip.id, rare: S.cur.slip.rare }, gold: S.cyc.gold, amp: S.cyc.amp, glow: KM.glow(S), money: S.money, got: [...S.got] },
    raw: () => S, pause: b => { paused = b }, step: n => { for (let i = 0; i < n; i++) KM.step(S, 1 / 60); drain(); render() },
    setSeed: n => { seedNext = n }, setTime: t => { S.t = t }, fast: b => { window.__kmFast = b },
    xy: n => XY({ box: $('#boxBtn'), boxArt: $('#boxArt'), stick: $('#stick'), folded: $('#folded'), rack: $('#rack'), ex: $('#ex'), crow: $('#crow'), start: $('#bStart'), again: $('#bAgain'), slip: $('#slip') }[n] || $(n)),
    setLang: l => { lang = l; applyLang() }, book: () => [...book], aff, level: () => S && KM.level(D, S),
    // 光を指定の状態にして止める（撮影用）
    holdGlow: (amp, gold, phase) => { S.cyc = { s: S.t - phase * 0.9, len: 0.9, gold, amp }; paused = true },
  }

  // ---- 読み込み（フォントと短い音。BGM は裏で読む）
  const CORE = ['shake1', 'pop1', 'pull1', 'paper1', 'bell1', 'slip1', 'jam', 'clap1', 'crow1', 'tie1', 'bad1', 'step1']
  let got = 0; const total = CORE.length + 1
  const bump = () => { got++; $('#loadBar i').style.width = (got / total * 100) + '%' }
  const hideLoad = () => { const l = $('#loading'); if (l.dataset.gone) return; l.dataset.gone = 1; l.style.opacity = 0; l.style.pointerEvents = 'none'; setTimeout(() => { l.hidden = true }, 360) }
  buildThread(); rackDecor(); applyLang(); muteIcon()
  const fontP = Promise.race([Promise.all([document.fonts.load('40px "Yuji Syuku"', '恋みくじ連打大吉凶'), document.fonts.load('800 20px "Shippori Mincho B1"', '引きに行く閉門まで')]), wait(6000)]).catch(() => {}).then(bump)
  Promise.all([fontP, ...CORE.map(n => fetch(`snd/${n}.mp3`).then(r => r.arrayBuffer()).catch(() => {}).then(bump))]).then(() => {
    applyLang(); hideLoad(); window.__kmReady = true
  })
  setTimeout(() => { if (!window.__kmReady) { hideLoad(); window.__kmReady = true } }, 12000)
})()
