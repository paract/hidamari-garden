// check-dawnseed.js — 登録済みユーザーの DawnSeed 保有状況を確認するスクリプト
// 実行: node check-dawnseed.js
import 'dotenv/config';
import { hasDawnSeed } from './src/lib/chain.js';
import { prisma } from './src/lib/db.js';

async function run() {
  console.log('=== DawnSeed 保有確認 ===\n');

  // DB から登録済みユーザーを全員取得
  const users = await prisma.user.findMany({
    select: { discordId: true, walletAddress: true },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('登録済みユーザーがいません。');
    await prisma.$disconnect();
    return;
  }

  console.log(`登録ユーザー数: ${users.length} 人\n`);

  // 各ユーザーの DawnSeed 保有をチェック
  for (const user of users) {
    const has = await hasDawnSeed(user.walletAddress).catch(() => null);
    const status = has === true ? '✅ 保有あり' : has === false ? '❌ 未保有' : '⚠️  確認失敗';
    console.log(`${status}  Discord: ${user.discordId}  Wallet: ${user.walletAddress}`);
  }

  console.log('\n=== 確認完了 ===');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('❌ エラー:', err);
  await prisma.$disconnect();
  process.exit(1);
});
