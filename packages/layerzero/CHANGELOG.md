# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-01-XX - LayerZero Official Tooling Migration

### 🎉 Major Changes

**Migrated to LayerZero official `layerzero.config.ts` tooling**

This is a major architectural change that simplifies deployment and configuration by using industry-standard LayerZero tooling instead of custom scripts.

### Added

- **`layerzero.config.ts`** - Complete LayerZero OApp configuration
  - Contract definitions for all 3 networks
  - 4 bidirectional connection routes  
  - ULN configuration with confirmations and DVNs
  - Type-safe configuration with full validation

- **New npm commands:**
  - `npm run lz:deploy` - Deploy contracts using LayerZero
  - `npm run lz:wire` - Configure all peers and DVNs automatically
  - `npm run lz:peers:get` - View configured peers
  - `npm run lz:config:get` - View full LayerZero configuration
  - `npm run lz:config:init` - Initialize config from deployed contracts

- **Dependencies:**
  - `@layerzerolabs/toolbox-hardhat` - LayerZero Hardhat plugin
  - `@layerzerolabs/lz-definitions` - Endpoint IDs and constants
  - `@layerzerolabs/lz-v2-utilities` - Utility functions

- **Documentation:**
  - `MIGRATION_TO_LZ_CONFIG.md` - Complete migration guide
  - `MIGRATION_COMPLETE.md` - Migration summary and metrics
  - `scripts/legacy/README.md` - Legacy scripts documentation
  - Updated `README.md` with new workflow
  - Updated `QUICK_START.md` with 2-command deployment

### Changed

- **Deployment workflow** - From 4 steps to 2 commands
  - Old: `npm run deploy` → edit config → `npm run configure:peers` → verify
  - New: `npm run lz:deploy` → `npm run lz:wire`

- **Configuration approach** - From custom scripts to LayerZero config
  - Old: Custom TypeScript orchestrator scripts (~365 lines)
  - New: Declarative `layerzero.config.ts` (~150 lines)

- **Hardhat configuration** - Added LayerZero plugin
  ```typescript
  import "@layerzerolabs/toolbox-hardhat";
  ```

### Deprecated

- **Custom deployment scripts** - Moved to `scripts/legacy/`
  - `deploy.ts` → Now `npm run deploy:legacy`
  - `verify.ts` → Now `npm run verify:legacy`
  - `configure_peers.ts` → Now `npm run configure:peers:legacy`

These remain available for backward compatibility but LayerZero tooling is recommended.

### Removed

- Nothing removed - full backward compatibility maintained

### Benefits

✅ **Reduced complexity** - 365 lines of custom scripts → 150 lines config  
✅ **Industry standard** - Used by all major LayerZero projects  
✅ **Type safety** - Full TypeScript validation  
✅ **Automation** - Automated peer + DVN configuration  
✅ **Production ready** - Battle-tested by LayerZero ecosystem  
✅ **Better DX** - Simpler commands, clearer errors  

### Migration Path

For existing deployments:

```bash
# Initialize LayerZero config from deployed contracts
npm run lz:config:init

# Review generated config
vim layerzero.config.ts

# Re-wire using LayerZero tooling
npm run lz:wire

# Verify
npm run lz:peers:get
```

For fresh deployments:

```bash
# Deploy
npm run lz:deploy

# Wire
npm run lz:wire
```

### Breaking Changes

**None** - Legacy scripts still work via `*:legacy` commands.

### See Also

- [MIGRATION_TO_LZ_CONFIG.md](./MIGRATION_TO_LZ_CONFIG.md) - Detailed migration guide
- [layerzero.config.ts](./layerzero.config.ts) - Configuration file
- [README.md](./README.md) - Updated documentation

---

## [0.1.0] - 2025-01-XX - Initial Custom Implementation

### Added

- **Custom deployment scripts**
  - `scripts/deploy.ts` - Multi-chain deployment orchestrator
  - `scripts/verify.ts` - Contract verification on block explorers
  - `scripts/configure_peers.ts` - LayerZero peer configuration

- **Shared utilities**
  - `utils/script-helpers.ts` - Reusable script utilities
  - `utils/config.ts` - Configuration management

- **Configuration**
  - `config/config.json` - Network and contract configuration

- **Contracts**
  - `contracts/PocoOApp.sol` - LayerZero OApp for cross-chain routing
  - `contracts/libraries/PocoMessageLib.sol` - Message encoding/decoding
  - `contracts/interfaces/IPocoOApp.sol` - OApp interface

- **Ignition modules**
  - `ignition/modules/PocoOApp.ts` - Hardhat Ignition deployment module

- **npm commands**
  - `npm run deploy` - Deploy on all chains
  - `npm run verify` - Verify all contracts
  - `npm run configure:peers` - Configure all peers

- **Documentation**
  - `README.md` - Main documentation
  - `LAYERZERO_CONFIG.md` - LayerZero configuration guide
  - `REFACTORING_SUMMARY.md` - Code refactoring details

### Features

- ✅ Multi-chain deployment (Sepolia, Base Sepolia, Arbitrum Sepolia)
- ✅ Router/Receiver architecture
- ✅ CREATE2 deterministic deployment
- ✅ Automatic contract verification
- ✅ Peer configuration management
- ✅ Type-safe configuration

### Architecture

- **Router Mode** - Deployed on Sepolia, Base Sepolia
  - Routes PoCo calls to Arbitrum via LayerZero
  - Only sends messages

- **Receiver Mode** - Deployed on Arbitrum Sepolia
  - Receives cross-chain messages
  - Executes on PoCo contract

### Known Limitations

- Manual peer configuration required
- No DVN management
- Custom scripts to maintain
- Limited validation

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Types of changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

