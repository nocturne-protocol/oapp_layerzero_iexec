// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

export interface ChainConfig {
  mode: 'Router' | 'Receiver';
  lzEndpointAddress: string;
  lzEndpointId: number;
  destinationChain?: string; // Network name of destination chain (for Router mode)
  pocoAddress?: string; // PoCo contract address (only for Receiver mode)
  pocoOAppAddress: string;
  pocoOAppCreatexSalt: string;
}

export interface Config {
  chains: {
    [key: string]: ChainConfig;
  };
}

