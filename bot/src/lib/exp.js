// exp.js — EXP（貢献ポイント）システム / DB ロジック
// Discord 返信は呼び出し元（index.js）で行う。このモジュールは DB 操作のみ担当する。
import { prisma } from './db.js';
import { todayJST } from '../handlers/keyword.js';

// =========================================================
// クールダウン管理（メモリ）
// =========================================================
// Bot 再起動でリセットされるが、スパム対策として十分機能する
const cooldowns = new Map(); // discordId → 最終加算時刻(ms)
const COOLDOWN_MS = 60 * 1000; // 1 分

// メッセージEXPの1日上限
const DAILY_MSG_EXP_LIMIT = 10;
const dailyMsgExp = new Map(); // discordId → { date: 'YYYY-MM-DD', count: number }

// 🌸リアクションの1日上限
const DAILY_REACTION_LIMIT = 5;

// =========================================================
// チャンネル判定
// =========================================================

/**
 * EXP 対象チャンネルかどうか判定する
 * 対象: 「☕陽だまりラウンジ」「📝今日の合言葉」
 * emoji は絵文字の有無にかかわらず includes で部分一致
 */
export function isExpChannel(channelName) {
  return (
    channelName?.includes('陽だまりラウンジ') ||
    channelName?.includes('今日の合言葉')
  );
}

// =========================================================
// EXP 操作
// =========================================================

/**
 * EXP を +1 する（クールダウンあり）
 *
 * スキップ条件:
 *   - 直近 1 分以内にすでに加算済み（スパム対策）
 *   - DB に User レコードがない（ウォレット未登録ユーザー）
 *
 * @param {string} discordId
 * @returns {Promise<boolean>} 加算成功 → true / スキップ → false
 */
export async function addExp(discordId) {
  // 1分クールダウンチェック
  const lastTime = cooldowns.get(discordId);
  if (lastTime && Date.now() - lastTime < COOLDOWN_MS) return false;

  // 1日10EXP上限チェック
  const today = todayJST();
  const entry = dailyMsgExp.get(discordId);
  if (entry && entry.date === today && entry.count >= DAILY_MSG_EXP_LIMIT) return false;

  // updateMany: User が存在しない場合はエラーを出さず count:0 を返す
  const result = await prisma.user.updateMany({
    where: { discordId },
    data:  { exp: { increment: 1 } },
  });

  if (result.count === 0) return false; // ウォレット未登録ユーザーはスキップ

  cooldowns.set(discordId, Date.now());

  // 1日の加算カウントを更新
  const newCount = (entry?.date === today ? entry.count : 0) + 1;
  dailyMsgExp.set(discordId, { date: today, count: newCount });

  // 月次EXPも同時に加算
  const yearMonth = today.slice(0, 7); // "YYYY-MM"
  await prisma.monthlyExpLog.upsert({
    where:  { discordId_yearMonth: { discordId, yearMonth } },
    update: { exp: { increment: 1 } },
    create: { discordId, yearMonth, exp: 1 },
  }).catch(err => console.error('❌ 月次EXP加算エラー:', err));

  return true;
}

/**
 * 累計 EXP を取得する
 * @param {string} discordId
 * @returns {Promise<number|null>} 未登録の場合は null
 */
export async function getExp(discordId) {
  const user = await prisma.user.findUnique({ where: { discordId } });
  return user?.exp ?? null;
}

/**
 * 残クールダウン秒数を返す（デバッグ用）
 * @param {string} discordId
 * @returns {number} 残り秒数。0 なら受付可能
 */
export function getCooldownRemaining(discordId) {
  const lastTime = cooldowns.get(discordId);
  if (!lastTime) return 0;
  return Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - lastTime)) / 1000));
}

/**
 * 現在の EXP から「次の進化ステージ」を返す
 * @param {number} currentExp
 * @returns {Promise<import('@prisma/client').EvolutionSettings | null>}
 *   null = 全ステージ到達済み（大樹）
 */
export async function getNextEvolution(currentExp) {
  return prisma.evolutionSettings.findFirst({
    where:   { requiredExp: { gt: currentExp } },
    orderBy: { level: 'asc' },
  });
}

/**
 * 🌸を押した人に +1 EXP（1日5回上限）
 * @param {string} reactorId - リアクションを押したユーザーの Discord ID
 * @returns {Promise<'added' | 'limit_reached' | 'not_registered'>}
 */
export async function addReactionGivenExp(reactorId) {
  // ウォレット未登録ユーザーはスキップ
  const user = await prisma.user.findUnique({ where: { discordId: reactorId } });
  if (!user) return 'not_registered';

  const today = todayJST();

  // 今日のリアクションログを取得（なければ新規作成）
  const log = await prisma.dailyReactionLog.upsert({
    where:  { reactorId_date: { reactorId, date: today } },
    update: {},
    create: { reactorId, date: today, count: 0 },
  });

  // 1日5回の上限チェック
  if (log.count >= DAILY_REACTION_LIMIT) return 'limit_reached';

  const yearMonth = today.slice(0, 7);

  // カウント +1 & EXP +1（累計・月次）を同時更新
  await Promise.all([
    prisma.dailyReactionLog.update({
      where: { reactorId_date: { reactorId, date: today } },
      data:  { count: { increment: 1 } },
    }),
    prisma.user.update({
      where: { discordId: reactorId },
      data:  { exp: { increment: 1 } },
    }),
    prisma.monthlyExpLog.upsert({
      where:  { discordId_yearMonth: { discordId: reactorId, yearMonth } },
      update: { exp: { increment: 1 } },
      create: { discordId: reactorId, yearMonth, exp: 1 },
    }),
  ]);

  return 'added';
}

/**
 * 🌸をもらった人に +2 EXP
 * @param {string} authorId - メッセージを書いたユーザーの Discord ID
 * @returns {Promise<boolean>} 加算成功 → true / 未登録 → false
 */
export async function addReactionReceivedExp(authorId) {
  const result = await prisma.user.updateMany({
    where: { discordId: authorId },
    data:  { exp: { increment: 2 } },
  });
  if (result.count === 0) return false;

  // 月次EXPにも +2 反映
  const yearMonth = todayJST().slice(0, 7);
  await prisma.monthlyExpLog.upsert({
    where:  { discordId_yearMonth: { discordId: authorId, yearMonth } },
    update: { exp: { increment: 2 } },
    create: { discordId: authorId, yearMonth, exp: 2 },
  }).catch(err => console.error('❌ 月次EXP（受信）加算エラー:', err));

  return true;
}

/**
 * 月次EXPランキング上位N名を取得する
 * @param {string} yearMonth - "YYYY-MM"
 * @param {number} limit
 */
export async function getMonthlyRanking(yearMonth, limit = 5) {
  return prisma.monthlyExpLog.findMany({
    where:   { yearMonth },
    orderBy: { exp: 'desc' },
    take:    limit,
  });
}
