/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@swc/core-linux-arm64-gnu',
        'node_modules/@swc/core-linux-arm64-musl',
        'node_modules/@swc/core-win32-x64-msvc',
        'node_modules/@swc/core-win32-ia32-msvc',
        'node_modules/@swc/core-win32-arm64-msvc',
        'node_modules/@swc/core-darwin-x64',
        'node_modules/@swc/core-darwin-arm64',
        'node_modules/@swc/core-freebsd-x64',
        'node_modules/@swc/core-linux-arm-gnueabihf',
        'node_modules/@swc/core-android-arm64',
        'node_modules/@esbuild/**',
        'node_modules/webpack/**',
        'node_modules/@metamask/**',
        'node_modules/@walletconnect/**',
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    
    // Ignore problematic modules
    config.externals = config.externals || []
    config.externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
      'pino-pretty': 'commonjs pino-pretty',
    })
    
    return config
  },
}

module.exports = nextConfig