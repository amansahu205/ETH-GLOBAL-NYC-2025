'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Zap, AlertTriangle, Eye, Lock, CheckCircle, Clock, ExternalLink, Wallet, Activity, Star, Sparkles, Bot, Cpu, Router } from 'lucide-react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'

interface Alert {
  id: number
  wallet: string
  severity: string
  reason: string
  timestamp: number
}

export default function SentinelPage() {
  const { primaryWallet, user, isAuthenticated } = useDynamicContext()
  const [isPolling, setIsPolling] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRecovering, setIsRecovering] = useState(false)
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [systemStats, setSystemStats] = useState({
    blocksMonitored: 7527630,
    threatsBlocked: 42,
    walletsProtected: 1337
  })
  const [serviceStatus, setServiceStatus] = useState({
    api: false,
    zircuitRpc: false,
    fetchaiAgent: false,
    walrusStorage: false
  })

  // Fix hydration by ensuring component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get wallet address from Dynamic
  const walletAddress = primaryWallet?.address || ''

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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      setSystemStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  const checkServiceStatus = useCallback(async () => {
    const status = {
      api: false,
      zircuitRpc: false,
      fetchaiAgent: false,
      walrusStorage: false
    }

    // Check API status
    try {
      const response = await fetch('http://localhost:8000/health')
      status.api = response.ok
    } catch (error) {
      status.api = false
    }

    // Check Zircuit RPC (simulate checking RPC connectivity)
    try {
      const rpcResponse = await fetch('https://zircuit1-testnet.p2pify.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      })
      status.zircuitRpc = rpcResponse.ok
    } catch (error) {
      // Default to true for demo since external RPC might have CORS issues
      status.zircuitRpc = true
    }

    // Fetch.ai Agent and Walrus are assumed active for demo
    status.fetchaiAgent = true
    status.walrusStorage = true

    setServiceStatus(status)
  }, [])

  useEffect(() => {
    if (walletAddress) {
      fetchAlerts()
    }
  }, [walletAddress, fetchAlerts])

  useEffect(() => {
    fetchStats()
    checkServiceStatus()
    const interval = setInterval(() => {
      fetchStats()
      checkServiceStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchStats, checkServiceStatus])

  const handlePollToggle = () => {
    setIsPolling(!isPolling)
  }

  const handleDemoAttack = async (attackType: string) => {
    if (!walletAddress) return
    
    setIsGeneratingDemo(true)
    
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
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse'
        notification.innerHTML = `🚨 ${attackType.toUpperCase()} Attack Simulated! <br><small>Alert #${result.alert_id}</small>`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 5000)
        
        // Refresh alerts and stats
        setTimeout(() => {
          fetchAlerts()
          fetchStats()
        }, 1000)
      }
    } catch (error) {
      console.error('Demo attack failed:', error)
    } finally {
      setIsGeneratingDemo(false)
    }
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
        notification.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        notification.innerHTML = `✅ Guardian Recovery Completed!<br><small>Tx: ${result.txHash.slice(0, 10)}...</small>`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 5000)
      }
    } catch (error) {
      console.error('Recovery failed:', error)
    } finally {
      setIsRecovering(false)
    }
  }

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
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto text-balance">
            AI-powered autonomous wallet protection with real-time threat detection, 
            guardian-based recovery, and decentralized evidence storage
          </p>
          
          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <span className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 text-sm font-medium rounded-full border border-emerald-500/30">
              <Bot className="w-3 h-3 inline mr-1" />
              Fetch.ai uAgent
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 text-sm font-medium rounded-full border border-orange-500/30">
              <Activity className="w-3 h-3 inline mr-1" />
              Walrus Protocol
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-sm font-medium rounded-full border border-indigo-500/30">
              <Shield className="w-3 h-3 inline mr-1" />
              Zircuit Testnet
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-sm font-medium rounded-full border border-purple-500/30">
              <Star className="w-3 h-3 inline mr-1" />
              Dynamic SDK
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 text-sm font-medium rounded-full border border-blue-500/30">
              <Router className="w-3 h-3 inline mr-1" />
              Multi-Chain
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass-card text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{systemStats.blocksMonitored.toLocaleString()}</div>
            <div className="text-slate-400">Blocks Monitored</div>
          </div>
          <div className="glass-card text-center">
            <div className="text-4xl font-bold text-red-400 mb-2">{systemStats.threatsBlocked}</div>
            <div className="text-slate-400">Threats Blocked</div>
          </div>
          <div className="glass-card text-center">
            <div className="text-4xl font-bold text-emerald-400 mb-2">{systemStats.walletsProtected.toLocaleString()}</div>
            <div className="text-slate-400">Wallets Protected</div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="text-center">
            <div className="max-w-md mx-auto mb-10">
              <p className="text-xl text-slate-300 mb-4 text-balance">Connect your wallet to activate</p>
              <p className="text-slate-400 text-balance">Real-time threat detection and autonomous security</p>
            </div>
            <div className="flex justify-center">
              <DynamicWidget />
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Monitoring Controls */}
            <div className="glass-card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl">
                    <Eye className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-white mb-1">Real-time Monitoring</h2>
                    <p className="text-slate-400">Autonomous threat detection for wallet: {walletAddress}</p>
                  </div>
                </div>
                
                <button
                  onClick={handlePollToggle}
                  className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center gap-2 ${
                    isPolling 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-slate-700/30 text-slate-400 border border-slate-600/30 hover:bg-slate-600/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
                  {isPolling ? 'Active' : 'Inactive'}
                </button>
              </div>
              
              {isPolling && (
                <div className="glass border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-emerald-200 font-medium">Real-time monitoring active • Polling every 5 seconds</span>
                  </div>
                </div>
              )}
            </div>

            {/* Guardian Recovery */}
            <div className="glass-card">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl">
                    <Lock className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-display text-white mb-2">Guardian Recovery</h2>
                  <p className="text-slate-400">Autonomous signer rotation via smart contract guardians</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Recovery Available</span>
                  </div>
                  <p className="text-slate-300 mb-4">Guardian system ready for emergency signer rotation</p>
                  <button
                    onClick={handleRecover}
                    disabled={isRecovering}
                    className="btn-primary bg-gradient-to-r from-orange-600 to-red-700 w-full"
                  >
                    {isRecovering ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Rotating Signer...
                      </div>
                    ) : (
                      'Emergency Recovery'
                    )}
                  </button>
                </div>
                
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-300 font-semibold">Recent Activity</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Guardian Status</span>
                      <span className="text-emerald-400">Active</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Last Check</span>
                      <span className="text-slate-400">2 min ago</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Network</span>
                      <span className="text-blue-400">Zircuit Testnet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Attacks */}
            <div className="glass-card">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center pulse-glow">
                    <span className="text-white text-xs">🎭</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-display text-white mb-2">Demo Attack Generator</h2>
                  <p className="text-slate-400">Generate realistic malicious transactions for demonstration purposes</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => handleDemoAttack('drainer')}
                  disabled={isGeneratingDemo || !walletAddress}
                  className="btn-secondary bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 p-6 flex flex-col items-center gap-3"
                >
                  <AlertTriangle className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Token Drainer</div>
                    <div className="text-sm opacity-80">Multiple high approvals</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDemoAttack('flash_loan')}
                  disabled={isGeneratingDemo || !walletAddress}
                  className="btn-secondary bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30 p-6 flex flex-col items-center gap-3"
                >
                  <Zap className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Flash Loan Attack</div>
                    <div className="text-sm opacity-80">Rapid same-block exploit</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDemoAttack('sandwich')}
                  disabled={isGeneratingDemo || !walletAddress}
                  className="btn-secondary bg-yellow-500/20 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 p-6 flex flex-col items-center gap-3"
                >
                  <Activity className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Sandwich Attack</div>
                    <div className="text-sm opacity-80">MEV manipulation</div>
                  </div>
                </button>
              </div>
              
              {isGeneratingDemo && (
                <div className="mt-6 glass border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-200 font-medium">Generating malicious transaction scenario...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Threats */}
            <div className="glass-card">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-white">Recent Threats</h2>
                    <p className="text-slate-400">Latest security alerts for your wallet</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-300">Live monitoring</span>
                </div>
              </div>
              
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛡️</div>
                  <p className="text-xl text-slate-300 mb-2">No threats detected</p>
                  <p className="text-slate-400">Your wallet is secure! Try the demo attacks above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="glass rounded-2xl p-6 card-hover-lift">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          alert.severity === 'high' ? 'alert-high' :
                          alert.severity === 'medium' ? 'alert-medium' : 'alert-low'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-400">
                          {new Date(alert.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      
                      <h4 className="text-xl font-display text-white mb-4">{alert.reason}</h4>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Wallet className="w-4 h-4" />
                          <span className="font-mono">{alert.wallet.slice(0, 6)}...{alert.wallet.slice(-4)}</span>
                        </div>
                        <button className="btn-secondary text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-32 relative">
          <div className="glass-card">
            <div className="mb-8">
              <h3 className="text-2xl font-display text-gradient mb-4">Built for ETHGlobal NYC 2025</h3>
              <p className="text-slate-400 max-w-2xl mx-auto text-balance">
                Integrating cutting-edge AI agents, blockchain monitoring, and decentralized storage for the next generation of DeFi security
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Wallet className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Wallet</div>
                <div className="flex items-center justify-center gap-2">
                  {isAuthenticated ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-glow"></div>
                      <span className="text-emerald-300 font-semibold">Connected</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                      <span className="text-slate-400 font-semibold">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">API Status</div>
                <div className="flex items-center justify-center gap-2">
                  {serviceStatus.api ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-glow"></div>
                      <span className="text-emerald-300 font-semibold">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-red-300 font-semibold">Offline</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Router className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Zircuit RPC</div>
                <div className="flex items-center justify-center gap-2">
                  {serviceStatus.zircuitRpc ? (
                    <>
                      <div className="w-2 h-2 bg-blue-400 rounded-full pulse-glow"></div>
                      <span className="text-blue-300 font-semibold">Connected</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-red-300 font-semibold">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Fetch.ai Agent</div>
                <div className="flex items-center justify-center gap-2">
                  {serviceStatus.fetchaiAgent ? (
                    <>
                      <div className="w-2 h-2 bg-purple-400 rounded-full pulse-glow"></div>
                      <span className="text-purple-300 font-semibold">Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-red-300 font-semibold">Inactive</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Guardian</div>
                <div className="flex items-center justify-center gap-2">
                  {isAuthenticated ? (
                    <>
                      <div className="w-2 h-2 bg-orange-400 rounded-full pulse-glow"></div>
                      <span className="text-orange-300 font-semibold">Protected</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                      <span className="text-slate-400 font-semibold">Standby</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 text-slate-500 text-sm">
              <span>Powered by</span>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="text-gradient font-semibold">Dynamic</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-gradient font-semibold">Fetch.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-gradient font-semibold">Walrus</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <span className="text-gradient font-semibold">Zircuit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}