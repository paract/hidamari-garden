"use client";

// このページでエラーが発生した場合のフォールバック表示（真っ白防止）
export default function ConnectError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🌱</p>
        <p className="text-amber-800 font-bold mb-2">ページの読み込みに失敗しました</p>
        <p className="text-gray-500 text-sm mb-6">
          一時的な問題が発生しました。
          <br />
          下のボタンでもう一度お試しください。
          <br />
          何度も失敗する場合は、Discord の Bot から
          <br />
          新しいリンクを発行してください。
        </p>
        <button
          onClick={reset}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-6 py-2 rounded-full transition-colors"
        >
          再読み込み
        </button>
      </div>
    </main>
  );
}
