// 恋みくじ v2 の中身（画面に依存しない。sim.mjs と共用）
// 運 = 今日の巡り合わせ（日付・名前・状況・何回目かで決まる）を、振り方と引く瞬間で一段上下させる
;(function (g) {
  const CFG = { SHAKES: 3, FAST: 0.2, UP: 0.78, DOWN: 0.4 }
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

  // ---- 儀式（振る・光る・引く）
  function ritual(seed) { const R = { t: 0, taps: [], stick: false, R: rng(seed), cyc: null, slow: 0, ev: [] }; cycle(R, 0); return R }
  function cycle(R, s) { R.cyc = { s, len: 0.8 + R.R() * 0.6, amp: 0.55 + R.R() * 0.45 } }
  function glow(R) { const c = R.cyc, p = (R.t - c.s) / c.len; return c.amp * (1 - Math.cos(2 * Math.PI * p)) / 2 }
  function step(R, dt) { R.t += dt; while (R.t >= R.cyc.s + R.cyc.len) cycle(R, R.cyc.s + R.cyc.len) }
  function shake(R) {
    if (R.stick) return 'none'
    const last = R.taps[R.taps.length - 1]
    if (last != null && R.t - last < CFG.FAST && R.slow < 2) { R.taps = []; R.slow++; R.ev.push('slow'); return 'slow' }   // 急ぐと数え直し（2回まで。その後は振れるが運は下がる）
    R.taps.push(R.t); R.ev.push('shake')
    if (R.taps.length >= CFG.SHAKES) { R.stick = true; R.ev.push('pop'); return 'pop' }
    return 'shake'
  }
  const gapScore = i => i < 0.2 ? 0 : i < 0.45 ? (i - 0.2) / 0.25 : i <= 1.1 ? 1 : i < 2.5 ? 1 - (i - 1.1) / 1.4 : 0
  function rhythm(R) {
    const t = R.taps; if (t.length < 3) return 0
    const a = t[1] - t[0], b = t[2] - t[1]
    let s = (gapScore(a) + gapScore(b)) / 2
    if (Math.abs(a - b) / Math.max(a, b) > 0.45) s -= 0.25
    return Math.max(0, Math.min(1, s - Math.min(0.3, R.slow * 0.15)))
  }
  function pull(R) {
    if (!R.stick) return null
    const gl = glow(R), rh = rhythm(R), q = 0.5 * rh + 0.5 * gl
    return { glow: gl, rhythm: rh, q, shift: q >= CFG.UP ? 1 : q < CFG.DOWN ? -1 : 0 }
  }

  // ---- 紙
  function pickW(r, list) { const sum = list.reduce((a, b) => a + b, 0); let x = r() * sum; for (let i = 0; i < list.length; i++) { x -= list[i]; if (x < 0) return i } return list.length - 1 }
  function choose(r, n, key, recent) { const idx = [...Array(n).keys()]; const fresh = idx.filter(i => !recent.includes(key + i)); const c = fresh.length ? fresh : idx; return c[Math.floor(r() * c.length)] }
  // o = { D, date, name, sit, n(今日何回目), shift, greed, recent[] }
  function makeSlip(o) {
    const { D } = o, r = rng(hash([o.date, (o.name || '').trim(), o.sit, o.n].join('|')))
    const base = pickW(r, D.FATE)
    let idx = base - (o.shift || 0) + (o.greed ? 1 : 0); idx = Math.max(0, Math.min(D.RANK.length - 1, idx))
    const rank = D.RANK[idx], tier = rank.tier, sit = D.SIT.find(s => s.id === o.sit) || D.SIT[0], recent = o.recent || [], used = []
    const wi = choose(r, D.WAKA[tier].length, 'w' + tier, recent); used.push('w' + tier + wi)
    const si = Math.floor(r() * D.SOHYO[rank.id].length)
    const items = sit.items.map(k => {
      if (k === 'place') { const i = choose(r, D.PLACE.length, 'p', recent); used.push('p' + i); return { k, ja: D.PLACE[i][0], en: D.PLACE[i][1] } }
      const pool = D.T[k][tier], key = k + tier, i = choose(r, pool.length, key, recent); used.push(key + i); return { k, ja: pool[i][0], en: pool[i][1] }
    })
    return { base, idx, rank: rank.id, tier, no: 1 + Math.floor(r() * 99), waka: D.WAKA[tier][wi], sohyo: D.SOHYO[rank.id][si], items, sit: sit.id, shift: o.shift || 0, greed: !!o.greed, used }
  }

  g.KM = { CFG, hash, rng, ritual, step, glow, shake, rhythm, pull, makeSlip, gapScore }
})(typeof window !== 'undefined' ? window : globalThis)
