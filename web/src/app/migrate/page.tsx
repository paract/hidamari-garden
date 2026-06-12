"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const CHAIN          = defineChain(137);
const BIONFT_ADDRESS = "0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322";
const ATSC_ADDRESS   = "0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49";

const STAGE_NAMES: Record<number, string> = {
  0: "Seed（種）",
  1: "新芽 Sprout",
  2: "若木 Vine",
  3: "開花 Bloom",
  4: "大樹 Ancient",
};

const BIONFT_IMAGES: Record<number, string> = {
  0: "https://ipfs.io/ipfs/bafybeibfdlwawhojqks3iwld36jcd4wxgclsrjzxvotdvrzj5pr5fvqox4",
  1: "https://ipfs.io/ipfs/bafybeifl2yxfq74aeoznnx5lnqcllp5zueykbvbw5hc43vmfxcxs3rlr2u",
  2: "https://ipfs.io/ipfs/bafybeidxwgojwosyb53cdkh54fmfvenigirqzq3f44ddukqbdtwzgovvdq",
  3: "https://ipfs.io/ipfs/bafybeifwbt7fjfgbxyynofawvjvn2d5we2ebqdfe7hfqnrpaq5l2hcnh7m",
  4: "https://ipfs.io/ipfs/bafybeife75uris7x67pptvpi34bghuophlmj3jhvpxpzcncwg36ubgsgdu",
};

const wallets = [inAppWallet({ auth: { options: ["discord"] } })];

type Step = "enter_address" | "preview" | "transferring" | "done";

export default function MigratePage() {
  const account = useActiveAccount();
  const wallet  = useActiveWallet();

  const [client, setClient]               = useState<ThirdwebClient | null>(null);
  const [loading, setLoading]             = useState(false);
  const [bioNftTokenId, setBioNftTokenId] = useState<bigint | null>(null);
  const [bioNftStage, setBioNftStage]     = useState<number | null>(null);
  const [atscBalance, setAtscBalance]     = useState<bigint>(BigInt(0));
  const [step, setStep]                   = useState<Step>("enter_address");
  const [avacusAddress, setAvacusAddress] = useState("");
  const [addressError, setAddressError]   = useState<string | null>(null);
  const [transferStep, setTransferStep]   = useState<string | null>(null);
  const [errMsg, setErrMsg]               = useState<string | null>(null);
  const [showGuide, setShowGuide]         = useState(false);
  const [showAvacusInfo, setShowAvacusInfo] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (clientId) setClient(createThirdwebClient({ clientId }));
  }, []);

  // 接続後にトークン残高を取得
  useEffect(() => {
    if (!client || !account) return;

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });
        const atscContract   = getContract({ client, chain: CHAIN, address: ATSC_ADDRESS });

        const nftBal = await readContract({
          contract: bioNftContract,
          method:   "function balanceOf(address owner) view returns (uint256)",
          params:   [account.address],
        });

        if (nftBal > BigInt(0)) {
          const tokenId = await readContract({
            contract: bioNftContract,
            method:   "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
            params:   [account.address, BigInt(0)],
          });
          const stage = await readContract({
            contract: bioNftContract,
            method:   "function stage(uint256) view returns (uint8)",
            params:   [tokenId],
          });
          setBioNftTokenId(tokenId);
          setBioNftStage(Number(stage));
        }

        const atscBal = await readContract({
          contract: atscContract,
          method:   "function balanceOf(address account) view returns (uint256)",
          params:   [account.address],
        });
        setAtscBalance(atscBal);
      } catch (err) {
        console.error("残高取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [client, account]);

  // Avacusアドレスのバリデーションと次ステップへ
  const handleAddressSubmit = () => {
    const trimmed = avacusAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setAddressError("正しいウォレットアドレスではないよ（0xから始まる42文字）");
      return;
    }
    if (trimmed.toLowerCase() === account?.address.toLowerCase()) {
      setAddressError("今と同じアドレスだよ。Avacusのアドレスを入力してね");
      return;
    }
    setAddressError(null);
    setAvacusAddress(trimmed);
    setStep("preview");
  };

  // BioNFT → Avacus へ転送
  const handleTransfer = async () => {
    if (!client || !account || !wallet || bioNftTokenId === null) return;
    setStep("transferring");
    setErrMsg(null);

    try {
      const bioNftContract = getContract({ client, chain: CHAIN, address: BIONFT_ADDRESS });

      // ① BioNFT を転送（必須）
      setTransferStep("① BioNFTをAvacusに転送中...");
      const nftTx = prepareContractCall({
        contract: bioNftContract,
        method:   "function safeTransferFrom(address from, address to, uint256 tokenId)",
        params:   [account.address, avacusAddress, bioNftTokenId],
      });
      const nftReceipt = await sendTransaction({ transaction: nftTx, account });

      // ② ATSC を転送（残高がある場合のみ・失敗してもBioNFTは転送済み）
      if (atscBalance > BigInt(0)) {
        setTransferStep("② ATSCをAvacusに転送中...");
        try {
          const atscContract = getContract({ client, chain: CHAIN, address: ATSC_ADDRESS });
          const atscTx = prepareContractCall({
            contract: atscContract,
            method:   "function transfer(address to, uint256 amount) returns (bool)",
            params:   [avacusAddress, atscBalance],
          });
          await sendTransaction({ transaction: atscTx, account });
        } catch (err) {
          console.error("ATSC転送エラー（継続）:", err);
        }
      }

      // ③ DB更新・Discordロール付与
      setTransferStep("③ Web3メンバー登録中...");
      await fetch("/api/migrate/complete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWallet: account.address,
          toWallet:   avacusAddress,
          txHash:     nftReceipt.transactionHash,
        }),
      });

      setStep("done");
    } catch (err: unknown) {
      console.error("転送エラー:", err);
      setErrMsg("転送中にエラーが起きたよ。もう一度試してみてね。");
      setStep("preview");
    } finally {
      setTransferStep(null);
    }
  };

  if (!client) return null;

  const atscDisplay = (Number(atscBalance) / 1e18).toFixed(2);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-800 mb-2">🌳 Web3の扉を開こう</h1>
        <p className="text-base text-gray-500">Avacusウォレットでほんとうの所有者になる</p>
      </div>

      {/* 未ログイン：特典一覧 + ログインボタン */}
      {!account && (
        <>
          <div className="w-full max-w-sm bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 mb-6">
            <p className="text-sm font-bold text-emerald-700 mb-3">🎁 移行すると手に入るもの</p>
            <ul className="text-sm text-gray-600 space-y-2.5">
              <li>🌳 Discord「Web3メンバー」役職</li>
              <li>🪙 限定ATSC ボーナス配布</li>
              <li>🎁 BioNFTを贈ったり売ったりできる</li>
              <li>🗳️ コミュニティ投票権（DAO）</li>
            </ul>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-400">Discordでログインして続ける</p>
            <ConnectButton client={client} wallets={wallets} connectModal={{ title: "Discordでログイン" }} />
          </div>
        </>
      )}

      {/* 読み込み中 */}
      {account && loading && (
        <p className="text-emerald-600 text-base animate-pulse">トークン情報を確認中...</p>
      )}

      {/* BioNFTなし */}
      {account && !loading && bioNftTokenId === null && step === "enter_address" && (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-base text-gray-500 mb-5">BioNFTをまだ持っていないよ</p>
          <Link href="/shop" className="inline-block bg-green-500 text-white font-bold text-base px-6 py-3 rounded-full">
            BioNFTを入手する
          </Link>
        </div>
      )}

      {/* Step: アドレス入力 */}
      {account && !loading && bioNftTokenId !== null && step === "enter_address" && (
        <div className="w-full max-w-sm space-y-4">
          {/* 移行するトークンの確認 */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-500 mb-3">移行するトークン</p>
            <div className="flex items-center gap-3 mb-2">
              <img
                src={BIONFT_IMAGES[bioNftStage ?? 0]}
                alt="BioNFT"
                className="w-14 h-14 rounded-xl object-cover bg-green-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23dcfce7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='24'%3E🌿%3C/text%3E%3C/svg%3E";
                }}
              />
              <div>
                <p className="text-base font-bold text-gray-800">BioNFT — {STAGE_NAMES[bioNftStage ?? 0]}</p>
                <p className="text-sm text-gray-400">#{String(Number(bioNftTokenId)).padStart(4, "0")}</p>
              </div>
            </div>
            {atscBalance > BigInt(0) && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className="text-lg">🪙</span>
                <p className="text-base text-yellow-700 font-bold">{atscDisplay} ATSC も一緒に転送</p>
              </div>
            )}
          </div>

          {/* Avacusとは？ */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <button
              onClick={() => setShowAvacusInfo(!showAvacusInfo)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-base font-bold text-emerald-700">🤔 Avacusって何？</span>
              <span className="text-emerald-400 text-base">{showAvacusInfo ? "▲" : "▼"}</span>
            </button>
            {showAvacusInfo && (
              <div className="mt-4 space-y-4">
                <p className="text-base text-gray-600 leading-7">
                  Avacusは日本向けのWeb3ウォレットアプリです。<br />
                  インストールするだけで、BioNFTを本当に「自分のもの」として管理できるようになります。秘密鍵の管理も安心です。
                </p>
                <div className="space-y-3">
                  <a
                    href="https://apps.apple.com/jp/app/avacus-web3/id6449657442"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-black text-white rounded-xl px-4 py-3.5 text-base font-bold"
                  >
                    <span className="text-2xl"></span>
                    <span>App Store からダウンロード（iOS）</span>
                  </a>
                  <a
                    href="https://avacus.cc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl px-4 py-3.5 text-base font-bold"
                  >
                    <span className="text-2xl">🤖</span>
                    <span>公式サイトからダウンロード（Android）</span>
                  </a>
                </div>
                <p className="text-sm text-gray-400">※ インストール後にこのページに戻ってきてね</p>
              </div>
            )}
          </div>

          {/* アドレス入力 */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <p className="text-sm font-bold text-emerald-700 mb-2">Avacusのウォレットアドレス</p>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-emerald-500 underline mb-3 block"
            >
              {showGuide ? "▲ 閉じる" : "▼ アドレスの確認方法（Avacus）"}
            </button>
            {showGuide && (
              <div className="bg-emerald-50 rounded-xl p-4 mb-3 text-sm text-gray-600 space-y-1.5">
                <p>① Avacusアプリを開く</p>
                <p>② 下のタブ「Wallet」をタップ</p>
                <p>③ 画面上部のアドレスをタップ → コピー</p>
                <p className="text-emerald-600 font-bold mt-1">※ Polygon（MATIC）のアドレスをコピーしてね</p>
              </div>
            )}
            <input
              type="text"
              placeholder="0x..."
              value={avacusAddress}
              onChange={(e) => { setAvacusAddress(e.target.value); setAddressError(null); }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-mono focus:outline-none focus:border-emerald-400"
            />
            {addressError && <p className="text-sm text-red-500 mt-2">{addressError}</p>}
            <button
              onClick={handleAddressSubmit}
              disabled={!avacusAddress}
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-full text-base transition-colors"
            >
              確認する →
            </button>
          </div>
        </div>
      )}

      {/* Step: 転送プレビュー */}
      {step === "preview" && (
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-500 mb-3">転送内容の確認</p>
            <div className="space-y-2.5 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>BioNFT（{STAGE_NAMES[bioNftStage ?? 0]}）</span>
                <span className="text-emerald-600 font-bold">転送</span>
              </div>
              {atscBalance > BigInt(0) && (
                <div className="flex justify-between">
                  <span>ATSC（{atscDisplay} ATSC）</span>
                  <span className="text-emerald-600 font-bold">転送</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-400 mb-1">転送先（Avacus）</p>
                <p className="font-mono text-gray-700 break-all text-sm">{avacusAddress}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            ⚠️ 転送すると元に戻せません。Avacusのアドレスが正しいか確認してね。
          </div>

          {errMsg && <p className="text-sm text-red-500 text-center">{errMsg}</p>}

          <button
            onClick={handleTransfer}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-full text-base transition-colors"
          >
            🌳 Web3の扉を開く
          </button>
          <button
            onClick={() => setStep("enter_address")}
            className="w-full text-gray-400 text-base underline"
          >
            アドレスを変更する
          </button>
        </div>
      )}

      {/* Step: 転送中 */}
      {step === "transferring" && (
        <div className="w-full max-w-sm text-center py-8">
          <p className="text-5xl mb-4">🌿</p>
          <p className="text-base font-bold text-emerald-700 mb-2">転送中です...</p>
          {transferStep && (
            <p className="text-sm text-gray-500 animate-pulse">{transferStep}</p>
          )}
          <p className="text-sm text-gray-400 mt-3">ウォレットの承認画面が出たら許可してね</p>
        </div>
      )}

      {/* Step: 完了 */}
      {step === "done" && (
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-3">Web3メンバーへようこそ！</h2>
          <p className="text-base text-gray-500 mb-6">
            BioNFTはAvacusウォレットに移ったよ。<br />
            Discordに「web3Members」役職が付いているか確認してみてね。
          </p>
          <div className="bg-emerald-50 rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm font-bold text-emerald-700 mb-3">🎁 これから使えるもの</p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>🌳 Discord「web3Members」役職</li>
              <li>🎁 BioNFTをOpenSeaで確認・売買</li>
              <li>🗳️ コミュニティ投票権（DAO）</li>
            </ul>
          </div>
          <Link
            href="/my-tokens"
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-full text-base transition-colors text-center"
          >
            マイトークンを見る
          </Link>
        </div>
      )}

      <div className="mt-8">
        <Link href="/my-tokens" className="text-base text-gray-400 underline">
          マイトークンに戻る
        </Link>
      </div>
    </main>
  );
}
