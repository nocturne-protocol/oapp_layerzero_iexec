// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "fs";
import { join } from "path";

export interface ChainConfig {
  mode: "Router" | "Receiver";
  lzEndpointAddress: string;
  lzEndpointId: number;
  destinationChain?: string;
  pocoAddress?: string;
  pocoOAppAddress?: string;
  pocoOAppCreatexSalt?: string;
}

export interface Config {
  chains: Record<string, ChainConfig>;
}

/**
 * Load configuration from config.json
 */
export function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config", "config.json");
  const configData = readFileSync(configPath, "utf8");
  return JSON.parse(configData);
}

/**
 * Get chain configuration by name
 */
export function getChainConfig(chainName: string, config?: Config): ChainConfig {
  const cfg = config || loadConfig();
  const chainConfig = cfg.chains[chainName];
  
  if (!chainConfig) {
    throw new Error(
      `Chain ${chainName} not found in config. Available chains: ${Object.keys(
        cfg.chains
      ).join(", ")}`
    );
  }
  
  return chainConfig;
}

/**
 * Get PoCo address for a chain
 */
export function getPocoAddress(config: Config, chainName: string): string {
  const chainConfig = getChainConfig(chainName, config);
  
  if (chainConfig.mode === "Receiver") {
    if (!chainConfig.pocoAddress) {
      throw new Error(`PoCo address not configured for receiver ${chainName}`);
    }
    return chainConfig.pocoAddress;
  } else {
    // For routers, get the PoCo address from the destination chain
    const destinationChain = chainConfig.destinationChain;
    if (!destinationChain) {
      throw new Error(`Destination chain not configured for router ${chainName}`);
    }
    const destConfig = getChainConfig(destinationChain, config);
    if (!destConfig.pocoAddress) {
      throw new Error(`PoCo address not configured for destination ${destinationChain}`);
    }
    return destConfig.pocoAddress;
  }
}

/**
 * Get destination endpoint ID for a router chain
 */
export function getDestinationEndpointId(config: Config, chainName: string): number {
  const chainConfig = getChainConfig(chainName, config);
  
  if (chainConfig.mode !== "Router") {
    throw new Error(`${chainName} is not a router`);
  }
  
  const destinationChain = chainConfig.destinationChain;
  if (!destinationChain) {
    throw new Error(`Destination chain not configured for ${chainName}`);
  }
  
  const destConfig = getChainConfig(destinationChain, config);
  return destConfig.lzEndpointId;
}

/**
 * Get all router chains
 */
export function getRouters(config: Config): Array<[string, ChainConfig]> {
  return Object.entries(config.chains).filter(
    ([_, cfg]) => cfg.mode === "Router"
  );
}

/**
 * Get all receiver chains
 */
export function getReceivers(config: Config): Array<[string, ChainConfig]> {
  return Object.entries(config.chains).filter(
    ([_, cfg]) => cfg.mode === "Receiver"
  );
}

/**
 * Validate chain configuration
 */
export function validateChainConfig(chainConfig: ChainConfig): void {
  if (!chainConfig.lzEndpointAddress) {
    throw new Error("lzEndpointAddress is required");
  }
  if (!chainConfig.lzEndpointId) {
    throw new Error("lzEndpointId is required");
  }
  if (chainConfig.mode === "Router" && !chainConfig.destinationChain) {
    throw new Error("destinationChain is required for Router mode");
  }
  if (chainConfig.mode === "Receiver" && !chainConfig.pocoAddress) {
    throw new Error("pocoAddress is required for Receiver mode");
  }
}

