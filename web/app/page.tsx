'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Zap, AlertTriangle, Eye, Lock, CheckCircle, Clock, ExternalLink, Wallet, Activity } from 'lucide-react'

interface Alert {
  id: number
  wallet: string
  severity: string
  reason: string
  signals: any[]
  created_at: string
}

export default function SentinelPage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRecovering, setIsRecovering] = useState(false)
  const [systemStats, setSystemStats] = useState({
    blocksMonitored: 7527630,
    threatsBlocked: 42,
    walletsProtected: 1337
  })

  const fetchAlerts = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/alerts?wallet=${walletAddress}`)
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }, [walletAddress])

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isPolling && walletAddress) {
      fetchAlerts()
      interval = setInterval(fetchAlerts, 5000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPolling, walletAddress, fetchAlerts])

  // Simulate live stats
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        blocksMonitored: prev.blocksMonitored + Math.floor(Math.random() * 3),
        threatsBlocked: prev.threatsBlocked + (Math.random() > 0.8 ? 1 : 0),
        walletsProtected: prev.walletsProtected + (Math.random() > 0.9 ? 1 : 0)
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handlePollToggle = () => {
    setIsPolling(!isPolling)
  }

  const handleRecover = async () => {
    setIsRecovering(true)
    
    try {
      // Step-up authentication
      await fetch('http://localhost:8000/api/identity/stepup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: '123456' })
      })
      
      // Use deployer address for recovery
      const newSigner = '0xcEa3aF0a65e3C865A32F9367A23F4165051DF3F5'
      
      // Rotate signer
      const response = await fetch('http://localhost:8000/api/actions/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSigner })
      })
      
      const result = await response.json()
      
      if (result.txHash) {
        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse'
        notification.innerHTML = `✅ Recovery Complete! <br><small>Tx: ${result.txHash.slice(0,10)}...</small>`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 5000)
      }
    } catch (error) {
      console.error('Recovery failed:', error)
    } finally {
      setIsRecovering(false)
    }
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high': 
        return { 
          classes: 'alert-high border-2', 
          icon: AlertTriangle,
          bg: 'bg-red-500/20'
        }
      case 'medium': 
        return { 
          classes: 'alert-medium border-2', 
          icon: Eye,
          bg: 'bg-yellow-500/20'
        }
      case 'low': 
        return { 
          classes: 'alert-low border-2', 
          icon: CheckCircle,
          bg: 'bg-green-500/20'
        }
      default: 
        return { 
          classes: 'border border-slate-600', 
          icon: Activity,
          bg: 'bg-slate-500/20'
        }
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 animate-glow">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Sentinel
            </h1>
          </div>
          <p className="text-xl text-slate-300 mb-8">Agentic Wallet Security for DeFi</p>
          
          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-xl p-6 glow-border">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                <span className="text-slate-300">Blocks Monitored</span>
              </div>
              <div className="text-2xl font-bold text-white">{systemStats.blocksMonitored.toLocaleString()}</div>
            </div>
            <div className="glass rounded-xl p-6 glow-border">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-green-400 animate-pulse" />
                <span className="text-slate-300">Threats Blocked</span>
              </div>
              <div className="text-2xl font-bold text-white">{systemStats.threatsBlocked}</div>
            </div>
            <div className="glass rounded-xl p-6 glow-border">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 text-purple-400 animate-pulse" />
                <span className="text-slate-300">Wallets Protected</span>
              </div>
              <div className="text-2xl font-bold text-white">{systemStats.walletsProtected.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="glass rounded-2xl p-8 mb-8 glow-border">
          <div className="flex items-center gap-3 mb-6">
            <Wallet className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
              Demo Mode
            </span>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="0x742d35Cc6C4C45cb62FF6Fc6e6E6b9B5d8e0e5Dd"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 px-6 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handlePollToggle}
              className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                isPolling 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              {isPolling ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Start Monitoring
                </>
              )}
            </button>
          </div>
          {isPolling && (
            <div className="mt-4 flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Real-time monitoring active • Polling every 5 seconds</span>
            </div>
          )}
        </div>

        {/* Emergency Recovery */}
        <div className="glass rounded-2xl p-8 mb-8 glow-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Emergency Recovery</h2>
            </div>
            <button
              onClick={handleRecover}
              disabled={isRecovering || !walletAddress}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-3 shadow-lg shadow-red-500/25 disabled:shadow-none"
            >
              {isRecovering ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Executing Recovery...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Rotate Signer
                </>
              )}
            </button>
          </div>
          <p className="text-slate-300">
            Instantly rotate wallet signer via GuardianController when threats are detected
          </p>
        </div>

        {/* Security Alerts */}
        <div className="glass rounded-2xl overflow-hidden glow-border">
          <div className="p-8 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Security Alerts</h2>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} found</span>
              </div>
            </div>
          </div>
          
          {alerts.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-float" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">All Clear</h3>
              <p className="text-slate-500">No security threats detected. Your wallet is protected.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {alerts.map((alert, index) => {
                const severityConfig = getSeverityConfig(alert.severity)
                const IconComponent = severityConfig.icon
                return (
                  <div 
                    key={alert.id} 
                    className={`p-6 hover:bg-slate-800/30 transition-all duration-300 ${severityConfig.bg}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${severityConfig.classes.includes('alert-high') ? 'bg-red-500/20' : severityConfig.classes.includes('alert-medium') ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-slate-400">#{alert.id}</span>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${severityConfig.classes}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-slate-400">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold text-white mb-2">{alert.reason}</h4>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-400">
                            Wallet: <span className="font-mono">{alert.wallet.slice(0, 6)}...{alert.wallet.slice(-4)}</span>
                          </span>
                          <a
                            href={`http://localhost:8000/cases/${alert.id}.json`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Evidence
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-400">
          <p className="mb-2">Built for ETHGlobal NYC 2025</p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              API: Online
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Zircuit: Connected
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              Guardian: Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}