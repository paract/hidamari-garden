export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// POST /api/stripe/confirm-mint
// body: { sessionId: string, txHash: string }
// mint 完了後に mintedAt と txHash を記録する
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { sessionId, txHash } = await req.json();

    if (!sessionId || !txHash) {
      return NextResponse.json(
        { error: "sessionId と txHash は必須です。" },
        { status: 400 }
      );
    }

    // 支払い済みかどうかを確認してから更新（未払いのmintを防止）
    const record = await prisma.bioNftPurchase.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!record) {
      return NextResponse.json(
        { error: "購入記録が見つかりません。" },
        { status: 404 }
      );
    }
    if (!record.paidAt) {
      return NextResponse.json(
        { error: "支払いが確認されていません。" },
        { status: 402 }
      );
    }

    await prisma.bioNftPurchase.update({
      where: { stripeSessionId: sessionId },
      data:  { mintedAt: new Date(), mintTxHash: txHash },
    });

    // Discord Webhook で mint 完了を通知（DISCORD_MINT_WEBHOOK_URL 未設定時はスキップ）
    const webhookUrl = process.env.DISCORD_MINT_WEBHOOK_URL;
    if (webhookUrl) {
      const addr = `${record.walletAddress.slice(0, 6)}...${record.walletAddress.slice(-4)}`;
      const tx   = `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
      try {
        await fetch(webhookUrl, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🌿 **BioNFT mint完了！**\nウォレット: \`${addr}\`\nTX: \`${tx}\``,
          }),
        });
      } catch (err) {
        console.error("Discord通知エラー:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/stripe/confirm-mint error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
