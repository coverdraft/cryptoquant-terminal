import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Data sources that require an API key to be considered "configured"
const KEYED_SOURCES: Record<string, string> = {
  moralis: 'MORALIS_API_KEY',
  helius: 'HELIUS_API_KEY',
  etherscan: 'ETHERSCAN_API_KEY',
  sqd: 'SQD_API_KEY',
  dune: 'DUNE_API_KEY',
  footprint: 'FOOTPRINT_API_KEY',
}

// Data sources that are always available (no key required)
const ALWAYS_AVAILABLE = ['coingecko', 'dexscreener', 'defillama', 'dexpaprika'] as const

export async function GET() {
  const timestamp = new Date().toISOString()
  const uptimeSeconds = process.uptime()

  // --- Database check ---
  let dbConnected = false
  let dbLatencyMs = 0

  try {
    const start = performance.now()
    await db.$queryRaw`SELECT 1`
    dbLatencyMs = Math.round(performance.now() - start)
    dbConnected = true
  } catch {
    dbConnected = false
    dbLatencyMs = 0
  }

  // --- Source configuration check ---
  const sources: Record<string, { configured: boolean }> = {}

  // Keyed sources: configured if the env var is set and non-empty
  for (const [name, envVar] of Object.entries(KEYED_SOURCES)) {
    sources[name] = {
      configured: !!process.env[envVar] && process.env[envVar]!.trim().length > 0,
    }
  }

  // Always-available sources
  for (const name of ALWAYS_AVAILABLE) {
    sources[name] = { configured: true }
  }

  // Overall status: "ok" if database is connected, "degraded" otherwise
  const status = dbConnected ? 'ok' : 'degraded'

  return NextResponse.json({
    status,
    timestamp,
    version: '1.0.0',
    database: {
      connected: dbConnected,
      latency_ms: dbLatencyMs,
    },
    sources,
    uptime_seconds: Math.round(uptimeSeconds),
  })
}
