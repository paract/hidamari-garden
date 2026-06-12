require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// .env から読み込む（値は絶対にログに出力しない）
// フォールバックは「秘密鍵=1」の公開ダミー値（コンパイル用）。実鍵は必ず .env で渡す
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const POLYGON_AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "";
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-bor-rpc.publicnode.com";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    // ローカルテスト用
    hardhat: {},
    // Polygon Amoy テストネット（Chain ID: 80002）
    polygon_amoy: {
      url: POLYGON_AMOY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
    // Polygon メインネット（Chain ID: 137）
    polygon_mainnet: {
      url: POLYGON_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
  },
  // Polygonscan でのコントラクト検証用
  etherscan: {
    apiKey: {
      polygonAmoy: POLYGONSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
};
