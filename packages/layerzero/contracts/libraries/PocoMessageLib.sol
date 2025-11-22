// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.22;

/**
 * @title PocoMessageLib
 * @notice Library for encoding and decoding LayerZero messages for PoCo cross-chain calls
 */
library PocoMessageLib {
    /**
     * @notice Encodes a cross-chain message
     * @param sourceChainId The chain ID where the call originated
     * @param caller The address that initiated the call
     * @param targetFunction The function selector to call
     * @param payload The encoded function call data
     * @return Encoded message bytes
     */
    function encodeMessage(
        uint64 sourceChainId,
        address caller,
        bytes4 targetFunction,
        bytes calldata payload
    ) internal pure returns (bytes memory) {
        return abi.encode(sourceChainId, caller, targetFunction, payload);
    }

    /**
     * @notice Decodes a cross-chain message
     * @param message The encoded message bytes
     * @return sourceChainId The chain ID where the call originated
     * @return caller The address that initiated the call
     * @return targetFunction The function selector to call
     * @return payload The encoded function call data
     */
    function decodeMessage(bytes calldata message)
        internal
        pure
        returns (uint64 sourceChainId, address caller, bytes4 targetFunction, bytes memory payload)
    {
        (sourceChainId, caller, targetFunction, payload) = abi.decode(
            message,
            (uint64, address, bytes4, bytes)
        );
    }

    /**
     * @notice Prepares the full calldata for a function call
     * @param targetFunction The function selector
     * @param payload The encoded function parameters
     * @return callData The complete calldata (selector + parameters)
     */
    function prepareCallData(bytes4 targetFunction, bytes memory payload)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(targetFunction, payload);
    }

    /**
     * @notice Decodes a revert reason from returnData
     * @param returnData The return data from a failed call
     * @return reason The decoded error message
     */
    function decodeRevertReason(bytes memory returnData) internal pure returns (string memory) {
        if (returnData.length == 0) {
            return "Call failed with no return data";
        }

        // Check if it's a standard revert with reason (Error(string))
        if (returnData.length > 68) {
            bytes4 errorSelector;
            assembly {
                errorSelector := mload(add(returnData, 0x20))
            }
            
            // Error(string) selector is 0x08c379a0
            if (errorSelector == 0x08c379a0) {
                assembly {
                    // Skip the selector (4 bytes)
                    returnData := add(returnData, 0x04)
                }
                return abi.decode(returnData, (string));
            }
        }

        return "Call failed";
    }
}

