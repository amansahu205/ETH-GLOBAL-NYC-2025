// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ISmartAccount {
    function setSigner(address newSigner) external;
}

contract GuardianController is Ownable {
    address public smartAccount;
    mapping(address => bool) public guardians;
    
    event SignerRotated(address newSigner, address caller);
    
    constructor(address _smartAccount) Ownable(msg.sender) {
        require(_smartAccount != address(0), "Invalid smart account address");
        smartAccount = _smartAccount;
    }
    
    function setGuardian(address g, bool ok) external onlyOwner {
        guardians[g] = ok;
    }
    
    function rotateSigner(address newSigner) external {
        require(newSigner != address(0), "Invalid signer address");
        require(
            msg.sender == owner() || guardians[msg.sender], 
            "Not authorized"
        );
        
        ISmartAccount(smartAccount).setSigner(newSigner);
        
        emit SignerRotated(newSigner, msg.sender);
    }
}