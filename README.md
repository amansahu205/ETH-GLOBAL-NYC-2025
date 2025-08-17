# 🛡️ Sentinel - Agentic Wallet Security

Sentinel is an autonomous wallet security guardian that continuously monitors ERC20 transactions on Zircuit, detects suspicious patterns through intelligent rules, and automatically triggers recovery actions via smart contract guardians. Built for ETHGlobal NYC 2025, Sentinel combines real-time blockchain monitoring with AI-powered threat detection to protect users from approval farming, sandwich attacks, and other DeFi exploits before they drain accounts.

## Architecture

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   Zircuit L2    │ ──────────────> │  Backend Monitor │
│  (ERC20 Events) │                 │   (Python/web3)  │
└─────────────────┘                 └──────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Rules Engine   │
                                    │ (Risk Analysis) │
                                    └────────┬────────┘
                                             │
                    ┌─────────────┬──────────▼──────────┬─────────────┐
                    │             │                     │             │
                    ▼             ▼                     ▼             ▼
            ┌──────────────┐ ┌─────────────┐ ┌─────────────────┐ ┌──────────┐
            │   SQLite     │ │   Walrus    │ │ GuardianController│ │ Frontend │
            │  (Alerts)    │ │ (Evidence)  │ │   (Recovery)     │ │  (UI)    │
            └──────────────┘ └─────────────┘ └─────────────────┘ └──────────┘
```

## Quickstart

### 1. Smart Contracts

```bash
cd contracts
cp .env.example .env
# Fill ZIRCUIT_RPC, PRIVATE_KEY, SMART_ACCOUNT

npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network zircuit
# Copy deployed addresses to backend .env
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill ZIRCUIT_WS, ZIRCUIT_HTTP, SENDER_PRIVATE_KEY, contract addresses

# Windows PowerShell
powershell -ExecutionPolicy Bypass .\run_dev.ps1

# Manual setup
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 &
python -m app.zircuit_listener &
```

### 3. Frontend (Optional)

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

## Demo Steps

### 1. Create Security Alert

```bash
curl -X POST http://localhost:8000/api/cases/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6C4C45cb62FF6Fc6e6E6b9B5d8e0e5Dd",
    "severity": "high", 
    "reason": "Suspicious approval to unknown contract",
    "signals": [
      {
        "type": "approval",
        "timestamp": 1703234567,
        "allowance_ratio": 0.8,
        "spender_known": false
      }
    ]
  }'
```

Response:
```json
{
  "case_id": "abc123-def456",
  "alert_id": 1,
  "evidence_url": "http://localhost:8000/cases/abc123-def456.json",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. Emergency Recovery

```bash
curl -X POST http://localhost:8000/api/actions/rotate \
  -H "Content-Type: application/json" \
  -d '{
    "newSigner": "0x8ba1f109551bD432803012645Hap0E00ba1f45C3"
  }'
```

Response:
```json
{
  "txHash": "0xabc123...def789"
}
```

### 3. Query Alerts

```bash
curl "http://localhost:8000/api/alerts?wallet=0x742d35Cc6C4C45cb62FF6Fc6e6E6b9B5d8e0e5Dd"
```

## Sponsor Tracks

### Fetch.ai - Agentic Orchestration
- **Backend Logic Engine**: Autonomous decision-making via `rules.py` evaluates threat signals
- **Multi-Agent Architecture**: Separate agents for monitoring, analysis, and recovery actions
- **Proactive Security**: System acts independently without human intervention during threats

### Dynamic - Enhanced Login UX  
- **Wallet Simulation**: Frontend represents Dynamic's seamless login experience
- **Identity Step-up**: `/api/identity/stepup` endpoint simulates biometric/MFA verification
- **Progressive Authentication**: Higher-risk actions require additional verification layers

### Walrus - Decentralized Evidence Storage
- **Immutable Incident Records**: All security alerts stored with tamper-proof evidence
- **Case Documentation**: Complete transaction context preserved for forensic analysis  
- **Public Verifiability**: Evidence URLs allow independent verification of threats

### Zircuit - L2 Security Monitoring
- **Real-time Event Streaming**: WebSocket connection monitors all ERC20 activities
- **Guardian Infrastructure**: Smart contracts enable instant recovery actions
- **Batch Operations**: Efficient approval revocations via helper contracts

## Future Work

- **Multi-chain Listeners**: Extend monitoring to Ethereum mainnet, Polygon, Arbitrum
- **True Walrus Integration**: Replace local storage with actual Walrus blob uploads
- **OpenSea MCP Integration**: Cross-reference suspicious contracts with NFT marketplace data
- **ML Risk Scorer**: Replace rule-based detection with trained anomaly detection models
- **Social Recovery**: Multi-guardian consensus for high-value wallet operations
- **Insurance Integration**: Automatic claim filing for confirmed exploit victims

## Repository Structure

```
├── contracts/           # Solidity smart contracts
│   ├── contracts/       # GuardianController, ApprovalRevokeHelper  
│   ├── scripts/         # Deployment scripts
│   └── test/           # Contract tests
├── backend/            # Python FastAPI backend
│   ├── app/            # Core application modules
│   └── run_dev.ps1     # Development runner
└── web/               # Next.js frontend
    └── app/           # React components
```

Built with ❤️ for ETHGlobal NYC 2025