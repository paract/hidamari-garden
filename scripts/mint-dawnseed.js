// DawnSeed（参加証SBT）を指定アドレスへ発行するスクリプト
// 使い方: npx hardhat run scripts/mint-dawnseed.js --network polygon_amoy
// 発行先は RECIPIENT_ADDRESS を変更する

const { ethers } = require("hardhat");

const DAWNSEED_ADDRESS = "0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C";

// ここに発行したいウォレットアドレスを入れる
const RECIPIENT_ADDRESS = "0x2e5D87D0457c48B85F7Ccb0cFE3A3995d54329D4";

async function main() {
  if (RECIPIENT_ADDRESS === "YOUR_WALLET_ADDRESS_HERE") {
    throw new Error("RECIPIENT_ADDRESS を実際のアドレスに書き換えてください");
  }

  const [owner] = await ethers.getSigners();
  console.log("実行アカウント（オーナー）:", owner.address);
  console.log("発行先:", RECIPIENT_ADDRESS);

  const dawnSeed = await ethers.getContractAt("DawnSeed", DAWNSEED_ADDRESS);

  // すでにミント済みか確認
  const alreadyMinted = await dawnSeed.hasMinted(RECIPIENT_ADDRESS);
  if (alreadyMinted) {
    console.log("⚠️ このアドレスにはすでにDawnSeedが発行されています");
    return;
  }

  console.log("\nDawnSeed をミント中...");
  const tx = await dawnSeed.mintSeed(RECIPIENT_ADDRESS);
  await tx.wait();

  console.log("✅ ミント完了！ TX:", tx.hash);
  console.log("発行先:", RECIPIENT_ADDRESS);
  console.log(
    "確認:",
    `https://amoy.polygonscan.com/tx/${tx.hash}`
  );
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
