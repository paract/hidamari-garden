import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createThirdwebClient,
  getContract,
  readContract,
  sendTransaction,
  prepareContractCall,
} from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";

// ============================================================
// POST /api/register
// body: { token: string, walletAddress: string }
// 1. WalletLinkToken を検証（期限切れ・使用済みチェック）
// 2. User テーブルに walletAddress を保存（upsert）
// 3. WalletLinkToken を使用済みにして二重登録を防止
// 4. DawnSeed（SBT）を自動mint
// ============================================================

// ウォレット登録完了後に DawnSeed を自動で発行する
// mint に失敗しても登録自体は成功扱いにする（後で手動mintで補填できる）
async function tryMintDawnSeed(walletAddress: string): Promise<void> {
  const secretKey       = process.env.THIRDWEB_SECRET_KEY;
  const privateKey      = process.env.PRIVATE_KEY;
  const dawnSeedAddress = process.env.DAWN_SEED_ADDRESS;

  if (!secretKey || !privateKey || !dawnSeedAddress) {
    console.warn("DawnSeed mint: 環境変数が不足しているためスキップ");
    return;
  }

  const client  = createThirdwebClient({ secretKey });
  const account = privateKeyToAccount({
    client,
    privateKey: (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`,
  });

  // Amoy = 80002 / Mainnet移行後は 137 に変更する
  const chain    = defineChain(Number(process.env.CHAIN_ID ?? "80002"));
  const contract = getContract({ client, chain, address: dawnSeedAddress });

  // すでにmint済みならスキップ
  const alreadyMinted = await readContract({
    contract,
    method: "function hasMinted(address) view returns (bool)",
    params: [walletAddress as `0x${string}`],
  });
  if (alreadyMinted) {
    console.log(`DawnSeed mint: スキップ（発行済み）: ${walletAddress}`);
    return;
  }

  const tx = prepareContractCall({
    contract,
    method: "function mintSeed(address to) external",
    params: [walletAddress as `0x${string}`],
  });

  const receipt = await sendTransaction({ transaction: tx, account });
  console.log(`✅ DawnSeed mint 完了: ${walletAddress} TX: ${receipt.transactionHash}`);
}

export async function POST(req: NextRequest) {
  try {
    const { token, walletAddress } = await req.json();

    if (!token || !walletAddress) {
      return NextResponse.json(
        { error: "token と walletAddress は必須です。" },
        { status: 400 }
      );
    }

    // ----- Step 1: トークン検証 -----
    const rec = await prisma.walletLinkToken.findUnique({ where: { token } });

    if (!rec) {
      return NextResponse.json(
        { error: "無効なリンクです。Bot から新しいリンクを発行してください。" },
        { status: 404 }
      );
    }
    if (rec.usedAt) {
      return NextResponse.json(
        { error: "このリンクはすでに使用済みです。" },
        { status: 409 }
      );
    }
    if (Date.now() > rec.expiresAt.getTime()) {
      return NextResponse.json(
        { error: "リンクの有効期限が切れています。Bot から新しいリンクを発行してください。" },
        { status: 410 }
      );
    }

    // ----- Step 2: User テーブルに walletAddress を保存 -----
    const existingByWallet = await prisma.user.findUnique({ where: { walletAddress } });

    if (existingByWallet && existingByWallet.discordId !== rec.discordId) {
      // 同じウォレットが別discordIdで登録済み → discordIdを付け替えて履歴を引き継ぐ
      // （DailyRewardなどの関連レコードがあるためdeleteではなくupdateで対処）
      const existingByDiscord = await prisma.user.findUnique({ where: { discordId: rec.discordId } });
      if (existingByDiscord) {
        // 新discordIdのレコードが既にあれば先に履歴ごと削除（空のテスト残留データ）
        await prisma.dailyReward.deleteMany({ where: { userId: existingByDiscord.id } });
        await prisma.user.delete({ where: { discordId: rec.discordId } });
      }
      // walletAddressを持つレコードのdiscordIdを付け替え（履歴を保持）
      await prisma.user.update({
        where: { walletAddress },
        data:  { discordId: rec.discordId },
      });
    } else {
      await prisma.user.upsert({
        where:  { discordId: rec.discordId },
        create: { discordId: rec.discordId, walletAddress },
        update: { walletAddress },
      });
    }

    // ----- Step 3: トークンを使用済みにする -----
    await prisma.walletLinkToken.update({
      where: { id: rec.id },
      data:  { usedAt: new Date() },
    });

    // ----- Step 4: DawnSeed を自動mint（失敗しても登録は成功扱い） -----
    tryMintDawnSeed(walletAddress).catch((err) => {
      console.error("DawnSeed mint エラー（登録は完了済み）:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/register error:", err);
    return NextResponse.json(
      { error: `サーバーエラーが発生しました。（${msg.slice(0, 120)}）` },
      { status: 500 }
    );
  }
}
