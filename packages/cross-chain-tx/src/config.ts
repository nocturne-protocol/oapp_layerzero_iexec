// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Config, ChainConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load configuration from layerzero package config.json
 * Imports directly from the layerzero package to avoid duplication
 */
export function loadConfig(): Config {
  const configPath = join(
    __dirname,
    "..",
    "..",
    "layerzero",
    "config",
    "config.json"
  );
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

/**
 * Get chain configuration for a specific network
 */
export function getChainConfig(network: string): ChainConfig {
  const config = loadConfig();
  const chainConfig = config.chains[network];

  if (!chainConfig) {
    throw new Error(
      `No configuration found for network: ${network}\n` +
        `Available networks: ${Object.keys(config.chains).join(', ')}`
    );
  }

  return chainConfig;
}

