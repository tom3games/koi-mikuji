// 恋みくじ連打の中身（画面に依存しない）。ブラウザでもシミュレーション（node）でも同じ物を使う
// 運は確率でなく「棒を抜いた瞬間の光」で決まる。光の周期と金の光は種（seed）から決まる
;(function (g) {
  const CFG = {
    T: 45, SHAKES: 5, HEAT_MAX: 3.6, HEAT_DECAY: 3.2, HEAT_TAP: 1, HEAT_FAST: 1.7, FAST_GAP: 0.2, HEAT_PULL: 0.6, HEAT_WARN: 2.4, JAM: 2.4,
    STICK_LIFE: 3.2, TIE: 3, EX_HP: 6, EX2_HP: 9, EX_LIFE: 6, CROW_HP: 2, CROW2_HP: 4, DKYO_LOSS: 2, PRICE: 100,
  }
  const PTS = { dk: 3, ki: 2, sk: 1, sue: 0, kyo: 0, dkyo: 0 }
  const SCORE = { dk: 6, ki: 5, sk: 4, sue: 3, kyo: 2, dkyo: 1 }
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
  const rankOf = v => v >= 0.92 ? 'dk' : v >= 0.7 ? 'ki' : v >= 0.5 ? 'sk' : v >= 0.3 ? 'sue' : v >= 0.12 ? 'kyo' : 'dkyo'
  const isBad = r => r === 'kyo' || r === 'dkyo'

  function create(D, seed, book) {
    const S = {
      D, t: 0, over: false, seed, R: rng(seed), pts: 0, draws: 0, money: 0, tied: 0, stolen: 0, jams: 0, curses: 0,
      ranks: { dk: 0, ki: 0, sk: 0, sue: 0, kyo: 0, dkyo: 0 }, best: null, got: [], prog: 0, heat: 0, jamUntil: -1,
      stick: null, folded: null, cur: null, pend: null, tieN: 0, ex: null, crow: null, cyc: null, ev: [], book: new Set(book || []), last: [],
      taps: 0, rare: 0, lastShake: -9,
    }
    newCycle(S, 0)
    return S
  }
  function ev(S, name, data) { S.ev.push({ name, data, t: S.t }) }
  // 光は1回ごとに長さと強さが違う。弱い光では大吉に届かない（待つか、今の吉で抜くか）。金の光は必ず一番強い
  function newCycle(S, s) {
    const prevGold = S.cyc && S.cyc.gold, gold = !prevGold && S.R() < 0.18
    S.cyc = { s, len: 0.75 + S.R() * 0.6, gold, amp: gold ? 1 : 0.6 + S.R() * 0.4 }
  }
  function glow(S) { const c = S.cyc, p = (S.t - c.s) / c.len; return c.amp * (1 - Math.cos(2 * Math.PI * p)) / 2 }

  function step(S, dt) {
    if (S.over) return
    S.t += dt
    S.heat = Math.max(0, S.heat - CFG.HEAT_DECAY * dt)
    while (S.t >= S.cyc.s + S.cyc.len) newCycle(S, S.cyc.s + S.cyc.len)
    if (S.stick && S.t - S.stick.t > CFG.STICK_LIFE) { S.stick = null; ev(S, 'retract') }
    if (S.ex && S.t - S.ex.t > CFG.EX_LIFE) { S.ex = null; ev(S, 'exGone', { self: true }) }
    if (S.jamUntil > 0 && S.t >= S.jamUntil) { S.jamUntil = -1; ev(S, 'unjam') }
    if (S.t >= CFG.T) { S.t = CFG.T; S.over = true; ev(S, 'end') }
  }

  function pick(S, r, gold) {
    const all = S.D.SLIPS.filter(s => s.r === r)
    const pool = gold ? all.filter(s => s.rare) : all.filter(s => !s.rare)
    let c = pool.filter(s => !S.last.includes(s.id)); if (!c.length) c = pool
    const fresh = c.filter(s => !S.book.has(s.id)); if (fresh.length && S.R() < 0.5) c = fresh
    const s = c[Math.floor(S.R() * c.length)]
    S.last.push(s.id); if (S.last.length > 4) S.last.shift()
    return s
  }

  function jam(S) {
    S.jams++; S.jamUntil = S.t + CFG.JAM; S.heat = 0; S.stick = null
    ev(S, 'jam'); return 'jam'
  }
  function curse(S) {
    const k = S.pend; S.pend = null; S.curses++
    if (k === 'ex' || k === 'ex2') S.ex = { hp: k === 'ex2' ? CFG.EX2_HP : CFG.EX_HP, max: k === 'ex2' ? CFG.EX2_HP : CFG.EX_HP, t: S.t, plus: k === 'ex2', kind: S.R() < 0.5 ? 0 : 1 }
    else S.crow = { hp: k === 'crow2' ? CFG.CROW2_HP : CFG.CROW_HP, two: k === 'crow2' }
    if (S.cur && S.cur.r === 'dkyo') S.pts -= CFG.DKYO_LOSS
    ev(S, 'curse', k); return 'curse'
  }

  // ---- 操作
  function tapBox(S) {
    if (S.over) return 'over'
    S.taps++
    if (S.ex) return tapEx(S)
    if (S.jamUntil > 0) { ev(S, 'locked'); return 'locked' }
    if (S.folded) { ev(S, 'needOpen'); return 'needOpen' }
    if (S.pend) return curse(S)
    // 速すぎる振り方（0.2秒より短い間隔）は詰まりやすい
    const gap = S.t - S.lastShake; S.lastShake = S.t
    // 熱い（振りすぎた）ところへさらに振ると詰まる
    if (S.heat >= CFG.HEAT_MAX) return jam(S)
    S.heat += gap < CFG.FAST_GAP ? CFG.HEAT_FAST : CFG.HEAT_TAP
    if (S.stick) { ev(S, 'rattle'); return 'rattle' }
    S.prog++; ev(S, 'shake', S.prog)
    if (S.prog >= CFG.SHAKES) { S.prog = 0; S.stick = { t: S.t, no: 1 + Math.floor(S.R() * 100) }; ev(S, 'pop') }
    return 'shake'
  }
  function tapStick(S) {
    if (S.over || !S.stick || S.ex || S.jamUntil > 0) return 'none'
    S.taps++
    S.heat += CFG.HEAT_PULL   // 抜く時は詰まらない。ただ熱は残る
    const v = glow(S), gold = S.cyc.gold, r = rankOf(v), slip = pick(S, r, gold), no = S.stick.no
    S.stick = null; S.money += CFG.PRICE
    if (S.crow) {
      S.stolen++; S.crow.hp = 0
      const two = S.crow.two; S.crow = null
      ev(S, 'stolen', { slip, r, two }); return 'stolen'
    }
    S.folded = { slip, r, gold, no, g: v }
    ev(S, 'pull', S.folded); return 'pull'
  }
  function tapSlip(S) {
    if (S.over || !S.folded) return 'none'
    S.taps++
    const f = S.folded; S.folded = null; S.draws++; S.ranks[f.r]++; S.cur = f; S.tieN = 0
    S.pts += PTS[f.r]
    if (f.slip.rare) S.rare++
    if (!S.book.has(f.slip.id)) { S.book.add(f.slip.id); S.got.push(f.slip.id); f.fresh = true }
    if (isBad(f.r)) S.pend = f.slip.curse
    const sc = x => SCORE[x.r] + (x.slip.rare ? 0.5 : 0)
    if (!S.best || sc(f) >= sc(S.best)) S.best = f
    ev(S, 'open', f); return 'open'
  }
  function tapRack(S) {
    if (S.over) return 'none'
    S.taps++
    if (!S.pend) { ev(S, 'rackIdle'); return 'idle' }
    S.tieN++; ev(S, 'tie', S.tieN)
    if (S.tieN >= CFG.TIE) { S.pend = null; S.tied++; S.cur.tied = true; ev(S, 'tied', S.cur); return 'tied' }
    return 'tie'
  }
  function tapEx(S) {
    if (S.over || !S.ex) return 'none'
    S.ex.hp--; ev(S, 'push', S.ex)
    if (S.ex.hp <= 0) { S.ex = null; ev(S, 'exGone', {}) }
    return 'push'
  }
  function tapCrow(S) {
    if (S.over || !S.crow) return 'none'
    S.taps++
    S.crow.hp--; ev(S, 'shoo', S.crow)
    if (S.crow.hp <= 0) { S.crow = null; ev(S, 'crowGone') }
    return 'shoo'
  }

  function level(D, S) {
    if (!S.draws) return { i: -1, ...D.NOPLAY }
    const p = Math.max(0, S.pts); let i = 0
    while (i + 1 < D.LV.length && p >= D.LV[i + 1].min) i++
    return { i, ...D.LV[i], next: D.LV[i + 1] ? D.LV[i + 1].min : null, from: D.LV[i].min }
  }

  g.KM = { CFG, PTS, create, step, glow, tapBox, tapStick, tapSlip, tapRack, tapEx, tapCrow, level, rankOf, isBad }
})(typeof window !== 'undefined' ? window : globalThis)
