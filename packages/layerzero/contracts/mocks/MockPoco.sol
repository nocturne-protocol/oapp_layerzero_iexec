// SPDX-FileCopyrightText: 2025 IEXEC BLOCKCHAIN TECH <contact@iex.ec>
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.22;

/**
 * @title MockPoco
 * @notice Simple mock contract to simulate PoCo for testing LayerZero routing
 * @dev This contract accepts any call and stores the call data for verification
 */
contract MockPoco {
    struct CallRecord {
        bytes4 functionSelector;
        bytes payload;
        address caller;
        uint256 timestamp;
    }

    CallRecord[] public callHistory;
    mapping(bytes4 => bool) public functionCalled;
    mapping(bytes4 => bytes) public functionReturnData;

    event CallReceived(bytes4 indexed functionSelector, bytes payload, address caller);

    /**
     * @notice Set a return value for a specific function selector
     */
    function setReturnData(bytes4 selector, bytes calldata returnData) external {
        functionReturnData[selector] = returnData;
    }

    /**
     * @notice Simulate a function call (matchOrders)
     */
    function matchOrders(
        bytes calldata /* appOrder */,
        bytes calldata /* datasetOrder */,
        bytes calldata /* workerpoolOrder */,
        bytes calldata /* requestOrder */
    ) external returns (bytes32) {
        bytes4 selector = this.matchOrders.selector;
        callHistory.push(CallRecord({
            functionSelector: selector,
            payload: msg.data[4:], // Remove selector
            caller: msg.sender,
            timestamp: block.timestamp
        }));
        functionCalled[selector] = true;
        emit CallReceived(selector, msg.data[4:], msg.sender);
        return keccak256(abi.encodePacked(selector, block.timestamp));
    }

    /**
     * @notice Simulate a function call (createApp)
     */
    function createApp(bytes calldata data) external returns (address) {
        bytes4 selector = this.createApp.selector;
        callHistory.push(CallRecord({
            functionSelector: selector,
            payload: data,
            caller: msg.sender,
            timestamp: block.timestamp
        }));
        functionCalled[selector] = true;
        emit CallReceived(selector, data, msg.sender);
        return address(uint160(uint256(keccak256(abi.encodePacked(selector, block.timestamp)))));
    }

    /**
     * @notice Simulate a function call (createDataset)
     */
    function createDataset(bytes calldata data) external returns (address) {
        bytes4 selector = this.createDataset.selector;
        callHistory.push(CallRecord({
            functionSelector: selector,
            payload: data,
            caller: msg.sender,
            timestamp: block.timestamp
        }));
        functionCalled[selector] = true;
        emit CallReceived(selector, data, msg.sender);
        return address(uint160(uint256(keccak256(abi.encodePacked(selector, block.timestamp)))));
    }

    /**
     * @notice Generic fallback to accept any call
     */
    fallback() external {
        bytes4 selector = bytes4(msg.data);
        bytes memory payload;
        if (msg.data.length > 4) {
            payload = msg.data[4:];
        } else {
            payload = "";
        }
        callHistory.push(CallRecord({
            functionSelector: selector,
            payload: payload,
            caller: msg.sender,
            timestamp: block.timestamp
        }));
        functionCalled[selector] = true;
        emit CallReceived(selector, payload, msg.sender);
    }

    /**
     * @notice Get call count
     */
    function getCallCount() external view returns (uint256) {
        return callHistory.length;
    }

    /**
     * @notice Get call at index
     */
    function getCall(uint256 index) external view returns (CallRecord memory) {
        return callHistory[index];
    }
}

