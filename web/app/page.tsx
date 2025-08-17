'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Activity } from 'lucide-react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'

interface Alert {
  id: number
  wallet: string
  severity: string
  reason: string
  timestamp: number
}

export default function SentinelPage() {
  const { primaryWallet, isAuthenticated } = useDynamicContext()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState({
    blocksMonitored: 7527630,
    threatsBlocked: 42,
    walletsProtected: 1337
  })
  const [mounted, setMounted] = useState(false)

  const walletAddress = primaryWallet?.address || ''

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAlerts = async () => {
    if (!walletAddress) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/alerts?wallet=${walletAddress}`)
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleDemoAttack = async (attackType: string) => {
    if (!walletAddress) return
    
    try {
      const response = await fetch('http://localhost:8000/api/demo/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wallet: walletAddress, 
          attack_type: attackType 
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Show success notification
        alert(`🚨 ${attackType.toUpperCase()} Attack Simulated!`)
        
        // Refresh alerts and stats
        setTimeout(() => {
          fetchAlerts()
          fetchStats()
        }, 1000)
      }
    } catch (error) {
      console.error('Demo attack failed:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (walletAddress) {
      fetchAlerts()
    }
  }, [walletAddress])

  // Show static loading state during SSR/hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl">
                <Shield className="w-12 h-12 text-purple-400" />
              </div>
              <div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400 bg-clip-text text-transparent">
                  Sentinel
                </h1>
                <p className="text-2xl text-slate-300 mt-2">Agentic Wallet Security</p>
              </div>
            </div>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              AI-powered autonomous wallet protection with real-time threat detection, 
              guardian-based recovery, and decentralized evidence storage
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl">
              <Shield className="w-12 h-12 text-purple-400" />
            </div>
            <div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400 bg-clip-text text-transparent">
                Sentinel
              </h1>
              <p className="text-2xl text-slate-300 mt-2">Agentic Wallet Security</p>
            </div>
          </div>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            AI-powered autonomous wallet protection with real-time threat detection, 
            guardian-based recovery, and decentralized evidence storage
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{stats.blocksMonitored.toLocaleString()}</div>
            <div className="text-slate-400">Blocks Monitored</div>
          </div>
          <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-4xl font-bold text-red-400 mb-2">{stats.threatsBlocked}</div>
            <div className="text-slate-400">Threats Blocked</div>
          </div>
          <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-4xl font-bold text-emerald-400 mb-2">{stats.walletsProtected.toLocaleString()}</div>
            <div className="text-slate-400">Wallets Protected</div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="text-center">
            <div className="max-w-md mx-auto mb-10">
              <p className="text-xl text-slate-300 mb-4">Connect your wallet to activate</p>
              <p className="text-slate-400">Real-time threat detection and autonomous security</p>
            </div>
            <div className="flex justify-center">
              <DynamicWidget />
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Wallet Info */}
            <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Protected Wallet</h2>
              <p className="text-slate-300 font-mono text-lg break-all">{walletAddress}</p>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 font-semibold">Active Protection</span>
              </div>
            </div>

            {/* Demo Attacks */}
            <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Demo Attack Generator</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => handleDemoAttack('drainer')}
                  className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300"
                >
                  <AlertTriangle className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Token Drainer</div>
                    <div className="text-sm opacity-80">Multiple high approvals</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDemoAttack('flash_loan')}
                  className="bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300"
                >
                  <Activity className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Flash Loan Attack</div>
                    <div className="text-sm opacity-80">Rapid same-block exploit</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDemoAttack('sandwich')}
                  className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300"
                >
                  <Activity className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Sandwich Attack</div>
                    <div className="text-sm opacity-80">MEV manipulation</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Threats */}
            <div className="bg-slate-800/20 backdrop-blur-lg border border-slate-600/30 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Recent Threats</h2>
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛡️</div>
                  <p className="text-xl text-slate-300 mb-2">No threats detected</p>
                  <p className="text-slate-400">Your wallet is secure! Try the demo attacks above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="bg-slate-700/30 border border-slate-600/30 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          alert.severity === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-400">
                          {new Date(alert.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-xl font-semibold text-white">{alert.reason}</h4>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}