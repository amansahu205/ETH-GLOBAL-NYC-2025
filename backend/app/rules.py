from typing import List, Dict, Any
from datetime import datetime, timedelta

def evaluate_signals(signals: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Evaluate security signals and return severity + reason
    
    Args:
        signals: List of signal dictionaries with keys like:
                - type: 'approval', 'transfer', etc.
                - timestamp: unix timestamp
                - allowance_ratio: float (0-1)
                - spender_known: bool
                - amount_ratio: float (0-1)
                - window_minutes: int
    
    Returns:
        Dict with 'severity' and 'reason' keys
    """
    reasons = []
    severity_scores = {'low': 1, 'medium': 2, 'high': 3}
    max_severity = 'low'
    
    current_time = datetime.now()
    
    # R01: Multiple approvals in short window
    approval_signals = [s for s in signals if s.get('type') == 'approval']
    recent_approvals = []
    
    for signal in approval_signals:
        signal_time = datetime.fromtimestamp(signal.get('timestamp', 0))
        if current_time - signal_time <= timedelta(minutes=10):
            recent_approvals.append(signal)
    
    if len(recent_approvals) >= 3:
        reasons.append("R01: Multiple approvals detected (3+ in 10 minutes)")
        if severity_scores['medium'] > severity_scores[max_severity]:
            max_severity = 'medium'
    
    # R02: High allowance to unknown spender
    for signal in signals:
        allowance_ratio = signal.get('allowance_ratio', 0)
        spender_known = signal.get('spender_known', True)
        
        if allowance_ratio > 0.2 and not spender_known:
            reasons.append(f"R02: High allowance ({allowance_ratio:.1%}) to unknown spender")
            if severity_scores['high'] > severity_scores[max_severity]:
                max_severity = 'high'
            break
    
    # R03: High outflow ratio in short window
    transfer_signals = [s for s in signals if s.get('type') == 'transfer']
    recent_outflows = []
    
    for signal in transfer_signals:
        signal_time = datetime.fromtimestamp(signal.get('timestamp', 0))
        if current_time - signal_time <= timedelta(minutes=5):
            recent_outflows.append(signal.get('amount_ratio', 0))
    
    total_outflow_ratio = sum(recent_outflows)
    if total_outflow_ratio > 0.4:
        reasons.append(f"R03: High outflow detected ({total_outflow_ratio:.1%} in 5 minutes)")
        if severity_scores['high'] > severity_scores[max_severity]:
            max_severity = 'high'
    
    # Default reason if no specific rules triggered
    if not reasons:
        reasons.append("Suspicious activity detected")
    
    return {
        'severity': max_severity,
        'reason': '; '.join(reasons)
    }