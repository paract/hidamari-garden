// linkToken.js — Web2.5 ウォレット登録用ワンタイムリンクの生成・検証
import { randomUUID } from 'crypto';
import { prisma } from './db.js';

const EXPIRE_MIN = 10; // リンクの有効期限（分）

/**
 * 未登録ユーザー向けのワンタイム登録 URL を生成する。
 * 同一ユーザーの未使用トークンは事前に削除し、常に最新の1本に保つ。
 * @param {string} discordId
 * @returns {Promise<string>} 登録用 URL
 */
export async function createLinkToken(discordId) {
  // 同一ユーザーの古い未使用トークンを削除（リンクの使い回し防止）
  await prisma.walletLinkToken.deleteMany({
    where: { discordId, usedAt: null },
  });

  const token     = randomUUID();
  const expiresAt = new Date(Date.now() + EXPIRE_MIN * 60 * 1000);

  await prisma.walletLinkToken.create({ data: { token, discordId, expiresAt } });

  const base = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  return `${base}/connect?token=${token}`;
}

/**
 * トークンを検証する（Web 側 API から呼び出す想定）。
 * @param {string} token
 * @returns {{ valid: boolean, discordId?: string, tokenId?: string, reason?: string }}
 */
export async function verifyLinkToken(token) {
  const rec = await prisma.walletLinkToken.findUnique({ where: { token } });
  if (!rec)               return { valid: false, reason: 'NOT_FOUND' };
  if (rec.usedAt)         return { valid: false, reason: 'ALREADY_USED' };
  if (Date.now() > rec.expiresAt.getTime()) return { valid: false, reason: 'EXPIRED' };
  return { valid: true, discordId: rec.discordId, tokenId: rec.id };
}

/**
 * トークンを使用済みにする（ウォレット登録完了時に呼ぶ）。
 * @param {string} tokenId  verifyLinkToken が返した id
 */
export async function consumeLinkToken(tokenId) {
  await prisma.walletLinkToken.update({
    where: { id: tokenId },
    data:  { usedAt: new Date() },
  });
}
