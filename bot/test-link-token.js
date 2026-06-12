// test-link-token.js — WalletLinkToken の動作確認スクリプト
// 実行: node test-link-token.js
import 'dotenv/config';
import { createLinkToken, verifyLinkToken, consumeLinkToken } from './src/lib/linkToken.js';
import { prisma } from './src/lib/db.js';

const TEST_DISCORD_ID = 'test-user-000000000000';

async function run() {
  console.log('=== WalletLinkToken テスト開始 ===\n');

  // ① トークン生成
  console.log('① createLinkToken...');
  const url = await createLinkToken(TEST_DISCORD_ID);
  console.log(`   生成URL: ${url}`);
  const token = new URL(url).searchParams.get('token');
  console.log(`   token:   ${token}\n`);

  // ② 検証（有効なトークン）
  console.log('② verifyLinkToken（有効）...');
  const result = await verifyLinkToken(token);
  console.log(`   valid:     ${result.valid}`);
  console.log(`   discordId: ${result.discordId}`);
  console.log(`   tokenId:   ${result.tokenId}\n`);

  // ③ 消費（使用済みにする）
  console.log('③ consumeLinkToken...');
  await consumeLinkToken(result.tokenId);
  console.log('   使用済みに変更\n');

  // ④ 使用済みトークンの再検証
  console.log('④ verifyLinkToken（使用済み）...');
  const result2 = await verifyLinkToken(token);
  console.log(`   valid:  ${result2.valid}`);
  console.log(`   reason: ${result2.reason}\n`);

  // ⑤ クリーンアップ
  await prisma.walletLinkToken.deleteMany({ where: { discordId: TEST_DISCORD_ID } });
  console.log('⑤ テストデータを削除しました\n');

  // ⑥ 存在しないトークンの検証
  console.log('⑥ verifyLinkToken（存在しない）...');
  const result3 = await verifyLinkToken('00000000-0000-0000-0000-000000000000');
  console.log(`   valid:  ${result3.valid}`);
  console.log(`   reason: ${result3.reason}\n`);

  console.log('=== 全テスト完了 ===');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('❌ テスト失敗:', err);
  await prisma.$disconnect();
  process.exit(1);
});
