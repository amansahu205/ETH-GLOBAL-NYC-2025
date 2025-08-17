import asyncio
import logging
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Any
from web3 import Web3
from web3.providers import HTTPProvider
from dotenv import load_dotenv

from .sqlite_store import SQLiteStore
from .walrus import WalrusUploader
from .fetchai_agent import evaluate_signals

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Event signatures
APPROVAL_SIGNATURE = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
TRANSFER_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

class ZircuitListener:
    def __init__(self):
        self.http_url = os.getenv("ZIRCUIT_HTTP")
        self.w3 = None
        self.db = SQLiteStore()
        
        # Rolling window storage: wallet -> deque of events
        self.wallet_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.running = False
        
    async def connect(self):
        """Connect to Zircuit HTTP"""
        try:
            self.w3 = Web3(HTTPProvider(self.http_url))
            if self.w3.is_connected():
                logger.info("Connected to Zircuit HTTP")
                return True
            else:
                logger.error("Failed to connect to Zircuit HTTP")
                return False
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    async def process_event(self, event: Dict[str, Any]):
        """Process a blockchain event and generate alerts"""
        try:
            # Extract event data
            topics = event.get('topics', [])
            data = event.get('data', '0x')
            if not topics:
                return
                
            event_signature = topics[0]
            block_number = event.get('blockNumber', 0)
            tx_hash = event.get('transactionHash', '')
            contract_address = event.get('address', '')
            timestamp = int(datetime.now().timestamp())
            
            # Parse based on event type
            if event_signature == APPROVAL_SIGNATURE:
                # Approval(owner, spender, value)
                if len(topics) >= 3:
                    owner = self.w3.to_checksum_address('0x' + topics[1][-40:])
                    spender = self.w3.to_checksum_address('0x' + topics[2][-40:])
                    
                    # Parse approval value from data
                    approval_value = int(data, 16) if data and data != '0x' else 0
                    
                    # Calculate real allowance ratio
                    allowance_ratio = await self.calculate_allowance_ratio(
                        owner, contract_address, approval_value
                    )
                    
                    # Check if spender is known/trusted
                    spender_known = await self.check_address_reputation(spender)
                    
                    # Get gas price for this transaction
                    gas_price = await self.get_transaction_gas_price(tx_hash)
                    
                    signal = {
                        'type': 'approval',
                        'timestamp': timestamp,
                        'owner': owner,
                        'spender': spender,
                        'tx_hash': tx_hash,
                        'block_number': block_number,
                        'contract_address': contract_address,
                        'approval_value': approval_value,
                        'allowance_ratio': allowance_ratio,
                        'spender_known': spender_known,
                        'gas_price': gas_price,
                        'to_contract': await self.is_contract_address(spender)
                    }
                    
                    self.wallet_events[owner].append(signal)
                    await self.evaluate_wallet_signals(owner)
                    
            elif event_signature == TRANSFER_SIGNATURE:
                # Transfer(from, to, value)
                if len(topics) >= 3:
                    from_addr = self.w3.to_checksum_address('0x' + topics[1][-40:])
                    to_addr = self.w3.to_checksum_address('0x' + topics[2][-40:])
                    
                    # Parse transfer value from data
                    transfer_value = int(data, 16) if data and data != '0x' else 0
                    
                    # Calculate real amount ratio
                    amount_ratio = await self.calculate_transfer_ratio(
                        from_addr, contract_address, transfer_value
                    )
                    
                    # Get gas price for this transaction
                    gas_price = await self.get_transaction_gas_price(tx_hash)
                    
                    signal = {
                        'type': 'transfer',
                        'timestamp': timestamp,
                        'from': from_addr,
                        'to': to_addr,
                        'tx_hash': tx_hash,
                        'block_number': block_number,
                        'contract_address': contract_address,
                        'transfer_value': transfer_value,
                        'amount_ratio': amount_ratio,
                        'gas_price': gas_price,
                        'to_contract': await self.is_contract_address(to_addr)
                    }
                    
                    self.wallet_events[from_addr].append(signal)
                    await self.evaluate_wallet_signals(from_addr)
                    
        except Exception as e:
            logger.error(f"Error processing event: {e}")
    
    async def calculate_allowance_ratio(self, owner: str, token_address: str, approval_value: int) -> float:
        """Calculate the ratio of approval value to wallet's token balance"""
        try:
            # ERC20 balanceOf function signature
            balance_selector = "0x70a08231"
            owner_padded = owner[2:].zfill(64)  # Remove 0x and pad to 64 chars
            
            balance_call = await self.w3.eth.call({
                'to': token_address,
                'data': balance_selector + owner_padded
            })
            
            balance = int(balance_call.hex(), 16) if balance_call else 0
            
            if balance == 0:
                return 1.0 if approval_value > 0 else 0.0
            
            ratio = min(approval_value / balance, 1.0)
            return ratio
            
        except Exception as e:
            logger.warning(f"Could not calculate allowance ratio: {e}")
            # Fallback: assume high risk if we can't calculate
            return 0.8 if approval_value > 10**18 else 0.3  # 1 token threshold
    
    async def calculate_transfer_ratio(self, from_addr: str, token_address: str, transfer_value: int) -> float:
        """Calculate the ratio of transfer value to wallet's previous token balance"""
        try:
            # Get current balance (after transfer)
            balance_selector = "0x70a08231"
            from_padded = from_addr[2:].zfill(64)
            
            current_balance_call = await self.w3.eth.call({
                'to': token_address,
                'data': balance_selector + from_padded
            })
            
            current_balance = int(current_balance_call.hex(), 16) if current_balance_call else 0
            previous_balance = current_balance + transfer_value
            
            if previous_balance == 0:
                return 1.0 if transfer_value > 0 else 0.0
            
            ratio = min(transfer_value / previous_balance, 1.0)
            return ratio
            
        except Exception as e:
            logger.warning(f"Could not calculate transfer ratio: {e}")
            # Fallback: assume medium risk
            return 0.4 if transfer_value > 10**18 else 0.1
    
    async def check_address_reputation(self, address: str) -> bool:
        """Check if an address is known/trusted"""
        # Known good addresses (DEX routers, popular protocols)
        KNOWN_GOOD_ADDRESSES = {
            # Uniswap V2 Router
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            # Uniswap V3 Router  
            "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            # 1inch Router
            "0x1111111254EEB25477B68fb85Ed929f73A960582",
            # SushiSwap Router
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
            # Curve.fi
            "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
            # Aave V3 Pool
            "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
        }
        
        # Convert to checksum address for comparison
        checksum_addr = self.w3.to_checksum_address(address)
        return checksum_addr in KNOWN_GOOD_ADDRESSES
    
    async def is_contract_address(self, address: str) -> bool:
        """Check if an address is a contract"""
        try:
            code = await self.w3.eth.get_code(address)
            return len(code) > 0
        except Exception:
            return False
    
    async def get_transaction_gas_price(self, tx_hash: str) -> int:
        """Get the gas price used in a transaction"""
        try:
            tx = await self.w3.eth.get_transaction(tx_hash)
            return tx.get('gasPrice', 0)
        except Exception:
            return 0
    
    async def evaluate_wallet_signals(self, wallet: str):
        """Evaluate signals for a wallet and create alerts if needed"""
        try:
            # Get recent signals (last 15 minutes)
            cutoff_time = datetime.now() - timedelta(minutes=15)
            cutoff_timestamp = int(cutoff_time.timestamp())
            
            recent_signals = [
                signal for signal in self.wallet_events[wallet]
                if signal.get('timestamp', 0) >= cutoff_timestamp
            ]
            
            if not recent_signals:
                return
            
            # Evaluate signals
            evaluation = evaluate_signals(recent_signals)
            severity = evaluation['severity']
            reason = evaluation['reason']
            
            # Only create alerts for medium/high severity
            if severity in ['medium', 'high']:
                logger.info(f"Alert triggered for {wallet}: {severity} - {reason}")
                
                # Insert alert to database
                alert_id = self.db.insert_alert(
                    wallet=wallet,
                    severity=severity,
                    reason=reason
                )
                
                # Create case data for Walrus
                case_data = {
                    'wallet': wallet,
                    'severity': severity,
                    'reason': reason,
                    'signals': recent_signals,
                    'alert_id': alert_id,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Upload to Walrus Protocol and update alert
                try:
                    walrus = WalrusUploader()
                    walrus_url = await walrus.upload_case_to_walrus(case_data)
                    
                    # Update alert with Walrus URL (would need to add this to SQLiteStore)
                    logger.info(f"Case uploaded: {walrus_url}")
                    
                except Exception as e:
                    logger.error(f"Failed to upload case: {e}")
                    
        except Exception as e:
            logger.error(f"Error evaluating wallet signals: {e}")
    
    async def poll_for_logs(self):
        """Poll for ERC20 Approval and Transfer events"""
        last_block = self.w3.eth.block_number
        logger.info(f"Starting to poll from block {last_block}")
        
        while self.running:
            try:
                current_block = self.w3.eth.block_number
                
                if current_block > last_block:
                    # Get logs for new blocks
                    logs = self.w3.eth.get_logs({
                        'fromBlock': last_block + 1,
                        'toBlock': current_block,
                        'topics': [
                            [APPROVAL_SIGNATURE, TRANSFER_SIGNATURE]
                        ]
                    })
                    
                    logger.info(f"Found {len(logs)} logs in blocks {last_block + 1} to {current_block}")
                    
                    for log in logs:
                        if self.running:
                            await self.process_event(log)
                    
                    last_block = current_block
                
                # Wait before next poll
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Polling error: {e}")
                await asyncio.sleep(10)
    
    async def start_monitoring(self):
        """Start the monitoring loop with reconnection"""
        self.running = True
        
        while self.running:
            try:
                # Connect to WebSocket
                connected = await self.connect()
                if not connected:
                    logger.warning("Retrying connection in 10 seconds...")
                    await asyncio.sleep(10)
                    continue
                
                # Start polling for logs
                await self.poll_for_logs()
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                logger.info("Reconnecting in 10 seconds...")
                await asyncio.sleep(10)
                
            finally:
                if self.w3:
                    try:
                        await self.w3.provider.disconnect()
                    except:
                        pass
    
    def stop_monitoring(self):
        """Stop the monitoring loop"""
        self.running = False
        logger.info("Stopping monitoring...")

# Example usage
if __name__ == "__main__":
    async def main():
        listener = ZircuitListener()
        try:
            await listener.start_monitoring()
        except KeyboardInterrupt:
            listener.stop_monitoring()
            logger.info("Monitoring stopped")
    
    asyncio.run(main())