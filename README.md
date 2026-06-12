# 🌱 陽だまりの庭（Hidamari Garden）

> **「web3って怪しいかも。」を、合言葉ひとことで変える。**
>
> ウォレット作成もシードフレーズ管理も不要。Discordで朝の合言葉を打つだけでトークンが届き、育成型NFTが成長する——web3初心者のための、やさしいコミュニティ自動化システム。

**🔗 本番稼働中:** https://atsc-hidamari.vercel.app/lp
**⛓ チェーン:** Polygon Mainnet（3コントラクト稼働中・Stripe決済 本番運用済み）

---

## なにができるか

| 体験 | 仕組み |
|---|---|
| 朝活Discordで合言葉を打つ → トークンが届く | Bot が6段チェック後、ATSC（ERC-20）を自動転送 |
| ウォレットを「作った覚えがないのに持っている」 | Discord OAuth + thirdweb In-App Wallet（秘密鍵の自己管理不要） |
| 貯めたトークンでNFTを育てる | BioNFT（ERC-721 dNFT）が Seed → 大樹 へ5段階成長 |
| 日本円でNFTを買う | Stripe Checkout → Webhook → mint の非同期連携 |
| 半年続けると最終ステージに | 1日3 ATSC × 180日 = 540 ATSC の継続設計 |

### 従来のweb3との違い

| 従来のweb3 | 陽だまりの庭 |
|---|---|
| ウォレットアプリを自分でインストール | Discordログインで自動生成 |
| シードフレーズを自己管理 | 管理不要（In-App Wallet） |
| ガス代を自分で用意 | サーバー側で負担 |
| トークンを自分で請求 | 合言葉ひとことで自動配布 |

---

## システム全体図

```
                        ┌──────────────────────────────┐
                        │   Discord サーバー（朝活）      │
                        │  #今日の合言葉 / 司令ルーム     │
                        └──────┬───────────────────────┘
                               │ メッセージ検知
                ┌──────────────▼──────────────┐
                │  Bot「ひまりちゃん」(PM2 24h)  │
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
          │  /lp /connect /my-tokens /shop     │
          │  thirdweb In-App Wallet (Discord)  │
          └──────────▲────────────────────────┘
                     │ 決済 Webhook
          ┌──────────┴───┐
          │   Stripe      │
          └──────────────┘
```

詳細な設計資料: [docs/design.md](docs/design.md)

---

## 技術的なポイント

### 1. 二重送金を防ぐ冪等性設計
トークン転送の**前に**DBログを作成し、`(userId, date)` の複合UNIQUE制約を分散ロックとして利用。同時リクエストが来ても1本しか転送されない。転送失敗時はログを削除してロールバック。

### 2. 6段チェックによるSybil攻撃対策
チャンネル判定 → 合言葉一致 → 受付時間（JST）→ ウォレット/SBT保有 → アカウント年齢7日制限 → 重複受取防止。「仕組みを知られても破れない」設計。

### 3. Web2.5 ウォレット登録フロー
ワンタイムトークン（10分失効・1回使用で無効化）→ Discord OAuth → In-App Wallet 自動生成。運営も秘密鍵に触れない非カストディアル構成。

### 4. Stripe × ブロックチェーンの非同期連携
法定通貨決済（Webhook）と ユーザーウォレットでの mint を「支払い済み・未mint」状態をDBで管理して整合。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| コントラクト | Solidity / Hardhat / OpenZeppelin（ERC-20・721・1155 / ERC-2981） |
| Bot | Node.js (ESM) / discord.js v14 / node-cron |
| チェーン接続 | thirdweb v5 / viem |
| Web | Next.js (App Router) / TypeScript / Tailwind CSS |
| ウォレット | thirdweb In-App Wallet（Discord OAuth） |
| DB | Prisma ORM / Supabase (PostgreSQL) |
| 決済 | Stripe Checkout + Webhook |
| ストレージ | IPFS (Pinata) |
| 運用 | Vercel（Web）/ PM2 24時間稼働（Bot）/ Polygon Mainnet |

## デプロイ済みコントラクト（Polygon Mainnet）

| コントラクト | アドレス |
|---|---|
| DawnSeed (ERC-1155 SBT) | [`0xaFf4...382C`](https://polygonscan.com/address/0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C) |
| ATSCoin (ERC-20) | [`0x41f2...2F49`](https://polygonscan.com/address/0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49) |
| BioNFT (ERC-721 dNFT) | [`0xdC5F...4322`](https://polygonscan.com/address/0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322) |

---

## ディレクトリ構成

```
├── contracts/   # Solidity（DawnSeed / ATSToken / BioNFT）
├── scripts/     # Hardhat デプロイスクリプト
├── bot/         # Discord Bot「ひまりちゃん」（配布・EXP・cron）
├── web/         # Next.js（LP / ウォレット登録 / マイページ / ショップ）
├── metadata/    # NFT メタデータ（IPFS用）
└── docs/        # 設計資料・ロードマップ・コントラクト仕様
```

---

## 開発スタイル — AI協働について

本プロジェクトは **Claude Code（AI開発環境）を活用し、設計・実装管理・デバッグ・本番運用まで開発者が主導**する形で構築しています。

- 体験設計・仕様策定・アーキテクチャ判断・運用：開発者
- コーディング・リファクタリング：AIと協働（全コードをレビューの上採用）
- 本番運用・インシデント対応・コミュニティ運営：開発者

開発者は医療職（作業療法士）との二足のわらじで、「非エンジニアの不安がわかる」ことを体験設計に活かしています。

---

## ライセンス・お問い合わせ

このリポジトリは**ポートフォリオとして公開**しています。
コードの商用利用・再配布はご遠慮ください（All rights reserved）。

「自分のコミュニティにも似た仕組みがほしい」などのご相談は、お気軽にどうぞ：

- note: https://note.com/paracter/portal
- Substack: https://paracter7.substack.com
- サイト: https://atsc-hidamari.vercel.app/lp
