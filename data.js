// 恋みくじ v2: 本物の形のおみくじ1枚（運勢・一句・総評・状況ごとの項目）。日英
window.D = (function () {
  const RANK = [
    { id: 'dk', ja: '大吉', en: 'Great Blessing', tier: 'g' },
    { id: 'ck', ja: '中吉', en: 'Middle Blessing', tier: 'g' },
    { id: 'sk', ja: '小吉', en: 'Small Blessing', tier: 'm' },
    { id: 'ki', ja: '吉', en: 'Blessing', tier: 'm' },
    { id: 'sue', ja: '末吉', en: 'Future Blessing', tier: 'm' },
    { id: 'kyo', ja: '凶', en: 'Curse', tier: 'b' },
  ]
  // 今日の運の出やすさ（大吉〜凶）。振り方で一段上下する
  const FATE = [16, 18, 18, 20, 16, 12]

  // 状況と、紙に載る項目（右から順に）
  const SIT = [
    { id: 'kata', ja: '片思い', en: 'Crush', items: ['aite', 'kokuhaku', 'machi', 'gan', 'place'] },
    { id: 'tsuki', ja: '付き合っている', en: 'Together', items: ['aite', 'kenka', 'endan', 'gan', 'place'] },
    { id: 'fuku', ja: '復縁したい', en: 'Want them back', items: ['fukuen', 'aite', 'machi', 'gan', 'place'] },
    { id: 'deai', ja: '出会いがない', en: 'No one yet', items: ['deai', 'machi', 'renai', 'gan', 'place'] },
    { id: 'futa', ja: '気になる人が二人', en: 'Torn between two', items: ['mayoi', 'aite', 'kokuhaku', 'gan', 'place'] },
    { id: 'kekkon', ja: '結婚したい', en: 'Want to marry', items: ['endan', 'kazoku', 'machi', 'gan', 'place'] },
  ]
  const LABEL = {
    aite: { ja: '相手の心', en: 'Their heart' }, kokuhaku: { ja: '告白', en: 'Confession' }, machi: { ja: '待ち人', en: 'Awaited one' },
    gan: { ja: '願望', en: 'Wish' }, place: { ja: '縁の場所', en: 'Lucky place' }, kenka: { ja: '争事', en: 'Quarrels' },
    endan: { ja: '縁談', en: 'Marriage' }, fukuen: { ja: '復縁', en: 'Reunion' }, deai: { ja: '出会い', en: 'Meeting' },
    renai: { ja: '恋愛', en: 'Love' }, mayoi: { ja: '迷い', en: 'Choosing' }, kazoku: { ja: '家族', en: 'Family' },
  }
  // [日本語, 英語]。g=大吉中吉 m=小吉吉末吉 b=凶
  const T = {
    aite: {
      g: [['あなたを思う。言葉にするのが下手なだけ', 'They think of you. They are just bad at saying it.'], ['好意あり。あなたの話を三日後に思い出し笑い', 'They like you. They laugh about your story three days later.'], ['心は近い。返事が早くなる', 'Close at heart. Their replies get faster.'], ['気にかけている。あなたの好物を覚えている', 'They care. They remember your favorite food.']],
      m: [['まだ決めかねている。押しすぎず引きすぎず', 'Still undecided. Do not push or pull too hard.'], ['嫌ってはいない。ただ今は眠い', 'They do not dislike you. They are just sleepy.'], ['好意はある。量は小さじ一杯', 'There is affection. About one teaspoon.'], ['揺れている。天気のように変わりやすい', 'Wavering, like the weather.']],
      b: [['今は遠い。追えば逃げる', 'Far for now. Chase and they run.'], ['別のことで頭がいっぱい。主に昼ごはん', 'Busy with other thoughts. Mostly lunch.'], ['気づいていない。存在ごと', 'They have not noticed. You, at all.'], ['心が閉じている。急がず時を待て', 'Their heart is closed. Wait, do not rush.']],
    },
    kokuhaku: {
      g: [['吉。晴れた夕方に伝えよ', 'Good. Tell them on a clear evening.'], ['想いは届く。噛んでも届く', 'It reaches them. Even if you stumble.'], ['時は満ちた。長文を送るな、会って言え', 'The time is right. No long texts. Say it in person.'], ['叶う。言う前に鏡を一度見よ', 'It works. Check a mirror once first.']],
      m: [['急ぐな。もう少し話してから', 'No rush. Talk a little more first.'], ['半分届く。残りは笑顔で補え', 'Half of it lands. Make up the rest with a smile.'], ['時期を待て。月末は避けよ', 'Wait. Avoid the end of the month.'], ['言葉より行いで示せ', 'Show it through actions, not words.']],
      b: [['控えよ。勢いの告白は風に消える', 'Hold back. An impulsive confession blows away.'], ['今は伝わらない。電波も悪い', 'It will not get through now. Bad signal too.'], ['待て。深夜の送信は朝に悔やむ', 'Wait. A midnight message is regretted by morning.'], ['見送れ。まず自分を整えよ', 'Let it pass. Sort yourself out first.']],
    },
    machi: {
      g: [['来る。ただし寝癖のまま', 'Arrives. With bed hair.'], ['来る。思ったより早く', 'Arrives, sooner than you think.'], ['来る。笑顔で、少し遅れて', 'Arrives smiling, a little late.'], ['近くにいる。顔を上げよ', 'Nearby. Look up.']],
      m: [['遅れて来る。道に迷っている', 'Arrives late. Lost on the way.'], ['来る。ただし電車を一本乗り過ごす', 'Arrives. After missing one train.'], ['来るが気づきにくい。眼鏡を拭け', 'Arrives, but easy to miss. Clean your glasses.'], ['便りが先。本人は後から', 'Word comes first. They come later.']],
      b: [['来ず。今は自分を磨く時', 'Not coming. Time to polish yourself.'], ['来ない。代わりに宅配便が来る', 'Not coming. A delivery comes instead.'], ['遅し。焦れば遠のく', 'Slow. Rushing pushes it away.'], ['来ず。むしろ去る', 'Not coming. In fact, leaving.']],
    },
    endan: {
      g: [['整う。両家の話もはずむ', 'It comes together. Both families get along.'], ['まとまる。日取りは春がよし', 'It works out. Spring is the season.'], ['良縁あり。紹介を断るな', 'A good match. Do not turn down introductions.'], ['進む。決め手は相手の母の笑顔', 'It moves forward. Their mother\'s smile decides it.']],
      m: [['急がば回れ。話はゆっくり進む', 'Slow and steady. It moves gradually.'], ['整うが手間取る。書類は二度確かめよ', 'It comes together with fuss. Check paperwork twice.'], ['まとまりかける。親戚の一言に注意', 'Nearly there. Beware of a relative\'s remark.'], ['時期尚早。まず二人で旅をせよ', 'Too early. Travel together first.']],
      b: [['今は動くな。足元を固めよ', 'Do not move now. Steady your footing.'], ['障りあり。言葉選びに気をつけよ', 'Obstacles. Choose your words with care.'], ['延びる。焦らず待て', 'Delayed. Wait calmly.'], ['見送れ。他に縁あり', 'Let it pass. Another match is out there.']],
    },
    gan: {
      g: [['叶う。思うより大きく', 'Fulfilled, bigger than you hope.'], ['叶う。人の助けあり', 'Fulfilled, with help from others.'], ['望み通り。ただし調子に乗るな', 'As you wish. Do not get carried away.'], ['叶う。お礼参りを忘れずに', 'Fulfilled. Come back to give thanks.']],
      m: [['叶うが遅い。気長に待て', 'Fulfilled, slowly. Be patient.'], ['半ば叶う。欲張れば逃す', 'Half fulfilled. Greed loses it.'], ['努力次第。三日坊主に注意', 'Depends on effort. Beware of quitting on day three.'], ['少しずつ叶う。毎日の小さな一歩', 'Bit by bit. A small step each day.']],
      b: [['今は叶い難し。願いを一つに絞れ', 'Hard for now. Narrow it to one wish.'], ['思うようにならず。焦りは禁物', 'Not as you hope. Do not rush.'], ['遠し。まずよく寝よ', 'Far off. Get some sleep first.'], ['叶わず。しかし次の芽あり', 'Not this time. A new bud is coming.']],
    },
    kenka: {
      g: [['起きても仲直りは早い', 'Even if it happens, you make up fast.'], ['争いなし。話せば分かる', 'No conflict. Talking settles it.'], ['勝ちを譲れば二人とも勝つ', 'Let them win and you both win.'], ['穏やか。争いの種は冷蔵庫のプリン程度', 'Calm. The worst fight is over the pudding in the fridge.']],
      m: [['小さな言い合いあり。食事の後に話せ', 'Small arguments. Talk after eating.'], ['言い過ぎに注意。一晩置け', 'Watch your words. Sleep on it.'], ['返事の遅さで揉める。気にするな', 'A slow reply causes friction. Let it go.'], ['譲り合えば収まる', 'Meeting halfway settles it.']],
      b: [['争い多し。正しさより優しさ', 'Many quarrels. Kindness over being right.'], ['揉める。原因は洗い物', 'Friction. Cause: the dishes.'], ['言葉が刺さる。今日は黙ってうなずけ', 'Words cut. Today, just nod.'], ['長引く。謝るなら先に', 'It drags on. Apologize first.']],
    },
    fukuen: {
      g: [['望みあり。相手も同じ思い出を見ている', 'There is hope. They look at the same memories.'], ['再び結ばれる兆し。昔の店へ', 'Signs of reuniting. Go to your old place.'], ['戻る道あり。同じ過ちはするな', 'There is a way back. Do not repeat mistakes.'], ['縁はまだ切れず', 'The bond is not cut yet.']],
      m: [['時を置け。半年後に風が変わる', 'Give it time. The wind changes in half a year.'], ['友として戻るのが先', 'Return as friends first.'], ['五分五分。決めるのはあなたの変わり方', 'Even odds. It depends on how you change.'], ['連絡は短く。思い出話は封印', 'Keep messages short. Seal away nostalgia.']],
      b: [['難し。新しい縁が近くに来ている', 'Difficult. A new connection is near.'], ['追うな。相手は新しい髪型', 'Do not chase. They have a new haircut.'], ['戻らず。写真の整理を始めよ', 'It will not return. Start sorting your photos.'], ['今は見送れ。心を休めよ', 'Let it go for now. Rest your heart.']],
    },
    deai: {
      g: [['あり。友人の誘いに乗れ', 'Yes. Accept a friend\'s invitation.'], ['近し。いつもと違う道で', 'Soon. On a different route than usual.'], ['多し。ただし全員と連絡先を交換するな', 'Plenty. Do not swap contacts with all of them.'], ['思わぬ所で。たぶん雨宿り中', 'In an unexpected place. Probably sheltering from rain.']],
      m: [['少しずつ増える。外へ出よ', 'Slowly increasing. Go outside.'], ['あるが気づかない。人の話を聞け', 'They are there, unnoticed. Listen to people.'], ['趣味の場に縁あり', 'A connection at a hobby gathering.'], ['遅い。先に部屋を片付けよ', 'Slow. Clean your room first.']],
      b: [['今は少なし。自分を整える時', 'Few for now. Time to work on yourself.'], ['ある。全員既婚', 'Plenty. All married.'], ['家にいては来ない', 'Not while you stay home.'], ['薄し。画面の外を見よ', 'Thin. Look beyond the screen.']],
    },
    renai: {
      g: [['実る。誠実さが鍵', 'It bears fruit. Sincerity is key.'], ['良し。笑い合える人を選べ', 'Good. Choose someone you laugh with.'], ['盛ん。もてる時期の入口', 'Thriving. The start of a popular phase.'], ['心が通う。焦らず育てよ', 'Hearts connect. Nurture it slowly.']],
      m: [['進みはゆるやか。二ミリずつ', 'Slow progress. Two millimeters at a time.'], ['迷いあり。心の声に従え', 'Some doubt. Follow your heart.'], ['平穏。刺激より安心を', 'Peaceful. Choose comfort over thrills.'], ['進む。ただし家の猫に妬かれる', 'It moves. Your cat gets jealous.']],
      b: [['迷い多し。決めるのは今ではない', 'Many doubts. Now is not the time to decide.'], ['滞る。まず暮らしを整えよ', 'Stalled. Sort out your daily life first.'], ['家の猫に負ける', 'You lose to your own cat.'], ['実らず。だが学びは大きい', 'No fruit. But big lessons.']],
    },
    mayoi: {
      g: [['答えは出ている。黙っていて楽な方', 'You know already. The one you can be silent with.'], ['会った後の帰り道の気分で決めよ', 'Decide by your mood on the way home.'], ['縁の強い方は自ずと分かる', 'The stronger bond will show itself.'], ['心が決まる日は近い', 'The day your heart decides is near.']],
      m: [['急いで決めるな。二人とも人である', 'Do not decide in haste. Both are people.'], ['比べるほど迷う。紙に書き出せ', 'The more you compare, the more lost. Write it down.'], ['どちらも半分。もう少し見よ', 'Both are half there. Watch a little longer.'], ['迷いは長引く。三人目に注意', 'Doubts linger. Beware of a third.']],
      b: [['二兎を追う者は一兎も得ず', 'Chase two rabbits, catch none.'], ['両方から返事が来ない', 'No reply from either.'], ['今は選ぶな。どちらも遠ざかる', 'Do not choose now. Both drift away.'], ['迷うより休め', 'Rest instead of agonizing.']],
    },
    kazoku: {
      g: [['喜ぶ。顔合わせは和やか', 'They are pleased. The meeting goes well.'], ['味方になる。母は既に乗り気', 'On your side. Mom is already excited.'], ['円満。親の話は長いが温かい', 'Harmonious. Parents talk long, but warmly.'], ['良し。手土産は甘いものを', 'Good. Bring sweets.']],
      m: [['時間がかかる。少しずつ話せ', 'It takes time. Talk bit by bit.'], ['賛成半分。父が無口', 'Half in favor. Dad is quiet.'], ['心配はされる。安心を見せよ', 'They worry. Show them peace of mind.'], ['並。親戚の質問攻めに備えよ', 'Average. Brace for relatives\' questions.']],
      b: [['反対あり。焦らず誠意を', 'Opposition. Be sincere, not hasty.'], ['今は話すな。時期を待て', 'Do not bring it up now. Wait.'], ['波風立つ。話すなら食後に', 'Waves ahead. Talk after a meal.'], ['理解され難し。まず自分の暮らしを', 'Hard to understand. Set your own life first.']],
    },
  }
  const PLACE = [
    ['駅の三番出口', 'Exit three of the station'], ['雨の日の本屋', 'A bookshop on a rainy day'], ['コンビニの冷凍庫の前', 'The convenience store freezer'], ['川沿いの道', 'A path along the river'],
    ['古い喫茶店の窓際', 'A window seat in an old cafe'], ['夜の公園のブランコ', 'A park swing at night'], ['図書館の二階', 'The library\'s second floor'], ['商店街の八百屋の前', 'The greengrocer on the shopping street'],
    ['ビルの屋上', 'A rooftop'], ['最寄り駅の改札の右', 'Right of your station\'s ticket gate'], ['銭湯の帰り道', 'The way home from the bathhouse'], ['花屋の前', 'In front of a flower shop'],
    ['深夜のコインランドリー', 'A laundromat late at night'], ['バス停のベンチ', 'A bench at the bus stop'], ['港の見える坂', 'A slope with a harbor view'], ['パン屋の行列', 'The line at a bakery'],
    ['美術館の出口', 'A museum exit'], ['神社の石段', 'The shrine\'s stone steps'], ['自販機の明かりの下', 'Under a vending machine\'s light'], ['映画館のいちばん後ろの席', 'The back row of a cinema'],
  ]
  // 一句（上の句・下の句・英訳）
  const WAKA = {
    g: [['春風に　ひらく花びら　待つ人の', '足音ちかく　胸ぞときめく', 'Petals open in the spring wind; the footsteps you await draw near.'], ['夕焼けの　空に結びし　赤き糸', 'ほどけぬままに　明日へつづく', 'The red string tied in the sunset sky runs on into tomorrow.'],
      ['雨あがり　傘をたたみて　見上ぐれば', '虹のふもとに　君の笑み見ゆ', 'After the rain, umbrella folded, a smile at the rainbow\'s foot.'], ['梅が枝に　鶯なきて　春近し', 'こころの窓を　そっとひらけよ', 'A warbler sings on the plum; open the window of your heart.'],
      ['月影の　さやかに照らす　帰り道', 'ふたつの影の　ひとつに重なる', 'Moonlight on the way home; two shadows become one.'], ['咲く花の　香りにさそわれ　ゆく道に', '思わぬ縁の　灯はともりけり', 'Following the blossoms\' scent, a light of fate on an unexpected path.'],
      ['朝露の　光る小道を　ゆく人に', '幸の便りの　風ぞ吹きくる', 'To one on the dewy path, a wind brings happy news.'], ['山桜　ひとめ見しより　忘られず', '結ぶえにしは　深くなりけり', 'Since one glimpse of mountain cherry, the bond grows deep.']],
    m: [['霧はれて　道は見えども　遠くあり', '一歩ずつこそ　歩みゆくべし', 'The fog clears; the road is long. Walk it one step at a time.'], ['秋の田の　実りを待ちて　種をまく', '急ぐ心を　しずめてぞ待て', 'Sow and wait for the harvest; calm your hurried heart.'],
      ['夕立の　過ぎゆくまでは　軒の下', '晴れ間を待ちて　外へ出でよ', 'Stay under the eaves until the shower passes.'], ['川の瀬に　小石ながるる　音きけば', 'とどまるもまた　ひとつの道', 'Pebbles in the stream: staying put is also a path.'],
      ['若竹の　伸びゆく先は　まだ見えず', '根をはる時と　心得て待て', 'Young bamboo cannot see its height yet. Now is for roots.'], ['寒き夜の　灯火ひとつ　ともしつつ', '春のおとずれ　静かに待たん', 'Light one lamp on a cold night and wait for spring.'],
      ['小舟こぐ　波はおだやか　なれど風', '向きを読みつつ　舵をとるべし', 'Calm waves, but read the wind and steer.'], ['つぼみなる　花は咲く日を　知らねども', '日を浴びるほど　色はふかまる', 'The bud knows not its day; more sun, deeper color.']],
    b: [['曇り空　月は隠れて　見えねども', '雲のむこうに　光はありけり', 'Clouds hide the moon, yet light remains beyond.'], ['冬枯れの　枝にも春の　芽はひそむ', '今はしずかに　時を待つべし', 'Bare branches hide spring buds. Wait quietly now.'],
      ['荒波に　小舟を出すは　危うけれ', '港に休み　風を見るべし', 'Rough seas are no place for a small boat. Rest in port.'], ['落ち葉ふる　道に迷いて　立ちどまる', 'ふりむけばそこに　帰り道あり', 'Lost among falling leaves, look back: the way home is there.'],
      ['雪ふかき　山路をゆけば　足とられ', 'ゆるりと進め　春は遠からじ', 'Deep snow trips your feet. Go slowly; spring is not far.'], ['夜ふけて　送る言葉は　風にちる', '朝日を待ちて　心ととのえ', 'Words sent late at night scatter. Wait for morning.'],
      ['割れし器も　継げば景色と　なりにけり', '傷を恐れず　手をのばすべし', 'A mended bowl becomes beauty. Do not fear scars.'], ['長雨に　洗われし道　ぬかるめど', '晴れたる後は　花ぞ咲くらん', 'Mud after long rain, but flowers after it clears.']],
  }
  const SOHYO = {
    dk: [['運気は満ちている。ただし浮かれて小指をぶつけるな', 'Luck is full. Do not stub your pinky celebrating.'], ['思い切ってよし。迷ったら前へ', 'Go boldly. If unsure, step forward.'], ['縁は向こうから来る。玄関を片付けておけ', 'Fate comes to you. Tidy your entrance.']],
    ck: [['良い流れ。焦らず続ければ実る', 'A good flow. Keep at it and it bears fruit.'], ['人の縁に恵まれる。お礼を惜しむな', 'Blessed with people. Do not hold back thanks.'], ['晴れ間多し。傘は置いていってよい', 'Mostly clear. Leave the umbrella.']],
    sk: [['小さな幸せを数えよ。一つ目はこのくじ', 'Count small joys. The first is this slip.'], ['控えめが吉。話は相手に七割させよ', 'Modesty wins. Let them talk seventy percent.'], ['少しずつ上向く。睡眠を削るな', 'Slowly rising. Do not cut sleep.']],
    ki: [['穏やかな運。日々の挨拶が縁を呼ぶ', 'Gentle luck. Daily greetings invite fate.'], ['悪くない。むしろ普通が一番むずかしい', 'Not bad. Ordinary is the hardest.'], ['平らな道。寄り道に縁あり', 'A flat road. Detours hold fate.']],
    sue: [['今は種まきの時。花はのちに咲く', 'Time to sow. Flowers come later.'], ['後から良くなる。いつかは言えない', 'Better later. When, we cannot say.'], ['遅咲きの運。急がず整えよ', 'Late-blooming luck. Prepare calmly.']],
    kyo: [['今は守りの時。無理せず自分をいたわれ', 'Time to defend. Be gentle with yourself.'], ['焦れば裏目。一晩寝てから決めよ', 'Haste backfires. Sleep before deciding.'], ['底にいる時は上るだけ。結んで帰れ', 'At the bottom, only up. Tie this and go home.']],
  }
  const RITUAL = {
    up: { ja: '間よく三度振れた。運が一段上がった', en: 'Three even shakes. Luck rose one step.' },
    same: { ja: '振り方は並。くじのまま', en: 'An ordinary shake. The slip stands as is.' },
    down: { ja: '振り急いだ。運が一段下がった', en: 'Rushed. Luck dropped one step.' },
    greed: { ja: '本日三度目。神主さんがこちらを見ている', en: 'Third time today. The priest is watching.' },
  }
  const LINES = {
    slow: { ja: ['ゆっくり、三度です', '落ち着いて', '箱が驚いています'], en: ['Slowly. Three times.', 'Calm down.', 'The box is startled.'] },
    greed: { ja: ['……どうぞ', '本日は三度目ですね'], en: ['...Go ahead.', 'Third today, I see.'] },
  }
  const UI = {
    ja: {
      title: '恋みくじ', sub: '夕暮れの神社で、一日一枚', start: 'くじを引く', how: '引き方', book: '引いた運勢', back: 'もどる', load: 'みくじを振っています',
      askName: 'お名前', namePh: '書かなくてもよい', nameNote: 'どこにも送らず、残しません', askSit: 'いまの恋', go: '箱を振る',
      tShake: '願いを思いながら、ゆっくり三度', tPull: '光が満ちた時に棒を引く', tOpen: '紙を開く',
      san: 'さん', no: n => `第${n}番`, tie: '結び処に結ぶ', tied: '結んで帰った', save: '画像で持ち帰る', post: 'Xでポスト',
      again: '今日はもう一回だけ', tomorrow: 'また明日', greed: 'どうしても引く',
      affBtn: '本当の恋愛運を占い師に見てもらう', affNote: '17歳以上', sohyo: '総評',
      postText: (sit, rank, it) => `恋みくじを引いた。${sit}、${rank}。${it} #恋みくじ`,
      howBody: ['<b>1.</b> お名前（書かなくてもよい）と、いまの恋を選ぶ', '<b>2.</b> 願いを思いながら、箱をゆっくり三度振る。間がそろうほど良い。急ぐと運が一段下がる', '<b>3.</b> 棒が光る。光が満ちた時に引くと運が上がる。紙を開いて読む。凶は結び処に結んで帰る', '引けるのは一日に二度まで。'],
      credits: '音: Kenney / rubberduck / PWL / IgnasD / Kistol / Joseph Sardin（すべて CC0）。この神社は架空です', privacy: 'プライバシー',
      got: (n, m) => `${n} / ${m}`, none: 'まだ引いていない',
    },
    en: {
      title: 'Love Fortune Slip', sub: 'One slip a day, at a shrine at dusk', start: 'Draw a slip', how: 'How to draw', book: 'Your fortunes', back: 'Back', load: 'Shaking the box',
      askName: 'Your name', namePh: 'Optional', nameNote: 'Never sent, never saved', askSit: 'Your love life', go: 'Shake the box',
      tShake: 'Make a wish. Shake slowly, three times', tPull: 'Pull the stick when the glow is full', tOpen: 'Open the paper',
      san: '', no: n => `No. ${n}`, tie: 'Tie it at the rack', tied: 'Tied and left behind', save: 'Save image', post: 'Post on X',
      again: 'One more today', tomorrow: 'Come back tomorrow', greed: 'Draw anyway',
      affBtn: 'Get a real love reading from a fortune teller', affNote: 'Ages 17+', sohyo: 'Overall',
      postText: (sit, rank, it) => `I drew a love fortune. ${sit}: ${rank}. ${it} #LoveFortuneSlip`,
      howBody: ['<b>1.</b> Enter your name (optional) and pick your situation.', '<b>2.</b> Make a wish and shake the box slowly, three times. Even timing helps. Rushing lowers your luck one step.', '<b>3.</b> The stick glows. Pull when the glow is full to raise your luck. Open the slip and read. Tie a curse at the rack.', 'Two draws a day.'],
      credits: 'Sounds: Kenney / rubberduck / PWL / IgnasD / Kistol / Joseph Sardin (all CC0). The shrine is fictional.', privacy: 'Privacy',
      got: (n, m) => `${n} / ${m}`, none: 'Not drawn yet',
    },
  }
  return { RANK, FATE, SIT, LABEL, T, PLACE, WAKA, SOHYO, RITUAL, LINES, UI }
})()
