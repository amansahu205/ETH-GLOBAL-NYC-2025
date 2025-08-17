import sqlite3
import os
from typing import List, Dict, Optional
from datetime import datetime

class SQLiteStore:
    def __init__(self, db_path: str = None):
        if db_path is None:
            data_dir = os.path.join(os.path.dirname(__file__), "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "sentinel.db")
        
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database with alerts table"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                wallet TEXT NOT NULL,
                severity TEXT NOT NULL,
                reason TEXT NOT NULL,
                walrus_url TEXT,
                tx_hash TEXT
            )
        """)
        conn.commit()
        conn.close()
    
    def insert_alert(
        self,
        wallet: str,
        severity: str,
        reason: str,
        walrus_url: str = None,
        tx_hash: str = None,
        ts: int = None
    ) -> int:
        """Insert new alert and return alert ID"""
        if ts is None:
            ts = int(datetime.now().timestamp())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO alerts (ts, wallet, severity, reason, walrus_url, tx_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ts, wallet, severity, reason, walrus_url, tx_hash))
        
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return alert_id
    
    def list_alerts(self, wallet: str = None, limit: int = 20) -> List[Dict]:
        """List alerts with optional wallet filter"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if wallet:
            cursor.execute("""
                SELECT id, ts, wallet, severity, reason, walrus_url, tx_hash
                FROM alerts
                WHERE wallet = ?
                ORDER BY ts DESC
                LIMIT ?
            """, (wallet, limit))
        else:
            cursor.execute("""
                SELECT id, ts, wallet, severity, reason, walrus_url, tx_hash
                FROM alerts
                ORDER BY ts DESC
                LIMIT ?
            """, (limit,))
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                "id": row[0],
                "ts": row[1],
                "wallet": row[2],
                "severity": row[3],
                "reason": row[4],
                "walrus_url": row[5],
                "tx_hash": row[6]
            })
        
        conn.close()
        return alerts