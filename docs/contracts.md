# Contracts — コントラクト仕様・デプロイ情報

## デプロイ済みアドレス（Polygon Mainnet ✅ 2026-05-11移行）

| コントラクト | アドレス |
|---|---|
| DawnSeed (ERC-1155 SBT) | `0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C` |
| ATSCoin (ERC-20 / ATSC) | `0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49` |
| BioNFT (ERC-721 dNFT)   | `0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322` |

サーバーウォレット（Bot送金元）: `0xc4b98B5054BC7961b5A37BDA7919f794d79cb917`

※ デプロイウォレットのnonceがAmoy・Mainnetで同一だったため、アドレスは同じになっている

---

## DawnSeed.sol（ERC-1155 SBT）
- **役割**: コミュニティへの参加証（ソウルバウンドトークン）
- 譲渡不可（SBT）
- 1ウォレット1枚
- `onlyOwner` でmint（オーナーが手動配布）
- BioNFT の mint 条件になる

## ATSToken.sol（ERC-20 / シンボル: ATSC）
- **役割**: コミュニティ内流通トークン。朝活参加で獲得し、BioNFT育成で消費する
- 総供給: **1,000,000 ATSC**（固定・追加発行なし）
- 規格: ERC20 + ERC20Burnable + ERC20Permit
- アロケーション:
  - コミュニティ報酬: 50%（500,000 ATSC）
  - 運営: 20%（200,000 ATSC）
  - SaaS流動性: 30%（300,000 ATSC）
- Bot配布量: **3 ATSC / 日**（合言葉正解ユーザーへ）

## BioNFT.sol（ERC-721 dNFT）
- **役割**: ATSC を消費して育てる成長型NFT。継続参加の証明
- DawnSeed 保有者のみ mint 可能
- 成長コスト（ATSC → treasuryAddress へ移転）:

| ステージ | 名前 | 必要ATSC | 累計 |
|---|---|---|---|
| Stage 0 | Seed（初期） | — | — |
| Stage 1 | 新芽（Sprout） | 30 | 30 |
| Stage 2 | 若木（Vine） | 90 | 120 |
| Stage 3 | 開花（Bloom） | 180 | 300 |
| Stage 4 | 大樹（Ancient） | 240 | 540 |

- 設計思想: **1日3ATSC × 180日 = 540 ATSC**（半年継続で最終ステージ到達）
- constructor引数: `(atsTokenAddress, dawnSeedAddress, treasuryAddress)`
- `setStageCost` / `setTreasuryAddress` は `onlyOwner` で変更可能

---

## 本番移行時の注意
- 現在は Polygon **Amoy**（テストネット）で稼働中
- 本番移行時は Polygon **Mainnet** に再デプロイ
- `hardhat.config.js` のネットワーク設定を変更し、`.env` の RPC URL を更新する
