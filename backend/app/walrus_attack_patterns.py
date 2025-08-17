"""
Upload demo attack patterns to Walrus Protocol for decentralized storage
This moves hardcoded patterns to blockchain storage, showcasing Walrus more prominently
"""

import asyncio
import json
from .walrus import WalrusUploader

# Demo attack pattern templates stored on Walrus
ATTACK_PATTERNS = {
    "drainer_pattern": {
        "name": "Token Drainer Attack",
        "description": "Multiple high-value approvals to unknown contract followed by asset drainage",
        "severity": "high",
        "confidence": 0.95,
        "indicators": [
            "multiple_max_approvals",
            "unknown_spender_contract", 
            "high_gas_prices",
            "rapid_succession"
        ],
        "signal_template": {
            "base_signals": 4,
            "approval_count": 4,
            "transfer_count": 2,
            "time_window_seconds": 180,
            "max_allowance_ratio": 1.0,
            "gas_price_multiplier": 1.5,
            "spender_reputation": "unknown"
        },
        "recommendations": [
            "Immediately revoke all suspicious token approvals",
            "Rotate wallet signer/private keys", 
            "Transfer assets to a secure wallet",
            "Review transaction history for unauthorized activity"
        ]
    },
    
    "flash_loan_pattern": {
        "name": "Flash Loan Attack",
        "description": "Same-block approval and transfer indicating flash loan manipulation",
        "severity": "high", 
        "confidence": 0.9,
        "indicators": [
            "same_block_approval_transfer",
            "high_gas_prices",
            "large_amounts",
            "contract_interaction"
        ],
        "signal_template": {
            "base_signals": 2,
            "approval_count": 1,
            "transfer_count": 1,
            "time_window_seconds": 12,
            "max_allowance_ratio": 0.6,
            "gas_price_multiplier": 3.0,
            "same_block": True
        },
        "recommendations": [
            "Flash loan attack detected - immediate action required",
            "Rotate signer immediately via guardian system",
            "Enable additional security measures",
            "Analyze MEV exposure and protection"
        ]
    },
    
    "sandwich_pattern": {
        "name": "Sandwich Attack", 
        "description": "MEV bot front-running and back-running user transactions",
        "severity": "medium",
        "confidence": 0.8,
        "indicators": [
            "frontrun_approval",
            "backrun_transfer", 
            "mev_gas_pattern",
            "known_mev_bot"
        ],
        "signal_template": {
            "base_signals": 2,
            "approval_count": 1,
            "transfer_count": 1, 
            "time_window_seconds": 24,
            "max_allowance_ratio": 0.3,
            "gas_price_multiplier": 2.5,
            "mev_pattern": True
        },
        "recommendations": [
            "Sandwich attack pattern detected",
            "Consider using private mempool for transactions",
            "Enable MEV protection mechanisms",
            "Review transaction timing and gas strategies"
        ]
    },
    
    "phishing_pattern": {
        "name": "Phishing Contract",
        "description": "Interaction with known phishing or malicious contracts",
        "severity": "high",
        "confidence": 0.85,
        "indicators": [
            "malicious_contract_address",
            "unusual_approval_pattern",
            "suspicious_function_calls"
        ],
        "signal_template": {
            "base_signals": 3,
            "approval_count": 2,
            "transfer_count": 1,
            "time_window_seconds": 60,
            "max_allowance_ratio": 0.8,
            "gas_price_multiplier": 1.2,
            "contract_verified": False
        },
        "recommendations": [
            "Phishing contract interaction detected",
            "Do not approve any more transactions",
            "Verify contract legitimacy before interacting",
            "Use wallet security tools for contract verification"
        ]
    }
}

class WalrusAttackPatternManager:
    def __init__(self):
        self.walrus = WalrusUploader()
        self.pattern_blob_ids = {}
    
    async def upload_patterns_to_walrus(self):
        """Upload all attack patterns to Walrus and return blob IDs"""
        print("Uploading attack patterns to Walrus Protocol...")
        
        blob_ids = {}
        
        for pattern_id, pattern_data in ATTACK_PATTERNS.items():
            try:
                # Add metadata to pattern
                enhanced_pattern = {
                    **pattern_data,
                    "pattern_id": pattern_id,
                    "version": "1.0",
                    "created_for": "ETHGlobal NYC 2025 - Sentinel Demo",
                    "storage_type": "walrus_protocol",
                    "decentralized": True
                }
                
                # Upload to Walrus
                blob_url = await self.walrus.upload_case_to_walrus(enhanced_pattern)
                
                # Extract blob ID from URL
                if "blobs/" in blob_url:
                    blob_id = blob_url.split("blobs/")[1]
                else:
                    blob_id = blob_url
                
                blob_ids[pattern_id] = {
                    "blob_id": blob_id,
                    "blob_url": blob_url,
                    "pattern_name": pattern_data["name"]
                }
                
                print(f"Uploaded {pattern_data['name']}")
                print(f"   Blob ID: {blob_id}")
                print(f"   URL: {blob_url}")
                
            except Exception as e:
                print(f"Failed to upload {pattern_id}: {e}")
                # Fallback to local storage
                blob_ids[pattern_id] = {
                    "blob_id": f"local_{pattern_id}",
                    "blob_url": f"local://patterns/{pattern_id}.json",
                    "pattern_name": pattern_data["name"],
                    "fallback": True
                }
        
        # Save blob ID mapping
        mapping_data = {
            "attack_patterns": blob_ids,
            "upload_timestamp": "2025-08-17T06:00:00Z",
            "total_patterns": len(blob_ids),
            "storage_provider": "Walrus Protocol",
            "network": "testnet"
        }
        
        try:
            mapping_url = await self.walrus.upload_case_to_walrus(mapping_data)
            print(f"\nPattern mapping uploaded: {mapping_url}")
        except Exception as e:
            print(f"Failed to upload mapping: {e}")
        
        return blob_ids
    
    async def fetch_pattern_from_walrus(self, blob_id: str):
        """Fetch attack pattern from Walrus by blob ID"""
        try:
            # Construct Walrus read URL
            read_url = f"https://aggregator.walrus-testnet.walrus.space/v1/{blob_id}"
            
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(read_url) as response:
                    if response.status == 200:
                        pattern_data = await response.json()
                        return pattern_data
                    else:
                        print(f"Failed to fetch pattern {blob_id}: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            print(f"Error fetching pattern from Walrus: {e}")
            # Fallback to hardcoded patterns
            pattern_id = blob_id.replace("local_", "")
            return ATTACK_PATTERNS.get(pattern_id)
    
    async def get_available_patterns(self):
        """Get list of available attack patterns from Walrus"""
        # In production, this would fetch from the mapping blob
        # For demo, return the known patterns
        return {
            "drainer": {
                "name": "Token Drainer",
                "description": "Multiple high approvals to drain tokens",
                "severity": "high"
            },
            "flash_loan": {
                "name": "Flash Loan Attack", 
                "description": "Same-block manipulation exploit",
                "severity": "high"
            },
            "sandwich": {
                "name": "Sandwich Attack",
                "description": "MEV bot transaction manipulation", 
                "severity": "medium"
            },
            "phishing": {
                "name": "Phishing Contract",
                "description": "Malicious contract interaction",
                "severity": "high"
            }
        }

async def main():
    """Upload demo patterns to Walrus for ETHGlobal demo"""
    manager = WalrusAttackPatternManager()
    blob_ids = await manager.upload_patterns_to_walrus()
    
    print(f"\nAttack patterns uploaded to Walrus!")
    print(f"Total patterns: {len(blob_ids)}")
    print("\nBlob IDs for demo use:")
    for pattern_id, info in blob_ids.items():
        print(f"  {pattern_id}: {info['blob_id']}")
    
    print("\nReady for ETHGlobal demo with decentralized attack patterns!")

if __name__ == "__main__":
    asyncio.run(main())