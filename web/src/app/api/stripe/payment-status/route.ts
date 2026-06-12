export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// GET /api/stripe/payment-status?session_id=...
// 指定した Stripe セッションの支払い・mint 状態を返す
// ============================================================

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id は必須です。" },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.bioNftPurchase.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!record) {
      return NextResponse.json(
        { error: "該当する購入記録が見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      paid:          !!record.paidAt,
      minted:        !!record.mintedAt,
      walletAddress: record.walletAddress,
    });
  } catch (err) {
    console.error("GET /api/stripe/payment-status error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
