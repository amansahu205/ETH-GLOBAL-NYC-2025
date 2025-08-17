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
            if not topics:
                return
                
            event_signature = topics[0]
            block_number = event.get('blockNumber', 0)
            tx_hash = event.get('transactionHash', '')
            timestamp = int(datetime.now().timestamp())
            
            # Parse based on event type
            if event_signature == APPROVAL_SIGNATURE:
                # Approval(owner, spender, value)
                if len(topics) >= 3:
                    owner = self.w3.to_checksum_address('0x' + topics[1][-40:])
                    spender = self.w3.to_checksum_address('0x' + topics[2][-40:])
                    
                    signal = {
                        'type': 'approval',
                        'timestamp': timestamp,
                        'owner': owner,
                        'spender': spender,
                        'tx_hash': tx_hash,
                        'block_number': block_number,
                        'allowance_ratio': 0.3,  # Mock ratio - would calculate from actual data
                        'spender_known': False   # Mock - would check against known addresses
                    }
                    
                    self.wallet_events[owner].append(signal)
                    await self.evaluate_wallet_signals(owner)
                    
            elif event_signature == TRANSFER_SIGNATURE:
                # Transfer(from, to, value)
                if len(topics) >= 3:
                    from_addr = self.w3.to_checksum_address('0x' + topics[1][-40:])
                    to_addr = self.w3.to_checksum_address('0x' + topics[2][-40:])
                    
                    signal = {
                        'type': 'transfer',
                        'timestamp': timestamp,
                        'from': from_addr,
                        'to': to_addr,
                        'tx_hash': tx_hash,
                        'block_number': block_number,
                        'amount_ratio': 0.25  # Mock ratio - would calculate from actual data
                    }
                    
                    self.wallet_events[from_addr].append(signal)
                    await self.evaluate_wallet_signals(from_addr)
                    
        except Exception as e:
            logger.error(f"Error processing event: {e}")
    
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