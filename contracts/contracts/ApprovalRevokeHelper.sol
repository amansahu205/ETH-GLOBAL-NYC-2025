// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC721 {
    function setApprovalForAll(address operator, bool approved) external;
}

interface IERC1155 {
    function setApprovalForAll(address operator, bool approved) external;
}

contract ApprovalRevokeHelper {
    function revokeERC20(address[] calldata tokens, address[] calldata spenders) external {
        require(tokens.length == spenders.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).approve(spenders[i], 0);
        }
    }
    
    function revokeApprovalsForAll(
        address operator,
        address[] calldata erc721s,
        address[] calldata erc1155s
    ) external {
        for (uint256 i = 0; i < erc721s.length; i++) {
            IERC721(erc721s[i]).setApprovalForAll(operator, false);
        }
        
        for (uint256 i = 0; i < erc1155s.length; i++) {
            IERC1155(erc1155s[i]).setApprovalForAll(operator, false);
        }
    }
}