# 設計資料 — 陽だまりの庭（ATS TOKEN）

作成日: 2026-06-12
対象: コンテスト応募・技術説明・引き継ぎ用

---

## 1. プロジェクト概要

### 解決したい悩み
「web3って怪しいかも。」——ウォレット・シードフレーズ・自己責任という壁で
一歩を踏み出せない人に、**何も覚えなくていいweb3体験**を届ける。

### コンセプト
朝活（Xスペース 5:30）Discordコミュニティ「夢ポケ」と連動したWeb3エコシステム。
毎朝の合言葉をDiscordに打つだけでトークン（ATSC）が自動で届き、
貯めたトークンで育成型NFT（BioNFT）を成長させる。

### 体験設計の原則
| 従来のweb3 | 陽だまりの庭 |
|---|---|
| ウォレットアプリを自分でインストール | Discordログインで自動生成 |
| シードフレーズを自己管理 | 管理不要（In-App Wallet） |
| ガス代を自分で用意 | サーバー側で負担 |
| トークンを自分で請求 | 合言葉ひとことで自動配布 |

---

## 2. システム全体図

```
                        ┌──────────────────────────────┐
                        │   Discord サーバー「夢ポケ」   │
                        │  #今日の合言葉 / 司令ルーム     │
                        └──────┬───────────────────────┘
                               │ メッセージ検知
                ┌──────────────▼──────────────┐
                │  Bot「ひまりちゃん」(iMac/PM2) │
                │  discord.js v14 + node-cron  │
                │  ・合言葉検知 → 6段チェック    │
                │  ・ATSC自動転送              │
                │  ・ワンタイム登録URL発行       │
                └────┬─────────────┬──────────┘
                     │             │
          ┌──────────▼───┐   ┌────▼──────────────────┐
          │ Supabase      │   │ Polygon Mainnet        │
          │ (PostgreSQL)  │   │ ・DawnSeed (SBT)       │
          │ 6テーブル      │   │ ・ATSCoin (ERC-20)     │
          └──────────▲───┘   │ ・BioNFT (dNFT)        │
                     │        └────▲──────────────────┘
          ┌──────────┴─────────────┴──────────┐
          │  Web (Next.js / Vercel)            │
          │  https://atsc-hidamari.vercel.app  │
          │  /lp /connect /my-tokens /shop ... │
          │  thirdweb In-App Wallet (Discord)  │
          └──────────▲────────────────────────┘
                     │ 決済 Webhook
          ┌──────────┴───┐
          │   Stripe      │
          └──────────────┘
```

---

## 3. スマートコントラクト（Polygon Mainnet）

| コントラクト | 規格 | アドレス | 役割 |
|---|---|---|---|
| DawnSeed | ERC-1155 (SBT) | `0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C` | 参加証。譲渡不可・1ウォレット1枚・owner手動配布 |
| ATSCoin (ATSC) | ERC-20 + Burnable + Permit | `0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49` | コミュニティ流通トークン。総供給100万枚固定 |
| BioNFT | ERC-721 (dNFT) | `0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322` | ATSC消費で成長する育成型NFT |

サーバーウォレット（Bot送金元）: `0xc4b98B5054BC7961b5A37BDA7919f794d79cb917`

### ATSC アロケーション
- コミュニティ報酬: 50%（500,000）
- 運営: 20%（200,000）
- SaaS流動性: 30%（300,000）
- 配布レート: **3 ATSC / 日**（合言葉正解者）

### BioNFT 成長設計（180日設計）
| ステージ | 名前 | 必要ATSC | 累計 |
|---|---|---|---|
| 0 | Seed | — | — |
| 1 | 新芽 Sprout | 30 | 30 |
| 2 | 若木 Vine | 90 | 120 |
| 3 | 開花 Bloom | 180 | 300 |
| 4 | 大樹 Ancient | 240 | 540 |

**1日3ATSC × 180日 = 540 ATSC** → 半年の朝活継続で最終ステージ到達。
継続の可視化そのものをNFTにした設計。

- mint条件: DawnSeed保有者のみ／ユーザー自身のウォレットから実行
- `grow(tokenId)`: ATSCをtreasuryへ移転してステージアップ（要事前approve）
- メタデータ: IPFS（Pinata）。baseURI `ipfs://bafybeied7qv4...`
- `setStageCost` / `setTreasuryAddress` は onlyOwner で調整可能

---

## 4. Discord Bot「ひまりちゃん」

- スタック: Node.js (ESM) / discord.js v14 / thirdweb v5 / Prisma / node-cron
- 稼働: iMac 24時間・PM2管理（`himari` プロセス）
- 補助Bot: チケットくん（Python・認証担当・`ticket` プロセス）

### 合言葉配布フロー — 6段チェック（`bot/src/handlers/keyword.js`）

```
メッセージ受信
 ① チャンネル判定 ──「今日の合言葉」チャンネル以外は無視
 ② 合言葉一致 ────── 当日の合言葉と完全一致のみ通過
 ③ 受付時間 ──────── JST 05:30〜07:30 等の時間窓チェック
 ④ ウォレット登録 ── 未登録ならワンタイム登録URL（10分有効）を発行
    └ DawnSeed保有 ─ 参加証SBT未保有はブロック
 ⑤ アカウント年齢 ── Discord作成7日未満をブロック（Sybil対策）
 ⑥ 重複受取防止 ──── DBログを「転送前に」作成（複合UNIQUE制約）
       ↓
 ATSC 3枚を実転送 → TXハッシュをDBに記録
```

### ⑥ 二重転送防止の設計（冪等性の確保）

転送→記録の順だと同時リクエストで二重送金が起きるため、**記録→転送**の順にしている。

```javascript
// 1. 先にDBログを作成。(userId, date) の複合UNIQUE制約が
//    同時リクエストの2本目を P2002 エラーで弾く
rewardRecord = await prisma.dailyReward.create({
  data: { userId: user.id, date: today },
});

// 2. ブロックチェーン転送（成功したらTXハッシュを追記）
txHash = await transferATSC(user.walletAddress);

// 3. 転送失敗時はDBログを削除してロールバック
//    →「記録だけ残って明日も受け取れない」事故を防ぐ
await prisma.dailyReward.delete({ where: { id: rewardRecord.id } });
```

> DBのUNIQUE制約を分散ロックとして使う、「鍵を先に取った1人だけが扉を通れる」設計。

### 管理者コマンド（司令ルーム専用・2段ガード）

チャンネル判定 + Administrator 権限の両方を要求。

| コマンド | 機能 |
|---|---|
| `!setkeyword [合言葉]` | 合言葉設定（公開チャンネルへ自動告知） |
| `!keyword` | 今日の合言葉確認 |
| `!mint @user / ID` | DawnSeed発行＋「陽だまりメンバー」ロール付与 |
| `!reset @user / ID` | ウォレット登録リセット |

### cron 自動化（Asia/Tokyo）
- 04:00 — 合言葉自動設定（70語プールからランダム選択）
- 05:30 — 開園告知を公開チャンネルへ投稿

### 🌸リアクションEXPシステム
- 押した人 +1 EXP／もらった人 +2 EXP／1日5回上限（DailyReactionLogで制御）

---

## 5. Web2.5 ウォレット登録フロー（最重要設計）

「秘密鍵を持たせずにブロックチェーン資産を扱う」ための橋渡し。

```
合言葉を打つ（未登録ユーザー）
   ↓
Bot が WalletLinkToken（UUID・10分有効）を発行
   ↓ Discordにボタン付きメッセージ
/connect?token=UUID（Next.js）
   ↓
Discord OAuth ログイン → thirdweb In-App Wallet 自動生成
   ↓
/api/register が token を検証
   ├ NOT_FOUND / EXPIRED / ALREADY_USED → エラー表示
   └ OK → User.walletAddress を保存 + token を使用済み化
   ↓
もう一度合言葉を打つ → ATSC が届く 🎉
```

設計ポイント:
- **ワンタイムトークン**: URL漏洩しても10分で失効・1回使うと無効
- **非カストディアル**: 秘密鍵はthirdwebのIn-App Walletが管理し、運営も触れない
- **Botとwebは同一DBを共有**（Prismaスキーマ共通）

---

## 6. Web アプリ（Next.js / Vercel）

本番: https://atsc-hidamari.vercel.app

### ページ構成
| パス | 役割 |
|---|---|
| `/lp` | ランディングページ（作品の顔・OGP設定済み） |
| `/connect` | ウォレット登録（ワンタイムトークン受け取り） |
| `/my-tokens` | DawnSeed・ATSC残高・BioNFT表示 |
| `/shop` | BioNFT購入（Stripe決済） |
| `/shop/thank-you` | 購入完了 |
| `/guide` `/journey` `/start` | 導入ガイド類 |
| `/migrate` | Avacusウォレットからの移行＋ロール付与 |

### API Routes
| パス | 役割 |
|---|---|
| `/api/register` | トークン検証→ウォレット保存 |
| `/api/stripe/create-checkout` | Checkoutセッション作成 |
| `/api/stripe/webhook` | 支払い完了通知の受信 |
| `/api/stripe/payment-status` | 支払い状態ポーリング |
| `/api/stripe/confirm-mint` | mint完了の記録 |
| `/api/grow/notify` | BioNFT成長のDiscord通知 |
| `/api/migrate/complete` | 移行完了→web3Membersロール付与 |

### BioNFT 購入フロー（Stripe × ブロックチェーンの非同期連携）

```
/shop で購入 → Stripe Checkout（法定通貨・円）
   ↓ 支払い完了
Stripe Webhook → BioNftPurchase テーブルに記録
   ↓ フロントが payment-status をポーリング
ユーザー自身のウォレットで mint() 実行
   ↓
confirm-mint で完了記録 → /my-tokens に表示
```

- mintはユーザーウォレット必須（コントラクト仕様）のため、
  「支払い済み・未mint」状態をDBで管理し、**支払いとmintの整合性**を保つ
- 価格は環境変数 `BIONFT_PRICE_JPY` / `NEXT_PUBLIC_BIONFT_PRICE_JPY` で変更可能

---

## 7. データベース（Supabase PostgreSQL・6テーブル）

| テーブル | 役割 | キー設計 |
|---|---|---|
| User | Discord ID ↔ ウォレット紐付け・EXP | discordId / walletAddress 各UNIQUE |
| DailyReward | 1日1回配布ログ・TXハッシュ | **(userId, date) 複合UNIQUE** ← 二重転送防止の要 |
| DailyKeyword | 日替わり合言葉・受付時間 | date UNIQUE |
| EvolutionSettings | 進化ステージ設定（コード変更なしでDB調整） | level PK |
| WalletLinkToken | ワンタイム登録トークン | token UNIQUE・10分失効・usedAt |
| DailyReactionLog | 🌸リアクションEXPの1日上限管理 | 日付×ユーザー |

開発初期は SQLite、本番移行時に Supabase（PostgreSQL）へ移行。
Prisma ORM によりスキーマは bot / web で共通。

---

## 8. インフラ・運用

| 項目 | 内容 |
|---|---|
| Bot稼働 | iMac 24時間・PM2（`himari` / `ticket`） |
| Web | Vercel（本番エイリアス: atsc-hidamari.vercel.app） |
| DB | Supabase（PostgreSQL） |
| チェーン | Polygon Mainnet（ガス代はサーバーウォレット負担） |
| 決済 | Stripe（本番稼働・テスター実購入確認済み） |
| NFT画像 | IPFS（Pinata）・ステージ別5画像 |
| 再起動 | `pm2 restart himari` / ログ `pm2 logs himari --nostream` |

### デプロイ運用の知見
- Vercelのエイリアスが自動設定されない構成のため、デプロイ後に
  `vercel inspect [URL] | grep Aliases` で確認 → 空なら `vercel alias set` を手動実行
- 公開ページは未ログインブラウザ・スマホSafari・Discordプレビューカードで動作確認

---

## 9. セキュリティ設計まとめ

| 脅威 | 対策 |
|---|---|
| Sybil攻撃（複数アカウントで荒稼ぎ） | アカウント年齢7日制限＋DawnSeed招待制＋1日1回制限 |
| 二重送金 | DB複合UNIQUE制約による転送前ロック＋失敗時ロールバック |
| 登録URL漏洩 | ワンタイムトークン（10分失効・1回使用で無効化） |
| 管理コマンド悪用 | 司令ルームチャンネル＋Administrator権限の2段ガード |
| 秘密鍵流出 | 非カストディアル設計（運営も秘密鍵に触れない） |
| 時間外の不正取得 | JST時間窓チェック（05:30〜07:30等） |

---

## 10. 技術スタック一覧

| レイヤー | 技術 |
|---|---|
| コントラクト | Solidity / Hardhat / OpenZeppelin（ERC-20・721・1155） |
| Bot | Node.js (ESM) / discord.js v14 / node-cron |
| チェーン接続 | thirdweb v5 / viem |
| Web | Next.js (App Router) / TypeScript / Tailwind CSS |
| ウォレット | thirdweb In-App Wallet（Discord OAuth） |
| DB | Prisma ORM / Supabase (PostgreSQL) |
| 決済 | Stripe Checkout + Webhook |
| ストレージ | IPFS (Pinata) |
| ホスティング | Vercel（Web）/ iMac + PM2（Bot） |
| ネットワーク | Polygon Mainnet（テストはAmoy） |
