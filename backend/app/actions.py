import os
from web3 import Web3
from dotenv import load_dotenv
from typing import List

load_dotenv()

# Environment variables
ZIRCUIT_HTTP = os.getenv("ZIRCUIT_HTTP")
SENDER_PRIVATE_KEY = os.getenv("SENDER_PRIVATE_KEY")
GUARDIAN_CONTROLLER_ADDR = os.getenv("GUARDIAN_CONTROLLER_ADDR")
APPROVAL_REVOKE_HELPER_ADDR = os.getenv("APPROVAL_REVOKE_HELPER_ADDR")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(ZIRCUIT_HTTP))
account = w3.eth.account.from_key(SENDER_PRIVATE_KEY)

# Minimal ABI fragments
GUARDIAN_CONTROLLER_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "newSigner", "type": "address"}],
        "name": "rotateSigner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

APPROVAL_REVOKE_HELPER_ABI = [
    {
        "inputs": [
            {"internalType": "address[]", "name": "tokens", "type": "address[]"},
            {"internalType": "address[]", "name": "spenders", "type": "address[]"}
        ],
        "name": "revokeERC20",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "operator", "type": "address"},
            {"internalType": "address[]", "name": "erc721s", "type": "address[]"},
            {"internalType": "address[]", "name": "erc1155s", "type": "address[]"}
        ],
        "name": "revokeApprovalsForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Contract instances
guardian_controller = w3.eth.contract(
    address=GUARDIAN_CONTROLLER_ADDR,
    abi=GUARDIAN_CONTROLLER_ABI
)

approval_revoke_helper = w3.eth.contract(
    address=APPROVAL_REVOKE_HELPER_ADDR,
    abi=APPROVAL_REVOKE_HELPER_ABI
)

async def rotate_signer(new_signer: str) -> str:
    """Rotate signer via GuardianController"""
    # Build transaction
    tx = guardian_controller.functions.rotateSigner(new_signer).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 200000,
        'gasPrice': w3.eth.gas_price,
    })
    
    # Sign transaction
    signed_tx = w3.eth.account.sign_transaction(tx, SENDER_PRIVATE_KEY)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return receipt.transactionHash.hex()

async def revoke_erc20(tokens: List[str], spenders: List[str]) -> str:
    """Revoke ERC20 approvals via ApprovalRevokeHelper"""
    # Build transaction
    tx = approval_revoke_helper.functions.revokeERC20(tokens, spenders).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 300000,
        'gasPrice': w3.eth.gas_price,
    })
    
    # Sign transaction
    signed_tx = w3.eth.account.sign_transaction(tx, SENDER_PRIVATE_KEY)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return receipt.transactionHash.hex()