// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

/**
 * Generic cross-chain matchOrders script using LayerZero
 * 
 * This script creates and signs iExec orders, then sends them cross-chain
 * from any source chain (Sepolia, Base Sepolia, etc.) to Arbitrum Sepolia using LayerZero OApp contracts.
 * 
 * Usage:
 *   tsx src/matchorder.ts <source-chain>
 * 
 * Example:
 *   tsx src/matchorder.ts sepolia
 *   tsx src/matchorder.ts baseSepolia
 */

import 'dotenv/config';
import { IExec, utils } from 'iexec';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiParameters,
  encodeAbiParameters,
  encodePacked,
  recoverAddress,
  type Address,
  type WalletClient,
  type PublicClient,
  type Chain,
} from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { loadConfig, getChainConfig } from "./config.js";
// Import ABI directly from layerzero package artifacts
import PocoOAppArtifact from "../../layerzero/artifacts/contracts/PocoOApp.sol/PocoOApp.json" assert { type: "json" };

const PocoOAppAbi = PocoOAppArtifact.abi;

interface MatchOrderParams {
  appAddress: Address;
  appprice?: bigint;
  volume?: number;
  tag?: string[];
  category?: number;
}

/**
 * Helper function to build LayerZero options
 * Creates options with executor LZ receive option (Type 3)
 * Format: TYPE_3 (uint16) + WORKER_ID (uint8) + option_size (uint16) + option_type (uint8) + option (bytes)
 * where option = encodeLzReceiveOption(gas, value) = abi.encodePacked(gas) or abi.encodePacked(gas, value)
 */
function buildLzOptions(
  gasLimit: bigint,
  nativeDrop: bigint = 0n
): `0x${string}` {
  const TYPE_3 = 3; // Type 3 for executor options
  const WORKER_ID = 1; // Worker ID 1 (Executor)
  const OPTION_TYPE_LZRECEIVE = 1; // Option type 1 (LZ Receive)

  // Encode the option (gas, or gas + nativeDrop if nativeDrop > 0)
  let optionBytes: `0x${string}`;
  if (nativeDrop === 0n) {
    // Only gas limit
    optionBytes = encodePacked(["uint128"], [gasLimit]);
  } else {
    // Gas limit + native drop
    optionBytes = encodePacked(["uint128", "uint128"], [gasLimit, nativeDrop]);
  }

  // Calculate option size: 1 byte for option_type + option bytes length
  const optionSize = 1 + (optionBytes.length - 2) / 2; // -2 for '0x', /2 for hex pairs

  // Encode the full option: TYPE_3 + WORKER_ID + option_size + OPTION_TYPE_LZRECEIVE + option
  return encodePacked(
    ["uint16", "uint8", "uint16", "uint8", "bytes"],
    [TYPE_3, WORKER_ID, optionSize, OPTION_TYPE_LZRECEIVE, optionBytes]
  );
}

/**
 * Get the Viem chain object for a given chain name
 */
function getViemChain(chainName: string): Chain {
  switch (chainName) {
    case "sepolia":
      return sepolia;
    case "baseSepolia":
      return baseSepolia;
    default:
      throw new Error(`Unsupported chain: ${chainName}`);
  }
}

/**
 * Get the RPC URL for a given chain
 */
function getRpcUrl(chainName: string): string {
  switch (chainName) {
    case "sepolia":
      return (
        process.env.SEPOLIA_RPC_URL ||
        "https://gateway.tenderly.co/public/sepolia"
      );
    case "baseSepolia":
      return process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
    default:
      throw new Error(`Unsupported chain: ${chainName}`);
  }
}

async function main() {
  // ==================================================================
  // STEP 0: Parse command-line arguments
  // ==================================================================
  const sourceChain = process.argv[2];
  if (!sourceChain) {
    console.error("❌ Error: Please provide a source chain name");
    console.error("\nUsage: tsx src/matchorder.ts <source-chain>");
    console.error("\nAvailable chains:");
    console.error("  - sepolia");
    console.error("  - baseSepolia");
    console.error("\nExample:");
    console.error("  tsx src/matchorder.ts sepolia");
    process.exit(1);
  }

  console.log(
    `\n🚀 Starting cross-chain matchOrders from ${sourceChain} to Arbitrum Sepolia...\n`
  );

  // ==================================================================
  // STEP 1: Load configuration
  // ==================================================================
  console.log("📋 Loading configuration...");

  const config = loadConfig();
  const sourceChainConfig = getChainConfig(sourceChain, config);
  const arbitrumSepoliaConfig = getChainConfig("arbitrumSepolia", config);

  if (sourceChainConfig.mode !== "Router") {
    throw new Error(`Chain ${sourceChain} is not configured as a Router`);
  }

  if (arbitrumSepoliaConfig.mode !== "Receiver") {
    throw new Error("arbitrumSepolia is not configured as a Receiver");
  }

  console.log(`  Source chain:      ${sourceChain} (Router)`);
  console.log(`  Destination chain: arbitrumSepolia (Receiver)`);
  console.log(`  Source PocoOApp:   ${sourceChainConfig.pocoOAppAddress}`);
  console.log(`  Dest PocoOApp:     ${arbitrumSepoliaConfig.pocoOAppAddress}`);
  console.log(`  PoCo contract:     ${arbitrumSepoliaConfig.pocoAddress}\n`);

  // ==================================================================
  // STEP 2: Setup wallets and clients
  // ==================================================================
  console.log("🔐 Setting up wallets and clients...");

  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Ensure private key has 0x prefix for Viem
  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`  Account: ${account.address}`);

  // Setup Viem clients for source chain
  const viemChain = getViemChain(sourceChain);
  const rpcUrl = getRpcUrl(sourceChain);

  const publicClient: PublicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl),
  });

  const walletClient: WalletClient = createWalletClient({
    account,
    chain: viemChain,
    transport: http(rpcUrl),
  });

  // Setup iExec SDK for Arbitrum Sepolia (where orders are executed)
  // iExec SDK requires private key WITHOUT 0x prefix and chain ID as string
  const privateKeyRaw = privateKey.startsWith("0x")
    ? privateKey.slice(2)
    : privateKey;

  const ethProvider = utils.getSignerFromPrivateKey(
    "421614", // Arbitrum Sepolia chain ID
    privateKeyRaw
  );
  const iexec = new IExec({ ethProvider });

  console.log(`🔑 iExec SDK initialized with wallet: ${account.address}`);

  // Verify iExec SDK is using the correct PoCo contract
  console.log("\n🔍 Verifying iExec configuration...");
  const iexecDomain = await iexec.config.resolveContractsClient();
  console.log(`  PoCo Hub Address: ${iexecDomain.hubAddress}`);

  const expectedPocoAddress = arbitrumSepoliaConfig.pocoAddress || "";
  if (
    iexecDomain.hubAddress.toLowerCase() !== expectedPocoAddress.toLowerCase()
  ) {
    throw new Error(
      `❌ iExec SDK is using wrong PoCo contract!\n` +
        `  SDK expects: ${iexecDomain.hubAddress}\n` +
        `  Config has:  ${expectedPocoAddress}\n\n` +
        `💡 The iExec SDK will automatically use the correct EIP712 domain for this contract.`
    );
  }

  console.log(
    `  ✅ iExec SDK will sign orders with correct PoCo contract (chain 421614)`
  );
  console.log(
    `  📝 EIP712 domain separator will be automatically computed by iExec SDK\n`
  );

  // ==================================================================
  // STEP 3: Create and sign iExec orders
  // ==================================================================
  console.log("📝 Creating and signing iExec orders...");
  console.log(
    "⚠️  WARNING: This may take a while if using public RPC endpoints...\n"
  );

  const params: MatchOrderParams = {
    appAddress: "0x0117a9955f868a81aa7ba54cb440edee993accab" as Address,
    appprice: 0n,
    volume: 1,
    tag: ["tee", "scone"],
    category: 0,
  };

  console.log("Creating app order...");
  const apporder = await iexec.order.createApporder({
    app: params.appAddress,
    appprice: Number(params.appprice || 0n),
    volume: params.volume || 1,
    tag: params.tag || [],
  });
  const signedApporder = await iexec.order.signApporder(apporder);
  console.log("✓ App order signed\n");

  // Create empty dataset order (no actual dataset - just for encoding)
  console.log("Creating empty dataset order...");
  const signedDatasetorder = {
    dataset: "0x0000000000000000000000000000000000000000" as Address,
    datasetprice: 0,
    volume: params.volume || 1,
    tag: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    apprestrict: "0x0000000000000000000000000000000000000000" as Address,
    workerpoolrestrict: "0x0000000000000000000000000000000000000000" as Address,
    requesterrestrict: "0x0000000000000000000000000000000000000000" as Address,
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    sign: "0x" as `0x${string}`,
  };
  console.log("✓ Empty dataset order created\n");

  // Fetch workerpool order from marketplace
  console.log("🏊 Fetching workerpool order from marketplace...");
  const workerpoolOrderbook = await iexec.orderbook.fetchWorkerpoolOrderbook({
    minTag: params.tag || [],
    maxTag: params.tag || [],
    category: params.category || 0,
    minVolume: 1,
  });

  if (!workerpoolOrderbook || workerpoolOrderbook.count === 0) {
    throw new Error(
      `No workerpool order found for category ${
        params.category || 0
      } with tags ${JSON.stringify(params.tag || [])}. ` +
        `Try a different category or check the marketplace on Arbitrum Sepolia.`
    );
  }

  const publishedWorkerpoolorder = workerpoolOrderbook.orders[0];
  const workerpoolorder = publishedWorkerpoolorder.order;
  console.log(`✓ Workerpool order found: ${workerpoolorder.workerpool}`);
  console.log(`  Price: ${workerpoolorder.workerpoolprice} nRLC`);
  console.log(`  Remaining volume: ${publishedWorkerpoolorder.remaining}`);
  console.log(`  Category: ${workerpoolorder.category}`);
  console.log(`  Tag: ${workerpoolorder.tag}\n`);

  console.log("📝 Creating and signing request order...");
  const requestorder = await iexec.order.createRequestorder({
    app: params.appAddress,
    appmaxprice: Number(params.appprice || 0n),
    dataset: "0x0000000000000000000000000000000000000000" as Address,
    datasetmaxprice: 0,
    workerpool: workerpoolorder.workerpool,
    workerpoolmaxprice: Number(workerpoolorder.workerpoolprice),
    requester: account.address,
    volume: params.volume || 1,
    tag: params.tag || [],
    category: Number(workerpoolorder.category),
    trust: 0,
    beneficiary: account.address,
    callback: "0x0000000000000000000000000000000000000000" as Address,
    params: JSON.stringify({ iexec_args: "" }),
  });
  console.log(`  Requester set to: ${account.address}`);
  const signedRequestorder = await iexec.order.signRequestorder(requestorder);
  console.log("✓ Request order signed\n");

  // Hash the request order after signing (salt is added during signing)
  const requestorderHash = await iexec.order.hashRequestorder(
    signedRequestorder
  );

  // Log all order details for debugging
  const allOrders = {
    apporder: signedApporder,
    datasetorder: signedDatasetorder,
    workerpoolorder: workerpoolorder,
    requestorder: signedRequestorder,
  };

  console.log("\n📊 Order Details:");
  console.log(`  App:              ${allOrders.apporder.app}`);
  console.log(
    `  Dataset:          ${allOrders.datasetorder.dataset} (empty - no dataset)`
  );
  console.log(
    `  Workerpool:       ${allOrders.workerpoolorder.workerpool} (from marketplace)`
  );
  console.log(`  Request hash:     ${requestorderHash}`);
  console.log(`  Request requester: ${allOrders.requestorder.requester}\n`);

  // ✅ ECDSA Signature Verification
  console.log("\n🔐 Verifying ECDSA signature...");
  try {
    // Recover signer address from signature
    const recoveredAddress = await recoverAddress({
      hash: requestorderHash as `0x${string}`,
      signature: signedRequestorder.sign as `0x${string}`,
    });

    console.log(`  Order hash:         ${requestorderHash}`);
    console.log(`  Signature:          ${signedRequestorder.sign}`);
    console.log(`  Expected requester: ${signedRequestorder.requester}`);
    console.log(`  Recovered signer:   ${recoveredAddress}`);
    console.log(`  Account address:    ${account.address}`);

    if (
      recoveredAddress.toLowerCase() ===
      signedRequestorder.requester.toLowerCase()
    ) {
      console.log(`  ✅ Signature is VALID - matches requester!`);
    } else {
      throw new Error(
        `❌ Signature verification FAILED!\n` +
          `  Expected requester: ${signedRequestorder.requester}\n` +
          `  Recovered signer:   ${recoveredAddress}\n` +
          `  Account address:    ${account.address}\n\n` +
          `🔍 This means the order was signed by ${recoveredAddress} but the requester field is ${signedRequestorder.requester}.\n` +
          `   The signature is valid, but for the WRONG address!`
      );
    }
  } catch (error: any) {
    console.error(`  ❌ ECDSA verification failed: ${error.message}`);
    throw error;
  }

  // ==================================================================
  // STEP 4: Encode matchOrders payload
  // ==================================================================
  console.log("\n🔐 Encoding matchOrders payload for cross-chain call...");

  const matchOrdersPayload = encodeAbiParameters(
    parseAbiParameters([
      "(address app, uint256 appprice, uint256 volume, bytes32 tag, address datasetrestrict, address workerpoolrestrict, address requesterrestrict, bytes32 salt, bytes sign) apporder",
      "(address dataset, uint256 datasetprice, uint256 volume, bytes32 tag, address apprestrict, address workerpoolrestrict, address requesterrestrict, bytes32 salt, bytes sign) datasetorder",
      "(address workerpool, uint256 workerpoolprice, uint256 volume, bytes32 tag, uint256 category, uint256 trust, address apprestrict, address datasetrestrict, address requesterrestrict, bytes32 salt, bytes sign) workerpoolorder",
      "(address app, uint256 appmaxprice, address dataset, uint256 datasetmaxprice, address workerpool, uint256 workerpoolmaxprice, address requester, uint256 volume, bytes32 tag, uint256 category, uint256 trust, address beneficiary, address callback, string params, bytes32 salt, bytes sign) requestorder",
    ]),
    [
      {
        app: allOrders.apporder.app as Address,
        appprice: BigInt(allOrders.apporder.appprice),
        volume: BigInt(allOrders.apporder.volume),
        tag: allOrders.apporder.tag as `0x${string}`,
        datasetrestrict: allOrders.apporder.datasetrestrict as Address,
        workerpoolrestrict: allOrders.apporder.workerpoolrestrict as Address,
        requesterrestrict: allOrders.apporder.requesterrestrict as Address,
        salt: allOrders.apporder.salt as `0x${string}`,
        sign: allOrders.apporder.sign as `0x${string}`,
      },
      {
        dataset: allOrders.datasetorder.dataset as Address,
        datasetprice: BigInt(allOrders.datasetorder.datasetprice),
        volume: BigInt(allOrders.datasetorder.volume),
        tag: allOrders.datasetorder.tag as `0x${string}`,
        apprestrict: allOrders.datasetorder.apprestrict as Address,
        workerpoolrestrict: allOrders.datasetorder
          .workerpoolrestrict as Address,
        requesterrestrict: allOrders.datasetorder.requesterrestrict as Address,
        salt: allOrders.datasetorder.salt as `0x${string}`,
        sign: allOrders.datasetorder.sign as `0x${string}`,
      },
      {
        workerpool: allOrders.workerpoolorder.workerpool as Address,
        workerpoolprice: BigInt(allOrders.workerpoolorder.workerpoolprice),
        volume: BigInt(allOrders.workerpoolorder.volume),
        tag: allOrders.workerpoolorder.tag as `0x${string}`,
        category: BigInt(allOrders.workerpoolorder.category),
        trust: BigInt(allOrders.workerpoolorder.trust),
        apprestrict: allOrders.workerpoolorder.apprestrict as Address,
        datasetrestrict: allOrders.workerpoolorder.datasetrestrict as Address,
        requesterrestrict: allOrders.workerpoolorder
          .requesterrestrict as Address,
        salt: allOrders.workerpoolorder.salt as `0x${string}`,
        sign: allOrders.workerpoolorder.sign as `0x${string}`,
      },
      {
        app: allOrders.requestorder.app as Address,
        appmaxprice: BigInt(allOrders.requestorder.appmaxprice),
        dataset: allOrders.requestorder.dataset as Address,
        datasetmaxprice: BigInt(allOrders.requestorder.datasetmaxprice),
        workerpool: allOrders.requestorder.workerpool as Address,
        workerpoolmaxprice: BigInt(allOrders.requestorder.workerpoolmaxprice),
        requester: allOrders.requestorder.requester as Address,
        volume: BigInt(allOrders.requestorder.volume),
        tag: allOrders.requestorder.tag as `0x${string}`,
        category: BigInt(allOrders.requestorder.category),
        trust: BigInt(allOrders.requestorder.trust),
        beneficiary: allOrders.requestorder.beneficiary as Address,
        callback: allOrders.requestorder.callback as Address,
        params: allOrders.requestorder.params,
        salt: allOrders.requestorder.salt as `0x${string}`,
        sign: allOrders.requestorder.sign as `0x${string}`,
      },
    ]
  );

  console.log("✓ Payload encoded\n");

  // ==================================================================
  // STEP 5: Quote the cross-chain call
  // ==================================================================
  console.log("💰 Quoting cross-chain call...");

  const matchOrdersSelector = "0x156194d4"; // matchOrders(IexecLibOrders_v5.AppOrder,IexecLibOrders_v5.DatasetOrder,IexecLibOrders_v5.WorkerpoolOrder,IexecLibOrders_v5.RequestOrder)

  // Build LayerZero options with gas limit for destination execution
  const gasLimit = 2_000_000n; // Increased gas limit for matchOrders
  const lzOptions = buildLzOptions(gasLimit);

  const pocoOAppContract = {
    address: sourceChainConfig.pocoOAppAddress as Address,
    abi: PocoOAppAbi,
  };

  const fee = await publicClient.readContract({
    ...pocoOAppContract,
    functionName: "quoteCall",
    args: [matchOrdersSelector, matchOrdersPayload, lzOptions, false],
  });

  const nativeFee = (fee as any).nativeFee || (fee as any)[0];
  console.log(`  Estimated fee: ${nativeFee} wei\n`);

  // ==================================================================
  // STEP 6: Send the cross-chain transaction
  // ==================================================================
  console.log("🚀 Sending cross-chain matchOrders transaction...");

  const hash = await walletClient.writeContract({
    ...pocoOAppContract,
    functionName: "routeCall",
    args: [
      matchOrdersSelector,
      matchOrdersPayload,
      account.address, // refundAddress
      lzOptions,
    ],
    value: nativeFee as bigint,
  });

  console.log(`  Transaction hash: ${hash}`);
  console.log(`  Waiting for confirmation...\n`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
    console.log("✅ Transaction confirmed!");
    console.log(`  Block: ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed}\n`);

    console.log("🔗 View transaction:");
    console.log(
      `  Source chain (${sourceChain}): https://${viemChain.blockExplorers?.default.url}/tx/${hash}`
    );
    console.log(
      `  LayerZero Scan: https://testnet.layerzeroscan.com/tx/${hash}\n`
    );

    console.log(
      "⏳ The cross-chain message will be delivered by LayerZero relayers."
    );
    console.log(
      "   Check LayerZero Scan for delivery status and Arbitrum Sepolia for execution.\n"
    );
  } else {
    console.error("❌ Transaction failed!");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

