import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DynamicProvider } from './providers/DynamicProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sentinel - Agentic Wallet Security',
  description: 'AI-powered autonomous wallet protection for DeFi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DynamicProvider>
          {children}
        </DynamicProvider>
      </body>
    </html>
  )
}