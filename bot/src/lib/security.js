// security.js — セキュリティ検証ユーティリティ
// このモジュールは「判定」のみを行う。Discord 返信は呼び出し元で処理する。

const ACCOUNT_MIN_AGE_DAYS = 7;
const ACCOUNT_MIN_AGE_MS   = ACCOUNT_MIN_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Discord アカウントが作成から 7 日未満かどうか判定する（Sybil 攻撃対策）
 *
 * Bot 業者は使い捨てアカウントを大量生成するため、
 * 新規アカウントをブロックすることで不正受取を防止する。
 *
 * @param {import('discord.js').User} user  Discord ユーザーオブジェクト
 * @returns {boolean} true = アカウントが新しすぎる（ブロックすべき）
 */
export function isTooNewAccount(user) {
  return Date.now() - user.createdAt.getTime() < ACCOUNT_MIN_AGE_MS;
}

/**
 * アカウント作成からの経過日数を返す
 * @param {import('discord.js').User} user
 * @returns {number} 経過日数（小数切り捨て）
 */
export function getAccountAgeDays(user) {
  return Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * 解禁まで何日残っているか返す
 * @param {import('discord.js').User} user
 * @returns {number} 残り日数（1 以上。すでに解禁済みなら 0）
 */
export function getDaysUntilUnlock(user) {
  return Math.max(0, ACCOUNT_MIN_AGE_DAYS - getAccountAgeDays(user));
}
