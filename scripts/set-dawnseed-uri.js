const { ethers } = require("hardhat");

const DAWNSEED_ADDRESS = "0xaFf4Fee8f3714C2A77675b1cc6489e74A89e382C";
const METADATA_URI = "ipfs://bafkreiak5svbjpcgsnbx6xnzppu45popth7k7wnsb2y7t5ggx2vim2qxom";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("実行アカウント:", owner.address);

  const dawnSeed = await ethers.getContractAt("DawnSeed", DAWNSEED_ADDRESS);

  console.log("setURI を実行中...");
  const tx = await dawnSeed.setURI(METADATA_URI);
  await tx.wait();

  console.log("✅ URI 設定完了！ TX:", tx.hash);
  console.log("設定URI:", METADATA_URI);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
