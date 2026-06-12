// seed.js — EvolutionSettings 初期データ投入スクリプト
// 実行: npm run db:seed
//
// 進化コストは BioNFT.sol の setStageCost と合わせて設定する。
// DB を直接編集するだけでリバランスできる（コード変更不要）。
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVOLUTION_STAGES = [
  // BioNFT Stage 0 → 1
  {
    level:        1,
    stageName:    '新芽 (Sprout)',
    requiredAtsc: 30,   // BioNFT.sol の Stage 1 コストと一致
    requiredExp:  50,   // 約50日分のラウンジ活動
  },
  // BioNFT Stage 1 → 2
  {
    level:        2,
    stageName:    '若木 (Vine)',
    requiredAtsc: 90,   // BioNFT.sol の Stage 2 コストと一致
    requiredExp:  150,
  },
  // BioNFT Stage 2 → 3
  {
    level:        3,
    stageName:    '開花 (Bloom)',
    requiredAtsc: 180,  // BioNFT.sol の Stage 3 コストと一致
    requiredExp:  300,
  },
  // BioNFT Stage 3 → 4
  {
    level:        4,
    stageName:    '大樹 (Ancient)',
    requiredAtsc: 240,  // BioNFT.sol の Stage 4 コストと一致
    requiredExp:  500,
  },
];

async function main() {
  console.log('🌱 EvolutionSettings シードデータを投入中...\n');

  for (const stage of EVOLUTION_STAGES) {
    const result = await prisma.evolutionSettings.upsert({
      where:  { level: stage.level },
      update: stage,
      create: stage,
    });
    console.log(
      `  ✅ Level ${result.level}: ${result.stageName}` +
      ` | ATSC: ${result.requiredAtsc} / EXP: ${result.requiredExp}`
    );
  }

  console.log('\n🎉 シード完了！');
}

main()
  .catch(err => { console.error('❌ シードエラー:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
