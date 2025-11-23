# @iexec/cross-chain-tx

Cross-chain transaction tools for iExec using LayerZero OApp contracts.

This package provides ESM-compatible scripts for executing cross-chain iExec operations from any supported chain (Sepolia, Base Sepolia) to Arbitrum Sepolia using LayerZero messaging protocol.

## Prerequisites

Before running the scripts, ensure you have:

1. **LayerZero package built** (for contract ABIs)

   ```bash
   cd ../layerzero
   npm install
   npm run build
   ```

2. **PocoOApp contracts deployed** on your source chain and Arbitrum Sepolia

   ```bash
   cd ../layerzero
   npm run lz:deploy
   npm run lz:wire
   ```

3. **iExec App** deployed on Arbitrum Sepolia
   - Get your app address from iExec console

4. **Wallet with funds**
   - Sepolia ETH or Base Sepolia ETH for transaction fees (depending on source chain)
   - Must be the same wallet used to sign iExec orders

## Installation

```bash
cd packages/cross-chain-tx
npm install
```

## Configuration

### 1. Environment Variables

Copy `env.template` to `.env` and fill in your values:

```bash
cp env.template .env
```

Required variables:

- `PRIVATE_KEY` - Your wallet private key (0x prefix optional, will be added automatically)
- `APP_ADDRESS` - Your iExec app address (must include 0x prefix)

Optional variables (have sensible defaults):

- `SEPOLIA_RPC_URL` - Custom Sepolia RPC URL
- `BASE_SEPOLIA_RPC_URL` - Custom Base Sepolia RPC URL
- `ARBITRUM_SEPOLIA_RPC_URL` - Custom Arbitrum Sepolia RPC URL

### 2. Network Configuration

**Note**: This package uses `../layerzero/config/config.json` directly (no duplication).

Update the LayerZero package configuration with your deployed PocoOApp addresses:

```bash
# Edit the shared config file
vim ../layerzero/config/config.json
```

Example configuration:

```json
{
  "chains": {
    "sepolia": {
      "mode": "Router",
      "lzEndpointAddress": "0x6EDCE65403992e310A62460808c4b910D972f10f",
      "lzEndpointId": 40161,
      "destinationChain": "arbitrumSepolia",
      "pocoOAppAddress": "0xYourSepoliaRouterAddress"
    },
    "baseSepolia": {
      "mode": "Router",
      "lzEndpointAddress": "0x6EDCE65403992e310A62460808c4b910D972f10f",
      "lzEndpointId": 40245,
      "destinationChain": "arbitrumSepolia",
      "pocoOAppAddress": "0xYourBaseSepoliaRouterAddress"
    },
    "arbitrumSepolia": {
      "mode": "Receiver",
      "lzEndpointAddress": "0x6EDCE65403992e310A62460808c4b910D972f10f",
      "lzEndpointId": 40231,
      "pocoAddress": "0xB2157BF2fAb286b2A4170E3491Ac39770111Da3E",
      "pocoOAppAddress": "0xYourArbitrumReceiverAddress"
    }
  }
}
```

## Usage

### Run matchOrder from Any Supported Chain

This script will:

1. Create and sign an app order
2. Fetch a workerpool order from the marketplace
3. Create and sign a request order
4. Encode the orders for cross-chain transmission
5. Send the orders via LayerZero from your source chain to Arbitrum Sepolia
6. The PoCo contract on Arbitrum will execute `matchOrders`

#### From Sepolia

```bash
npm run matchorder:sepolia
```

#### From Base Sepolia

```bash
npm run matchorder:base-sepolia
```

This uses `tsx` to run the TypeScript directly - **no build step needed**!

### Script Arguments

The generic script accepts the source chain as an argument:

```bash
# From Sepolia
tsx src/matchorder.ts sepolia

# From Base Sepolia
tsx src/matchorder.ts baseSepolia
```

## How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ Source Chain    │         │    LayerZero     │         │ Arbitrum Sepolia│
│ (Sepolia/Base)  │────────>│   Messaging      │────────>│   (Receiver)    │
│   (Router)      │         └──────────────────┘         └─────────────────┘
└─────────────────┘                                               │
      │                                                            │
      │ 1. Create iExec orders                                    │
      │ 2. Sign orders                                            │
      │ 3. Encode payload                                         │
      │ 4. routeCall()                                            │
      │                                                            │
      │                                                       5. _lzReceive()
      │                                                       6. matchOrders()
      │                                                            │
      │                                                       ✅ Deal created
```

## Example Transactions

Here are real examples of cross-chain TEE confidential computing task triggering via LayerZero:

### Successful Cross-Chain Executions

- **[Transaction 1](https://testnet.layerzeroscan.com/tx/0xcd6beb1de6d15e540ed466b5a79505c9ab406ba03c0fb837de211d8fa5354c9f)** - Cross-chain matchOrders from source chain to Arbitrum Sepolia
  - Demonstrates TEE confidential computing task creation via LayerZero messaging
  
- **[Transaction 2](https://testnet.layerzeroscan.com/tx/0x61533221f9002971e799cd96287caa1c9abef561e95172ef21f6f088ad063865)** - Another successful cross-chain TEE task execution
  - Shows the full LayerZero message flow from router to receiver

You can inspect these transactions on [LayerZero Testnet Scan](https://testnet.layerzeroscan.com/) to see:

- Message delivery status
- Source and destination chains
- Gas consumption
- Execution traces

## Development

### Project Structure

```
cross-chain-tx/
├── src/
│   ├── config.ts                # Configuration loader (imports from layerzero)
│   ├── types.ts                 # TypeScript types
│   └── matchorder.ts            # Generic cross-chain script (supports all chains)
├── package.json
├── tsconfig.json
└── README.md
```

**Note**: Contract ABIs and configuration are imported directly from `../layerzero/` to avoid duplication:

- ABIs: `../layerzero/artifacts/contracts/PocoOApp.sol/PocoOApp.json`
- Config: `../layerzero/config/config.json`

### Adding New Scripts

1. Create a new TypeScript file in `src/`
2. Import necessary dependencies
3. Add a script entry in `package.json`

Example:

```json
{
  "scripts": {
    "myscript": "tsx src/myscript.ts"
  }
}
```

Scripts use `tsx` which runs TypeScript directly without compilation.

## Related Packages

- **@iexec/poco-layerzero** - LayerZero OApp contract deployment and management

## License

Apache-2.0
