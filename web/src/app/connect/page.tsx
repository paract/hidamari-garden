"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createThirdwebClient, type ThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { getUserEmail } from "thirdweb/wallets/in-app";

function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /Discord|Line|FBAN|FBAV|Instagram|Twitter|Snapchat/i.test(navigator.userAgent);
}

type Status = "idle" | "confirming" | "registering" | "success" | "error";

function ConnectContent() {
  const searchParams = useSearchParams();
  const urlToken     = searchParams.get("token");

  const account        = useActiveAccount();
  const activeWallet   = useActiveWallet();
  const { disconnect } = useDisconnect();

  const [status, setStatus]             = useState<Status>("idle");
  const [errorMsg, setErrorMsg]         = useState("");
  const [client, setClient]             = useState<ThirdwebClient | null>(null);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [token, setToken]               = useState<string | null>(urlToken);
  const [userEmail, setUserEmail]       = useState<string | null>(null);
  const [emailCopied, setEmailCopied]   = useState(false);

  // token を sessionStorage で保持（OAuth リダイレクト後に URL から消えても復元できる）
  useEffect(() => {
    if (urlToken) {
      sessionStorage.setItem("ats_link_token", urlToken);
      setToken(urlToken);
    } else {
      const stored = sessionStorage.getItem("ats_link_token");
      if (stored) setToken(stored);
    }
  }, [urlToken]);

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (id) setClient(createThirdwebClient({ clientId: id }));
    setInAppBrowser(isInAppBrowser());
  }, []);

  // wallets は初回マウント時に1度だけ生成（OAuth の redirectUrl に token を含める）
  const wallets = useMemo(() => {
    if (typeof window === "undefined") return [];
    const t = urlToken ?? sessionStorage.getItem("ats_link_token");
    const redirectUrl = `${window.location.origin}/connect${t ? `?token=${t}` : ""}`;
    // mode: "redirect" — ポップアップ方式はスマホでブロック・白画面になるため、
    // ページごと Discord 認証へ移動して戻ってくる方式に変更
    return [inAppWallet({ auth: { options: ["discord"], mode: "redirect", redirectUrl } })];
    // urlToken は初回レンダー時に確定するため deps は空で意図的
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // account が設定されたら確認画面へ
  useEffect(() => {
    if (account && token && status === "idle") setStatus("confirming");
  }, [account, token, status]);

  // 登録完了後にメールアドレスを取得
  useEffect(() => {
    if (status !== "success" || !client) return;
    getUserEmail({ client }).then((e) => { if (e) setUserEmail(e); }).catch(() => {});
  }, [status]);

  const handleConfirm = async () => {
    if (!account || !token) return;
    setStatus("registering");
    try {
      const res  = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, walletAddress: account.address }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.removeItem("ats_link_token");
        setStatus("success");
      } else {
        setErrorMsg(data.error ?? "登録に失敗しました。もう一度お試しください。");
        setStatus("error");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました。");
      setStatus("error");
    }
  };

  const handleDisconnect = () => {
    if (activeWallet) disconnect(activeWallet);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleCopyEmail = async () => {
    if (!userEmail) return;
    await navigator.clipboard.writeText(userEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  if (!client) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-500 animate-pulse">読み込み中...</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center p-8">
          <p className="text-red-500 text-lg">無効なURLです。</p>
          <p className="text-gray-500 mt-2">Discord の Bot から送られたリンクをご利用ください。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-amber-700 mb-2">陽だまりの庭</h1>
        <p className="text-gray-500 text-sm mb-6">ウォレット登録ページ</p>

        {/* Discord インアプリブラウザ警告 */}
        {inAppBrowser && status === "idle" && !account && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-5 text-left">
            <p className="text-base font-bold text-amber-700 mb-2">⚠️ Safari で開いてから登録してね</p>
            <p className="text-sm text-gray-600 leading-6 mb-4">
              Discord アプリ内のブラウザでは認証がうまく動きません。<br />
              下のボタンで Safari に移動してね🌱
            </p>
            <button
              onClick={() => {
                // x-safari-https:// は iOS で Safari を直接開く正式なスキーム
                // （旧コードの "safari:" は存在しないスキームで白画面になっていた）
                const url = window.location.href;
                window.location.href = url.replace(/^https:\/\//, "x-safari-https://");
                setTimeout(() => window.open(url, "_blank"), 800);
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-full text-base transition-colors mb-3"
            >
              🌿 Safari で開く
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
              className="w-full bg-white border border-amber-400 text-amber-700 font-bold py-3 rounded-full text-base transition-colors"
            >
              URLをコピーする
            </button>
          </div>
        )}

        {/* 未接続：ConnectButton（Discord のみ） */}
        {status === "idle" && !account && (
          <>
            <p className="text-gray-600 text-sm mb-2">
              Discord でログインするとウォレットが自動で作られます。
            </p>
            <div className="bg-amber-50 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs font-bold text-amber-700 mb-1">📋 登録の流れ</p>
              <p className="text-xs text-gray-500 leading-5">
                ① 下のボタンを押す<br />
                ② Discord の認証ページが開く（画面が切り替わります）<br />
                ③ Discord で「認証する」を押す<br />
                ④ このページに自動で戻ります<br />
                ⑤ 確認ボタンを押して完了
              </p>
            </div>
            <div className="flex justify-center">
              <ConnectButton
                client={client}
                wallets={wallets}
                connectModal={{ title: "Discordでログイン", size: "compact" }}
              />
            </div>
          </>
        )}

        {/* 確認画面 */}
        {status === "confirming" && account && (
          <div className="text-left">
            <p className="text-sm font-bold text-amber-700 mb-4 text-center">✅ 接続できました！</p>
            <div className="bg-amber-50 rounded-xl p-4 mb-5">
              <p className="text-xs text-gray-400 mb-1">ウォレットアドレス</p>
              <p className="text-xs font-mono text-gray-700 break-all">{account.address}</p>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full text-base transition-colors mb-3"
            >
              🌱 このアカウントで登録する
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full bg-white border border-gray-300 text-gray-500 font-bold py-3 rounded-full text-sm transition-colors"
            >
              別のアカウントを使う
            </button>
          </div>
        )}

        {/* 登録中 */}
        {status === "registering" && (
          <p className="text-amber-500 animate-pulse">登録中...</p>
        )}

        {/* エラー */}
        {status === "error" && (
          <div>
            <p className="text-red-500 text-sm font-medium mb-4">{errorMsg}</p>
            <button
              onClick={handleDisconnect}
              className="w-full bg-white border border-gray-300 text-gray-500 font-bold py-3 rounded-full text-sm transition-colors"
            >
              最初からやり直す
            </button>
          </div>
        )}

        {/* 登録完了 */}
        {status === "success" && (
          <div className="text-left">
            <div className="flex items-center gap-2 justify-center mb-6">
              <span className="text-2xl">🌱</span>
              <p className="text-green-600 font-bold text-lg">ウォレット登録が完了しました！</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-5 mb-4 space-y-4">
              <p className="text-sm font-bold text-amber-700">📋 あなたのアカウント情報</p>
              {userEmail && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">メールアドレス</p>
                  <p className="text-base font-mono text-gray-800 break-all">{userEmail}</p>
                  <button
                    onClick={handleCopyEmail}
                    className={`mt-2 w-full py-2.5 rounded-full text-sm font-bold transition-colors ${
                      emailCopied ? "bg-green-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    {emailCopied ? "✓ コピーしました！" : "メールアドレスをコピー"}
                  </button>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">ウォレットアドレス</p>
                <p className="text-xs font-mono text-gray-600 break-all">{account?.address}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-blue-700 mb-1">📱 機種変更するときのために</p>
              <p className="text-sm text-gray-600 leading-6">
                上のメールアドレスをメモしておくと、新しいスマホでも簡単にログインできます。
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-green-700 mb-1">🌿 次のステップ</p>
              <p className="text-sm text-gray-600 leading-6">
                陽だまりラウンジに戻って<br />
                <span className="font-bold text-green-700">「ウォレット登録したよ！」</span>と送ってね。<br />
                確認後、なおさんが参加証を届けます🌸
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-500">読み込み中...</p>
      </main>
    }>
      <ConnectContent />
    </Suspense>
  );
}
