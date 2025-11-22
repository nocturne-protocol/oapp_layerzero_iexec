import { EndpointId } from "@layerzerolabs/lz-definitions";
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";
import type { OAppEnforcedOption, OmniPointHardhat } from "@layerzerolabs/toolbox-hardhat";
import { generateConnectionsConfig, type TwoWayConfig } from "@layerzerolabs/metadata-tools";

/**
 * LayerZero OApp Configuration for iExec PoCo Cross-Chain
 * 
 * Uses LayerZero Simple Config Generator for automatic bidirectional connections
 */

// ============================================================================
// Contract Definitions
// ============================================================================

const sepoliaContract: OmniPointHardhat = {
  eid: EndpointId.SEPOLIA_V2_TESTNET,
  contractName: "PocoOApp",
};

const baseSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: "PocoOApp",
};

const arbitrumSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.ARBSEP_V2_TESTNET,
  contractName: "PocoOApp",
};

// ============================================================================
// Enforced Options
// ============================================================================

// Gas limit for PoCo matchOrders execution on Arbitrum
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 200000, // Sufficient for matchOrders execution
    value: 0,
  },
];

// ============================================================================
// Pathways Configuration
// ============================================================================

/**
 * Define pathways - automatically bidirectional
 * Format: [contractA, contractB, [requiredDVNs, [optionalDVNs, threshold]], [confirmations A→B, B→A], [options A→B, B→A]]
 */
const pathways: TwoWayConfig[] = [
  // Sepolia ↔ Arbitrum Sepolia
  [
    sepoliaContract,                      // Chain A
    arbitrumSepoliaContract,              // Chain B
    [["LayerZero Labs"], []],             // Use default LayerZero Labs DVN
    [1, 1],                               // 1 block confirmation each direction
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],

  // Base Sepolia ↔ Arbitrum Sepolia
  [
    baseSepoliaContract,                  // Chain A
    arbitrumSepoliaContract,              // Chain B
    [["LayerZero Labs"], []],             // Use default LayerZero Labs DVN
    [1, 1],                               // 1 block confirmation each direction
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
];

// ============================================================================
// Export Configuration
// ============================================================================

export default async function () {
  // Generate bidirectional connections from pathways
  const connections = await generateConnectionsConfig(pathways);

  return {
    contracts: [
      { contract: sepoliaContract },
      { contract: baseSepoliaContract },
      { contract: arbitrumSepoliaContract },
    ],
    connections,
  };
}
