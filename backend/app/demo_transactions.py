"""
Demo malicious transaction generator for ETHGlobal presentation
Creates realistic but fake malicious transactions to demonstrate Sentinel's capabilities
"""

import asyncio
import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import List, Dict, Any
import uuid
from .sqlite_store import SQLiteStore
from .walrus import WalrusUploader
from .fetchai_agent import evaluate_signals

# Demo malicious addresses
MALICIOUS_ADDRESSES = {
    "0x1234567890123456789012345678901234567890": "Known Drainer Contract",
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef": "Suspicious MEV Bot",
    "0x9999999999999999999999999999999999999999": "Phishing Contract",
    "0x1111111111111111111111111111111111111111": "Flash Loan Attacker",
    "0x2222222222222222222222222222222222222222": "Rug Pull Contract"
}

class DemoTransactionGenerator:
    def __init__(self):
        self.db = SQLiteStore()
        
    async def generate_drainer_attack(self, victim_wallet: str) -> List[Dict[str, Any]]:
        """Generate a token drainer attack scenario"""
        malicious_spender = "0x1234567890123456789012345678901234567890"
        current_time = datetime.now().timestamp()
        
        signals = []
        
        # Multiple high-value approvals to unknown spender
        for i in range(4):
            signals.append({
                'type': 'approval',
                'timestamp': current_time + i * 30,  # 30 seconds apart
                'owner': victim_wallet,
                'spender': malicious_spender,
                'tx_hash': f'0x{uuid.uuid4().hex}',
                'block_number': 7527650 + i,
                'contract_address': f'0x{uuid.uuid4().hex[:40]}',
                'approval_value': 115792089237316195423570985008687907853269984665640564039457584007913129639935,  # MAX_UINT256
                'allowance_ratio': 1.0,  # 100% approval
                'spender_known': False,
                'gas_price': 150000000000,  # High gas (150 gwei) indicating urgency
                'to_contract': True,
                'wallet_address': victim_wallet
            })
        
        # Follow up with suspicious transfers
        for i in range(2):
            signals.append({
                'type': 'transfer',
                'timestamp': current_time + 150 + i * 10,  # Shortly after approvals
                'from': victim_wallet,
                'to': malicious_spender,
                'tx_hash': f'0x{uuid.uuid4().hex}',
                'block_number': 7527655 + i,
                'contract_address': f'0x{uuid.uuid4().hex[:40]}',
                'transfer_value': 1000000000000000000000,  # 1000 tokens
                'amount_ratio': 0.85,  # 85% of balance
                'gas_price': 200000000000,  # Very high gas (200 gwei)
                'to_contract': True,
                'wallet_address': victim_wallet
            })
        
        return signals
    
    async def generate_flash_loan_attack(self, victim_wallet: str) -> List[Dict[str, Any]]:
        """Generate a flash loan attack scenario"""
        attacker_contract = "0x1111111111111111111111111111111111111111"
        current_time = datetime.now().timestamp()
        
        signals = []
        
        # Rapid sequence of approvals and transfers within same block
        base_time = current_time
        
        # Quick approval
        signals.append({
            'type': 'approval',
            'timestamp': base_time,
            'owner': victim_wallet,
            'spender': attacker_contract,
            'tx_hash': f'0x{uuid.uuid4().hex}',
            'block_number': 7527660,
            'contract_address': f'0x{uuid.uuid4().hex[:40]}',
            'approval_value': 50000000000000000000000,  # 50k tokens
            'allowance_ratio': 0.6,
            'spender_known': False,
            'gas_price': 300000000000,  # Extremely high gas (300 gwei)
            'to_contract': True,
            'wallet_address': victim_wallet
        })
        
        # Immediate transfer (same block)
        signals.append({
            'type': 'transfer',
            'timestamp': base_time + 1,
            'from': victim_wallet,
            'to': attacker_contract,
            'tx_hash': f'0x{uuid.uuid4().hex}',
            'block_number': 7527660,  # Same block
            'contract_address': f'0x{uuid.uuid4().hex[:40]}',
            'transfer_value': 50000000000000000000000,
            'amount_ratio': 0.6,
            'gas_price': 300000000000,
            'to_contract': True,
            'wallet_address': victim_wallet
        })
        
        return signals
    
    async def generate_sandwich_attack(self, victim_wallet: str) -> List[Dict[str, Any]]:
        """Generate a sandwich attack scenario"""
        mev_bot = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        current_time = datetime.now().timestamp()
        
        signals = []
        
        # Front-run approval
        signals.append({
            'type': 'approval',
            'timestamp': current_time,
            'owner': victim_wallet,
            'spender': mev_bot,
            'tx_hash': f'0x{uuid.uuid4().hex}',
            'block_number': 7527665,
            'contract_address': f'0x{uuid.uuid4().hex[:40]}',
            'approval_value': 10000000000000000000000,  # 10k tokens
            'allowance_ratio': 0.3,
            'spender_known': False,
            'gas_price': 250000000000,  # High gas (250 gwei)
            'to_contract': True,
            'wallet_address': victim_wallet
        })
        
        # Back-run transfer
        signals.append({
            'type': 'transfer',
            'timestamp': current_time + 2,
            'from': victim_wallet,
            'to': mev_bot,
            'tx_hash': f'0x{uuid.uuid4().hex}',
            'block_number': 7527665,
            'contract_address': f'0x{uuid.uuid4().hex[:40]}',
            'transfer_value': 8000000000000000000000,
            'amount_ratio': 0.25,
            'gas_price': 250000000000,
            'to_contract': True,
            'wallet_address': victim_wallet
        })
        
        return signals
    
    async def create_demo_alert(self, wallet: str, attack_type: str):
        """Create a demo alert for presentation"""
        
        if attack_type == "drainer":
            signals = await self.generate_drainer_attack(wallet)
            title = "🚨 Token Drainer Attack Detected"
            description = "Multiple high-value approvals to unknown contract detected"
        elif attack_type == "flash_loan":
            signals = await self.generate_flash_loan_attack(wallet)
            title = "⚡ Flash Loan Attack Detected"
            description = "Rapid approval and transfer in single block detected"
        elif attack_type == "sandwich":
            signals = await self.generate_sandwich_attack(wallet)
            title = "🥪 Sandwich Attack Detected"
            description = "MEV bot manipulation pattern detected"
        else:
            raise ValueError(f"Unknown attack type: {attack_type}")
        
        # Evaluate signals using real Fetch.ai agent
        evaluation = evaluate_signals(signals)
        
        # Create case data
        case_data = {
            "case_id": str(uuid.uuid4()),
            "wallet": wallet,
            "severity": evaluation['severity'],
            "reason": f"{title}: {evaluation['reason']}",
            "signals": signals,
            "attack_type": attack_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "analysis_engine": "Fetch.ai uAgent + Demo Generator"
        }
        
        # Upload to Walrus
        try:
            walrus = WalrusUploader()
            evidence_url = await walrus.upload_case_to_walrus(case_data)
        except Exception as e:
            print(f"Walrus upload failed: {e}")
            evidence_url = f"local://cases/{case_data['case_id']}.json"
        
        # Save to database
        alert_id = self.db.insert_alert(
            wallet=wallet,
            severity=evaluation['severity'],
            reason=case_data['reason']
        )
        
        print(f"✅ Created {attack_type} attack demo for wallet {wallet}")
        print(f"   Alert ID: {alert_id}")
        print(f"   Severity: {evaluation['severity']}")
        print(f"   Evidence: {evidence_url}")
        
        return {
            "alert_id": alert_id,
            "case_id": case_data['case_id'],
            "evidence_url": evidence_url,
            "signals_count": len(signals)
        }

async def main():
    """Demo script to generate malicious transactions"""
    generator = DemoTransactionGenerator()
    
    # Demo wallet addresses
    demo_wallets = [
        "0x742d35Cc6634C0532925a3b8C17A26f6c45d8F7c",  # Demo wallet 1
        "0x8ba1f109551bD432803012645Hac136c22C501e",   # Demo wallet 2  
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"   # Demo wallet 3
    ]
    
    print("🎭 Generating demo malicious transactions for ETHGlobal presentation...")
    
    # Generate different types of attacks
    for i, wallet in enumerate(demo_wallets):
        attack_types = ["drainer", "flash_loan", "sandwich"]
        attack_type = attack_types[i % len(attack_types)]
        
        try:
            result = await generator.create_demo_alert(wallet, attack_type)
            print(f"Generated {attack_type} attack for {wallet}: Alert #{result['alert_id']}")
        except Exception as e:
            print(f"Failed to generate {attack_type} attack: {e}")
        
        # Wait between attacks
        await asyncio.sleep(2)
    
    print("\n🎬 Demo data generation complete! Ready for presentation.")

if __name__ == "__main__":
    asyncio.run(main())