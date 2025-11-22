// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee, MessagingReceipt} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPocoOApp} from "./interfaces/IPocoOApp.sol";
import {PocoMessageLib} from "./libraries/PocoMessageLib.sol";

/**
 * @title PocoOApp
 * @notice Unified contract that can act as either a Router or Receiver for cross-chain PoCo calls
 * @dev Deployed on all chains - acts as Router on non-Arbitrum chains, Receiver on Arbitrum
 *
 * Router Mode (non-Arbitrum chains):
 * - Routes PoCo function calls to Arbitrum via LayerZero
 * - Only sends messages, doesn't receive
 *
 * Receiver Mode (Arbitrum):
 * - Receives cross-chain messages and executes them on the PoCo contract
 * - Only receives messages, doesn't route
 *
 * Based on LayerZero OApp standard: https://docs.layerzero.network/v2/developers/evm/oapp/overview
 */
contract PocoOApp is OApp, IPocoOApp {
    /// @notice Operating mode of the contract
    enum Mode {
        Router,   // Routes calls to Arbitrum (non-Arbitrum chains)
        Receiver  // Receives and executes calls (Arbitrum only)
    }

    /// @notice The operating mode of this contract instance
    Mode public immutable mode;

    /// @notice Address of the PoCo contract (local on Arbitrum, remote for routers)
    address public immutable pocoAddress;

    /// @notice LayerZero Endpoint ID for Arbitrum (only used in router mode)
    uint32 public immutable arbitrumEid;

    /**
     * @notice Constructor
     * @param _endpoint The LayerZero Endpoint V2 address
     * @param _owner The owner of the contract
     * @param _mode Operating mode (Router = 0, Receiver = 1)
     * @param _pocoAddress The address of the PoCo contract (local for receiver, remote for router)
     * @param _arbitrumEid The LayerZero Endpoint ID for Arbitrum (only needed for router mode, use 0 for receiver)
     */
    constructor(
        address _endpoint,
        address _owner,
        Mode _mode,
        address _pocoAddress,
        uint32 _arbitrumEid
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        if (_pocoAddress == address(0)) revert InvalidAddress();
        
        mode = _mode;
        pocoAddress = _pocoAddress;
        arbitrumEid = _arbitrumEid;
    }

    // ============================================
    // ROUTER FUNCTIONS (non-Arbitrum chains)
    // ============================================

    /**
     * @notice Routes a function call to the PoCo contract on Arbitrum
     * @param targetFunction The function selector to call
     * @param payload The encoded function call data
     * @param refundAddress The address to refund any excess gas fees
     * @param options Additional parameters for the LayerZero adapter
     * @return nonce The nonce of the cross-chain message
     */
    function routeCall(
        bytes4 targetFunction,
        bytes calldata payload,
        address refundAddress,
        bytes calldata options
    ) external payable override returns (uint64) {
        if (mode == Mode.Receiver) revert RouterDoesNotReceiveMessages();
        if (refundAddress == address(0)) revert InvalidRefundAddress();

        // Encode the cross-chain message
        bytes memory message = PocoMessageLib.encodeMessage(
            uint64(block.chainid),
            msg.sender,
            targetFunction,
            payload
        );

        // Send the message via LayerZero
        MessagingReceipt memory receipt = _lzSend(
            arbitrumEid,
            message,
            options,
            MessagingFee(msg.value, 0),
            refundAddress
        );

        uint64 nonce = receipt.nonce;
        emit CrossChainCallInitiated(
            uint64(block.chainid),
            msg.sender,
            targetFunction,
            payload,
            nonce
        );

        return nonce;
    }

    /**
     * @notice Quote the fee for routing a call to Arbitrum
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
    ) external view override returns (MessagingFee memory fee) {
        if (mode == Mode.Receiver) revert RouterDoesNotReceiveMessages();
        
        bytes memory message = PocoMessageLib.encodeMessage(
            uint64(block.chainid),
            address(0), // Placeholder for quote
            targetFunction,
            payload
        );

        return _quote(arbitrumEid, message, options, payInLzToken);
    }


    // ============================================
    // RECEIVER FUNCTIONS (Arbitrum only)
    // ============================================

    /**
     * @notice Called by LayerZero when a message is received
     * @param _message The encoded message data containing function selector and payload
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        if (mode == Mode.Router) revert RouterDoesNotReceiveMessages();

        // Decode the message
        (uint64 sourceChainId, address caller, bytes4 targetFunction, bytes memory payload) = 
            PocoMessageLib.decodeMessage(_message);
        // Prepare the full calldata for the PoCo contract
        bytes memory callData = PocoMessageLib.prepareCallData(targetFunction, payload);
        // Execute the call on the PoCo contract
        (bool success, bytes memory returnData) = pocoAddress.call(callData);

        if (success) {
            emit CrossChainCallReceived(sourceChainId, caller, targetFunction, returnData);
            
            // If the call returned a dealId (bytes32), emit CrossChainDealCreated event
            // This happens for matchOrders and sponsorMatchOrders functions
            if (returnData.length == 32) {
                bytes32 dealId = abi.decode(returnData, (bytes32));
                emit CrossChainDealCreated(dealId, sourceChainId, caller);
            }
        } else {
            // Decode the revert reason
            string memory reason = PocoMessageLib.decodeRevertReason(returnData);
            // Emit failure event
            emit CrossChainCallFailed(sourceChainId, caller, targetFunction, reason);
            // Revert to ensure the LayerZero message is marked as failed
            revert(reason);
        }
    }
}

