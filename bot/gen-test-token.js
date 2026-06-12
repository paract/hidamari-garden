// gen-test-token.js — 結合テスト用のワンタイムURLを生成する
// 実行: node gen-test-token.js
// ※ テスト後は Prisma Studio で User テーブルに walletAddress が入ったか確認する
import 'dotenv/config';
import { createLinkToken } from './src/lib/linkToken.js';
import { prisma } from './src/lib/db.js';

const TEST_DISCORD_ID = 'test-user-integration-001';

async function run() {
  const url = await createLinkToken(TEST_DISCORD_ID);
  const token = new URL(url).searchParams.get('token');

  console.log('\n=== 結合テスト用トークン生成 ===');
  console.log(`discordId : ${TEST_DISCORD_ID}`);
  console.log(`token     : ${token}`);
  console.log(`\n👉 ブラウザで開く URL:`);
  console.log(`   ${url}`);
  console.log('\n有効期限: 10分');
  console.log('テスト後の確認: cd bot && npx prisma studio\n');

  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('❌ エラー:', err);
  await prisma.$disconnect();
  process.exit(1);
});
