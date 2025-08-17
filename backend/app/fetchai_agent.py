import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecuritySignal(Model):
    """Model for security signals sent to the agent"""
    wallet_address: str
    signals: List[Dict[str, Any]]
    timestamp: float

class SecurityAnalysis(Model):
    """Model for security analysis response"""
    severity: str
    reason: str
    confidence: float
    recommendations: List[str]

class SentinelSecurityAgent:
    """
    Fetch.ai uAgent for advanced security analysis
    Uses AI-powered threat detection beyond simple rules
    """
    
    def __init__(self, name: str = "sentinel_security", seed: Optional[str] = None):
        # Create the agent
        self.agent = Agent(
            name=name,
            seed=seed or "sentinel_security_agent_seed_phrase_2025",
            port=8001,
            endpoint=["http://localhost:8001/submit"]
        )
        
        # Fund agent if needed (for testnet operations)
        try:
            fund_agent_if_low(self.agent.wallet.address())
        except Exception as e:
            logger.warning(f"Could not fund agent: {e}")
        
        # Register message handlers
        self._register_handlers()
        
        # Known malicious patterns (could be expanded with ML models)
        self.malicious_patterns = {
            'flash_loan_attack': {
                'indicators': ['high_approval', 'immediate_transfer', 'unknown_spender'],
                'severity': 'high',
                'confidence': 0.9
            },
            'drainer_pattern': {
                'indicators': ['multiple_approvals', 'sweeping_transfers', 'max_allowance'],
                'severity': 'high', 
                'confidence': 0.95
            },
            'sandwich_attack': {
                'indicators': ['frontrun_approval', 'backrun_transfer', 'mev_pattern'],
                'severity': 'medium',
                'confidence': 0.8
            }
        }
    
    def _register_handlers(self):
        """Register message handlers for the agent"""
        
        @self.agent.on_message(model=SecuritySignal)
        async def handle_security_analysis(ctx: Context, sender: str, msg: SecuritySignal):
            """Main handler for security signal analysis"""
            try:
                ctx.logger.info(f"🔍 Analyzing security signals for wallet: {msg.wallet_address}")
                
                # Perform advanced analysis
                analysis = await self._analyze_signals(msg.signals, msg.wallet_address)
                
                # Log the analysis
                ctx.logger.info(f"📊 Analysis complete: {analysis.severity} risk detected")
                
                # Send response back
                await ctx.send(sender, analysis)
                
            except Exception as e:
                ctx.logger.error(f"❌ Analysis failed: {str(e)}")
                
                # Send error response
                error_analysis = SecurityAnalysis(
                    severity="unknown",
                    reason=f"Analysis failed: {str(e)}",
                    confidence=0.0,
                    recommendations=["Manual review required"]
                )
                await ctx.send(sender, error_analysis)
    
    async def _analyze_signals(self, signals: List[Dict[str, Any]], wallet_address: str) -> SecurityAnalysis:
        """
        Advanced AI-powered security analysis
        Goes beyond simple rule-based detection
        """
        
        # Extract features from signals
        features = self._extract_features(signals)
        
        # Pattern matching against known attack vectors
        threat_level = self._pattern_matching(features)
        
        # Behavioral analysis
        behavior_risk = self._behavioral_analysis(signals, wallet_address)
        
        # Combine analysis results
        final_analysis = self._combine_analyses(threat_level, behavior_risk, features)
        
        return final_analysis
    
    def _extract_features(self, signals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract relevant features from raw signals"""
        
        features = {
            'approval_count': 0,
            'transfer_count': 0,
            'max_allowance_ratio': 0.0,
            'total_outflow_ratio': 0.0,
            'unknown_spender_count': 0,
            'time_window_minutes': 0,
            'gas_price_anomaly': False,
            'contract_interactions': 0
        }
        
        current_time = datetime.now()
        earliest_time = current_time
        
        for signal in signals:
            signal_time = datetime.fromtimestamp(signal.get('timestamp', 0))
            earliest_time = min(earliest_time, signal_time)
            
            signal_type = signal.get('type', '')
            
            if signal_type == 'approval':
                features['approval_count'] += 1
                allowance_ratio = signal.get('allowance_ratio', 0)
                features['max_allowance_ratio'] = max(features['max_allowance_ratio'], allowance_ratio)
                
                if not signal.get('spender_known', True):
                    features['unknown_spender_count'] += 1
                    
            elif signal_type == 'transfer':
                features['transfer_count'] += 1
                amount_ratio = signal.get('amount_ratio', 0)
                features['total_outflow_ratio'] += amount_ratio
            
            # Check for contract interactions
            if signal.get('to_contract', False):
                features['contract_interactions'] += 1
            
            # Check for gas price anomalies (simplified)
            gas_price = signal.get('gas_price', 0)
            if gas_price > 100_000_000_000:  # > 100 gwei indicates urgency
                features['gas_price_anomaly'] = True
        
        # Calculate time window
        features['time_window_minutes'] = (current_time - earliest_time).total_seconds() / 60
        
        return features
    
    def _pattern_matching(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Match features against known malicious patterns"""
        
        detected_patterns = []
        max_confidence = 0.0
        max_severity = 'low'
        
        # Flash loan attack pattern
        if (features['approval_count'] >= 1 and 
            features['transfer_count'] >= 1 and
            features['time_window_minutes'] < 1 and
            features['max_allowance_ratio'] > 0.5):
            
            detected_patterns.append('flash_loan_attack')
            max_confidence = max(max_confidence, 0.9)
            max_severity = 'high'
        
        # Drainer pattern
        if (features['approval_count'] >= 3 and
            features['unknown_spender_count'] >= 2 and
            features['max_allowance_ratio'] > 0.8):
            
            detected_patterns.append('drainer_pattern')
            max_confidence = max(max_confidence, 0.95)
            max_severity = 'high'
        
        # Sandwich attack pattern
        if (features['approval_count'] >= 1 and
            features['transfer_count'] >= 2 and
            features['gas_price_anomaly']):
            
            detected_patterns.append('sandwich_attack')
            max_confidence = max(max_confidence, 0.8)
            if max_severity != 'high':
                max_severity = 'medium'
        
        return {
            'patterns': detected_patterns,
            'confidence': max_confidence,
            'severity': max_severity
        }
    
    def _behavioral_analysis(self, signals: List[Dict[str, Any]], wallet_address: str) -> Dict[str, Any]:
        """Analyze behavioral patterns for anomalies"""
        
        # Simplified behavioral analysis
        # In production, this would use historical data and ML models
        
        risk_score = 0.0
        anomalies = []
        
        # Check for rapid succession of transactions
        if len(signals) >= 5:
            risk_score += 0.3
            anomalies.append("High transaction frequency")
        
        # Check for unusual gas prices
        gas_prices = [s.get('gas_price', 0) for s in signals]
        if gas_prices and max(gas_prices) > 200_000_000_000:  # > 200 gwei
            risk_score += 0.2
            anomalies.append("Unusually high gas prices")
        
        # Check for interaction with new contracts
        contract_interactions = sum(1 for s in signals if s.get('to_contract', False))
        if contract_interactions >= 3:
            risk_score += 0.4
            anomalies.append("Multiple contract interactions")
        
        severity = 'low'
        if risk_score >= 0.7:
            severity = 'high'
        elif risk_score >= 0.4:
            severity = 'medium'
        
        return {
            'risk_score': risk_score,
            'anomalies': anomalies,
            'severity': severity
        }
    
    def _combine_analyses(self, threat_level: Dict[str, Any], behavior_risk: Dict[str, Any], features: Dict[str, Any]) -> SecurityAnalysis:
        """Combine different analysis results into final assessment"""
        
        # Determine final severity
        severities = [threat_level['severity'], behavior_risk['severity']]
        severity_order = {'low': 0, 'medium': 1, 'high': 2}
        final_severity = max(severities, key=lambda x: severity_order.get(x, 0))
        
        # Calculate combined confidence
        pattern_confidence = threat_level['confidence']
        behavior_confidence = min(behavior_risk['risk_score'], 1.0)
        final_confidence = max(pattern_confidence, behavior_confidence)
        
        # Build reason string
        reasons = []
        if threat_level['patterns']:
            reasons.append(f"Detected patterns: {', '.join(threat_level['patterns'])}")
        if behavior_risk['anomalies']:
            reasons.append(f"Behavioral anomalies: {', '.join(behavior_risk['anomalies'])}")
        
        if not reasons:
            reasons.append("Standard security evaluation completed")
        
        # Generate recommendations
        recommendations = self._generate_recommendations(final_severity, features, threat_level['patterns'])
        
        return SecurityAnalysis(
            severity=final_severity,
            reason='; '.join(reasons),
            confidence=final_confidence,
            recommendations=recommendations
        )
    
    def _generate_recommendations(self, severity: str, features: Dict[str, Any], patterns: List[str]) -> List[str]:
        """Generate actionable security recommendations"""
        
        recommendations = []
        
        if severity == 'high':
            recommendations.extend([
                "🚨 Immediately revoke all suspicious token approvals",
                "🔒 Rotate wallet signer/private keys",
                "💰 Transfer assets to a secure wallet",
                "🕵️ Review transaction history for unauthorized activity"
            ])
        
        elif severity == 'medium':
            recommendations.extend([
                "⚠️ Review and limit token approvals",
                "🔍 Monitor wallet activity closely",
                "🛡️ Consider using a hardware wallet for future transactions"
            ])
        
        else:  # low severity
            recommendations.extend([
                "✅ Continue normal security practices",
                "🔄 Periodic review of token approvals recommended"
            ])
        
        # Pattern-specific recommendations
        if 'drainer_pattern' in patterns:
            recommendations.append("🚫 Avoid interacting with unknown DApps")
        
        if 'flash_loan_attack' in patterns:
            recommendations.append("⚡ Be cautious of MEV and flash loan risks")
        
        if features['gas_price_anomaly']:
            recommendations.append("⛽ Review gas price settings to avoid overpaying")
        
        return recommendations
    
    def start(self):
        """Start the agent"""
        logger.info(f"🤖 Starting Sentinel Security Agent: {self.agent.address}")
        logger.info(f"💰 Agent wallet: {self.agent.wallet.address()}")
        self.agent.run()

# Synchronous wrapper for integration with existing codebase
class FetchAIAnalyzer:
    """
    Synchronous wrapper for the Fetch.ai agent
    Provides compatibility with existing FastAPI codebase
    """
    
    def __init__(self):
        self.agent_runner = None
        self.agent_address = None
    
    def analyze_signals(self, signals: List[Dict[str, Any]], wallet_address: str) -> Dict[str, str]:
        """
        Analyze signals using Fetch.ai agent with fallback to rule-based analysis
        """
        try:
            # Try to use Fetch.ai agent analysis
            return self._agent_analysis(signals, wallet_address)
        except Exception as e:
            logger.warning(f"Fetch.ai agent analysis failed: {e}")
            # Fallback to simple rule-based analysis
            return self._fallback_analysis(signals)
    
    def _agent_analysis(self, signals: List[Dict[str, Any]], wallet_address: str) -> Dict[str, str]:
        """
        Use Fetch.ai agent for analysis (async -> sync wrapper)
        """
        # For now, use enhanced rule-based analysis
        # In production, this would communicate with the running agent
        
        analyzer = SentinelSecurityAgent()
        
        # Extract features and run analysis synchronously
        features = analyzer._extract_features(signals)
        threat_level = analyzer._pattern_matching(features)
        behavior_risk = analyzer._behavioral_analysis(signals, wallet_address)
        
        # Combine results
        analysis = analyzer._combine_analyses(threat_level, behavior_risk, features)
        
        return {
            'severity': analysis.severity,
            'reason': analysis.reason,
            'confidence': str(analysis.confidence),
            'recommendations': '; '.join(analysis.recommendations)
        }
    
    def _fallback_analysis(self, signals: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Fallback to simple rule-based analysis
        """
        from .rules import evaluate_signals
        return evaluate_signals(signals)

# For backward compatibility
def evaluate_signals(signals: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Enhanced signal evaluation using Fetch.ai agent
    Falls back to rule-based analysis if agent is unavailable
    """
    analyzer = FetchAIAnalyzer()
    wallet_address = signals[0].get('wallet_address', 'unknown') if signals else 'unknown'
    
    result = analyzer.analyze_signals(signals, wallet_address)
    
    # Ensure backward compatibility by returning only severity and reason
    return {
        'severity': result['severity'],
        'reason': result['reason']
    }