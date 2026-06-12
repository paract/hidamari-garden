import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "スタートガイド | 陽だまりの庭",
  description: "テストメンバー向け初期設定ガイド",
};

const steps = [
  {
    number: "01",
    title: "Discord サーバーへ参加する",
    description: "招待リンクから陽だまりの庭のDiscordサーバーに参加してください。",
    action: {
      label: "Discord に参加する →",
      href: "https://discord.gg/2UjQryVDd8",
    },
    note: null,
  },
  {
    number: "02",
    title: "認証を完了する",
    description:
      "認証チャンネルにて、指定のリアクションまたはボタンを押してください。チャンネルの閲覧権限が解放されます。",
    action: null,
    note: null,
  },
  {
    number: "03",
    title: "ウォレットを登録する",
    description: null,
    action: {
      label: "コマンド一覧を見る →",
      href: "/guide",
    },
    note: "秘密鍵の管理は不要です。Discordアカウントで1クリックするだけで完了します。MetaMaskなどの外部ウォレットも不要です。",
    toggle: {
      label: "すでにウォレットを持っている方はこちら",
      content: "MetaMask などの既存ウォレットを使いたい場合は、#ats_check-in で以下のコマンドを送ってください。\n\n!wallet 0x自分のウォレットアドレス\n\n登録が完了したら上記の手順は不要です。",
    },
    substeps: [
      "チャンネル #ats_check-in を開く",
      "チャット欄に「!登録」と入力して送信",
      "ひまりちゃんから届いたURLをクリック",
      "Webページで「Discordでログイン」を実行",
      "完了画面にウォレットアドレスが表示されたら登録完了",
      "Discordに戻り「!ステータス」と入力してアドレスを確認",
    ],
  },
  {
    number: "04",
    title: "DawnSeed（参加証）を受け取る",
    description:
      "ウォレット登録が完了したら、管理者（なお）が順次 DawnSeed を付与します。付与完了の通知をお待ちください。",
    action: null,
    note: "DawnSeed は陽だまりの庭への正式な招待証です。これがないとATSCトークンを受け取れません。",
  },
  {
    number: "05",
    title: "ATSCトークンを受け取る",
    description:
      "DawnSeed を受け取ったら、いよいよ最初の報酬を受け取れます。毎朝の朝活に参加して合言葉を入力してください。",
    action: null,
    note: null,
    substeps: [
      "チャンネル #今日の合言葉 を開く",
      "共有された合言葉をチャット欄に入力",
      "ひまりちゃんから「3 ATSC」が届いたら成功！",
    ],
  },
];

export default function StartPage() {
  return (
    <main className="min-h-screen bg-amber-50 py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* ヘッダー */}
        <div className="text-center mb-12">
          <p className="text-amber-400 text-3xl mb-3">🌸</p>
          <h1 className="text-2xl font-bold text-amber-800 mb-2">陽だまりの庭</h1>
          <p className="text-amber-600 text-sm font-medium tracking-wide mb-6">
            テストメンバー スタートガイド
          </p>
          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 text-left border border-amber-100">
            <p className="text-gray-600 text-sm leading-7">
              参加してくれてありがとう。<br />
              このガイドに沿って初期設定を完了させてね。<br />
              わからないことがあれば、気軽に管理人（なお）に聞いてください。
            </p>
          </div>
        </div>

        {/* ステップ一覧 */}
        <div className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden"
            >
              {/* ステップヘッダー */}
              <div className="flex items-center gap-4 px-6 pt-5 pb-4">
                <span className="text-3xl font-bold text-amber-200 leading-none select-none">
                  {step.number}
                </span>
                <h2 className="text-base font-bold text-amber-800 leading-snug">
                  {step.title}
                </h2>
              </div>

              {/* ステップ本文 */}
              <div className="px-6 pb-5">
                {step.description && (
                  <p className="text-gray-600 text-sm leading-7 mb-3">
                    {step.description}
                  </p>
                )}

                {/* サブステップ */}
                {"substeps" in step && step.substeps && (
                  <ol className="flex flex-col gap-2 mb-3">
                    {step.substeps.map((sub, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-gray-600 text-sm leading-6">{sub}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {/* 補足 */}
                {step.note && (
                  <div className="bg-amber-50 rounded-xl px-4 py-3 mt-2">
                    <p className="text-amber-700 text-xs leading-6">💡 {step.note}</p>
                  </div>
                )}

                {/* トグル（既存ウォレット向け案内など） */}
                {"toggle" in step && step.toggle && (
                  <details className="mt-3 group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none bg-amber-500 hover:bg-amber-600 transition-colors text-white text-xs font-semibold px-4 py-2.5 rounded-xl select-none">
                      <span className="transition-transform group-open:rotate-90">▶</span>
                      {step.toggle.label}
                    </summary>
                    <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      {step.toggle.content.split("\n\n").map((block, i) =>
                        block.startsWith("!wallet") ? (
                          <p key={i} className="font-mono text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 my-2 text-gray-700">
                            {block}
                          </p>
                        ) : (
                          <p key={i} className="text-gray-500 text-xs leading-6">{block}</p>
                        )
                      )}
                    </div>
                  </details>
                )}

                {/* アクションボタン */}
                {step.action && (
                  <a
                    href={step.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center w-full rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors text-white text-sm font-semibold py-3 px-5"
                  >
                    {step.action.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="text-center mt-10">
          <p className="text-amber-400 text-xs leading-6">
            陽だまりの庭 • 毎朝 5:30 からスペースを開いています🌅
          </p>
          <p className="text-amber-300 text-xs mt-1">
            困ったときは Discord でなおに声をかけてね
          </p>
          <p className="text-amber-200 text-xs mt-4">
            © 2026 陽だまりの庭 All rights reserved.
          </p>
        </div>

      </div>
    </main>
  );
}
