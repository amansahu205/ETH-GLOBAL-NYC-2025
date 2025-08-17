// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockSmartAccount {
    address public currentSigner;
    
    event SignerChanged(address oldSigner, address newSigner);
    
    constructor(address initialSigner) {
        currentSigner = initialSigner;
    }
    
    function setSigner(address newSigner) external {
        require(newSigner != address(0), "Invalid signer");
        address oldSigner = currentSigner;
        currentSigner = newSigner;
        emit SignerChanged(oldSigner, newSigner);
    }
    
    // Additional functions for a complete smart account demo
    function owner() external view returns (address) {
        return currentSigner;
    }
}