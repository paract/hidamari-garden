"use client";

import { useState } from "react";

// コピーボタン付きのコマンドボックス
function CopyBox({
  command,
  description,
}: {
  command: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      {description && (
        <p className="text-sm text-gray-400">{description}</p>
      )}
      <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
        <span className="flex-1 font-mono text-green-400 text-base select-all">
          {command}
        </span>
        <button
          onClick={handleCopy}
          className={`shrink-0 text-sm font-medium px-3 py-1 rounded-lg transition-all duration-200 ${
            copied
              ? "bg-green-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          }`}
        >
          {copied ? "✓ コピー済み" : "コピー"}
        </button>
      </div>
    </div>
  );
}

// セクションのカード
function Section({
  icon,
  title,
  channel,
  children,
}: {
  icon: string;
  title: string;
  channel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs text-gray-500 font-mono mb-1">{channel}</p>
        <h2 className="text-lg font-bold text-white">
          {icon} {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ステップ表示（番号付き）
function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center mt-0.5">
        {num}
      </span>
      <p className="text-gray-300 text-sm">{text}</p>
    </div>
  );
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-lg mx-auto space-y-8">

        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <p className="text-3xl">🌸</p>
          <h1 className="text-2xl font-bold">コマンドガイド</h1>
          <p className="text-gray-400 text-sm">
            陽だまりの庭 — Discord コマンド一覧
          </p>
        </div>

        {/* STEP 1: 登録 */}
        <Section icon="🌱" title="ウォレット登録" channel="#✅ats_check-in">
          <div className="space-y-2 mb-2">
            <Step num={1} text="下のコマンドをコピーして #✅ats_check-in に送る" />
            <Step num={2} text="ひまりちゃんからボタンが届く" />
            <Step num={3} text="ボタンをクリック → Discordでログイン → 完了🎉" />
          </div>
          <CopyBox command="!登録" description="最初に一度だけ実行してね" />
        </Section>

        {/* STEP 2: 合言葉 */}
        <Section icon="🔑" title="ATSCを受け取る" channel="#📝今日の合言葉">
          <p className="text-sm text-gray-400">
            毎朝 5:30〜 のスペースで発表される合言葉を入力するよ。
            合言葉は毎日変わるので、スペースに参加してね！
          </p>
          <div className="bg-gray-900 border border-dashed border-gray-600 rounded-xl px-4 py-3 text-center">
            <p className="text-gray-500 text-sm">今日の合言葉を入力</p>
            <p className="text-yellow-400 text-xs mt-1">（毎日スペースで発表されるよ）</p>
          </div>
        </Section>

        {/* STEP 3: ステータス確認 */}
        <Section icon="📊" title="ステータス確認" channel="#✒️ひまりの記録帳">
          <CopyBox
            command="!ステータス"
            description="自分のEXP・ウォレットアドレスを確認"
          />
          <CopyBox
            command="!convert"
            description="EXPをATSCに変換（10 EXP = 0.1 ATSC）"
          />
        </Section>

        {/* EXP貯め方 */}
        <div className="bg-gray-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold">🌸 EXPの貯め方</h2>
          <div className="space-y-2 text-sm text-gray-300">
            {[
              { icon: "💬", text: "ラウンジ・合言葉チャンネルでメッセージ → +1（1分に1回）" },
              { icon: "🌸", text: "🌸リアクションを押す → +1（1日5回まで）" },
              { icon: "✨", text: "🌸リアクションをもらう → +2" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-2">
                <span>{item.icon}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <p className="text-center text-gray-600 text-xs pb-4">
          陽だまりの庭 • Polygon Mainnet
        </p>
      </div>
    </main>
  );
}
