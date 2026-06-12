// chain.js — thirdweb v5 を使った ATSC 実転送・DawnSeed確認モジュール
import { createThirdwebClient, getContract, sendTransaction, readContract, prepareContractCall, prepareTransaction, toWei } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { transfer } from "thirdweb/extensions/erc20";

// thirdweb クライアント（サーバー側は secretKey を使用）
const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY,
});

// サーバーウォレット（ATSC の配布元・秘密鍵は .env で管理）
const rawKey = process.env.PRIVATE_KEY ?? '';
const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;


const serverAccount = privateKeyToAccount({
  client,
  privateKey,
});

// ATSCoin コントラクト（Polygon Mainnet）
const atsContract = getContract({
  client,
  chain: polygon,
  address: process.env.ATS_TOKEN_ADDRESS,
});

// DawnSeed コントラクト（Polygon Mainnet）
const dawnSeedContract = getContract({
  client,
  chain: polygon,
  address: process.env.DAWN_SEED_ADDRESS,
});

// 1回あたりの配布量（.env の ATS_REWARD_AMOUNT、未設定なら 3）
const REWARD_AMOUNT = process.env.ATS_REWARD_AMOUNT ?? "3";

/**
 * 指定アドレスが DawnSeed（参加証SBT）を保有しているか確認する
 * @param {string} walletAddress 確認するウォレットアドレス
 * @returns {boolean} true = 保有している
 */
export async function hasDawnSeed(walletAddress) {
  return readContract({
    contract: dawnSeedContract,
    method: "function hasMinted(address) view returns (bool)",
    params: [walletAddress],
  });
}

/**
 * 指定アドレスに DawnSeed（SBT）を発行する
 * @param {string} walletAddress 発行先ウォレットアドレス
 * @returns {string} トランザクションハッシュ
 */
export async function mintDawnSeed(walletAddress) {
  const tx = prepareContractCall({
    contract: dawnSeedContract,
    method: "function mintSeed(address to)",
    params: [walletAddress],
  });

  const receipt = await sendTransaction({
    transaction: tx,
    account: serverAccount,
  });

  return receipt.transactionHash;
}

/**
 * 指定アドレスに ATSC を転送する（合言葉報酬用・固定量）
 * @param {string} toAddress 受取先ウォレットアドレス
 * @returns {string} トランザクションハッシュ
 */
export async function transferATSC(toAddress) {
  const tx = transfer({
    contract: atsContract,
    to: toAddress,
    amount: REWARD_AMOUNT,
  });

  const receipt = await sendTransaction({
    transaction: tx,
    account: serverAccount,
  });

  return receipt.transactionHash;
}

/**
 * 指定アドレスに任意の量の ATSC を転送する（EXP→ATSC変換用）
 * @param {string} toAddress 受取先ウォレットアドレス
 * @param {string|number} amount 転送するATSC量（例: "0.1", "1.0"）
 * @returns {string} トランザクションハッシュ
 */
export async function transferATSCAmount(toAddress, amount) {
  const tx = transfer({
    contract: atsContract,
    to: toAddress,
    amount: String(amount),
  });

  const receipt = await sendTransaction({
    transaction: tx,
    account: serverAccount,
  });

  return receipt.transactionHash;
}

// DawnSeed mint時にユーザーへ送るMATIC量（BioNFT mint + grow数回分）
const MATIC_GIFT_AMOUNT = "0.5";

/**
 * ユーザーのウォレットにMATICを送金する（ガス代補填用）
 * @param {string} toAddress 送金先ウォレットアドレス
 * @returns {string} トランザクションハッシュ
 */
export async function sendMATIC(toAddress) {
  const tx = prepareTransaction({
    to: toAddress,
    value: toWei(MATIC_GIFT_AMOUNT),
    chain: polygon,
    client,
  });

  const receipt = await sendTransaction({
    transaction: tx,
    account: serverAccount,
  });

  return receipt.transactionHash;
}
