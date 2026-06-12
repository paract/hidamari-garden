export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ============================================================
// POST /api/stripe/create-checkout
// body: { walletAddress: string, discordId?: string }
// 1. Stripe Checkout セッションを作成
// 2. BioNftPurchase に事前レコードを保存（未払い状態）
// 3. Stripe の決済ページ URL を返す
// ============================================================

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { walletAddress, discordId } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress は必須です。" },
        { status: 400 }
      );
    }

    const baseUrl   = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";
    const amountJpy = Number(process.env.BIONFT_PRICE_JPY ?? 1000);

    // Stripe Checkout セッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency:     "jpy",
            product_data: {
              name:        "BioNFT — Seed（種）",
              description: "陽だまりの庭の育成型NFT。朝活を続けるとステージアップします。",
              images:      [
                "https://ipfs.io/ipfs/bafybeibfdlwawhojqks3iwld36jcd4wxgclsrjzxvotdvrzj5pr5fvqox4",
              ],
            },
            unit_amount: amountJpy,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // 決済成功後に /shop へリダイレクト（session_id を URL に含める）
      success_url: `${baseUrl}/shop?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/shop`,
      metadata: {
        walletAddress,
        ...(discordId ? { discordId } : {}),
      },
    });

    // DB に未払いレコードを保存（webhook で paidAt を更新する）
    await prisma.bioNftPurchase.create({
      data: {
        stripeSessionId: session.id,
        walletAddress,
        discordId:       discordId ?? null,
        amountJpy,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/stripe/create-checkout error:", err);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました。" },
      { status: 500 }
    );
  }
}
