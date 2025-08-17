from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List
import uvicorn

from models import AlertCreate, Alert, RecoveryRequest
from database import init_db, get_db_connection
from blockchain_monitor import BlockchainMonitor
from guardian_controller import GuardianController
from walrus_uploader import WalrusUploader

# Global monitoring task
monitor_task = None
blockchain_monitor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global monitor_task, blockchain_monitor
    
    # Initialize database
    init_db()
    
    # Start blockchain monitoring
    blockchain_monitor = BlockchainMonitor()
    monitor_task = asyncio.create_task(blockchain_monitor.start_monitoring())
    
    yield
    
    # Cleanup
    if monitor_task:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="Sentinel Agentic Wallet Security",
    description="ETHGlobal NYC 2025 - Guardian-based wallet security monitoring",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

guardian_controller = GuardianController()
walrus_uploader = WalrusUploader()

@app.get("/")
async def root():
    return {"message": "Sentinel Guardian Security API", "status": "active"}

@app.get("/alerts", response_model=List[Alert])
async def get_alerts(limit: int = 50):
    """Get recent security alerts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, wallet_address, alert_type, severity, message, 
               evidence_url, tx_hash, block_number, created_at, resolved
        FROM alerts 
        ORDER BY created_at DESC 
        LIMIT ?
    """, (limit,))
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append(Alert(
            id=row[0],
            wallet_address=row[1],
            alert_type=row[2],
            severity=row[3],
            message=row[4],
            evidence_url=row[5],
            tx_hash=row[6],
            block_number=row[7],
            created_at=row[8],
            resolved=bool(row[9])
        ))
    
    conn.close()
    return alerts

@app.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: int):
    """Get specific alert details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, wallet_address, alert_type, severity, message, 
               evidence_url, tx_hash, block_number, created_at, resolved
        FROM alerts 
        WHERE id = ?
    """, (alert_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return Alert(
        id=row[0],
        wallet_address=row[1],
        alert_type=row[2],
        severity=row[3],
        message=row[4],
        evidence_url=row[5],
        tx_hash=row[6],
        block_number=row[7],
        created_at=row[8],
        resolved=bool(row[9])
    )

@app.post("/recover")
async def initiate_recovery(request: RecoveryRequest):
    """Initiate guardian-based signer rotation"""
    try:
        # Get alert details
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (request.alert_id,))
        alert = cursor.fetchone()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        if alert[9]:  # already resolved
            raise HTTPException(status_code=400, detail="Alert already resolved")
        
        # Execute guardian rotation
        tx_hash = await guardian_controller.rotate_signer(
            wallet_address=alert[1],
            new_signer=request.new_signer_address,
            guardian_private_key=request.guardian_private_key
        )
        
        # Mark alert as resolved
        cursor.execute(
            "UPDATE alerts SET resolved = 1 WHERE id = ?", 
            (request.alert_id,)
        )
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "tx_hash": tx_hash,
            "message": "Signer rotation initiated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int):
    """Manually resolve an alert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE alerts SET resolved = 1 WHERE id = ?", (alert_id,))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Alert not found")
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Alert resolved"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "monitoring": blockchain_monitor.is_connected() if blockchain_monitor else False,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )