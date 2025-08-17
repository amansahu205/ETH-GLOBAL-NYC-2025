from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import sqlite3
from datetime import datetime, timezone
from dotenv import load_dotenv
import uuid

from .actions import rotate_signer, revoke_erc20
from .walrus import WalrusUploader
from .fetchai_agent import evaluate_signals

load_dotenv()

app = FastAPI(title="Sentinel API", version="1.0.0")

# CORS setup
backend_origin = os.getenv("BACKEND_ORIGIN", "*")
origins = [backend_origin] if backend_origin != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directories
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CASES_DIR = os.path.join(DATA_DIR, "cases")
DB_PATH = os.path.join(DATA_DIR, "sentinel.db")

def init_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CASES_DIR, exist_ok=True)
    
    # Initialize SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet TEXT NOT NULL,
            severity TEXT NOT NULL,
            reason TEXT NOT NULL,
            signals TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

@app.on_event("startup")
async def startup_event():
    init_dirs()

# Pydantic models
class SnapshotRequest(BaseModel):
    wallet: str
    severity: str
    reason: str
    signals: List[Dict[str, Any]]

class RotateRequest(BaseModel):
    newSigner: str

class RevokeRequest(BaseModel):
    tokens: List[str]
    spenders: List[str]

class StepupRequest(BaseModel):
    otp: Optional[str] = None

@app.get("/api/alerts")
async def get_alerts(wallet: Optional[str] = Query(None)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if wallet:
        cursor.execute("""
            SELECT id, wallet, severity, reason, signals, created_at 
            FROM alerts 
            WHERE wallet = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        """, (wallet,))
    else:
        cursor.execute("""
            SELECT id, wallet, severity, reason, signals, created_at 
            FROM alerts 
            ORDER BY created_at DESC 
            LIMIT 20
        """)
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            "id": row[0],
            "wallet": row[1],
            "severity": row[2],
            "reason": row[3],
            "signals": json.loads(row[4]),
            "created_at": row[5]
        })
    
    conn.close()
    return {"alerts": alerts}

@app.post("/api/cases/snapshot")
async def create_case_snapshot(request: SnapshotRequest):
    try:
        # Generate case ID
        case_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Create case data
        case_data = {
            "case_id": case_id,
            "wallet": request.wallet,
            "severity": request.severity,
            "reason": request.reason,
            "signals": request.signals,
            "timestamp": timestamp,
            "analysis_engine": "Fetch.ai uAgent + Walrus Storage"
        }
        
        # Upload to Walrus Protocol (production)
        walrus = WalrusUploader()
        evidence_url = await walrus.upload_case_to_walrus(case_data)
        
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (wallet, severity, reason, signals)
            VALUES (?, ?, ?, ?)
        """, (request.wallet, request.severity, request.reason, json.dumps(request.signals)))
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "case_id": case_id,
            "alert_id": alert_id,
            "evidence_url": evidence_url,
            "timestamp": timestamp
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/actions/rotate")
async def rotate_signer_action(request: RotateRequest):
    try:
        tx_hash = await rotate_signer(request.newSigner)
        return {"txHash": tx_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/actions/revoke")
async def revoke_erc20_action(request: RevokeRequest):
    try:
        if len(request.tokens) != len(request.spenders):
            raise HTTPException(status_code=400, detail="Tokens and spenders arrays must have equal length")
        
        tx_hash = await revoke_erc20(request.tokens, request.spenders)
        return {"txHash": tx_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/identity/stepup")
async def stepup_identity(request: StepupRequest):
    # Stub implementation for identity step-up
    return {"ok": True}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)