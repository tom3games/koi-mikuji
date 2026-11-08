// 恋みくじ v2: 画面・音・入力。中身の計算は logic.js（KM）
;(function () {
  window.__jsUp = true
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]
  const mem = {}
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return k in mem ? mem[k] : null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) { mem[k] = v } } }
  let lang = store.get('km_lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
  const U = () => D.UI[lang], tx = o => (o ? (o[lang] ?? o.ja) : '')
  const touch = matchMedia('(pointer:coarse)').matches
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const KAN = '〇一二三四五六七八九'
  const kanji = n => n >= 100 ? '百' : (n >= 20 ? KAN[Math.floor(n / 10)] : '') + (n >= 10 ? '十' : '') + (n % 10 ? KAN[n % 10] : '')
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const MAXDAY = 2

  // ---- 音（全部録音素材。出所は CREDITS.md）
  Snd.muted = store.get('km_mute') === '1'
  Snd.def({
    shake: ['snd/shake1.mp3', 'snd/shake2.mp3', 'snd/shake3.mp3'], pop: ['snd/pop1.mp3', 'snd/pop2.mp3', 'snd/pop3.mp3'], pull: ['snd/pull1.mp3', 'snd/pull2.mp3'],
    slip: ['snd/slip1.mp3', 'snd/slip2.mp3'], paper: ['snd/paper1.mp3', 'snd/paper2.mp3', 'snd/paper3.mp3', 'snd/paper4.mp3'], bell: ['snd/bell1.mp3', 'snd/bell2.mp3', 'snd/bell3.mp3'],
    bellrare: 'snd/bellrare.mp3', bad: ['snd/bad1.mp3', 'snd/bad2.mp3'], tie: ['snd/tie1.mp3', 'snd/tie2.mp3', 'snd/tie3.mp3'], clap: ['snd/clap1.mp3', 'snd/clap2.mp3'], click: 'snd/click.mp3',
  })
  const CUE = {
    shake: [['shake', { vol: 0.85 }]], slow: [['clap', { vol: 0.9 }], ['clap', { vol: 0.8, delay: 0.16 }]], pop: [['pop', { vol: 0.85 }]], pull: [['pull', { vol: 0.9 }], ['slip', { vol: 0.6, delay: 0.14 }]],
    open: [['paper', { vol: 0.9 }], ['paper', { vol: 0.6, delay: 0.18 }]], g: [['bell', { vol: 0.75, delay: 0.25 }]], dk: [['bellrare', { vol: 0.85, delay: 0.25 }]], b: [['bad', { vol: 0.6, delay: 0.2 }]],
    tie: [['tie', { vol: 0.85 }], ['tie', { vol: 0.7, delay: 0.3 }], ['bell', { vol: 0.25, rate: 1.35, delay: 0.6 }]], click: [['click', { vol: 0.5, jitter: 0 }]],
  }
  window.__sfxCalls = {}
  const Sfx = n => { window.__sfxCalls[n] = (window.__sfxCalls[n] || 0) + 1; for (const [k, o] of CUE[n] || []) Snd.play(k, o) }
  function bed() { Snd.loop('amb', 'snd/amb_birds.mp3', 0.18); Snd.loop('crows', 'snd/amb_crows.mp3', 0.06); Snd.loop('bgm', 'snd/bgm.mp3', 0.1) }
  const muteIcon = () => { $('#icoWave').style.display = Snd.muted ? 'none' : '' }
  const unlock = () => { Snd.init(); if (!Snd.__bed) { Snd.__bed = 1; bed() } }

  // ---- 記録（端末の中だけ。名前は残さない）
  const readJSON = (k, d) => { try { return JSON.parse(store.get(k)) || d } catch (e) { return d } }
  function day() { const v = readJSON('km2_day', null); return v && v.d === today() ? v : { d: today(), n: 0 } }
  const book = new Set(readJSON('km2_book', []))
  let recent = readJSON('km2_recent', [])

  // ---- 状態
  let sit = null, R = null, res = null, slip = null, greed = false, run = false, acc = 0, lastT = 0, paused = false
  let shownAt = 0
  const show = id => { for (const v of $$('main.view')) v.hidden = v.id !== id; $('#finger').hidden = true; shownAt = performance.now() }

  $('#leaves').innerHTML = Array.from({ length: 7 }, (_, i) => `<i style="left:${8 + i * 14 + Math.random() * 8}%;animation-duration:${10 + Math.random() * 7}s;animation-delay:${-Math.random() * 14}s;transform:scale(${0.7 + Math.random() * 0.6})"></i>`).join('')

  // ---- 吹き出し・指
  let bubT = 0
  function say(text, el, ms) {
    const b = $('#bubble'); b.textContent = text; b.classList.add('on')
    const r = el.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight
    b.style.left = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + 'px'; b.style.top = Math.max(60, r.top - bh - 4) + 'px'
    clearTimeout(bubT); bubT = setTimeout(() => b.classList.remove('on'), ms || (900 + 90 * [...text].length))
  }
  const pickLine = k => { const a = D.LINES[k][lang]; return a[Math.floor(Math.random() * a.length)] }
  function point(el) { const f = $('#finger'); if (!el) { f.hidden = true; return } const r = el.getBoundingClientRect(); f.hidden = false; f.style.left = (r.left + r.width * 0.6) + 'px'; f.style.top = (r.top + r.height * 0.55) + 'px' }
  function hint(k) { $('#hint').textContent = U()[k] }

  // ---- 名前と状況
  function renderAsk() {
    const u = U()
    $('#lName').textContent = u.askName; $('#name').placeholder = u.namePh; $('#nameNote').textContent = u.nameNote; $('#lSit').textContent = u.askSit; $('#bGo').textContent = u.go
    $('#sits').innerHTML = D.SIT.map(s => `<button class="sit${s.id === sit ? ' on' : ''}" data-s="${s.id}">${esc(tx(s))}</button>`).join('')
    $('#bGo').disabled = !sit
  }
  $('#sits').addEventListener('click', e => { const b = e.target.closest('.sit'); if (!b) return; unlock(); sit = b.dataset.s; Sfx('click'); renderAsk() })
  $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#name').blur() })

  // ---- 儀式
  function stickSvg(no) {
    $('#stickSvg').innerHTML = `<rect x="4" y="0" width="16" height="122" rx="3" fill="#ecd5a6" stroke="#8a6236" stroke-width="1.5"/><path d="M8 4 V100 M15 6 V98" stroke="#b9925e" stroke-opacity=".35"/><rect x="4" y="104" width="16" height="18" rx="2" fill="#c4402a"/>` +
      [...kanji(no)].map((c, i) => `<text x="12" y="${48 + i * 17}" font-size="14" text-anchor="middle" font-family="Shippori Mincho B1, serif" font-weight="800" fill="#2b1d16">${c}</text>`).join('')
  }
  let shakeSide = 0
  function anim(el, cls, ms) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_' + cls]); el['_' + cls] = setTimeout(() => el.classList.remove(cls), ms) }
  function begin() {
    unlock()
    const d = day(); greed = d.n >= MAXDAY
    R = KM.ritual((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); res = null; slip = null
    show('vPlay'); hint('tShake')
    $$('#prog i').forEach(i => i.classList.remove('on')); $('#stick').classList.remove('out'); $('#stick').style.setProperty('--g', 0); $('#folded').hidden = true
    $('#priest').classList.toggle('out', greed); $('#bubble').classList.remove('on')
    if (greed) setTimeout(() => say(pickLine('greed'), $('#priest'), 1800), 300)
    setTimeout(() => { if (R && !R.taps.length && !$('#vPlay').hidden) point($('#boxBtn')) }, 400)
    window.TM && TM.start()
    run = true; paused = false; acc = 0; lastT = performance.now(); requestAnimationFrame(frame)
  }
  function frame(now) {
    if (!run) return
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now
    if (!paused) { acc += dt; while (acc >= 1 / 60) { KM.step(R, 1 / 60); acc -= 1 / 60 } }
    if (R.stick && !res) $('#stick').style.setProperty('--g', KM.glow(R).toFixed(3))
    requestAnimationFrame(frame)
  }
  function onShake() {
    if (!R || R.stick) return
    const r = KM.shake(R)
    if (r === 'slow') { Sfx('slow'); anim($('#boxArt'), 'nope', 420); $('#priest').classList.add('out'); say(pickLine('slow'), $('#priest'), 1500); setTimeout(() => { if (!greed) $('#priest').classList.remove('out') }, 1600) }
    else { Sfx('shake'); anim($('#boxArt'), (shakeSide++ % 2) ? 'shL' : 'shR', 280) }
    $$('#prog i').forEach((d, i) => d.classList.toggle('on', i < R.taps.length))
    point(null)
    if (r === 'pop') { stickSvg(1 + Math.floor(Math.random() * 99)); setTimeout(() => { Sfx('pop'); $('#stick').classList.add('out'); hint('tPull'); point($('#stick')) }, 250) }
  }
  function onPull() {
    if (!R || !R.stick || res) return
    res = KM.pull(R); window.__kmPull = res
    Sfx('pull'); $('#stick').classList.remove('out'); point(null)
    setTimeout(() => { const f = $('#folded'); f.hidden = false; f.classList.remove('pulse'); setTimeout(() => f.classList.add('pulse'), 400); hint('tOpen'); point(f) }, 220)
  }
  function onOpen() {
    if (!res || slip) return
    const d = day(), name = $('#name').value.trim().slice(0, 10)
    slip = KM.makeSlip({ D, date: d.d, name, sit, n: d.n, shift: res.shift, greed, recent })
    slip.name = name
    d.n++; store.set('km2_day', JSON.stringify(d))
    recent = recent.concat(slip.used).slice(-24); store.set('km2_recent', JSON.stringify(recent))
    book.add(`${slip.sit}:${slip.rank}`); store.set('km2_book', JSON.stringify([...book]))
    run = false; point(null)
    renderEnd(true)
    Sfx('open'); Sfx(slip.rank === 'dk' ? 'dk' : slip.tier === 'g' ? 'g' : slip.tier === 'b' ? 'b' : 'open')
    window.TM && TM.end(5 - slip.idx, slip.tier === 'g')
    window.__kmEnded = (window.__kmEnded || 0) + 1
  }
  $('#boxBtn').addEventListener('pointerdown', e => { e.preventDefault(); unlock(); onShake() })
  $('#stick').addEventListener('pointerdown', e => { e.preventDefault(); unlock(); onPull() })
  $('#folded').addEventListener('pointerdown', e => { e.preventDefault(); unlock(); onOpen() })

  // ---- 紙
  const rankOf = s => D.RANK[s.idx]
  // 一句は句の切れ目でだけ折り返す
  const ku = w => w.split('　').map(x => `<span>${esc(x)}</span>`).join('　')
  function slipHTML(s) {
    const u = U(), rk = rankOf(s), sitO = D.SIT.find(x => x.id === s.sit)
    if (lang === 'ja') {
      return `<div class="top"><div class="sHead"><span class="sNo">第${kanji(s.no)}番</span><b class="sRank">${rk.ja}</b></div>` +
        (s.name ? `<div class="sName">${esc(s.name)}さん　${esc(sitO.ja)}</div>` : `<div class="sName">${esc(sitO.ja)}</div>`) +
        `<div class="sWaka"><p>${ku(s.waka[0])}</p><p class="lo">${ku(s.waka[1])}</p></div>` +
        `<div class="sSo"><b class="l">${u.sohyo}</b>${s.sohyo[0]}</div></div>` +
        `<div class="bot sItems">${s.items.map(i => `<p><b class="l">${D.LABEL[i.k].ja}</b>${esc(i.ja)}</p>`).join('')}</div>` +
        (s.tied ? '<span class="stamp">結</span>' : s.greed ? '<span class="stamp">欲</span>' : '')
    }
    return `<div class="top"><div class="sHead"><b class="sRank">${rk.en}</b><span class="sNo">No. ${s.no}</span></div>` +
      `<div class="sName">${s.name ? esc(s.name) + ' / ' : ''}${esc(sitO.en)}</div>` +
      `<div class="sWaka">${esc(s.waka[2])}</div>` +
      `<div class="sSo"><b class="l">${u.sohyo}</b>${esc(s.sohyo[1])}</div></div>` +
      `<div class="bot sItems">${s.items.map(i => `<p><b class="l">${D.LABEL[i.k].en}</b>${esc(i.en)}</p>`).join('')}</div>` +
      (s.tied ? '<span class="stamp">Tied</span>' : s.greed ? '<span class="stamp">Greed</span>' : '')
  }
  // 紙の中に全部収まる字の大きさにする
  function fitSlip() {
    const el = $('#slip'); if ($('#vEnd').hidden || el.classList.contains('in') && el.getAnimations().length) return
    let f = 22; el.style.fontSize = f + 'px'
    const over = () => {
      const R0 = el.getBoundingClientRect(), pad = 4
      for (const box of el.querySelectorAll('.top,.bot')) { const B = box.getBoundingClientRect(); for (const x of box.querySelectorAll('p,b,span,div')) { const r = x.getBoundingClientRect(); if (!r.width) continue; if (x.matches('p,.sName,.sSo') && (x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2)) return true; if (r.left < Math.max(R0.left, B.left) - 0.5 || r.right > R0.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5) return true } }
      return el.scrollHeight > el.clientHeight + 1
    }
    while (f > 9 && over()) { f -= 0.5; el.style.fontSize = f + 'px' }
    window.__kmSlipFont = f
  }
  function renderEnd(fresh) {
    const u = U(), el = $('#slip'), d = day()
    show('vEnd')
    el.className = (lang === 'en' ? 'en ' : '') + slip.rank
    el.innerHTML = slipHTML(slip)
    $('#knot').hidden = !slip.tied
    $('#ritualNote').textContent = tx(slip.greed ? D.RITUAL.greed : slip.shift > 0 ? D.RITUAL.up : slip.shift < 0 ? D.RITUAL.down : D.RITUAL.same)
    const bt = $('#bTie'); bt.textContent = slip.tied ? u.tied : u.tie; bt.disabled = !!slip.tied; bt.classList.toggle('hot', slip.tier === 'b' && !slip.tied)
    $('#bSave').textContent = u.save; $('#bPost').textContent = u.post
    const more = d.n < MAXDAY, ba = $('#bAgain'); ba.textContent = more ? u.again : u.tomorrow; ba.disabled = !more
    ba.className = 'big'
    const bg = $('#bGreed'); bg.hidden = more; bg.textContent = u.greed
    aff()
    fitSlip(); requestAnimationFrame(() => { fitSlip(); setTimeout(fitSlip, 600) })
    if (fresh) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in') }
  }
  window.addEventListener('resize', () => fitSlip())

  // ---- 持ち帰る画像（縦書きの紙）
  async function fontsFor(text) {
    try { await Promise.race([Promise.all([document.fonts.load(`80px "Yuji Syuku"`, text), document.fonts.load(`800 40px "Shippori Mincho B1"`, text), document.fonts.load(`600 40px "Shippori Mincho B1"`, text)]), wait(1500)]) } catch (e) {}
  }
  function vcol(x, ch, y0, size, font, color, maxY) {
    // 1列ぶん縦に書く。入りきらない残りを返す
    const c = $('#card').getContext('2d'); c.font = font; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'
    let y = y0, i = 0
    for (; i < ch.length; i++) {
      if (y + size > maxY && !('。、'.includes(ch[i]) && i > 0)) break   // 句読点は前の列にぶら下げる
      const k = ch[i], cy = y + size / 2
      if (k === '　' || k === ' ') { y += size * 0.6; continue }
      if ('。、'.includes(k)) c.fillText(k, x + size * 0.32, cy - size * 0.3)
      else if ('ー〜…'.includes(k)) { c.save(); c.translate(x, cy); c.rotate(Math.PI / 2); c.fillText(k, 0, 0); c.restore() }
      else c.fillText(k, x, cy)
      y += size * 1.04
    }
    return ch.slice(i)
  }
  function vtext(x, text, y0, size, font, color, maxY, step) { let rest = [...text], cols = 0; while (rest.length) { rest = vcol(x - cols * step, rest, y0, size, font, color, maxY); cols++; if (cols > 6) break } return cols }
  function wrapH(c, text, maxW) { const out = []; let line = ''; for (const t of text.split(/(\s+)/)) { const test = line + t; if (c.measureText(test).width > maxW && line) { out.push(line.trim()); line = t.trimStart() } else line = test } if (line.trim()) out.push(line.trim()); return out }
  async function drawCard() {
    const cv = $('#card'), c = cv.getContext('2d'), W = 1080, H = 1440, s = slip, u = U(), rk = rankOf(s), sitO = D.SIT.find(x => x.id === s.sit)
    const BR = '"Yuji Syuku","Shippori Mincho B1",serif', MI = '"Shippori Mincho B1","Hiragino Mincho ProN",serif'
    await fontsFor(slipHTML(s).replace(/<[^>]+>/g, '') + '第番恋みくじ結欲総評' + kanji(s.no))
    c.fillStyle = '#f8f2e4'; c.fillRect(0, 0, W, H)
    c.strokeStyle = 'rgba(120,90,50,.05)'; c.lineWidth = 2; for (let i = -H; i < W; i += 9) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H * 0.14, H); c.stroke() }
    c.strokeStyle = '#c4402a'; c.lineWidth = 8; c.strokeRect(36, 36, W - 72, H - 72); c.lineWidth = 2.5; c.strokeRect(54, 54, W - 108, H - 108)
    const top = 110, bot = H - 150, red = '#c4402a', ink = '#2b1d16', sub = '#6d5a44'
    if (lang === 'ja') {
      const mid = 700
      for (let sz = 44; sz >= 26; sz -= 2) {
        c.fillStyle = '#f8f2e4'; c.fillRect(60, 60, W - 120, H - 200)
        const step = sz * 1.6; let x = W - 130, ok = true
        vtext(x, `第${kanji(s.no)}番`, top, 30, `600 30px ${MI}`, sub, mid, 46)
        c.font = `160px ${BR}`; c.fillStyle = s.rank === 'kyo' ? '#2b3a55' : red; c.textAlign = 'center'; c.textBaseline = 'middle'
        ;[...rk.ja].forEach((k, i) => c.fillText(k, x - 110, top + 90 + i * 170))
        x -= 240
        x -= vtext(x, (s.name ? s.name + 'さん　' : '') + sitO.ja, top, sz * 0.85, `800 ${Math.round(sz * 0.85)}px ${MI}`, sub, mid - 20, step) * step
        const wz = Math.round(sz * 0.74)
        x -= vtext(x, s.waka[0], top, wz, `${wz}px ${BR}`, ink, mid - 20, step) * step
        x -= vtext(x, s.waka[1], top + wz * 2.4, wz, `${wz}px ${BR}`, ink, mid - 20, step) * step + step * 0.2
        const col = (lab, text, y0, y1) => {
          c.fillStyle = red; const lh = [...lab].length * sz * 1.04 + 16; c.fillRect(x - sz * 0.62, y0 - 8, sz * 1.24, lh)
          vcol(x, [...lab], y0, sz, `800 ${sz}px ${MI}`, '#fff8ec', y1)
          const n = vtext(x, text, y0 + lh + 10, sz, `800 ${sz}px ${MI}`, ink, y1, step); x -= n * step + sz * 0.35
        }
        col(u.sohyo, s.sohyo[0], top, mid - 20); if (x < 70) ok = false
        c.strokeStyle = 'rgba(196,64,42,.5)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(80, mid); c.lineTo(W - 80, mid); c.stroke()
        x = W - 140
        for (const it of s.items) col(D.LABEL[it.k].ja, it.ja, mid + 40, bot)
        if (x < 70) ok = false
        if (ok) break
      }
    } else {
      c.textAlign = 'left'; c.textBaseline = 'alphabetic'; let y = 170
      c.fillStyle = s.rank === 'kyo' ? '#2b3a55' : red; c.font = `800 96px ${MI}`; c.fillText(rk.en, 110, y); y += 64
      c.fillStyle = sub; c.font = `600 34px ${MI}`; c.fillText(`No. ${s.no}  ${s.name ? s.name + ' / ' : ''}${sitO.en}`, 110, y); y += 70
      c.fillStyle = ink; c.font = `italic 600 38px ${MI}`; for (const l of wrapH(c, s.waka[2], 860)) { c.fillText(l, 110, y); y += 54 } y += 26
      const row = (lab, text) => { c.fillStyle = red; c.font = `800 32px ${MI}`; c.fillText(lab, 110, y); y += 48; c.fillStyle = ink; c.font = `800 40px ${MI}`; for (const l of wrapH(c, text, 860)) { c.fillText(l, 110, y); y += 54 } y += 22 }
      row(u.sohyo, s.sohyo[1]); for (const it of s.items) row(D.LABEL[it.k].en, it.en)
    }
    if (s.tied || s.greed) { c.save(); c.translate(160, H - 260); c.rotate(-0.2); c.strokeStyle = red; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 62, 0, 7); c.stroke(); c.fillStyle = red; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = lang === 'ja' ? `70px ${BR}` : `800 30px ${MI}`; c.fillText(lang === 'ja' ? (s.tied ? '結' : '欲') : (s.tied ? 'Tied' : 'Greed'), 0, 4); c.restore() }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#9a8566'; c.font = `600 30px ${MI}`; c.fillText(`${u.title}　tom3games.com`, W / 2, H - 86)
    window.__kmCardDone = true
  }

  // ---- 結果画面だけに出す PR ボタン（config.js の AFF_URL が空なら何も出さない）
  function aff() {
    const box = $('#affBox'), url = window.AFF_URL || '', u = U()
    if (!url) { box.hidden = true; $('#bAff').removeAttribute('href'); return }
    $('#bAff').href = url; $('#affTxt').textContent = u.affBtn; $('#affNote').textContent = u.affNote
    box.hidden = false
  }

  // ---- 引いた運勢（状況×運勢の表）
  function openBook() {
    const u = U()
    $('#bookH').textContent = u.book; $('#bookN').textContent = u.got(book.size, D.SIT.length * D.RANK.length); $('#bookClose').textContent = u.back
    const short = r => lang === 'ja' ? r.ja : r.en.split(' ')[0]
    $('#grid').innerHTML = '<span></span>' + D.RANK.map(r => `<span class="h">${short(r)}</span>`).join('') +
      D.SIT.map(s => `<span class="r">${esc(tx(s))}</span>` + D.RANK.map(r => `<span class="c${book.has(s.id + ':' + r.id) ? ' on' : ''}">${lang === 'ja' ? '済' : 'ok'}</span>`).join('')).join('')
    $('#bookInfo').textContent = book.size ? '' : u.none
    $('#book').hidden = false
  }

  function todayLine() { const n = day().n, u = U(); return lang === 'ja' ? (n ? `今日はあと${Math.max(0, MAXDAY - n)}回` : '') : (n ? `${Math.max(0, MAXDAY - n)} left today` : '') }
  function applyLang() {
    const u = U(); document.documentElement.lang = lang
    document.title = lang === 'ja' ? '恋みくじ｜夕暮れの神社で一日一枚引く恋のおみくじ' : 'Love Fortune Slip'
    $('#tTitle').innerHTML = lang === 'ja' ? '恋みくじ' : 'Love<br>Fortune<br>Slip'
    $('#tSlip').classList.toggle('en', lang !== 'ja')
    $('#tSub').textContent = u.sub; $('#bStart').textContent = u.start; $('#bHow').textContent = u.how; $('#bBook').textContent = u.book
    $('#tToday').textContent = todayLine()
    $('#bLang').textContent = lang === 'ja' ? 'EN' : 'JA'
    $('#loadTxt').textContent = u.load
    $('#howH').textContent = u.how; $('#howClose').textContent = u.back
    $('#howBody').innerHTML = u.howBody.map(t => `<p>${t}</p>`).join('') + `<small>${u.credits}<br><a href="privacy.html" target="_blank" rel="noopener">${u.privacy}</a></small>`
    renderAsk()
    if (!$('#vPlay').hidden && R) hint(res ? 'tOpen' : R.stick ? 'tPull' : 'tShake')
    if (slip && !$('#vEnd').hidden) renderEnd(false)
  }

  // ---- ボタン
  // 画面が切り替わった直後のクリックは、前の画面のタップの続き（指を離した時の click）なので無視する
  function on(sel, fn) { $(sel).addEventListener('click', e => { if (performance.now() - shownAt < 300) return; unlock(); fn(e) }) }
  on('#bStart', () => { Sfx('click'); renderAsk(); show('vAsk') })
  on('#bGo', () => { if (!sit) return; Sfx('click'); $('#name').blur(); begin() })
  on('#bAgain', () => { if (day().n >= MAXDAY) return; Sfx('click'); begin() })
  on('#bGreed', () => { Sfx('click'); begin() })
  on('#bTie', async () => { if (!slip || slip.tied) return; slip.tied = true; Sfx('tie'); const el = $('#slip'); renderEnd(false); el.classList.add('tied'); setTimeout(() => el.classList.remove('tied'), 950) })
  on('#bHow', () => { $('#how').hidden = false })
  on('#howClose', () => { $('#how').hidden = true })
  on('#bBook', openBook); on('#bookClose', () => { $('#book').hidden = true })
  on('#bAff', () => { window.TM && TM.aff && TM.aff() })
  on('#bLang', () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('km_lang', lang); applyLang() })
  on('#bMute', () => { Snd.setMute(!Snd.muted); store.set('km_mute', Snd.muted ? '1' : '0'); muteIcon() })
  on('#bSave', async () => { window.TM && TM.share('save'); await drawCard(); $('#card').toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'koi-mikuji.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000) }) })
  on('#bPost', () => {
    window.TM && TM.share('x')
    const s = slip, it = s.items.find(i => i.k === 'machi') || s.items[0], lab = tx(D.LABEL[it.k])
    const text = U().postText(tx(D.SIT.find(x => x.id === s.sit)), tx(rankOf(s)), lang === 'ja' ? `${lab}、${it.ja}` : `${lab}: ${it.en}`)
    open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.com/play/koi-mikuji/'), '_blank')
  })
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#tmSupport')) window.TM && TM.support() })
  document.addEventListener('touchend', unlock, { passive: true })

  // ---- 検証用の窓口
  const XY = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right } }
  window.km = {
    xy: n => XY({ box: $('#boxBtn'), stick: $('#stick'), folded: $('#folded'), start: $('#bStart'), go: $('#bGo'), again: $('#bAgain'), tie: $('#bTie'), slip: $('#slip') }[n] || $(n)),
    ritual: () => R && { taps: R.taps.length, stick: R.stick, glow: KM.glow(R), amp: R.cyc.amp, slow: R.slow }, pull: () => res, slip: () => slip, day, book: () => [...book],
    pause: b => { paused = b }, holdGlow: (amp, phase) => { R.cyc = { s: R.t - phase * 1, len: 1, amp }; paused = true }, setLang: l => { lang = l; applyLang() }, aff, drawCard, rerender: () => renderEnd(false), fit: () => window.__kmSlipFont,
  }

  // ---- 読み込み（フォントと短い音。BGM は裏で読む）
  const CORE = ['shake1', 'pop1', 'pull1', 'paper1', 'bell1', 'slip1', 'clap1', 'tie1', 'bad1']
  let got = 0; const total = CORE.length + 1
  const bump = () => { got++; $('#loadBar i').style.width = (got / total * 100) + '%' }
  const hideLoad = () => { const l = $('#loading'); if (l.dataset.gone) return; l.dataset.gone = 1; l.style.opacity = 0; l.style.pointerEvents = 'none'; setTimeout(() => { l.hidden = true }, 360) }
  applyLang(); muteIcon()
  const fontP = Promise.race([Promise.all([document.fonts.load('40px "Yuji Syuku"', '恋みくじ大吉凶'), document.fonts.load('800 20px "Shippori Mincho B1"', 'くじを引く')]), wait(6000)]).catch(() => {}).then(bump)
  Promise.all([fontP, ...CORE.map(n => fetch(`snd/${n}.mp3`).then(r => r.arrayBuffer()).catch(() => {}).then(bump))]).then(() => {
    applyLang(); hideLoad(); window.__kmReady = true
  })
  setTimeout(() => { if (!window.__kmReady) { hideLoad(); window.__kmReady = true } }, 12000)
})()
