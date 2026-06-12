"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const SEED_IMAGE =
  "https://ipfs.io/ipfs/bafybeibfdlwawhojqks3iwld36jcd4wxgclsrjzxvotdvrzj5pr5fvqox4";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">
          BioNFTを入手したよ！
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          陽だまりの庭へようこそ🌿
          <br />
          ATSCを集めてNFTを育てていこう！
        </p>

        {/* NFT カード */}
        <div className="rounded-2xl overflow-hidden shadow-md border border-green-100 mb-6 bg-white">
          <img
            src={SEED_IMAGE}
            alt="BioNFT Seed"
            className="w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23dcfce7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🌿%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="p-4">
            <p className="font-bold text-green-700 text-lg">Stage 0 — Seed（種）</p>
            {tokenId && (
              <p className="text-xs font-mono text-gray-400 mt-1">
                #{String(Number(tokenId)).padStart(4, "0")}
              </p>
            )}
          </div>
        </div>

        {/* 次のステップ */}
        <div className="bg-green-50 rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-green-700 mb-2">🌱 次のステップ</p>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li>• 朝活に参加してATSCを集める</li>
            <li>• 30 ATSCで「新芽 Sprout」に成長するよ</li>
            <li>• マイトークンページでいつでも確認できるよ</li>
          </ul>
        </div>

        <Link
          href="/my-tokens"
          className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full transition-colors text-center mb-3"
        >
          🌿 マイトークンを見る
        </Link>
        <Link href="/shop" className="text-sm text-gray-400 underline">
          ショップに戻る
        </Link>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
