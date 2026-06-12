import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// POST /api/migrate/complete
// body: { fromWallet: string, toWallet: string, txHash: string }
// 1. DBのウォレットアドレスを新しいAvacusアドレスへ更新
// 2. Discord「Web3メンバー」ロールを付与
// 3. Discord Webhookで卒業通知
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { fromWallet, toWallet, txHash } = await req.json();

    if (!fromWallet || !toWallet || !txHash) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
    }

    // DBでユーザーを検索
    const user = await prisma.user.findUnique({ where: { walletAddress: fromWallet } });
    if (!user) {
      // ユーザーが見つからなくても転送自体は完了しているため成功扱い
      console.warn(`migrate: ユーザーが見つかりません walletAddress=${fromWallet}`);
      return NextResponse.json({ ok: true, warning: "user_not_found" });
    }

    // ウォレットアドレスをAvacusアドレスへ更新（以降のATSC配布がAvacusに届く）
    await prisma.user.update({
      where: { walletAddress: fromWallet },
      data:  { walletAddress: toWallet },
    });

    // Discord「Web3メンバー」ロール付与
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId  = process.env.DISCORD_GUILD_ID;
    const roleId   = process.env.DISCORD_WEB3_ROLE_ID;

    if (botToken && guildId && roleId && user.discordId) {
      try {
        await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${user.discordId}/roles/${roleId}`,
          {
            method:  "PUT",
            headers: {
              Authorization:  `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(`✅ Web3メンバーロール付与: discordId=${user.discordId}`);
      } catch (err) {
        console.error("Discord ロール付与エラー:", err);
      }
    }

    // Discord Webhookで卒業を通知
    const webhookUrl = process.env.DISCORD_MINT_WEBHOOK_URL;
    if (webhookUrl) {
      const from = `${fromWallet.slice(0, 6)}...${fromWallet.slice(-4)}`;
      const to   = `${toWallet.slice(0, 6)}...${toWallet.slice(-4)}`;
      try {
        await fetch(webhookUrl, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🌳 **Web3卒業！** BioNFTをAvacusに移行しました\n\`${from}\` → \`${to}\``,
          }),
        });
      } catch (err) {
        console.error("Discord 通知エラー:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/migrate/complete error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
