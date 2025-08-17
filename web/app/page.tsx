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

function SentinelPage() {
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

  // Fix hydration by ensuring component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get wallet address from Dynamic
  const walletAddress = primaryWallet?.address || ''
  
  // Show loading spinner only initially - temporarily disabled for debugging
  // if (!mounted) {
  //   return (
  //     <div className="min-h-screen bg-slate-900 flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  //     </div>
  //   )
  // }

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

  // Fetch real stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      setSystemStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchStats()
    
    // Update stats every 10 seconds
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

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

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              background: `var(${['--primary-purple', '--soft-pink', '--soft-blue', '--soft-orange'][i % 4]})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="morphing-border p-6">
                <div className="glass-card p-4 pulse-glow">
                  <Shield className="w-12 h-12 text-purple-400" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center pulse-glow">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-7xl font-display text-gradient mb-2">
                Sentinel
              </h1>
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Security</span>
              </div>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <p className="text-2xl text-balance font-light mb-4 text-slate-300/90">
              Agentic Wallet Security for <span className="text-gradient font-semibold">DeFi</span>
            </p>
            <p className="text-lg text-slate-400 text-balance">
              Autonomous protection powered by AI agents, real-time monitoring, and instant recovery mechanisms
            </p>
          </div>
          
          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 mt-16">
            <div className="glass-card card-hover-lift group">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-slate-300 font-medium">Blocks Monitored</span>
              </div>
              <div className="text-4xl font-display text-white mb-2">{systemStats.blocksMonitored.toLocaleString()}</div>
              <div className="shimmer h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            </div>
            
            <div className="glass-card card-hover-lift group">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-slate-300 font-medium">Threats Blocked</span>
              </div>
              <div className="text-4xl font-display text-white mb-2">{systemStats.threatsBlocked}</div>
              <div className="shimmer h-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500"></div>
            </div>
            
            <div className="glass-card card-hover-lift group">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-slate-300 font-medium">Wallets Protected</span>
              </div>
              <div className="text-4xl font-display text-white mb-2">{systemStats.walletsProtected.toLocaleString()}</div>
              <div className="shimmer h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
            </div>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="glass-card mb-16 card-hover-lift">
          <div className="flex items-center gap-6 mb-10">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl">
                <Wallet className="w-8 h-8 text-purple-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-display text-white mb-2">Wallet Connection</h2>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 text-sm font-medium rounded-full border border-emerald-500/30">
                  <Star className="w-3 h-3 inline mr-1" />
                  Dynamic SDK
                </span>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 text-sm font-medium rounded-full border border-blue-500/30">
                  <Router className="w-3 h-3 inline mr-1" />
                  Multi-Chain
                </span>
              </div>
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
            <div className="space-y-8">
              <div className="glass border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-emerald-400 rounded-full pulse-glow"></div>
                    <span className="text-emerald-200 font-semibold">Wallet Connected</span>
                  </div>
                  <span className="text-slate-300 font-mono text-sm glass px-4 py-2">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass">
                  <div className="mb-4">
                    <span className="text-slate-400 text-sm font-medium">Connected Address</span>
                  </div>
                  <div className="text-slate-200 font-mono text-sm break-all p-4 glass rounded-xl">
                    {walletAddress}
                  </div>
                </div>
                
                <button
                  onClick={handlePollToggle}
                  disabled={!walletAddress}
                  className={`${isPolling ? 'btn-secondary bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30' : 'btn-primary'} h-fit w-full`}
                >
                  {isPolling ? (
                    <>
                      <div className="w-3 h-3 bg-current rounded-full pulse-glow"></div>
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
                <div className="glass border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full pulse-glow"></div>
                    <span className="text-emerald-200 font-medium">Real-time monitoring active • Polling every 5 seconds</span>
                    <div className="ml-auto flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{animationDelay: `${i * 0.2}s`}} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emergency Recovery */}
        <div className="glass-card mb-16 card-hover-lift">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl">
                  <Lock className="w-8 h-8 text-orange-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center pulse-glow">
                  <Zap className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-display text-white mb-2">Emergency Recovery</h2>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 text-sm font-medium rounded-full border border-orange-500/30">
                    <Cpu className="w-3 h-3 inline mr-1" />
                    GuardianController
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-sm font-medium rounded-full border border-blue-500/30">
                    <Bot className="w-3 h-3 inline mr-1" />
                    Automated
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleRecover}
              disabled={isRecovering || !walletAddress}
              className={`${isRecovering ? 'btn-secondary' : 'btn-primary bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'} min-w-[200px]`}
            >
              {isRecovering ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Executing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Rotate Signer
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-slate-300 text-lg leading-relaxed mb-4">
                Instantly rotate wallet signer via GuardianController when threats are detected
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">Multi-signature guardian protection</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">Instant signer rotation capability</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">Smart contract verification</span>
                </div>
              </div>
            </div>
            
            <div className="glass rounded-2xl p-6">
              <div className="mb-4">
                <span className="text-slate-400 text-sm font-medium">Recovery Flow</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center text-purple-400 text-sm font-semibold">1</div>
                  <span className="text-slate-300 text-sm">Threat Detection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center text-blue-400 text-sm font-semibold">2</div>
                  <span className="text-slate-300 text-sm">Identity Verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-semibold">3</div>
                  <span className="text-slate-300 text-sm">Signer Rotation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Alerts */}
        <div className="glass-card overflow-hidden mb-16">
          <div className="border-b border-white/10 pb-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="p-4 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-400 to-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{alerts.length}</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-display text-white mb-2">Security Alerts</h2>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {alerts.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-8">
                <div className="p-8 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full pulse-glow">
                  <Shield className="w-16 h-16 text-emerald-400" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center pulse-glow">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-display text-white mb-4">All Clear</h3>
              <p className="text-slate-400 text-lg max-w-md mx-auto text-balance">No security threats detected. Your wallet is protected by our AI-powered monitoring system.</p>
              <div className="mt-8 flex justify-center gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-emerald-400 rounded-full pulse-glow" style={{animationDelay: `${i * 0.3}s`}} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {alerts.map((alert, index) => {
                const severityConfig = getSeverityConfig(alert.severity)
                const IconComponent = severityConfig.icon
                return (
                  <div 
                    key={alert.id} 
                    className={`glass ${severityConfig.classes} card-hover-lift`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-6">
                      <div className="relative">
                        <div className={`p-4 rounded-2xl ${
                          alert.severity === 'high' ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20' :
                          alert.severity === 'medium' ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' :
                          'bg-gradient-to-br from-emerald-500/20 to-green-500/20'
                        }`}>
                          <IconComponent className={`w-6 h-6 ${
                            alert.severity === 'high' ? 'text-red-400' :
                            alert.severity === 'medium' ? 'text-yellow-400' :
                            'text-emerald-400'
                          }`} />
                        </div>
                        {alert.severity === 'high' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full pulse-glow"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-sm font-mono text-slate-400 glass px-3 py-1 rounded-lg">#{alert.id}</span>
                          <span className={`px-4 py-2 text-xs font-semibold rounded-full ${
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
                        
                        <h4 className="text-xl font-display text-white mb-4">{alert.reason}</h4>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Wallet:</span>
                            <span className="font-mono text-slate-300 text-sm glass px-3 py-1 rounded-lg">
                              {alert.wallet.slice(0, 6)}...{alert.wallet.slice(-4)}
                            </span>
                          </div>
                          
                          <a
                            href={`http://localhost:8000/cases/${alert.id}.json`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm flex items-center gap-2 hover:text-purple-300"
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

        {/* Demo Attack Section */}
        {isAuthenticated && (
          <div className="glass-card mb-16 card-hover-lift">
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">API Status</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full pulse-glow"></div>
                  <span className="text-emerald-300 font-semibold">Online</span>
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Router className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Zircuit RPC</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full pulse-glow"></div>
                  <span className="text-blue-300 font-semibold">Connected</span>
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Fetch.ai Agent</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full pulse-glow"></div>
                  <span className="text-purple-300 font-semibold">Active</span>
                </div>
              </div>
              
              <div className="glass rounded-2xl p-6 card-hover-lift">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-sm text-slate-400 mb-1">Guardian</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full pulse-glow"></div>
                  <span className="text-orange-300 font-semibold">Protected</span>
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

export default SentinelPage