// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  loadConfig,
  getChainConfig,
  validateChainConfig,
  getDestinationEndpointId,
  getPocoAddress,
} from "../utils/config";

/**
 * Deploy PocoOApp contract using hardhat-deploy
 * 
 * This script deploys the PocoOApp contract in the appropriate mode (Router or Receiver)
 * based on the network configuration in config/config.json
 */
const deployPocoOApp: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`\n📡 Deploying PocoOApp on ${network.name}...`);
  console.log(`Deployer: ${deployer}`);

  // Load configuration
  const config = loadConfig();
  const chainConfig = getChainConfig(network.name, config);
  validateChainConfig(chainConfig);

  // Determine mode enum value (Router = 0, Receiver = 1)
  const mode = chainConfig.mode === "Router" ? 0 : 1;
  console.log(`Mode: ${chainConfig.mode} (${mode})`);

  // Get destination endpoint ID (for Router mode)
  const destinationEid =
    chainConfig.mode === "Router"
      ? getDestinationEndpointId(config, network.name)
      : 0; // 0 for Receiver mode (not used)

  // Get PoCo address
  const pocoAddress = getPocoAddress(config, network.name);
  console.log(`PoCo address: ${pocoAddress}`);

  // Deploy parameters
  const endpoint = chainConfig.lzEndpointAddress;
  const owner = deployer; // Deployer is the owner
  const arbitrumEid = destinationEid;

  console.log(`\nDeployment parameters:`);
  console.log(`- Endpoint: ${endpoint}`);
  console.log(`- Owner: ${owner}`);
  console.log(`- Mode: ${mode}`);
  console.log(`- PoCo Address: ${pocoAddress}`);
  console.log(`- Arbitrum EID: ${arbitrumEid}`);

  // Deploy PocoOApp
  const deployment = await deploy("PocoOApp", {
    from: deployer,
    args: [endpoint, owner, mode, pocoAddress, arbitrumEid],
    log: true,
    waitConfirmations: 1,
  });

  console.log(`\n✅ PocoOApp deployed to: ${deployment.address}`);
  console.log(`Transaction hash: ${deployment.transactionHash}`);

  // Save deployment info to config
  console.log(`\n💡 Add this address to config/config.json:`);
  console.log(`"pocoOAppAddress": "${deployment.address}"`);

  return true;
};

// Export with tags for filtering
export default deployPocoOApp;

deployPocoOApp.id = "deploy_poco_oapp"; // Unique identifier for hardhat-deploy
deployPocoOApp.tags = ["PocoOApp", "1.0.0"];
deployPocoOApp.dependencies = []; // No dependencies

