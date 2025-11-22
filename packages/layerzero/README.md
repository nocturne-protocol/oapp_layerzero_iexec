# LayerZero PoCo OApp

Cross-chain routing for iExec PoCo using LayerZero V2.

## Overview

The `PocoOApp` contract enables cross-chain function calls to the PoCo contract on Arbitrum from any EVM chain.

### Architecture

- **Router Mode**: Deployed on non-Arbitrum chains (Sepolia, Base Sepolia, etc.)
  - Routes PoCo function calls to Arbitrum via LayerZero
  - Only sends messages, doesn't receive
  
- **Receiver Mode**: Deployed on Arbitrum Sepolia
  - Receives cross-chain messages and executes them on the PoCo contract
  - Only receives messages, doesn't route

### Supported Networks

#### Testnets

- ✅ **Sepolia** (Router) → Arbitrum Sepolia
- ✅ **Base Sepolia** (Router) → Arbitrum Sepolia  
- ✅ **Arbitrum Sepolia** (Receiver) - PoCo contract deployment

#### Mainnets (Coming Soon)

- Ethereum Mainnet → Arbitrum One
- Base Mainnet → Arbitrum One
- Optimism → Arbitrum One
- Polygon → Arbitrum One

### Key Features

- ✅ Unified contract with configurable mode (Router/Receiver)
- ✅ Gas-optimized with custom errors
- ✅ Library-based message encoding/decoding
- ✅ Deterministic deployment via CreateX
- ✅ Multi-network configuration

## Configuration

Edit `config/config.json` to configure deployments:

```json
{
  "chains": {
    "ethereum": {
      "mode": "Router",
      "lzEndpointAddress": "0x1a44076050125825900e736c501f859c50fE728c",
      "lzEndpointId": 30101,
      "destinationChain": "arbitrum",
      "pocoOAppCreatexSalt": "0x706f636f6f617070..."
    },
    "arbitrum": {
      "mode": "Receiver",
      "lzEndpointAddress": "0x1a44076050125825900e736c501f859c50fE728c",
      "lzEndpointId": 30110,
      "pocoAddress": "0x3eca1B216A7DF1C7689aEb259fFB83ADFB894E7f",
      "pocoOAppCreatexSalt": "0x706f636f6f617070..."
    }
  }
}
```

### Configuration Fields

- **`mode`**: `"Router"` or `"Receiver"` - Operating mode of the contract
- **`lzEndpointAddress`**: LayerZero V2 Endpoint address
- **`lzEndpointId`**: LayerZero Endpoint ID for this chain
- **`destinationChain`**: Network name of destination chain (only for Router mode)
- **`pocoAddress`**: PoCo contract address (only for Receiver mode - where calls are executed)
- **`pocoOAppCreatexSalt`**: Salt for deterministic CreateX deployment

## Deployment

### 1. Update Configuration

Edit `config/config.json` with your network-specific values:

- Set PoCo contract addresses
- Verify LayerZero endpoint addresses and IDs
- Configure unique CreateX salts for each network

### 2. Setup Environment

Add your API keys to `.env`:

```bash
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_key_here
```

### 3. Deploy Contracts

Deploy contracts using LayerZero's official tooling:

```bash
npm run lz:deploy
```

This uses Hardhat Ignition with the LayerZero plugin to deploy on all configured networks.

### 4. Configure LayerZero Connections

After deployment, wire all cross-chain connections:

```bash
npm run lz:wire
```

**What this does:**

- Reads `layerzero.config.ts` for connection definitions
- Calls `setPeer()` on all contracts automatically
- Configures DVNs (Decentralized Verifier Networks)
- Sets up send/receive libraries
- Establishes bidirectional communication

**Output:**

```
✓ Setting OApp config for PocoOApp on sepolia
✓ Setting OApp config for PocoOApp on baseSepolia  
✓ Setting OApp config for PocoOApp on arbitrumSepolia
✓ OApp config set successfully
```

### 5. Verify Configuration

Check that all peers are correctly configured:

```bash
npm run lz:peers:get
```

This displays all configured peers for each contract.

### 6. View Full Configuration

To see the complete LayerZero configuration:

```bash
npm run lz:config:get
```

This shows DVNs, executors, confirmations, and all LayerZero settings.

## LayerZero Configuration

This project uses **`layerzero.config.ts`** - LayerZero's official configuration system.

### Configuration File

`layerzero.config.ts` defines:

- **Contracts** on each network (Sepolia, Base Sepolia, Arbitrum Sepolia)
- **Connections** between contracts (bidirectional routes)
- **DVNs** (Decentralized Verifier Networks) - uses LayerZero defaults
- **ULN Config** - Confirmations, thresholds, etc.

### Why LayerZero Config?

✅ **Industry Standard** - Used by all major LayerZero integrations  
✅ **Automated** - One command to wire everything  
✅ **Type-Safe** - Full TypeScript support  
✅ **Validated** - Built-in safety checks  
✅ **Production-Ready** - Battle-tested infrastructure  

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Clean

```bash
npm run clean
```

## Contract Structure

```
contracts/
├── PocoOApp.sol              # Main unified contract
├── interfaces/
│   └── IPocoOApp.sol          # Interface with events and errors
├── libraries/
│   └── PocoMessageLib.sol     # Message encoding/decoding utilities
└── mocks/
    └── MockPoco.sol           # Mock PoCo for testing
```

## Usage Example

### Router (Ethereum → Arbitrum)

```solidity
// On Ethereum, call PoCo function via router
IPocoOApp router = IPocoOApp(routerAddress);

// Encode function call
bytes4 selector = bytes4(keccak256("matchOrders(bytes,bytes,bytes,bytes)"));
bytes memory payload = abi.encode(appOrder, datasetOrder, workerpoolOrder, requestOrder);

// Route to Arbitrum
bytes memory lzOptions = buildLzOptions(200000, 0);
router.routeCall{value: fee}(
    selector,
    payload,
    msg.sender, // refund address
    lzOptions
);
```

### Receiver (Arbitrum)

The receiver automatically:

1. Receives the LayerZero message
2. Decodes the function call
3. Executes it on the PoCo contract
4. Emits success/failure events

## LayerZero Endpoint IDs

| Network          | Endpoint ID | Address                                      |
|-----------------|-------------|----------------------------------------------|
| Ethereum        | 30101       | 0x1a44076050125825900e736c501f859c50fE728c   |
| Arbitrum        | 30110       | 0x1a44076050125825900e736c501f859c50fE728c   |
| Sepolia         | 40161       | 0x6EDCE65403992e310A62460808c4b910D972f10f   |
| Arbitrum Sepolia| 40231       | 0x6EDCE65403992e310A62460808c4b910D972f10f   |

## Security Considerations

- Only the contract owner can configure LayerZero peers
- Routers can only send to configured Arbitrum receiver
- Receiver validates messages from trusted routers only
- All cross-chain calls are authenticated with source chain ID and caller address

## Cross-Chain Transaction Tools

For executing cross-chain iExec operations (like `matchOrders`), see the **`@iexec/cross-chain-tx`** package.

This separate ESM package provides ready-to-use scripts for:

- Creating and signing iExec orders
- Encoding payloads for cross-chain transmission
- Sending transactions via the deployed PocoOApp contracts

```bash
cd packages/cross-chain-tx
npm install
npm run matchorder:sepolia
```

See [`packages/cross-chain-tx/README.md`](../cross-chain-tx/README.md) for more details.

## License

Apache-2.0
