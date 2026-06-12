// ATSToken（ATSCoin / ATSC ERC-20）を Polygon Amoy テストネットへデプロイするスクリプト
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("デプロイするウォレット:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("POL残高:", hre.ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    throw new Error("POL残高が0です。テスト用POLを取得してください");
  }

  // 全量（1,000,000 ATSC）をデプロイしたウォレットへ発行する
  // 後でコミュニティ50% / 運営20% / 流動性30% の割合で手動送金する
  const initialHolder = deployer.address;

  console.log("\nATSToken コントラクトをデプロイ中...");

  const ATSToken = await hre.ethers.getContractFactory("ATSToken");
  const atsToken = await ATSToken.deploy(initialHolder);

  await atsToken.waitForDeployment();

  const contractAddress = await atsToken.getAddress();
  console.log("\nATSToken デプロイ完了！");
  console.log("コントラクトアドレス:", contractAddress);
  console.log("Amoy Polygonscan:", `https://amoy.polygonscan.com/address/${contractAddress}`);

  console.log("\n--- 次のステップ ---");
  console.log("1. 上記アドレスを控えておく（BioNFTデプロイ時に必要）");
  console.log("2. scripts/deploy-BioNFT.js の ATS_TOKEN_ADDRESS に貼り付ける");
  console.log("3. アロケーション配布: コミュニティ50万/運営20万/流動性30万 ATS を手動送金");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
