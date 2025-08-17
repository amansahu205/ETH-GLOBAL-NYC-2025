/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    // Handle missing dependencies for Dynamic SDK
    config.externals = config.externals || []
    
    if (!isServer) {
      config.externals.push({
        '@react-native-async-storage/async-storage': 'window',
        'pino-pretty': 'window',
      })
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      buffer: false,
    }
    
    // Ignore problematic modules using webpack parameter
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@react-native-async-storage\/async-storage|pino-pretty)$/,
      })
    )
    
    return config
  },
}

module.exports = nextConfig