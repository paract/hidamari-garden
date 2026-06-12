// DawnSeed（参加証SBT）を Polygon Amoy テストネットへデプロイするスクリプト
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  // アドレスのみ表示（秘密鍵・RPC URLは絶対に出力しない）
  console.log("デプロイするウォレット:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("POL残高:", hre.ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    throw new Error("POL残高が0です。テスト用POLを取得してください: https://faucet.polygon.technology/");
  }

  // メタデータのIPFS URIは後でIPFSアップロード後に設定する
  // 現時点ではプレースホルダーURIを使用
  const PLACEHOLDER_URI = "ipfs://bafybeig6xv5nwphfmvcnektpnojts33jqcuam7bmye2pb54adnrtccjlsu/{id}.json";

  console.log("\nDawnSeed コントラクトをデプロイ中...");

  const DawnSeed = await hre.ethers.getContractFactory("DawnSeed");
  const dawnSeed = await DawnSeed.deploy(PLACEHOLDER_URI);

  await dawnSeed.waitForDeployment();

  const contractAddress = await dawnSeed.getAddress();
  console.log("\nDawnSeed デプロイ完了！");
  console.log("コントラクトアドレス:", contractAddress);
  console.log("Amoy Polygonscan:", `https://amoy.polygonscan.com/address/${contractAddress}`);

  console.log("\n--- 次のステップ ---");
  console.log("1. 上記のアドレスを PROJECT_SPEC.md のデプロイ情報テーブルに記録する");
  console.log("2. NFTのビジュアル画像を作成しIPFSにアップロードする");
  console.log("3. setURI() でメタデータURIを正式なものに更新する");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
