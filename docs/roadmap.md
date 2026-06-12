# Roadmap — 陽だまりの庭 進捗管理

## Phase 1 ✅ コントラクト設計・デプロイ
- DawnSeed / ATSCoin / BioNFT を Polygon Amoy にデプロイ済み
- アドレスは `docs/contracts.md` 参照

## Phase 2 ✅ Bot 基盤実装
- Prisma + SQLite 導入（5テーブル）
- 合言葉検知 → 4段チェック → ATSC実転送
- EXP システム・Sybil対策・EvolutionSettings

## Phase 3 ✅ Bot 運用仕上げ・リハーサル
- node-cron 導入（04:00 自動設定 / 05:30 開園告知）
- 司令ルームガード（チャンネル + Administrator 権限の2段）
- !setkeyword 変更時に公開チャンネルへ自動告知
- WalletLinkToken テーブル追加・実転送テスト成功（TX確認済み）
- キーワード70語ランダム選択

## Phase 4 🔲 Web2.5 実装（次フェーズ）

### 目標
`!wallet` コマンドを廃止し、Discord OAuth + thirdweb In-App Wallet で
ユーザーが秘密鍵を管理しない非カストディアル型ウォレット登録を実現する。

### フロー
```
合言葉を打つ（未登録）
  ↓
Bot がワンタイムURL を生成・送信（10分有効）
  ↓
ユーザーがボタンをクリック → Next.js の /connect ページへ
  ↓
Discord OAuth でログイン → thirdweb In-App Wallet 生成
  ↓
/api/register が token 検証 → User テーブルに walletAddress を保存
  ↓
登録完了 → もう一度合言葉を打つと ATSC が届く
```

### ToDo（実装順）

#### Step 1: Next.js プロジェクト作成
```bash
cd /Users/naom4/claudecode/web3-Token
npx create-next-app@latest web --typescript --tailwind --app --src-dir --no-git
cd web
npm install thirdweb
```

#### Step 2: 環境変数（web/.env.local）
```
DATABASE_URL="file:../bot/prisma/dev.db"
WEB_BASE_URL="http://localhost:3000"
THIRDWEB_CLIENT_ID="..."       # thirdweb ダッシュボードから取得
DISCORD_CLIENT_ID="..."        # Discord Developer Portal から取得
DISCORD_CLIENT_SECRET="..."
NEXTAUTH_SECRET="..."          # openssl rand -base64 32 で生成
NEXTAUTH_URL="http://localhost:3000"
```

#### Step 3: web/src/app/connect/page.tsx
- URLパラメータ `?token=UUID` を受け取る
- thirdweb `ConnectButton`（Discord OAuth）を配置
- ログイン後にウォレットアドレスを取得 → `/api/register` を呼ぶ

#### Step 4: web/src/app/api/register/route.ts
- `verifyLinkToken(token)` で検証（NOT_FOUND / EXPIRED / ALREADY_USED）
- `prisma.user.upsert` で walletAddress を保存
- `consumeLinkToken(tokenId)` でトークン無効化

#### Step 5: Prisma 共有設定（web/prisma/schema.prisma）
- `bot/prisma/schema.prisma` と同じ内容
- `DATABASE_URL` で `../bot/prisma/dev.db` を参照

#### Step 6: 本番デプロイ
- web/ → Vercel（SQLite は本番前に Supabase 等へ移行が必要）
- WEB_BASE_URL を Vercel の URL に変更

## Phase 5 🔲 本番公開
- テストメンバーへ DawnSeed（SBT）を配布
- Bot を PM2 で常時起動

## Phase 6 🔲 Guild.xyz トークンゲート（テストメンバー稼働後）
- Guild.xyz でDawnSeed保有者のみ入れるチャンネルを設定
- ウォレット残高に応じたDiscordロール自動付与
- 新メンバーのDawnSeed取得 → ロール付与の自動化
