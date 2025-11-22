// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.22;

import {MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

/**
 * @title IPocoOApp
 * @notice Unified interface for PoCo LayerZero OApp (Router + Receiver functionality)
 */
interface IPocoOApp {
        /// @notice Thrown when an invalid address (address(0)) is provided
    error InvalidAddress();
    
    /// @notice Thrown when an invalid refund address is provided
    error InvalidRefundAddress();
    
    /// @notice Thrown when receive() is called directly on router
    error UseRouteCallInstead();
    
    /// @notice Thrown when router receives a LayerZero message (not supported)
    error RouterDoesNotReceiveMessages();

    /**
     * @notice Emitted when a cross-chain call is initiated (Router mode)
     * @param sourceChainId The chain ID where the call originated
     * @param caller The address that initiated the call
     * @param targetFunction The function selector being called
     * @param payload The encoded function call data
     * @param nonce The nonce for this cross-chain message
     */
    event CrossChainCallInitiated(
        uint64 sourceChainId,
        address indexed caller,
        bytes4 indexed targetFunction,
        bytes payload,
        uint64 nonce
    );

    /**
     * @notice Emitted when a cross-chain call is received and executed (Receiver mode)
     * @param sourceChainId The chain ID where the call originated
     * @param caller The address that initiated the call on the source chain
     * @param targetFunction The function selector that was executed
     * @param returnData The return data from the function call
     */
    event CrossChainCallReceived(
        uint64 sourceChainId,
        address indexed caller,
        bytes4 indexed targetFunction,
        bytes returnData
    );

    /**
     * @notice Emitted when a cross-chain call fails (Receiver mode)
     * @param sourceChainId The chain ID where the call originated
     * @param caller The address that initiated the call on the source chain
     * @param targetFunction The function selector that was called
     * @param reason The reason for the failure
     */
    event CrossChainCallFailed(
        uint64 sourceChainId,
        address indexed caller,
        bytes4 indexed targetFunction,
        string reason
    );

    /**
     * @notice Emitted when a deal is created via cross-chain matchOrders (Receiver mode)
     * @param dealId The ID of the created deal
     * @param sourceChainId The chain ID where the matchOrders call originated
     * @param caller The address that initiated the matchOrders on the source chain
     */
    event CrossChainDealCreated(
        bytes32 indexed dealId,
        uint64 indexed sourceChainId,
        address indexed caller
    );

    /**
     * @notice Routes a function call to the PoCo contract on Arbitrum (Router mode only)
     * @param targetFunction The function selector to call
     * @param payload The encoded function call data
     * @param refundAddress The address to refund any excess gas fees
     * @param options Additional parameters for the LayerZero adapter
     * @return The nonce of the cross-chain message
     */
    function routeCall(
        bytes4 targetFunction,
        bytes calldata payload,
        address refundAddress,
        bytes calldata options
    ) external payable returns (uint64);

    /**
     * @notice Quote the fee for routing a call to Arbitrum (Router mode only)
     * @param targetFunction The function selector (for gas estimation)
     * @param payload The encoded function call data
     * @param options Additional parameters for the LayerZero adapter
     * @param payInLzToken Whether to return fee in ZRO token
     * @return fee The messaging fee
     */
    function quoteCall(
        bytes4 targetFunction,
        bytes calldata payload,
        bytes calldata options,
        bool payInLzToken
    ) external view returns (MessagingFee memory fee);
}

