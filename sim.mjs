// 振り方ごとの運の動き。node sim.mjs [--json]  （ブラウザは開かない）
// 丁寧=0.6秒おきに3回振り、光が強い時（反応0.18〜0.38秒の遅れ込み）に引く / 急ぐ=0.15秒おきに連打してすぐ引く / 適当=間もタイミングもばらばら
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const ROOT = import.meta.dirname
const ctx = { console }; ctx.globalThis = ctx; ctx.window = ctx
vm.createContext(ctx)
vm.runInContext(readFileSync(ROOT + '/data.js', 'utf8'), ctx)
vm.runInContext(readFileSync(ROOT + '/logic.js', 'utf8'), ctx)
const { D, KM } = ctx
const DT = 1 / 60

function run(kind, seed) {
  const R = KM.ritual(seed), r = KM.rng(seed * 7 + 1)
  let next = 0.3, waitPull = null, tries = 0
  while (R.t < 20 && tries < 4000) {
    tries++
    KM.step(R, DT)
    if (!R.stick && R.t >= next) {
      KM.shake(R)
      next = R.t + (kind === 'careful' ? 0.55 + r() * 0.1 : kind === 'rush' ? 0.07 + r() * 0.03 : 0.1 + r() * 1.6)
    }
    if (R.stick) {
      if (kind === 'careful') {
        const c = R.cyc, ph = (R.t - c.s) / c.len
        if (waitPull == null && c.amp > 0.8 && ph > 0.22 && ph < 0.4) waitPull = R.t + 0.18 + r() * 0.2
      } else if (waitPull == null) waitPull = R.t + (kind === 'rush' ? 0.05 : r() * 2)
      if (waitPull != null && R.t >= waitPull) return KM.pull(R)
    }
  }
  return null
}
const N = 200, out = {}
for (const k of ['careful', 'random', 'rush']) {
  const rs = Array.from({ length: N }, (_, i) => run(k, 100 + i * 13)).filter(Boolean)
  const c = s => rs.filter(x => x.shift === s).length / rs.length
  out[k] = { up: +c(1).toFixed(2), same: +c(0).toFixed(2), down: +c(-1).toFixed(2), q: +(rs.reduce((a, x) => a + x.q, 0) / rs.length).toFixed(2) }
}
// 運勢の分布（振り方なし）と、同じ日・名前・状況・回数なら同じ紙
const dist = [0, 0, 0, 0, 0, 0]
for (let i = 0; i < 3000; i++) dist[KM.makeSlip({ D, date: '2026-11-0' + (i % 9), name: 'x' + i, sit: D.SIT[i % 6].id, n: 0 }).idx]++
out.rankPct = dist.map(n => Math.round(n / 30))
const a = KM.makeSlip({ D, date: '2026-11-09', name: 'ゆき', sit: 'kata', n: 0 }), b = KM.makeSlip({ D, date: '2026-11-09', name: 'ゆき', sit: 'kata', n: 0 })
out.repeatable = JSON.stringify(a) === JSON.stringify(b)
// 続けて引いても同じ文が続かない（直近の紙の文を避ける）
let recent = [], dup = 0
for (let i = 0; i < 40; i++) { const s = KM.makeSlip({ D, date: 'd' + i, name: '', sit: 'kata', n: 0, recent }); if (s.used.some(u => recent.slice(-12).includes(u))) dup++; recent = recent.concat(s.used).slice(-24) }
out.repeatsIn40 = dup
console.log(JSON.stringify(out, null, 1))
if (process.argv.includes('--json')) console.log(JSON.stringify(out))
