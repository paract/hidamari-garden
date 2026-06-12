"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  createThirdwebClient,
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
  type ThirdwebClient,
} from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";

const CHAIN            = defineChain(137);
const DAWNSEED_ADDRESS = "0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C";
const BIONFT_ADDRESS   = "0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322";
const SEED_IMAGE       = "https://ipfs.io/ipfs/bafybeibfdlwawhojqks3iwld36jcd4wxgclsrjzxvotdvrzj5pr5fvqox4";

// 価格は .env の NEXT_PUBLIC_BIONFT_PRICE_JPY で管理（未設定なら 1000円）
const PRICE_JPY = Number(process.env.NEXT_PUBLIC_BIONFT_PRICE_JPY ?? 1000);

const wallets = [inAppWallet({ auth: { options: ["discord"] } })];

type Status =
  | "idle"        // 初期状態（未接続・確認前）
  | "checking"    // 残高・支払い確認中
  | "no_seed"     // DawnSeed 未保有
  | "already_owned" // BioNFT 保有済み
  | "unpaid"      // 未払い → 購入ボタン表示
  | "paid"        // 支払い済み → mintボタン表示
  | "minting"     // mint 処理中
  | "success"     // mint 完了
  | "error";      // エラー

// useSearchParams は Suspense が必要なため内部コンポーネントに分離
function ShopContent() {
  const account      = useActiveAccount();
  const wallet       = useActiveWallet();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [client,    setClient]    = useState<ThirdwebClient | null>(null);
  const [status,    setStatus]    = useState<Status>("idle");
  const [errMsg,    setErrMsg]    = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [buying,    setBuying]    = useState(false);

  // thirdweb クライアントを初期化
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (clientId) setClient(createThirdwebClient({ clientId }));
  }, []);

  // ウォレット接続後に保有状況・支払い状態を確認
  useEffect(() => {
    if (!client || !account) return;

    const sessionIdFromUrl = searchParams.get("session_id");
    const paymentResult    = searchParams.get("payment");

    const check = async () => {
      setStatus("checking");
      try {
        const dawnSeedContract = getContract({ client, chain: CHAIN, address: DAWNSEED_ADDRESS });
        const bioNftContract   = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });

        // DawnSeed 保有チェック
        const seedBalance = await readContract({
          contract: dawnSeedContract,
          method:   "function balanceOf(address account, uint256 id) view returns (uint256)",
          params:   [account.address, BigInt(0)],
        });
        if (seedBalance === BigInt(0)) { setStatus("no_seed"); return; }

        // BioNFT 保有チェック（すでに持っていれば終了）
        const nftBalance = await readContract({
          contract: bioNftContract,
          method:   "function balanceOf(address owner) view returns (uint256)",
          params:   [account.address],
        });
        if (nftBalance > BigInt(0)) { setStatus("already_owned"); return; }

        // Stripe 決済後のリダイレクト → 支払い状態を確認
        if (paymentResult === "success" && sessionIdFromUrl) {
          setSessionId(sessionIdFromUrl);
          const res  = await fetch(`/api/stripe/payment-status?session_id=${sessionIdFromUrl}`);
          const data = await res.json();

          if (data.paid) {
            setStatus("paid");
            return;
          }
        }

        // 未払い → 購入ボタンを表示
        setStatus("unpaid");
      } catch (err) {
        console.error(err);
        setStatus("unpaid");
      }
    };

    check();
  }, [client, account, searchParams]);

  // 購入ボタン → Stripe Checkout へリダイレクト
  const handleBuy = async () => {
    if (!account) return;
    setBuying(true);
    setErrMsg(null);
    try {
      const res  = await fetch("/api/stripe/create-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ walletAddress: account.address }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "URLが取得できませんでした");
      }
    } catch (err: unknown) {
      console.error(err);
      setErrMsg("購入ページへの移動に失敗しました。もう一度試してね。");
      setBuying(false);
    }
  };

  // mint ボタン → on-chain mint → DB に記録
  const handleMint = async () => {
    if (!client || !account || !wallet || !sessionId) return;
    setStatus("minting");
    setErrMsg(null);
    try {
      const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });
      const tx = prepareContractCall({
        contract: bioNftContract,
        method:   "function mint()",
        params:   [],
      });
      const receipt = await sendTransaction({ transaction: tx, account });

      // mint 完了を DB に記録
      await fetch("/api/stripe/confirm-mint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, txHash: receipt.transactionHash }),
      });

      // mint 後にトークンIDを取得してthank-youページへ遷移
      try {
        const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });
        const tokenId = await readContract({
          contract: bioNftContract,
          method:   "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
          params:   [account.address, BigInt(0)],
        });
        router.push(`/shop/thank-you?tokenId=${tokenId}`);
      } catch {
        router.push("/shop/thank-you");
      }
    } catch (err: unknown) {
      console.error(err);
      setErrMsg("mint 中にエラーが起きたよ。もう一度試してね。");
      setStatus("paid");
    }
  };

  if (!client) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-green-800 mb-1">🌿 BioNFT ショップ</h1>
        <p className="text-sm text-gray-500">陽だまりの庭の育成型NFT</p>
      </div>

      {/* 商品カード */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden border border-green-100 mb-6">
        <img
          src={SEED_IMAGE}
          alt="BioNFT Seed"
          className="w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23dcfce7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🌿%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-1">BioNFT — Seed（種）</h2>
          <p className="text-sm text-gray-500 mb-3">
            朝活を続けてATSCを集めると成長していく育成型NFT。<br />
            DawnSeed保有者だけが入手できる特別なNFTです。
          </p>

          {/* ステージ説明 */}
          <div className="bg-green-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-green-700 font-bold mb-2">成長ステージ</p>
            {[
              { name: "Seed（種）",    atsc: "初期" },
              { name: "新芽 Sprout",   atsc: "30 ATSC" },
              { name: "若木 Vine",     atsc: "90 ATSC" },
              { name: "開花 Bloom",    atsc: "180 ATSC" },
              { name: "大樹 Ancient",  atsc: "240 ATSC" },
            ].map((s, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                <span>Stage {i}：{s.name}</span>
                <span className="text-green-600">{s.atsc}</span>
              </div>
            ))}
          </div>

          {/* 価格 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">価格</span>
            <span className="text-2xl font-bold text-green-700">
              ¥{PRICE_JPY.toLocaleString()}
            </span>
          </div>

          {/* ウォレット未接続 */}
          {!account && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400">Discordでログインして購入する</p>
              <ConnectButton
                client={client}
                wallets={wallets}
                connectModal={{ title: "Discordでログイン" }}
              />
            </div>
          )}

          {/* 確認中 */}
          {account && status === "checking" && (
            <p className="text-center text-amber-500 text-sm animate-pulse">確認中...</p>
          )}

          {/* DawnSeed なし */}
          {account && status === "no_seed" && (
            <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
              <p>⚠️ DawnSeedが必要です</p>
              <p className="text-xs mt-1">まず合言葉チャンネルに参加してね</p>
            </div>
          )}

          {/* BioNFT 保有済み */}
          {account && status === "already_owned" && (
            <div className="text-center text-sm text-green-600 bg-green-50 rounded-xl p-3">
              <p>✅ すでにBioNFTを持っているよ！</p>
              <a href="/my-tokens" className="text-xs underline mt-1 block">マイトークンで確認する</a>
            </div>
          )}

          {/* mint 完了 */}
          {account && status === "success" && (
            <div className="text-center text-sm text-green-600 bg-green-50 rounded-xl p-3">
              <p>🌿 BioNFTを入手したよ！</p>
              <a href="/my-tokens" className="text-xs underline mt-1 block">マイトークンで確認する</a>
            </div>
          )}

          {/* 未払い → 購入ボタン */}
          {account && status === "unpaid" && (
            <>
              {errMsg && <p className="text-xs text-red-500 text-center mb-2">{errMsg}</p>}
              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-full transition-colors"
              >
                {buying ? "移動中..." : `🛒 ¥${PRICE_JPY.toLocaleString()} で購入する`}
              </button>
            </>
          )}

          {/* 支払い済み → mint ボタン */}
          {account && status === "paid" && (
            <>
              <div className="text-center text-xs text-green-600 bg-green-50 rounded-xl p-2 mb-3">
                ✅ 支払い確認済み。下のボタンでNFTを受け取ってね！
              </div>
              {errMsg && <p className="text-xs text-red-500 text-center mb-2">{errMsg}</p>}
              <button
                onClick={handleMint}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full transition-colors"
              >
                🌿 BioNFTを受け取る
              </button>
            </>
          )}

          {/* mint 処理中 */}
          {account && status === "minting" && (
            <button disabled className="w-full bg-gray-300 text-white font-bold py-3 rounded-full">
              受け取り処理中...
            </button>
          )}
        </div>
      </div>

      <a href="/my-tokens" className="text-sm text-gray-400 underline">マイトークンに戻る</a>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <ShopContent />
    </Suspense>
  );
}
