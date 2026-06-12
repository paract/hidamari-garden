import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "陽だまりの庭 | 朝活×Web3コミュニティ",
  description:
    "毎朝5:30からのスペースに参加するだけ。続けた分だけ、デジタルな価値が積み上がっていく。朝活×Web3のコミュニティ「陽だまりの庭」へようこそ。",
  // Discord・LINE・X でリンクをシェアしたときにプレビューを表示する
  openGraph: {
    title: "陽だまりの庭 | 朝活×Web3コミュニティ",
    description:
      "毎朝5:30からのスペースに参加するだけ。続けた分だけ、デジタルな価値が積み上がっていく。",
    url: "https://atsc-hidamari.vercel.app/lp",
    siteName: "陽だまりの庭",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "陽だまりの庭 | 朝活×Web3コミュニティ",
    description:
      "毎朝5:30からのスペースに参加するだけ。続けた分だけ、デジタルな価値が積み上がっていく。",
  },
};

const DISCORD_URL = "https://discord.gg/2UjQryVDd8";
const START_URL = "/start";

// ──────────────────────────────────────────────
const pains = [
  { icon: "😔", text: "朝活を始めたいけど、ひとりだと続かない…" },
  { icon: "😮‍💨", text: "毎朝起きても、何かを「積み上げている」感覚がない" },
  { icon: "🤔", text: "Web3に興味はあるけど、難しそうで踏み出せない" },
  { icon: "😞", text: "続けても、努力が形に残らないもどかしさがある" },
];

const features = [
  {
    icon: "🌅",
    title: "毎朝5:30スタート",
    body: "Xのスペースで少人数の朝活を開催。「おはよう」と声をかけるだけで1日が変わります。",
  },
  {
    icon: "🔑",
    title: "合言葉でATSCを獲得",
    body: "参加するたびに、その日だけの合言葉をゲット。Discordで入力すると自動で報酬が届きます。",
  },
  {
    icon: "🪙",
    title: "継続が資産になる",
    body: "ATSCはブロックチェーン上に記録される本物の価値。参加した証がずっと残ります。",
  },
  {
    icon: "🤝",
    title: "初心者でも安心",
    body: "ウォレット作成も1クリック。MetaMaskも秘密鍵も不要。Discordアカウントだけで始められます。",
  },
];

const steps = [
  {
    number: "01",
    title: "Discordに参加する",
    body: "招待リンクからサーバーへ。認証を完了するとチャンネルが開放されます。",
  },
  {
    number: "02",
    title: "ウォレットを登録する",
    body: "#ats_check-in で「!登録」と送るだけ。1クリックで完了します。",
  },
  {
    number: "03",
    title: "毎朝の朝活に参加する",
    body: "スペースで合言葉をゲットして、Discordで入力。ATSCが自動で届きます。",
  },
];

const stats = [
  { value: "5:30", label: "毎朝スペース開始時刻" },
  { value: "3 ATSC", label: "1回の参加で獲得できる報酬" },
  { value: "Polygon", label: "採用ブロックチェーン（低コスト・高速）" },
  { value: "1クリック", label: "ウォレット登録の手間" },
];

// ──────────────────────────────────────────────

export default function LpPage() {
  return (
    <main className="bg-white text-gray-800 overflow-x-hidden">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-900 via-amber-700 to-orange-500">

        {/* 背景グロー */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-amber-400 opacity-20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-orange-300 opacity-15 blur-[100px]" />
          <div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full bg-yellow-200 opacity-10 blur-[80px]" />
        </div>

        {/* 放射状の光（全ブラウザ対応のグラデーションで代替） */}
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            background:
              "radial-gradient(ellipse at 50% 120%, rgba(255,255,255,0.6) 0%, transparent 60%)",
          }}
        />

        {/* コンテンツ：PC は左右分割 */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-16">

          {/* ── 左：テキスト ── */}
          <div className="flex-1 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-amber-100 text-sm font-semibold tracking-widest px-4 py-2 rounded-full mb-8">
              🌸 陽だまりの庭
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-8">
              毎朝5分が<br />
              <span className="whitespace-nowrap">あなたの<span className="text-amber-200">資産</span>になる。</span>
            </h1>
            <p className="text-amber-100 text-base sm:text-lg lg:text-xl leading-8 lg:leading-9 mb-10 max-w-lg mx-auto lg:mx-0">
              朝活に参加するたびに、<br className="hidden sm:block" />
              ブロックチェーン上に記録が残る。<br />
              続けた分だけ、目に見える価値が積み上がっていく。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-white hover:bg-amber-50 transition-colors text-amber-700 font-bold shadow-2xl px-10 py-5 text-lg w-full sm:w-auto"
              >
                Discordで無料参加する →
              </a>
              <a
                href={START_URL}
                className="text-amber-200 hover:text-white text-sm underline underline-offset-4 transition-colors"
              >
                すでに参加済みの方はこちら
              </a>
            </div>

            <p className="text-amber-300 text-xs mt-5">
              参加無料 • Discordアカウントだけで始められます
            </p>
          </div>

          {/* ── 右：DiscordチャットUI風のビジュアル ── */}
          <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
            <div className="bg-[#313338] rounded-3xl shadow-2xl overflow-hidden border border-white/10">
              {/* タイトルバー */}
              <div className="bg-[#2b2d31] px-5 py-3.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-[#949ba4] text-sm font-medium ml-2"># 今日の合言葉</span>
              </div>

              {/* チャットメッセージ */}
              <div className="px-5 py-5 flex flex-col gap-5">

                {/* ひまりちゃん（Bot） */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-lg flex-shrink-0">
                    🌸
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[#f0b132] text-sm font-bold">ひまり</span>
                      <span className="text-[#949ba4] text-xs">BOT 今日 5:35</span>
                    </div>
                    <div className="bg-[#2b2d31] rounded-xl rounded-tl-none px-4 py-3">
                      <p className="text-[#dbdee1] text-sm">
                        おはよう🌸 今日の合言葉は受付中だよ！
                      </p>
                    </div>
                  </div>
                </div>

                {/* ユーザーメッセージ */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-base flex-shrink-0 text-white font-bold">
                    な
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[#dbdee1] text-sm font-bold">なお</span>
                      <span className="text-[#949ba4] text-xs">今日 5:36</span>
                    </div>
                    <div className="bg-[#404249] rounded-xl rounded-tl-none px-4 py-3">
                      <p className="text-[#dbdee1] text-sm">ひまり</p>
                    </div>
                  </div>
                </div>

                {/* ひまりちゃん返信（報酬） */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-lg flex-shrink-0">
                    🌸
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[#f0b132] text-sm font-bold">ひまり</span>
                      <span className="text-[#949ba4] text-xs">BOT 今日 5:36</span>
                    </div>
                    {/* Embedカード */}
                    <div className="bg-[#2b2d31] rounded-xl rounded-tl-none border-l-4 border-amber-400 pl-4 pr-4 py-3">
                      <p className="text-amber-300 text-xs font-semibold mb-1">🌱 ATSC 送金完了！</p>
                      <p className="text-[#dbdee1] text-sm font-bold mb-2">
                        なお に 3 ATSC を送ったよ🎉
                      </p>
                      <p className="text-[#949ba4] text-xs">
                        累計参加: 14日 • 合計: 42 ATSC
                      </p>
                    </div>
                  </div>
                </div>

                {/* 入力欄 */}
                <div className="bg-[#383a40] rounded-xl px-4 py-3 flex items-center gap-3 mt-1">
                  <span className="text-[#949ba4] text-sm flex-1">合言葉を入力...</span>
                  <span className="text-[#949ba4] text-lg">😊</span>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* 下部の波 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 80L1440 80L1440 30C1200 70 900 10 720 30C540 50 240 0 0 30L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PAIN（共感）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-500 font-semibold text-sm tracking-widest mb-4 uppercase">
            こんな悩みはありませんか？
          </p>
          <h2 className="text-center text-3xl lg:text-4xl font-bold text-gray-800 mb-14">
            「続けたい」<br className="sm:hidden" />気持ちはあるのに<br />
            続かない理由がある
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pains.map((p) => (
              <div
                key={p.text}
                className="flex items-start gap-4 bg-gray-50 rounded-2xl px-6 py-5 border border-gray-100"
              >
                <span className="text-3xl mt-0.5 flex-shrink-0">{p.icon}</span>
                <p className="text-gray-700 text-base leading-7">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="text-amber-700 font-bold text-xl leading-9">
              その悩み、全部まとめて解決する場所があります。
            </p>
            <p className="text-4xl mt-3">👇</p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          WHAT IS（陽だまりの庭とは）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-amber-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-500 font-semibold text-sm tracking-widest mb-4 uppercase">
            陽だまりの庭とは
          </p>
          <h2 className="text-center text-3xl lg:text-4xl font-bold text-gray-800 mb-6">
            朝活×Web3<br />
            「続ける仕組み」があるコミュニティ
          </h2>
          <p className="text-center text-gray-600 text-base lg:text-lg leading-8 mb-16 max-w-2xl mx-auto">
            毎朝5:30からXのスペースで朝活を開催。<br />
            参加するたびに「ATSC（ATSコイン）」というデジタルトークンが自動で届きます。<br />
            参加した証がブロックチェーンに刻まれるから、積み上げた努力が目に見える形で残ります。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl px-6 py-7 border border-amber-100 shadow-sm text-center hover:shadow-md transition-shadow"
              >
                <p className="text-4xl mb-4">{f.icon}</p>
                <h3 className="font-bold text-amber-800 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-6">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS（仕組み）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-500 font-semibold text-sm tracking-widest mb-4 uppercase">
            仕組み
          </p>
          <h2 className="text-center text-3xl lg:text-4xl font-bold text-gray-800 mb-4">
            参加するだけで<br className="sm:hidden" />自動で報酬が届く
          </h2>
          <p className="text-center text-gray-500 text-base mb-16">
            難しい操作はありません。毎朝たった3ステップ。
          </p>

          {/* PC：横並び / SP：縦 */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-0">
            {[
              { icon: "🌅", label: "朝活スペースに参加" },
              { icon: "🔑", label: "その日の合言葉を聞く" },
              { icon: "💬", label: "Discordで合言葉を入力" },
              { icon: "🪙", label: "3 ATSCが自動で届く！" },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex flex-col lg:flex-row items-center">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-7 py-6 flex flex-col items-center gap-2 w-48">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="font-semibold text-amber-800 text-sm text-center leading-5 whitespace-nowrap">{item.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-amber-300 text-2xl my-2 lg:my-0 lg:mx-3 rotate-0 lg:rotate-0">
                    <span className="block lg:hidden">↓</span>
                    <span className="hidden lg:block">→</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 bg-amber-50 rounded-2xl px-8 py-6 border border-amber-100 max-w-2xl mx-auto">
            <p className="text-amber-800 text-sm leading-7 text-center">
              💡 ATSCトークンはPolygonブロックチェーン上に記録されます。<br />
              参加した証が消えることなく、ずっとあなたのウォレットに残ります。
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATS（数字・実績）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-amber-900">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-amber-300 font-semibold text-sm tracking-widest mb-4 uppercase">
            数字で見る
          </p>
          <h2 className="text-center text-3xl lg:text-4xl font-bold text-white mb-14">
            陽だまりの庭の基本情報
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white/10 border border-white/10 rounded-2xl px-5 py-7 text-center backdrop-blur-sm"
              >
                <p className="text-3xl lg:text-4xl font-extrabold text-amber-200 mb-2 whitespace-nowrap">{s.value}</p>
                <p className="text-amber-300 text-xs leading-5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 主宰者プロフィール */}
          <div className="bg-white/10 border border-white/10 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-start gap-6 max-w-2xl mx-auto">
            <div className="text-5xl flex-shrink-0">🌸</div>
            <div>
              <p className="font-bold text-white text-lg mb-2">なお（主宰）</p>
              <p className="text-amber-200 text-sm leading-7">
                作業療法士×クリエイター。<br />
                毎朝5:30からXスペースで朝活を続け、<br />
                Web3の仕組みを使って「続けた努力が資産になる場所」を作っています。<br />
                わからないことは何でも聞いてください。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STEPS（参加ステップ）
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-amber-500 font-semibold text-sm tracking-widest mb-4 uppercase">
            参加ステップ
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-4">
            3ステップで始められます
          </h2>
          <p className="text-gray-500 text-base mb-14">
            難しい準備はありません。今日からすぐに参加できます。
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div
                key={s.number}
                className="bg-amber-50 rounded-2xl px-7 py-8 border border-amber-100 text-left hover:shadow-md transition-shadow"
              >
                <span className="block text-5xl font-extrabold text-amber-200 mb-4 leading-none select-none">
                  {s.number}
                </span>
                <h3 className="font-bold text-amber-800 text-lg mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-7">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <a
              href={START_URL}
              className="text-amber-600 text-sm underline underline-offset-4 hover:text-amber-700"
            >
              詳しいセットアップ手順はこちら →
            </a>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28 px-6 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-center text-white relative overflow-hidden">

        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-yellow-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-red-300 opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <p className="text-6xl mb-6">🌅</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">
            明日の朝<br />
            一緒に始めませんか？
          </h2>
          <p className="text-amber-100 text-base lg:text-xl leading-8 mb-12 max-w-xl mx-auto">
            毎朝5:30からスペースを開いています。<br />
            参加するだけで続けた証が積み上がっていく。<br />
            まずはDiscordに参加してみてください。
          </p>

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl bg-white hover:bg-amber-50 active:bg-amber-100 transition-colors text-amber-700 font-bold shadow-2xl px-12 py-6 text-xl tracking-wide"
          >
            Discordで無料参加する →
          </a>

          <p className="text-amber-200 text-sm mt-6">
            参加無料 • Discordアカウントだけで始められます
          </p>

          <div className="mt-12 pt-8 border-t border-amber-400/50">
            <a
              href={START_URL}
              className="text-amber-200 text-sm underline underline-offset-4 hover:text-white transition-colors"
            >
              すでにDiscordに参加済みの方はこちら（セットアップガイド）
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-amber-950 text-amber-400 text-center py-8 px-4">
        <p className="text-sm leading-7">
          陽だまりの庭 • 毎朝 5:30 からスペースを開いています🌅
        </p>
        <p className="text-amber-600 text-xs mt-1">
          © 2026 陽だまりの庭 All rights reserved.
        </p>
      </footer>

    </main>
  );
}
