"use client";

import { useEffect, useState } from "react";
import {
  createThirdwebClient,
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
  type ThirdwebClient,
} from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import ATSC_LOGO from "@/assets/atsc-logo-b64";

const CHAIN = defineChain(137);


const DAWNSEED_ADDRESS = "0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C";
const ATSC_ADDRESS     = "0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49";
const BIONFT_ADDRESS   = "0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322";

const DAWNSEED_IMAGE = "https://ipfs.io/ipfs/bafybeihojto6icdruv3df5hk3o6jrxhiong5bft6u7liot2tklng2ewmqa";

const BIONFT_IMAGES: Record<number, string> = {
  0: "https://ipfs.io/ipfs/bafybeibfdlwawhojqks3iwld36jcd4wxgclsrjzxvotdvrzj5pr5fvqox4",
  1: "https://ipfs.io/ipfs/bafybeifl2yxfq74aeoznnx5lnqcllp5zueykbvbw5hc43vmfxcxs3rlr2u",
  2: "https://ipfs.io/ipfs/bafybeidxwgojwosyb53cdkh54fmfvenigirqzq3f44ddukqbdtwzgovvdq",
  3: "https://ipfs.io/ipfs/bafybeifwbt7fjfgbxyynofawvjvn2d5we2ebqdfe7hfqnrpaq5l2hcnh7m",
  4: "https://ipfs.io/ipfs/bafybeife75uris7x67pptvpi34bghuophlmj3jhvpxpzcncwg36ubgsgdu",
};

const STAGE_NAMES: Record<number, string> = {
  0: "Seed（種）",
  1: "新芽 Sprout",
  2: "若木 Vine",
  3: "開花 Bloom",
  4: "大樹 Ancient",
};

// 次のステージへの必要ATSC（ステージ1〜4）
const GROW_COSTS: Record<number, number> = {
  1: 30,
  2: 90,
  3: 180,
  4: 240,
};

const wallets = [inAppWallet({ auth: { options: ["discord"] } })];

export default function MyTokensPage() {
  const account = useActiveAccount();
  const wallet  = useActiveWallet();
  const [client, setClient]           = useState<ThirdwebClient | null>(null);
  const [hasSeed, setHasSeed]         = useState<boolean | null>(null);
  const [atscBalance, setAtscBalance] = useState<string | null>(null);
  const [bioNftStage, setBioNftStage] = useState<number | null>(null);
  const [bioNftTokenId, setBioNftTokenId] = useState<bigint | null>(null);
  const [loading, setLoading]         = useState(false);
  const [minting, setMinting]         = useState(false);
  const [growing, setGrowing]               = useState(false);
  const [growStep, setGrowStep]             = useState<string | null>(null);
  const [growError, setGrowError]           = useState<string | null>(null);
  const [grewToStage, setGrewToStage]       = useState<number | null>(null);
  const [showMigrateBanner, setShowMigrateBanner] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (clientId) setClient(createThirdwebClient({ clientId }));
  }, []);

  useEffect(() => {
    if (!client || !account) return;

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const dawnSeedContract = getContract({ client, chain: CHAIN, address: DAWNSEED_ADDRESS });
        const atscContract     = getContract({ client, chain: CHAIN, address: ATSC_ADDRESS });
        const bioNftContract   = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });

        const seedBalance = await readContract({
          contract: dawnSeedContract,
          method: "function balanceOf(address account, uint256 id) view returns (uint256)",
          params: [account.address, BigInt(0)],
        });
        setHasSeed(seedBalance > BigInt(0));

        const balance = await readContract({
          contract: atscContract,
          method: "function balanceOf(address account) view returns (uint256)",
          params: [account.address],
        });
        setAtscBalance((Number(balance) / 1e18).toFixed(2));

        const nftBalance = await readContract({
          contract: bioNftContract,
          method: "function balanceOf(address owner) view returns (uint256)",
          params: [account.address],
        });

        if (nftBalance > BigInt(0)) {
          const tokenId = await readContract({
            contract: bioNftContract,
            method: "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
            params: [account.address, BigInt(0)],
          });
          const stage = await readContract({
            contract: bioNftContract,
            method: "function stage(uint256) view returns (uint8)",
            params: [tokenId],
          });
          setBioNftTokenId(tokenId);
          setBioNftStage(Number(stage));
        } else {
          setBioNftTokenId(null);
          setBioNftStage(null);
        }
      } catch (err) {
        console.error("残高取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [client, account]);

  // BioNFT mint
  const handleMint = async () => {
    if (!client || !account || !wallet) return;
    setMinting(true);
    try {
      const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });
      const tx = prepareContractCall({ contract: bioNftContract, method: "function mint()", params: [] });
      await sendTransaction({ transaction: tx, account });
      setBioNftStage(0);
    } catch (err) {
      console.error("mint エラー:", err);
    } finally {
      setMinting(false);
    }
  };

  // BioNFT grow（approve → grow の2ステップ）
  const handleGrow = async () => {
    if (!client || !account || !wallet || bioNftTokenId === null || bioNftStage === null) return;
    const nextStage = bioNftStage + 1;
    const cost = GROW_COSTS[nextStage];
    if (!cost) return;

    setGrowing(true);
    setGrowError(null);
    try {
      const atscContract   = getContract({ client, chain: CHAIN, address: ATSC_ADDRESS });
      const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });

      // ① ATSCの使用をBioNFTコントラクトに許可
      setGrowStep("① ATSCの使用を許可中...");
      const approveTx = prepareContractCall({
        contract: atscContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [BIONFT_ADDRESS, BigInt(cost) * BigInt(10 ** 18)],
      });
      const approveResult = await sendTransaction({ transaction: approveTx, account });

      // approveがブロックチェーン上で確定するまで待つ（これがないとgrowが先に届いてしまう）
      setGrowStep("① 承認の確定を待っています...");
      await waitForReceipt({ client, chain: CHAIN, transactionHash: approveResult.transactionHash });

      // ② grow実行
      setGrowStep("② BioNFTを成長させています...");
      const growTx = prepareContractCall({
        contract: bioNftContract,
        method: "function grow(uint256 tokenId)",
        params: [bioNftTokenId],
      });
      await sendTransaction({ transaction: growTx, account });

      setBioNftStage(nextStage);
      setAtscBalance((prev) => prev ? (parseFloat(prev) - cost).toFixed(2) : prev);
      setGrewToStage(nextStage);

      // Discord Webhook で grow 完了を通知（失敗しても無視）
      fetch("/api/grow/notify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          fromStage:     bioNftStage,
          toStage:       nextStage,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("grow エラー:", err);
      const msg = err instanceof Error ? err.message : String(err);
      // MATIC不足のエラーメッセージを検出して分かりやすく表示
      if (msg.includes("insufficient funds") || msg.includes("gas") || msg.includes("MATIC")) {
        setGrowError("ガス代（MATIC）が不足しています。管理者に補填を依頼してください。");
      } else if (msg.includes("not token owner") || msg.includes("owner")) {
        setGrowError("このBioNFTのオーナーではありません。ウォレットを確認してください。");
      } else if (msg.includes("ATS transfer")) {
        setGrowError("ATSC転送に失敗しました。残高を確認してもう一度お試しください。");
      } else {
        setGrowError(`成長に失敗しました（${msg.slice(0, 80)}）`);
      }
    } finally {
      setGrowing(false);
      setGrowStep(null);
    }
  };

  // Bloom（Stage3）以上に達したらバナーを表示（一度閉じたら再表示しない）
  useEffect(() => {
    if (bioNftStage === null || bioNftStage < 3) return;
    const dismissed = localStorage.getItem("atsc_migrate_banner_dismissed");
    if (!dismissed) setShowMigrateBanner(true);
  }, [bioNftStage]);

  const handleDismissBanner = () => {
    localStorage.setItem("atsc_migrate_banner_dismissed", "1");
    setShowMigrateBanner(false);
  };

  // クライアント初期化前は読み込み中スピナーを表示（return null にするとページが真っ白になる）
  if (!client) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center px-4">
        <p className="text-amber-500 text-sm animate-pulse">読み込み中...</p>
      </main>
    );
  }

  const nextStageCost = bioNftStage !== null && bioNftStage < 4 ? GROW_COSTS[bioNftStage + 1] : null;
  const hasEnoughAtsc = nextStageCost !== null && atscBalance !== null && parseFloat(atscBalance) >= nextStageCost;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-amber-800 mb-1">🌿 マイトークン</h1>
        <p className="text-sm text-gray-500">あなたの陽だまりの庭への参加証</p>
      </div>

      <div className="mb-8">
        <ConnectButton client={client} wallets={wallets} connectModal={{ title: "Discordでログイン" }} />
      </div>

      {!account && (
        <div className="text-center text-gray-400 text-sm mt-4">
          <p>Discordアカウントでログインすると</p>
          <p>あなたのトークンが表示されるよ🌱</p>
        </div>
      )}

      {account && loading && <p className="text-amber-600 text-sm animate-pulse">読み込み中...</p>}

      {/* Bloom以上で表示する移行バナー */}
      {account && !loading && showMigrateBanner && (
        <div className="w-full max-w-sm mb-4 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-4 text-white shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="font-bold text-sm">🌳 あなたのBioNFTは育ってきたね！</p>
            <button
              onClick={handleDismissBanner}
              className="text-white/60 hover:text-white text-xs ml-2 shrink-0"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-white/80 mb-3">
            Avacusウォレットに移行すると、NFTを贈ったり売ったりできるようになるよ。
          </p>
          <a
            href="/migrate"
            className="inline-block bg-white text-green-700 font-bold text-xs px-4 py-1.5 rounded-full hover:bg-green-50 transition-colors"
          >
            詳しく見る →
          </a>
        </div>
      )}

      {account && !loading && (
        <div className="w-full max-w-sm space-y-4">

          {/* DawnSeed カード */}
          <div className={`rounded-2xl border-2 overflow-hidden shadow-sm ${hasSeed ? "border-amber-300 bg-white" : "border-gray-200 bg-gray-50"}`}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌸</span>
                <span className="font-bold text-gray-800">DawnSeed</span>
                <span className="text-xs text-gray-400 ml-1">参加証SBT</span>
              </div>
              {hasSeed ? (
                <>
                  <div className="rounded-xl overflow-hidden mb-3 bg-amber-50">
                    <img src={DAWNSEED_IMAGE} alt="DawnSeed" className="w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23fef3c7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🌸%3C/text%3E%3C/svg%3E"; }} />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">陽だまりの庭への参加証。継続した行動の証明。</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">SBT</span>
                    <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">陽だまりの庭</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-3xl mb-2">🌱</p>
                  <p className="text-sm">まだ配布されていないよ</p>
                  <p className="text-xs mt-1">合言葉に参加すると届くよ！</p>
                </div>
              )}
            </div>
          </div>

          {/* BioNFT カード */}
          <div className="rounded-2xl border-2 border-green-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌿</span>
                <span className="font-bold text-gray-800">BioNFT</span>
                <span className="text-xs text-gray-400 ml-1">育成型NFT</span>
              </div>

              {bioNftStage !== null ? (
                <>
                  <div className="rounded-xl overflow-hidden mb-3 bg-green-50">
                    <img src={BIONFT_IMAGES[bioNftStage]} alt={STAGE_NAMES[bioNftStage]} className="w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23dcfce7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🌿%3C/text%3E%3C/svg%3E"; }} />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-green-700">{STAGE_NAMES[bioNftStage]}</p>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {bioNftTokenId !== null
                        ? `#${String(Number(bioNftTokenId)).padStart(4, "0")}`
                        : "#----"}
                    </span>
                  </div>

                  {/* ステージバー */}
                  <div className="flex gap-1 mb-3">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= bioNftStage ? "bg-green-400" : "bg-gray-200"}`} />
                    ))}
                  </div>

                  {/* grow 成功バナー */}
                  {grewToStage !== null && (
                    <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold text-green-700">
                        🎉 {STAGE_NAMES[grewToStage]} に成長したよ！
                      </p>
                      <button
                        onClick={() => setGrewToStage(null)}
                        className="text-green-400 text-xs hover:text-green-600 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* grow ボタン */}
                  {bioNftStage < 4 ? (
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">次のステージ</span>
                        <span className="text-xs font-bold text-green-700">{STAGE_NAMES[bioNftStage + 1]}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-500">必要ATSC</span>
                        <span className={`text-xs font-bold ${hasEnoughAtsc ? "text-green-700" : "text-red-500"}`}>
                          {nextStageCost} ATSC {!hasEnoughAtsc && "（不足）"}
                        </span>
                      </div>

                      {growStep && <p className="text-xs text-amber-600 animate-pulse mb-2">{growStep}</p>}
                      {growError && <p className="text-xs text-red-500 mb-2">{growError}</p>}

                      <button
                        onClick={handleGrow}
                        disabled={growing || !hasEnoughAtsc}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-bold py-2 rounded-full transition-colors"
                      >
                        {growing ? growStep ?? "処理中..." : "🌱 成長させる"}
                      </button>
                      {!hasEnoughAtsc && (
                        <p className="text-xs text-gray-400 text-center mt-1">合言葉に参加してATSCを集めよう</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-green-600 font-bold text-sm">
                      🎉 最終ステージ到達！大樹 Ancient
                    </div>
                  )}
                </>
              ) : hasSeed ? (
                <div className="text-center py-4">
                  <p className="text-3xl mb-2">🌱</p>
                  <p className="text-sm text-gray-500 mb-4">BioNFTをまだ入手していないよ</p>
                  <a href="/shop" className="inline-block bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-6 py-2 rounded-full transition-colors">
                    🌿 BioNFTを入手する
                  </a>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-3xl mb-2">🔒</p>
                  <p className="text-sm">DawnSeedが必要だよ</p>
                </div>
              )}
            </div>
          </div>

          {/* ATSC 残高カード */}
          <div className="rounded-2xl border-2 border-yellow-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-gray-800">ATSC</span>
                <span className="text-xs text-gray-400 ml-1">コミュニティトークン</span>
              </div>
              <div className="rounded-xl overflow-hidden mb-3 bg-amber-50 flex items-center justify-center py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ATSC_LOGO}
                  alt="ATSC"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="text-3xl font-bold text-yellow-600">
                {atscBalance ?? "0.00"}
                <span className="text-base font-normal text-gray-500 ml-1">ATSC</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">合言葉に参加するたびに3ATSCが届くよ🌿</p>
            </div>
          </div>

          {/* ウォレットアドレス */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs text-gray-400 mb-1">ウォレットアドレス</p>
            <p className="text-xs font-mono text-gray-600 break-all">{account.address}</p>
          </div>
        </div>
      )}
    </main>
  );
}
