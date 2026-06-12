// BioNFT（朝ツイ活デジタルガーデン ERC-721 dNFT）を Polygon Amoy テストネットへデプロイするスクリプト
// ※ 事前に DawnSeed と ATSToken をデプロイしてアドレスを取得しておくこと
const hre = require("hardhat");

// ========================================================
// ★ ここを編集してください（デプロイ前に必ず設定）
// ========================================================

// DawnSeed をデプロイしたときに表示されたコントラクトアドレス
const DAWN_SEED_ADDRESS = "0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C";

// ATSToken をデプロイしたときに表示されたコントラクトアドレス
const ATS_TOKEN_ADDRESS = "0x41f2aF2B85b34757bC853f92B9e3cB77fe2A2F49";

// ATSコストの回収先ウォレット（運営金庫）。空欄のままだとデプロイウォレットを使用する
const TREASURY_ADDRESS = ""; // 空欄 = デプロイウォレットを自動使用

// ========================================================

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("デプロイするウォレット:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("POL残高:", hre.ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    throw new Error("POL残高が0です。テスト用POLを取得してください");
  }

  // 入力チェック
  if (!DAWN_SEED_ADDRESS || !ATS_TOKEN_ADDRESS) {
    throw new Error(
      "DAWN_SEED_ADDRESS と ATS_TOKEN_ADDRESS を設定してからデプロイしてください"
    );
  }

  // TREASURYが未設定の場合はデプロイウォレットを使用
  const treasury = TREASURY_ADDRESS || deployer.address;
  console.log("\n--- デプロイ設定 ---");
  console.log("DawnSeed アドレス:", DAWN_SEED_ADDRESS);
  console.log("ATSToken アドレス:", ATS_TOKEN_ADDRESS);
  console.log("Treasury アドレス:", treasury);

  console.log("\nBioNFT コントラクトをデプロイ中...");

  const BioNFT = await hre.ethers.getContractFactory("BioNFT");
  const bioNFT = await BioNFT.deploy(ATS_TOKEN_ADDRESS, DAWN_SEED_ADDRESS, treasury);

  await bioNFT.waitForDeployment();

  const contractAddress = await bioNFT.getAddress();
  console.log("\nBioNFT デプロイ完了！");
  console.log("コントラクトアドレス:", contractAddress);
  console.log("Amoy Polygonscan:", `https://amoy.polygonscan.com/address/${contractAddress}`);

  console.log("\n--- 次のステップ ---");
  console.log("1. 上記3つのアドレスを PROJECT_SPEC.md に記録する");
  console.log("2. bot/src/lib/chain.js でATSToken実転送を実装する");
  console.log("3. DawnSeed の mintSeed() でコミュニティメンバーへSBT配布する");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
