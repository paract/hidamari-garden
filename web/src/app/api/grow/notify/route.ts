import { NextRequest, NextResponse } from "next/server";

// BioNFT ステージ名
const STAGE_NAMES: Record<number, string> = {
  0: "Seed（種）",
  1: "新芽 Sprout",
  2: "若木 Vine",
  3: "開花 Bloom",
  4: "大樹 Ancient",
};

// ============================================================
// POST /api/grow/notify
// body: { walletAddress: string, fromStage: number, toStage: number }
// BioNFT ステージアップ時に Discord Webhook で通知する
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, fromStage, toStage } = await req.json();

    const webhookUrl = process.env.DISCORD_MINT_WEBHOOK_URL;
    if (webhookUrl && walletAddress && toStage !== undefined) {
      const from = STAGE_NAMES[fromStage] ?? `Stage ${fromStage}`;
      const to   = STAGE_NAMES[toStage]   ?? `Stage ${toStage}`;
      const addr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

      await fetch(webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🌱 **BioNFT 成長！**\n${from} → **${to}**\nウォレット: \`${addr}\``,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/grow/notify error:", err);
    return NextResponse.json({ ok: false });
  }
}
