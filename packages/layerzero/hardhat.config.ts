import "dotenv/config";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-verify";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "@layerzerolabs/toolbox-hardhat";
import { EndpointId } from "@layerzerolabs/lz-definitions";

const config = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      // Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
      allowUnlimitedContractSize: true,
      // Fork Arbitrum for testing
      forking: {
        url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
        enabled: false, // Disabled by default, enable for specific tests
      },
      chainId: 31337,
      blockGasLimit: 32_000_000,
    },
    sepolia: {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://gateway.tenderly.co/public/sepolia",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrumSepolia: {
      eid: EndpointId.ARBSEP_V2_TESTNET,
      url:
        process.env.ARBITRUM_SEPOLIA_RPC_URL ||
        "https://arbitrum-sepolia.gateway.tenderly.co",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    baseSepolia: {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  dependencyCompiler: {
    paths: [
      "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol",
      "@layerzerolabs/test-devtools-evm-hardhat/contracts/mocks/EndpointV2Mock.sol",
    ],
  },
  ignition: {
    strategyConfig: {
      create2: {
        // Default salt for CREATE2 deterministic deployment
        // Can be overridden in ignition modules or via CLI
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: false, // Disable sourcify verification
  },
  namedAccounts: {
    deployer: {
      default: 0, // First account from accounts array
    },
  },
};

export default config;
