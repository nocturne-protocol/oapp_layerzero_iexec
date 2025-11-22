import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {
  loadConfig,
  getChainConfig,
  validateChainConfig,
  getDestinationEndpointId,
  getPocoAddress,
} from "../../utils/config";

const PocoOAppModule = buildModule("PocoOApp", (m) => {
  // Load configuration
  const config = loadConfig();

  // Get network name from env var (set by deploy.ts before module import)
  const networkName = process.env.IGNITION_NETWORK;
  if (!networkName) {
    throw new Error("IGNITION_NETWORK must be set by deploy script");
  }

  const chainConfig = getChainConfig(networkName);
  validateChainConfig(chainConfig);

  // Determine mode enum value (Router = 0, Receiver = 1)
  const mode = chainConfig.mode === "Router" ? 0 : 1;

  // Get destination endpoint ID (for Router mode)
  const destinationEid =
    chainConfig.mode === "Router"
      ? getDestinationEndpointId(config, networkName)
      : 0; // 0 for Receiver mode (not used)

  // Get PoCo address (from destination chain for Router, from local config for Receiver)
  const pocoAddr = getPocoAddress(config, networkName);

  // Deploy parameters
  const endpoint = m.getParameter("endpoint", chainConfig.lzEndpointAddress);
  // Owner is the deployer account - manages LayerZero configuration
  const owner = m.getAccount(0); // Default deployer account
  const modeParam = m.getParameter("mode", mode);
  const pocoAddress = m.getParameter("pocoAddress", pocoAddr);
  const arbitrumEid = m.getParameter("arbitrumEid", destinationEid);

  // Optional salt for CREATE2 deployment
  const salt = m.getParameter(
    "salt",
    chainConfig.pocoOAppCreatexSalt || undefined
  );

  // Deploy PocoOApp
  const pocoOApp = m.contract(
    "PocoOApp",
    [endpoint, owner, modeParam, pocoAddress, arbitrumEid],
    {
      id: `PocoOApp_${chainConfig.mode}`,
      ...(salt && { salt }),
    }
  );

  return { pocoOApp };
});

export default PocoOAppModule;

