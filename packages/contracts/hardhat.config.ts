import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatKeystore],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_INFURA_API_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    zgTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("ZG_RPC_URL"),
      accounts: [configVariable("ZG_TESTNET_PRIVATE_KEY")],
      chainId: 16602,
    },
  },
});
