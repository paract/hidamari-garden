// BioNFTコントラクトにbaseURIを設定するスクリプト
import 'dotenv/config';
import { createThirdwebClient, getContract, sendTransaction, prepareContractCall } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";

const BIONFT_ADDRESS = "0xdC5F5e7fD0C4c649Bd91fA4f814c6ae2C2eB4322";
const BASE_URI = "ipfs://bafybeied7qv4mfxz4ux77dlq7hdvsc5qhrakooeb7nkzlz66n4okimycum/";

const client = createThirdwebClient({ secretKey: process.env.THIRDWEB_SECRET_KEY });
const rawKey = process.env.PRIVATE_KEY ?? '';
const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
const account = privateKeyToAccount({ client, privateKey });

const contract = getContract({ client, chain: polygon, address: BIONFT_ADDRESS });

const tx = prepareContractCall({
  contract,
  method: "function setBaseURI(string memory newBaseURI)",
  params: [BASE_URI],
});

const receipt = await sendTransaction({ transaction: tx, account });
console.log("✅ baseURI設定完了！");
console.log("TX:", receipt.transactionHash);
