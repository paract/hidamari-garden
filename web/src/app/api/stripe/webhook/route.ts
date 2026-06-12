export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ============================================================
// POST /api/stripe/webhook
// Stripe からの支払い完了通知を受け取る
// - 署名検証（改ざん防止）
// - checkout.session.completed イベントで paidAt を記録
// ============================================================
// ⚠️ このルートは Stripe の署名検証に生の body が必要なため
//    Next.js の自動 JSON パースをスキップして text() で読む

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名なし" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook 署名検証エラー:", err);
    return NextResponse.json({ error: "署名検証失敗" }, { status: 400 });
  }

  // 支払い完了イベントだけ処理する
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      await prisma.bioNftPurchase.update({
        where: { stripeSessionId: session.id },
        data:  { paidAt: new Date() },
      });
      console.log(`✅ 支払い確認: session=${session.id}`);
    } catch (err) {
      console.error("BioNftPurchase 更新エラー:", err);
      // Stripe に 500 を返すと再送されるため、ここではログだけ
    }
  }

  return NextResponse.json({ received: true });
}
