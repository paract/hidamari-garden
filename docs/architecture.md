# Architecture — ディレクトリ構成・DB定義

## ディレクトリ構成

```
/Users/naom4/claudecode/web3-Token/
├── contracts/
│   ├── DawnSeed.sol              # 参加証SBT (ERC-1155)
│   ├── ATSToken.sol              # コミュニティトークン (ERC-20 / ATSC)
│   └── BioNFT.sol               # 成長するdNFT (ERC-721)
├── bot/                         # Discord Bot「ひまりちゃん」
│   ├── prisma/
│   │   ├── schema.prisma        # 5テーブル定義
│   │   ├── seed.js              # EvolutionSettings 初期データ
│   │   ├── migrations/          # マイグレーション履歴
│   │   └── dev.db               # SQLite 本番DB（gitignore済み）
│   ├── src/
│   │   ├── index.js             # Bot起動・ロール初期化・Cron起動・司令ルームログ
│   │   ├── handlers/
│   │   │   ├── keyword.js       # 合言葉検知→4段チェック→ATSC配布→リンクボタン
│   │   │   └── admin.js         # !setkeyword（司令ルーム専用）
│   │   └── lib/
│   │       ├── chain.js         # thirdweb v5 ATSC実転送
│   │       ├── db.js            # Prisma シングルトン
│   │       ├── walletStore.js   # Discord ID ↔ walletAddress の CRUD
│   │       ├── exp.js           # EXP 加算・取得・進化情報
│   │       ├── security.js      # Sybil対策（7日未満ブロック）
│   │       ├── cron.js          # 定期実行スケジューラ
│   │       └── linkToken.js     # Web2.5 ワンタイム登録URL
│   ├── test-link-token.js       # WalletLinkToken 動作確認スクリプト
│   └── package.json
├── web/                         # ★ 次フェーズ構築予定（Next.js）
│   ├── src/app/
│   │   ├── page.tsx
│   │   ├── connect/page.tsx     # ウォレット登録ページ
│   │   └── api/register/route.ts
│   ├── prisma/schema.prisma     # bot と同内容・同DB参照
│   ├── .env.local
│   └── package.json
├── docs/
│   ├── roadmap.md
│   ├── architecture.md          # このファイル
│   └── contracts.md
├── hardhat.config.js
├── .gitignore
└── CLAUDE.md
```

---

## Prisma スキーマ（5テーブル）

### User
Discord ユーザーとウォレットアドレスの紐付け。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| discordId | String @unique | Discord ユーザーID |
| walletAddress | String @unique | 登録済みウォレット |
| isVerified | Boolean | SBT検証済みフラグ |
| isVip | Boolean | VIPフラグ |
| exp | Int | 累計EXP（貢献ポイント） |
| createdAt / updatedAt | DateTime | 自動更新 |

### DailyReward
1日1回制限の配布ログ。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | User.id への FK |
| date | String | YYYY-MM-DD |
| txHash | String? | ATSC転送TXハッシュ |
| @@unique | [userId, date] | 重複防止の複合ユニーク |

### DailyKeyword
日替わり合言葉と受付時間の管理。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| date | String @unique | YYYY-MM-DD |
| keyword | String | 当日の合言葉 |
| startTime | String | 受付開始 HH:mm（JST） |
| endTime | String | 受付終了 HH:mm（JST） |
| sponsorName / announcement | String? | オプション情報 |

### EvolutionSettings
BioNFT 進化ステージ設定（コード変更なしでDB調整可能）。

| カラム | 型 | 説明 |
|---|---|---|
| level | Int @id | 1〜4 |
| stageName | String | 表示名（例: 新芽 Sprout） |
| requiredAtsc | Decimal | 必要ATSC消費量 |
| requiredExp | Int | 必要累計EXP |

シード値:
- Level 1: 新芽(Sprout) ATSC:30 EXP:50
- Level 2: 若木(Vine) ATSC:90 EXP:150
- Level 3: 開花(Bloom) ATSC:180 EXP:300
- Level 4: 大樹(Ancient) ATSC:240 EXP:500

### WalletLinkToken
Web2.5 ウォレット登録フロー用のワンタイムトークン。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (cuid) | PK |
| token | String @unique | UUID（URLに埋め込む） |
| discordId | String | 対象Discord ユーザーID |
| expiresAt | DateTime | 有効期限（発行から10分） |
| usedAt | DateTime? | 使用済み日時（null=未使用） |

---

## 主要スタック

| レイヤー | 技術 |
|---|---|
| Bot | discord.js v14 / Node.js ESM |
| ブロックチェーン | thirdweb v5 / viem / Polygon Amoy |
| DB | Prisma ORM / SQLite |
| スケジューラ | node-cron（Asia/Tokyo） |
| Web（予定） | Next.js 14 App Router / Tailwind / thirdweb Connect |
