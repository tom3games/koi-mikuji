// 遊び方ごとの分布。node sim.mjs  （ブラウザは開かない）
// 押す間隔は pace＋見てから押す遅れ0.05秒。smart=0.35秒おき・tempo22=0.22秒・fast=0.2秒・fast15=0.15秒、反応の遅れ 0.15〜0.3秒。連打=1秒に14回
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const ROOT = import.meta.dirname
const ctx = { console }; ctx.globalThis = ctx; ctx.window = ctx
vm.createContext(ctx)
vm.runInContext(readFileSync(ROOT + '/data.js', 'utf8'), ctx)
vm.runInContext(readFileSync(ROOT + '/logic.js', 'utf8'), ctx)
const { D, KM } = ctx
const DT = 1 / 60

function mkRand(seed) { let a = seed * 9301 + 49297; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280 } }

// bot は「次に押せる時刻」を持ち、その時刻が来たら今の画面を見て1回押す
const BOTS = {
  idle: () => () => null,
  spam: () => S => S.folded ? 'slip' : S.stick ? 'stick' : S.crow && false ? 'crow' : 'box',
  // 光を待たずにすぐ抜く（振る速さは普通）
  eager: (o = {}) => S => S.folded ? 'slip' : S.ex ? 'box' : S.crow && o.tie ? 'crow' : S.pend && o.tie ? 'rack' : S.stick ? 'stick' : 'box',
  // 落ち着いて振り、光が強い時に抜く。凶は祟りを見て決める（元恋人は結ぶ、カラスは追い払う）
  smart: (o = {}) => (S, me) => {
    if (S.folded) return 'slip'
    if (S.ex) return 'box'
    if (S.crow) return 'crow'
    if (S.pend) {
      const tie = o.tie === 'always' ? true : o.tie === 'never' ? false : /ex/.test(S.pend)
      return tie ? 'rack' : 'box'
    }
    if (S.stick) {
      const v = KM.glow(S), rising = (S.t - S.cyc.s) / S.cyc.len < 0.5
      // 人間は光の強まりを見て、ピークの少し手前で押す（反応の遅れは押す時刻の遅れで入る）
      if (v > (o.th || 0.55) * S.cyc.amp && rising && (S.cyc.amp > 0.85 || S.t - S.stick.t > 1.6)) return 'stick'
      return null
    }
    return 'box'
  },
}
const PACE = { idle: [1, 0], spam: [1 / 14, 0.01], eager: [0.3, 0.06], eagerTie: [0.3, 0.06], tempo22: [0.17, 0.015], fast15: [0.1, 0.01], smart: [0.3, 0.06], smartNoTie: [0.3, 0.06], smartAllTie: [0.3, 0.06], fast: [0.15, 0.03] }

function run(kind, seed) {
  const S = KM.create(D, seed, [])
  const r = mkRand(seed + 7)
  const brain = kind === 'smartNoTie' ? BOTS.smart({ tie: 'never' }) : kind === 'smartAllTie' ? BOTS.smart({ tie: 'always' }) : kind === 'fast' || kind === 'tempo22' || kind === 'fast15' ? BOTS.smart() : kind === 'eagerTie' ? BOTS.eager({ tie: 1 }) : BOTS[kind]()
  const [pace, jit] = PACE[kind]
  let next = 0.4, pending = null
  while (!S.over) {
    KM.step(S, DT)
    if (pending && S.t >= pending.at) {
      const a = pending.a; pending = null
      if (a === 'box') KM.tapBox(S); else if (a === 'stick') KM.tapStick(S); else if (a === 'slip') KM.tapSlip(S); else if (a === 'rack') KM.tapRack(S); else if (a === 'crow') KM.tapCrow(S)
      next = S.t + pace + (r() * 2 - 1) * jit
    }
    if (!pending && S.t >= next) {
      const a = brain(S)
      // 見てから押すまでの遅れ（連打は見ていないので遅れなし）
      if (a) pending = { a, at: S.t + (kind === 'spam' || kind === 'idle' ? 0 : a === 'stick' ? 0.18 + r() * 0.2 : 0.05) }
      else next = S.t + DT
    }
    S.ev.length = 0
  }
  const lv = KM.level(D, S)
  return { pts: S.pts, lv: lv.i, draws: S.draws, jams: S.jams, tied: S.tied, stolen: S.stolen, dk: S.ranks.dk, bad: S.ranks.kyo + S.ranks.dkyo, rare: S.rare, got: S.got.length }
}

const N = 12, out = {}
for (const k of ['idle', 'spam', 'eager', 'eagerTie', 'fast15', 'fast', 'tempo22', 'smartNoTie', 'smartAllTie', 'smart']) {
  const rs = Array.from({ length: N }, (_, i) => run(k, 1000 + i * 37))
  const avg = f => +(rs.reduce((a, x) => a + x[f], 0) / N).toFixed(1)
  out[k] = { pts: avg('pts'), min: Math.min(...rs.map(x => x.pts)), max: Math.max(...rs.map(x => x.pts)), lv: avg('lv'), draws: avg('draws'), jams: avg('jams'), dk: avg('dk'), bad: avg('bad'), tied: avg('tied'), stolen: avg('stolen'), rare: avg('rare') }
}
// 同じ種なら同じ結果（再現性）
const a = run('smart', 42), b = run('smart', 42)
out.repeatable = JSON.stringify(a) === JSON.stringify(b)
console.table(out)
if (process.argv.includes('--json')) console.log(JSON.stringify(out))
export default out
