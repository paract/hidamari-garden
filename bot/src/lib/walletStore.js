// walletStore.js — Discord ID ↔ ウォレットアドレスを Prisma User テーブルで永続管理
import { prisma } from './db.js';

/**
 * ウォレットアドレスを登録・更新する（upsert）
 * @param {string} discordId  Discord ユーザーID
 * @param {string} address    ウォレットアドレス（0x...）
 * @returns {Promise<User>}   作成 or 更新されたユーザーレコード
 * @throws {Error} WALLET_ALREADY_REGISTERED — 別アカウントが同じアドレスを登録済み
 */
export async function registerWallet(discordId, address) {
  try {
    return await prisma.user.upsert({
      where: { discordId },
      update: { walletAddress: address },
      create: { discordId, walletAddress: address },
    });
  } catch (err) {
    // P2002 = ユニーク制約違反（walletAddress が他のアカウントに紐付き済み）
    if (err.code === 'P2002') throw new Error('WALLET_ALREADY_REGISTERED');
    throw err;
  }
}

/**
 * Discord ID に紐づいたウォレットアドレスを返す
 * @param {string} discordId
 * @returns {Promise<string|null>}  未登録なら null
 */
export async function getWallet(discordId) {
  const user = await prisma.user.findUnique({ where: { discordId } });
  return user?.walletAddress ?? null;
}
