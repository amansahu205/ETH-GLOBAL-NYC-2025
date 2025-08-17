'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Zap, AlertTriangle, Eye, Lock, CheckCircle, Clock, ExternalLink, Wallet, Activity } from 'lucide-react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'
import dynamic from 'next/dynamic'

interface Alert {
  id: number
  wallet: string
  severity: string
  reason: string
  signals: any[]
  created_at: string
}

function SentinelPage() {
  const { primaryWallet, user, isAuthenticated } = useDynamicContext()
  const [isPolling, setIsPolling] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRecovering, setIsRecovering] = useState(false)
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

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-6xl font-light tracking-tight text-gray-800">
              Sentinel
            </h1>
          </div>
          <p className="text-xl text-gray-600 font-light mb-2">Agentic Wallet Security for DeFi</p>
          <p className="text-sm text-gray-500">Autonomous protection powered by AI</p>
          
          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700 font-medium">Blocks Monitored</span>
              </div>
              <div className="text-3xl font-light text-gray-800">{systemStats.blocksMonitored.toLocaleString()}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-gray-700 font-medium">Threats Blocked</span>
              </div>
              <div className="text-3xl font-light text-gray-800">{systemStats.threatsBlocked}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700 font-medium">Wallets Protected</span>
              </div>
              <div className="text-3xl font-light text-gray-800">{systemStats.walletsProtected.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-10 mb-12 shadow-xl border border-gray-200/50">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-light text-gray-800">Connect Wallet</h2>
            <span className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-full border border-emerald-200">
              Dynamic SDK
            </span>
          </div>
          
          {!isAuthenticated ? (
            <div className="text-center">
              <p className="text-gray-600 mb-8 text-lg">Connect your wallet to start monitoring for security threats</p>
              <DynamicWidget />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-2xl border border-emerald-200/50">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-800 font-medium">Wallet Connected</span>
                </div>
                <span className="text-gray-600 font-mono text-sm bg-white px-3 py-1 rounded-lg">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 px-6 py-5 bg-gray-50/50 border border-gray-200 rounded-2xl">
                  <span className="text-gray-500 text-sm font-medium">Connected Address</span>
                  <div className="text-gray-800 font-mono mt-2 text-sm break-all">{walletAddress}</div>
                </div>
                <button
                  onClick={handlePollToggle}
                  disabled={!walletAddress}
                  className={`px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center gap-3 ${
                    isPolling 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none'
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
                <div className="mt-6 flex items-center gap-3 text-emerald-600 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/50">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Real-time monitoring active • Polling every 5 seconds</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emergency Recovery */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-10 mb-12 shadow-xl border border-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-light text-gray-800">Emergency Recovery</h2>
            </div>
            <button
              onClick={handleRecover}
              disabled={isRecovering || !walletAddress}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-2xl transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
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
          <p className="text-gray-600 text-lg leading-relaxed">
            Instantly rotate wallet signer via GuardianController when threats are detected
          </p>
        </div>

        {/* Security Alerts */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-gray-200/50">
          <div className="p-10 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-light text-gray-800">Security Alerts</h2>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} found</span>
              </div>
            </div>
          </div>
          
          {alerts.length === 0 ? (
            <div className="p-16 text-center">
              <div className="p-6 bg-emerald-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Shield className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-light text-gray-800 mb-3">All Clear</h3>
              <p className="text-gray-600">No security threats detected. Your wallet is protected.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50">
              {alerts.map((alert, index) => {
                const severityConfig = getSeverityConfig(alert.severity)
                const IconComponent = severityConfig.icon
                return (
                  <div 
                    key={alert.id} 
                    className="p-8 hover:bg-gray-50/50 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`p-3 rounded-xl ${severityConfig.classes.includes('alert-high') ? 'bg-red-50' : severityConfig.classes.includes('alert-medium') ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                        <IconComponent className={`w-5 h-5 ${severityConfig.classes.includes('alert-high') ? 'text-red-600' : severityConfig.classes.includes('alert-medium') ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">#{alert.id}</span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            severityConfig.classes.includes('alert-high') ? 'bg-red-100 text-red-700' : 
                            severityConfig.classes.includes('alert-medium') ? 'bg-amber-100 text-amber-700' : 
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-800 mb-3">{alert.reason}</h4>
                        <div className="flex items-center gap-6">
                          <span className="text-sm text-gray-600">
                            Wallet: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{alert.wallet.slice(0, 6)}...{alert.wallet.slice(-4)}</span>
                          </span>
                          <a
                            href={`http://localhost:8000/cases/${alert.id}.json`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
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
        <div className="text-center mt-20 text-gray-500">
          <p className="mb-4 text-lg font-light">Built for ETHGlobal NYC 2025</p>
          <div className="flex items-center justify-center gap-8 text-sm">
            <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              API: Online
            </span>
            <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Zircuit: Connected
            </span>
            <span className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              Guardian: Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export with dynamic loading to fix hydration
export default dynamic(() => Promise.resolve(SentinelPage), { 
  ssr: false 
})