import type { Metadata } from "next";

// ============================================================
// /journey — 陽だまりの庭 はじめての道のりガイド
// Discord参加 → ウォレット登録 → DawnSeed → ATSC受け取りまでを
// 図解つきで案内する一般ユーザー向けページ（静的ページ・認証UI不要）
// ============================================================

export const metadata: Metadata = {
  title: "はじめての道のり | 陽だまりの庭",
  description:
    "Discordに参加してから、ウォレット登録・DawnSeed・ATSCを受け取るまでを図解で案内します。",
  openGraph: {
    title: "はじめての道のり | 陽だまりの庭",
    description:
      "参加からATSC受け取りまで、迷わず進める図解ガイド🌱",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "はじめての道のり | 陽だまりの庭",
    description:
      "参加からATSC受け取りまで、迷わず進める図解ガイド🌱",
  },
};

// ------------------------------------------------------------
// 全体マップ（SVG）— 種から大樹までの成長路線図
// ------------------------------------------------------------
function JourneyMapSvg() {
  // 5つの駅（ステップ）を縦の路線図として描く
  const stations = [
    { y: 40,  emoji: "🚪", label: "Discord に参加",        sub: "STEP 1" },
    { y: 130, emoji: "👛", label: "ウォレット登録",         sub: "STEP 2" },
    { y: 220, emoji: "🌱", label: "DawnSeed を受け取る",    sub: "STEP 3" },
    { y: 310, emoji: "🪙", label: "ATSC を受け取る",        sub: "STEP 4" },
    { y: 400, emoji: "🌳", label: "BioNFT を育てる",        sub: "これから" },
  ];
  return (
    <svg
      viewBox="0 0 340 450"
      role="img"
      aria-label="参加からATSC受け取りまでの全体マップ"
      className="w-full max-w-sm mx-auto"
    >
      {/* 路線（ゆるやかに曲がる庭の小道） */}
      <path
        d="M 60 40 C 110 70, 20 100, 60 130 C 110 160, 20 190, 60 220 C 110 250, 20 280, 60 310 C 110 340, 20 370, 60 400"
        fill="none"
        stroke="#fcd34d"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="1 12"
      />
      {stations.map((s, i) => (
        <g key={i}>
          {/* 駅の丸 */}
          <circle cx="60" cy={s.y} r="22" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="60" y={s.y + 7} textAnchor="middle" fontSize="20">{s.emoji}</text>
          {/* ラベル */}
          <text x="100" y={s.y - 4} fontSize="11" fill="#b45309" fontWeight="bold">{s.sub}</text>
          <text x="100" y={s.y + 14} fontSize="15" fill="#78350f" fontWeight="bold">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------
// ミニ流れ図 — 吹き出しカードを矢印でつなぐ（スマホ縦向き）
// ------------------------------------------------------------
function MiniFlow({ items }: { items: { icon: string; text: string; note?: string }[] }) {
  return (
    <div className="flex flex-col items-stretch gap-0 my-4">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-full flex items-start gap-3 bg-white border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xl shrink-0">{item.icon}</span>
            <div>
              <p className="text-sm text-gray-700 font-medium leading-6">{item.text}</p>
              {item.note && <p className="text-xs text-amber-600 mt-0.5 leading-5">{item.note}</p>}
            </div>
          </div>
          {/* 最後のカード以外は下向き矢印でつなぐ */}
          {i < items.length - 1 && (
            <span className="text-amber-400 text-lg leading-none py-1">↓</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// スクリーンショット枠 — 後で実際の画像に差し替えるプレースホルダー
// 画像を /public/journey/ に置いて src を渡すと表示される
// ------------------------------------------------------------
function Screenshot({ src, caption }: { src?: string; caption: string }) {
  if (src) {
    return (
      <figure className="my-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption} className="rounded-xl border border-amber-200 w-full" />
        <figcaption className="text-xs text-gray-400 text-center mt-1">{caption}</figcaption>
      </figure>
    );
  }
  // 画像がまだない間は控えめな点線枠で場所だけ確保しておく
  return (
    <div className="my-4 border-2 border-dashed border-amber-200 rounded-xl px-4 py-6 text-center bg-amber-50/50">
      <p className="text-amber-400 text-xs">📷 {caption}（画像は近日追加）</p>
    </div>
  );
}

// ------------------------------------------------------------
// ステップカードの枠
// ------------------------------------------------------------
function StepCard({
  num,
  emoji,
  title,
  children,
}: {
  num: string;
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-100 px-6 py-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl shrink-0">
          {emoji}
        </span>
        <div>
          <p className="text-xs font-bold text-amber-400 tracking-wider">STEP {num}</p>
          <h2 className="text-base font-bold text-amber-800">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

// ヒント（補足）の小さな箱
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 rounded-xl px-4 py-3 mt-3">
      <p className="text-amber-700 text-xs leading-6">💡 {children}</p>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <main className="min-h-screen bg-amber-50 py-14 px-4">
      <div className="max-w-xl mx-auto">

        {/* ===== ヘッダー ===== */}
        <div className="text-center mb-10">
          <p className="text-3xl mb-3">🌅</p>
          <h1 className="text-2xl font-bold text-amber-800 mb-2">はじめての道のり</h1>
          <p className="text-amber-600 text-sm font-medium tracking-wide">
            陽だまりの庭 — 参加からATSC受け取りまで
          </p>
        </div>

        {/* ===== 全体マップ ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 px-4 py-6 mb-8">
          <p className="text-center text-sm font-bold text-amber-700 mb-2">🗺 ぜんたいマップ</p>
          <p className="text-center text-xs text-gray-400 mb-4">
            4つのステップで、あなたの「種」が庭に植えられます
          </p>
          <JourneyMapSvg />
        </div>

        <div className="flex flex-col gap-5">

          {/* ===== STEP 1 ===== */}
          <StepCard num="1" emoji="🚪" title="Discord サーバーに参加する">
            <p className="text-gray-600 text-sm leading-7">
              まずは陽だまりの庭の Discord サーバーに参加します。
              参加すると、案内のメッセージ（DM）がひまりちゃんから届きます。
            </p>
            <a
              href="https://discord.gg/2UjQryVDd8"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center w-full rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors text-white text-sm font-semibold py-3 px-5"
            >
              Discord に参加する →
            </a>
            <Hint>
              ひまりちゃん＝庭の案内係をしてくれる Bot（自動応答プログラム）です。怪しい者ではありません🌸
            </Hint>
          </StepCard>

          {/* ===== STEP 2 ===== */}
          <StepCard num="2" emoji="👛" title="ウォレットを登録する">
            <p className="text-gray-600 text-sm leading-7">
              ウォレットは「トークンを受け取るためのお財布」です。
              <span className="font-bold text-amber-700">難しい設定は一切ありません。</span>
              Discord でログインするだけで、自動で作られます。
            </p>
            <MiniFlow
              items={[
                { icon: "💬", text: "「✅ats_check-in」チャンネルで !登録 と送る" },
                { icon: "🔗", text: "ひまりちゃんから登録リンクが届く", note: "リンクの有効期限は10分。切れたらもう一度 !登録 でOK" },
                { icon: "🧭", text: "リンクを開き、案内に従って Safari で開く", note: "iPhoneの方は「Safariで開く」ボタンを押してね" },
                { icon: "🔑", text: "「Discordでログイン」を押して認証する", note: "ページが切り替わって、自動でこのサイトに戻ります" },
                { icon: "🌱", text: "緑の「このアカウントで登録する」を押して完了！" },
              ]}
            />
            <Screenshot
              src="/journey/connect-confirm.jpg"
              caption="Discordログイン後の画面。緑のボタンを押せば登録完了"
            />
            <Screenshot
              src="/journey/register-done.jpg"
              caption="登録完了画面。メールアドレスをメモしてね"
            />
            <Hint>
              完了画面に表示される<span className="font-bold">メールアドレスをメモ</span>しておくと、
              機種変更したときも同じウォレットにログインできます。
            </Hint>
          </StepCard>

          {/* ===== STEP 3 ===== */}
          <StepCard num="3" emoji="🌱" title="DawnSeed（参加証）を受け取る">
            <p className="text-gray-600 text-sm leading-7">
              DawnSeed は陽だまりの庭への<span className="font-bold text-amber-700">正式な招待証</span>です。
              ウォレット登録が終わると、管理人（なお）があなたのウォレットに届けます。
            </p>
            <MiniFlow
              items={[
                { icon: "🙋", text: "ラウンジで「ウォレット登録したよ！」と一言送る" },
                { icon: "🎁", text: "なおが DawnSeed をあなたのウォレットへ送る", note: "少し時間がかかることもあります。のんびり待っててね" },
                { icon: "✅", text: "付与完了の連絡が届いたら受け取り完了！" },
              ]}
            />
            <Hint>
              DawnSeed は「譲渡できない記念バッジ（SBT）」です。売ったり送ったりはできない、あなただけの参加証です。
            </Hint>
          </StepCard>

          {/* ===== STEP 4 ===== */}
          <StepCard num="4" emoji="🪙" title="ATSC トークンを受け取る">
            <p className="text-gray-600 text-sm leading-7">
              ここまで来たら、いよいよ毎朝の楽しみがはじまります。
              朝活スペースに参加して<span className="font-bold text-amber-700">合言葉</span>を入力すると、
              ひまりちゃんから ATSC が届きます。
            </p>
            <MiniFlow
              items={[
                { icon: "🌅", text: "毎朝 5:30〜 の X スペース（朝活）に参加する" },
                { icon: "📝", text: "「今日の合言葉」チャンネルに合言葉を入力する" },
                { icon: "🪙", text: "ひまりちゃんから 3 ATSC が届いたら成功！", note: "受け取れるのは1日1回までです" },
              ]}
            />
            <Screenshot
              src="/journey/atsc-received.jpg"
              caption="合言葉を入力すると、ひまりちゃんから 3 ATSC が届くよ"
            />
            <Hint>
              貯めた ATSC は BioNFT（育てるデジタル植物）の成長に使えます。
              コツコツ続けると、最終ステージの「大樹🌳」まで育ちます。
            </Hint>
          </StepCard>

        </div>

        {/* ===== 困ったときは ===== */}
        <section className="bg-white rounded-2xl shadow-sm border border-amber-100 px-6 py-6 mt-8">
          <h2 className="text-base font-bold text-amber-800 mb-4">🌿 困ったときは</h2>
          <ul className="flex flex-col gap-3">
            <li className="text-sm text-gray-600 leading-6">
              <span className="font-bold text-amber-700">リンクを開いても進めない</span><br />
              リンクの有効期限（10分）が切れているかも。もう一度 <span className="font-mono bg-amber-50 px-1 rounded">!登録</span> を送ってね。
            </li>
            <li className="text-sm text-gray-600 leading-6">
              <span className="font-bold text-amber-700">画面がうまく表示されない</span><br />
              Discord アプリの中のブラウザではなく、Safari や Chrome で開き直してみてね。
            </li>
            <li className="text-sm text-gray-600 leading-6">
              <span className="font-bold text-amber-700">それでも解決しないとき</span><br />
              Discord でなおに気軽に声をかけてください。一緒に解決します🌸
            </li>
          </ul>
        </section>

        {/* ===== フッター ===== */}
        <div className="text-center mt-10">
          <p className="text-amber-400 text-xs leading-6">
            陽だまりの庭 • 毎朝 5:30 からスペースを開いています🌅
          </p>
          <p className="text-amber-200 text-xs mt-4">
            © 2026 陽だまりの庭 All rights reserved.
          </p>
        </div>

      </div>
    </main>
  );
}
