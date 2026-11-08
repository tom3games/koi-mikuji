// 恋みくじ連打: くじの文・段位・画面の文言（日英）
window.D = (function () {
  const R = {
    dk: { ja: '大吉', en: 'Great Luck', p: 3, c: '#c4402a' },
    ki: { ja: '吉', en: 'Good Luck', p: 2, c: '#c4402a' },
    sk: { ja: '小吉', en: 'Small Luck', p: 1, c: '#8a5a2b' },
    sue: { ja: '末吉', en: 'Future Luck', p: 0, c: '#8a5a2b' },
    kyo: { ja: '凶', en: 'Bad Luck', p: 0, c: '#2b3a55', bad: true },
    dkyo: { ja: '大凶', en: 'Terrible Luck', p: 0, c: '#1b2235', bad: true },
  }
  const C = {
    machi: { ja: '待ち人', en: 'Awaited one' }, renai: { ja: '恋愛', en: 'Love' }, endan: { ja: '縁談', en: 'Marriage' },
    deai: { ja: '出会い', en: 'Encounters' }, unsei: { ja: '恋愛運', en: 'Love luck' },
  }
  // [id, 段, 項目, 日本語, 英語, 珍しい(金の光でだけ出る), 祟り]
  const L = [
    ['dk1', 'dk', 'machi', '来る。三人同時に来る', 'Arrives. Three of them at once.'],
    ['dk2', 'dk', 'renai', '向こうから告白される。しかも敬語で', 'They confess first. Very politely.'],
    ['dk3', 'dk', 'endan', '両家の親が先に仲良くなる', 'Both sets of parents become friends first.'],
    ['dk4', 'dk', 'renai', '目が合っただけで両想い', 'One glance and it is mutual.'],
    ['dk5', 'dk', 'machi', '来る。花束を持って走って来る', 'Arrives, running, holding flowers.'],
    ['dk6', 'dk', 'deai', 'コンビニのレジで運命が起きる', 'Destiny happens at a convenience store register.'],
    ['dk7', 'dk', 'endan', '相手の猫もあなたを気に入る', 'Their cat approves of you too.'],
    ['dk8', 'dk', 'renai', '既読が1秒でつく', 'They read your messages within one second.'],
    ['dk9', 'dk', 'machi', 'もう隣にいる。気づけ', 'Already next to you. Notice.', 1],
    ['dk10', 'dk', 'renai', '赤い糸、太さ3センチ', 'Your red string of fate is 3 cm thick.', 1],
    ['dk11', 'dk', 'endan', '式場の予約が向こうから空く', 'The wedding venue clears its own calendar.', 1],

    ['ki1', 'ki', 'renai', '好かれる。理由は声が大きいから', 'You will be liked. Because you are loud.'],
    ['ki2', 'ki', 'machi', '来る。少し遅れて、言い訳つきで', 'Arrives a little late, with excuses.'],
    ['ki3', 'ki', 'deai', '傘を貸すと始まる。傘は返ってこない', 'Lend an umbrella and it begins. The umbrella never returns.'],
    ['ki4', 'ki', 'endan', 'まとまる。ただし話が長い', 'It works out. The speeches run long.'],
    ['ki5', 'ki', 'renai', 'デートは雨。それでも楽しい', 'Rain on the date. Fun anyway.'],
    ['ki6', 'ki', 'machi', '来る。名前を一回まちがえる', 'Arrives. Gets your name wrong once.'],
    ['ki7', 'ki', 'renai', '手料理をほめられる。カップ麺だけど', 'They praise your cooking. It was cup noodles.'],
    ['ki8', 'ki', 'endan', '隣の席の人。ただし気づくのは10年後', 'The person in the next seat. You notice in 10 years.', 1],
    ['ki9', 'ki', 'deai', '落とした小銭を拾った人と結ばれる', 'You end up with whoever picks up your dropped coins.', 1],

    ['sk1', 'sk', 'renai', '進展あり。2ミリ', 'Progress. Two millimeters.'],
    ['sk2', 'sk', 'machi', '来る。来たけど帰る', 'Arrives. Then goes home.'],
    ['sk3', 'sk', 'deai', 'ある。相手は道を聞きたいだけ', 'Yes. They only want directions.'],
    ['sk4', 'sk', 'renai', 'やりとりは続く。スタンプだけで', 'The chat continues. Stickers only.'],
    ['sk5', 'sk', 'endan', '友達の友達の、そのまた友達', 'A friend of a friend of a friend.'],
    ['sk6', 'sk', 'renai', 'ほめられる。前髪だけ', 'You get a compliment. On your bangs.'],
    ['sk7', 'sk', 'machi', '来る。来世で', 'Arrives. Next life.', 1],

    ['sue1', 'sue', 'renai', 'いつか良くなる。いつかは言えない', 'It gets better someday. Which day, we cannot say.'],
    ['sue2', 'sue', 'machi', '来ず。代わりに請求書が来る', 'Not coming. A bill comes instead.'],
    ['sue3', 'sue', 'deai', '合コンで幹事とだけ仲良くなる', 'At the mixer you bond with the organizer. Only.'],
    ['sue4', 'sue', 'endan', '話は出る。親戚の集まりでだけ', 'It comes up. Only at family gatherings.'],
    ['sue5', 'sue', 'renai', '夢に出てくる。あなたの夢に', 'They appear in a dream. Yours.'],
    ['sue6', 'sue', 'machi', '迷っている。地図アプリを見ろ', 'Lost on the way. Tell them to open a map.'],
    ['sue7', 'sue', 'renai', '好みが急に変わる。明日から鳥', 'Your type suddenly changes. Birds, from tomorrow.', 1],

    ['kyo1', 'kyo', 'machi', '来ず。むしろ去る', 'Not coming. In fact, leaving.', 0, 'crow'],
    ['kyo2', 'kyo', 'unsei', '家の猫に負ける', 'You lose to your own cat.', 0, 'crow'],
    ['kyo3', 'kyo', 'deai', 'ある。全員既婚', 'Plenty. All married.', 0, 'ex'],
    ['kyo4', 'kyo', 'renai', '告白は届く。別の人に', 'Your confession arrives. To someone else.', 0, 'crow'],
    ['kyo5', 'kyo', 'endan', '先方の都合で延期。永遠に', 'Postponed on their side. Forever.', 0, 'ex'],
    ['kyo6', 'kyo', 'renai', '既読はつく。返事はつかない', 'Read. Not answered.', 0, 'crow'],
    ['kyo7', 'kyo', 'machi', '来る。元恋人だった', 'Arrives. It is your ex.', 0, 'ex'],
    ['kyo8', 'kyo', 'renai', '好きな人の好きな人が、あなたの母', 'The one you like likes your mom.', 1, 'ex'],

    ['dkyo1', 'dkyo', 'renai', '今年の恋は全部夢オチ', 'Every romance this year turns out to be a dream.', 0, 'crow2'],
    ['dkyo2', 'dkyo', 'machi', '来ない。住所を変えた', 'Not coming. They moved.', 0, 'ex2'],
    ['dkyo3', 'dkyo', 'endan', '縁が切れる。糸が物理的に切れる', 'The bond breaks. The string physically snaps.', 0, 'crow2'],
    ['dkyo4', 'dkyo', 'deai', '運命の人とすれ違う。あなたは寝ている', 'You pass your soulmate. You are asleep.', 0, 'ex2'],
    ['dkyo5', 'dkyo', 'renai', 'モテ期が来る。昨日終わった', 'Your popular phase came. It ended yesterday.', 0, 'ex2'],
    ['dkyo6', 'dkyo', 'renai', '送る長文が全部誤字', 'Every long message you send is a typo.', 0, 'crow2'],
    ['dkyo7', 'dkyo', 'machi', '来ない。代わりにカラスが来る', 'Not coming. A crow comes instead.', 1, 'crow2'],
    ['dkyo8', 'dkyo', 'unsei', 'くじを引きすぎ。縁が渋滞', 'Too many fortunes drawn. Your fate is stuck in traffic.', 1, 'ex2'],
  ]
  const SLIPS = L.map(([id, r, c, ja, en, rare, curse]) => ({ id, r, c, t: { ja, en }, rare: !!rare, curse: curse || null }))

  // 縁結びの段位（点が足りるところまで）
  const LV = [
    { min: 0, ja: '縁、ゼロ', en: 'Zero Ties', sja: '神主さんが同情している', sen: 'The priest feels for you.' },
    { min: 1, ja: '小指に糸くず', en: 'Lint on Your Pinky', sja: '糸と呼ぶにはまだ早い', sen: 'Too early to call it a string.' },
    { min: 4, ja: '糸が見えてきた', en: 'A Thread Appears', sja: '目をこらせば見える', sen: 'Visible if you squint.' },
    { min: 8, ja: '片想いの蝶結び', en: 'One-Sided Bow', sja: '引っぱるとほどける', sen: 'Comes undone if pulled.' },
    { min: 14, ja: '両想いの固結び', en: 'Mutual Square Knot', sja: 'もうほどけない', sen: 'It will not come loose.' },
    { min: 21, ja: '運命の赤い糸', en: 'Red String of Fate', sja: '小指が少し重い', sen: 'Your pinky feels heavy.' },
    { min: 29, ja: '赤い糸ぐるぐる巻き', en: 'Wrapped in Red String', sja: '手首まで巻かれている', sen: 'It reaches your wrist.' },
    { min: 38, ja: '結ばれすぎて動けない', en: 'Too Tied to Move', sja: '神主さんがほどきに来た', sen: 'The priest came to untie you.' },
  ]
  const NOPLAY = { ja: '引いてもいない', en: 'Did Not Even Draw', sja: '箱は振らないと出ない', sen: 'The box needs shaking.' }

  // 遊び中の一言（12字前後）
  const LINES = {
    priest: { ja: ['振りすぎです', 'お一人様、落ち着いて', '箱が泣いています', '欲が顔に出てます', '一回で十分です'], en: ['Too much shaking.', 'Please calm down.', 'The box is crying.', 'Your greed shows.', 'Once is enough.'] },
    peek: { ja: ['……'], en: ['...'] },
    ex: { ja: ['久しぶり', 'ちょっと話そ', '今なにしてるの', '髪切った？', '変わってないね', 'じゃ、また'], en: ['Long time.', 'Got a minute?', 'What are you up to?', 'New haircut?', 'You never change.', 'See you.'] },
    ex2: { ja: ['紹介するね', 'こっち、今の恋人', '式には呼ぶね', '幸せになってね'], en: ['Meet my partner.', 'This is them.', 'You are invited.', 'Be happy, okay?'] },
    crow: { ja: ['カァ'], en: ['Caw'] },
    end: { ja: '本日は閉門です', en: 'The shrine is closing.' },
  }

  const UI = {
    ja: {
      title: '恋みくじ連打', sub: '閉門まで45秒。引けるだけ引け', start: '引きに行く', how: '遊び方', book: '図鑑', back: 'もどる',
      load: 'みくじを振っています', close: '閉門まで', en: '縁', yen: '円',
      howBody: [
        '<b>1.</b> 箱をトン、トンと振る。速く振りすぎると詰まって、神主さんに止められる',
        '<b>2.</b> 棒が出たら、光った瞬間に抜く。光が強いほど良いくじ。たまに来る金の光では珍しいくじが出る',
        '<b>3.</b> 凶は右の結び処を3回押して結べば帳消し。結ばずに箱を振ると、カラスや元恋人が来る',
      ],
      tut: { shake: 'トン、トン、と箱を振る', pull: '光った瞬間に棒を押して抜く', open: '紙を押して開く', tie: '凶は結び処に3回で帳消し', gold: '金の光は珍しいくじ' },
      curse: { crow: '結ばないと|カラス', crow2: '結ばないと|カラス2羽', ex: '結ばないと|元恋人', ex2: '結ばないと|元恋人と|今の恋人' },
      tieHere: '結ぶ', stolen: '持っていかれた', jam: '詰まった', rack: '結び処', exTag: ['元カレ', '元カノ'], newTag: '今の恋人',
      result: '縁結び判定', drew: '引いた', times: '回', tied: '結んだ', cost: 'おみくじ代', bestSlip: 'いちばんの一枚', best: 'これまでの最高',
      save: '画像を保存', post: 'Xでポスト', again: 'もう一回', got: (n, m) => `集めた ${n} / ${m}`, locked: 'まだ引いていない', rare: '珍',
      affBtn: '本当の恋愛運、占ってみる？', affNote: '17歳以上',
      postText: (lv, n, slip) => `恋みくじを45秒で${n}回引いた。縁結びは「${lv}」。いちばんの一枚「${slip}」 #恋みくじ連打`,
      credits: '音: Kenney / rubberduck / PWL / fvcalderan / zeroisnotnull / IgnasD / VishwaJai / Kistol / Joseph Sardin（すべて CC0）。この神社は架空です',
      privacy: 'プライバシー', pc: false,
    },
    en: {
      title: 'Love Fortune Frenzy', sub: '45 seconds until closing. Draw all you can.', start: 'Go draw', how: 'How to play', book: 'Collection', back: 'Back',
      load: 'Shaking the box', close: 'Closing in', en: 'Ties', yen: '',
      howBody: [
        '<b>1.</b> Shake the box with steady taps. Shake too fast and it jams, and the priest stops you.',
        '<b>2.</b> When a stick slides out, pull it the moment it glows. Brighter glow, better fortune. A rare gold glow brings rare fortunes.',
        '<b>3.</b> Bad luck? Tap the tying rack on the right 3 times to cancel it. Shake again without tying and a crow or your ex shows up.',
      ],
      tut: { shake: 'Tap the box, steady', pull: 'Pull it when it glows', open: 'Tap the paper to open', tie: 'Tie bad luck: rack x3', gold: 'Gold glow: rare fortune' },
      curse: { crow: 'If untied:|a crow', crow2: 'If untied:|two crows', ex: 'If untied:|your ex', ex2: 'If untied:|ex and|new partner' },
      tieHere: 'Tie', stolen: 'Stolen', jam: 'Jammed', rack: 'Tying rack', exTag: ['Ex', 'Ex'], newTag: 'New partner',
      result: 'Your Ties', drew: 'Drawn', times: '', tied: 'Tied', cost: 'Spent', bestSlip: 'Best fortune', best: 'Best so far',
      save: 'Save image', post: 'Post on X', again: 'Again', got: (n, m) => `Found ${n} / ${m}`, locked: 'Not drawn yet', rare: 'Rare',
      affBtn: 'Want a real love reading?', affNote: 'Ages 17+',
      postText: (lv, n, slip) => `I drew ${n} love fortunes in 45 seconds. Result: "${lv}". Best one: "${slip}" #LoveFortuneFrenzy`,
      credits: 'Sounds: Kenney / rubberduck / PWL / fvcalderan / zeroisnotnull / IgnasD / VishwaJai / Kistol / Joseph Sardin (all CC0). The shrine is fictional.',
      privacy: 'Privacy',
    },
  }
  return { R, C, SLIPS, LV, NOPLAY, LINES, UI, ORDER: ['dk', 'ki', 'sk', 'sue', 'kyo', 'dkyo'] }
})()
