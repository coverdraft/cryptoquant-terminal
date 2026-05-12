#!/bin/bash
# ============================================================
# CryptoQuant Terminal - Critical Fixes Script
# Ejecutar desde la carpeta del proyecto en tu Mac:
#   cd ~/cryptoquant-terminal && bash fix-cryptoquant.sh
# ============================================================

set -e
echo "🔧 Aplicando correcciones críticas a CryptoQuant Terminal..."
echo ""

# ============================================================
# 1. COMPLETAR .env.example
# ============================================================
echo "📝 1/6 - Completando .env.example..."
cat > .env.example << 'EOF'
# Database - SQLite (relative to prisma/schema.prisma)
DATABASE_URL="file:./dev.db"

# Blockchain APIs (at least one required for full functionality)
HELIUS_API_KEY=""
MORALIS_API_KEY=""
ETHERSCAN_API_KEY=""

# Data Sources (optional but recommended)
SQD_API_KEY=""
DUNE_API_KEY=""
FOOTPRINT_API_KEY=""
DATA_SOURCE="hybrid"  # hybrid | simulation | live

# WebSocket Bridge
WS_BRIDGE_URL="http://localhost:3010"
WS_CLIENT_PORT=3003

# NextAuth (for future authentication)
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Brain Scheduler
BRAIN_SCAN_LIMIT=250
BRAIN_CAPITAL_USD=10
BRAIN_CHAIN="SOL"

# Server
PORT=3000
NODE_ENV="development"
EOF
echo "  ✅ .env.example completado con todas las variables"

# ============================================================
# 2. ARREGLAR next.config.ts
# ============================================================
echo "📝 2/6 - Arreglando next.config.ts..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
};

export default nextConfig;
EOF
echo "  ✅ ignoreBuildErrors: false, reactStrictMode: true"

# ============================================================
# 3. ARREGLAR ESLint - reglas críticas como warnings
# ============================================================
echo "📝 3/6 - Arreglando ESLint config..."
if [ -f eslint.config.mjs ]; then
  sed -i.bak 's/"@typescript-eslint\/no-explicit-any": "off"/"@typescript-eslint\/no-explicit-any": "warn"/g' eslint.config.mjs
  sed -i.bak 's/"@typescript-eslint\/no-unused-vars": "off"/"@typescript-eslint\/no-unused-vars": "warn"/g' eslint.config.mjs
  rm -f eslint.config.mjs.bak
  echo "  ✅ no-explicit-any y no-unused-vars cambiados a warn"
else
  echo "  ⚠️  No se encontró eslint.config.mjs"
fi

# ============================================================
# 4. ARREGLAR PrismaClient duplicado en market/summary
# ============================================================
echo "📝 4/6 - Unificando PrismaClient en market/summary..."
SUMMARY_FILE="src/app/api/market/summary/route.ts"
if [ -f "$SUMMARY_FILE" ]; then
  # Replace PrismaClient import with db import
  sed -i.bak "s/import { PrismaClient } from '@prisma\/client'/import { db } from '@\/lib\/db'/g" "$SUMMARY_FILE"
  # Remove the standalone PrismaClient instantiation
  sed -i.bak '/^const prisma = new PrismaClient/d' "$SUMMARY_FILE"
  # Replace all prisma. with db.
  sed -i.bak 's/prisma\./db./g' "$SUMMARY_FILE"
  rm -f "${SUMMARY_FILE}.bak"
  echo "  ✅ PrismaClient unificado usando singleton db"
else
  echo "  ⚠️  No se encontró $SUMMARY_FILE"
fi

# ============================================================
# 5. CREAR validaciones Zod
# ============================================================
echo "📝 5/6 - Creando validaciones Zod..."
mkdir -p src/lib
cat > src/lib/validations.ts << 'EOF'
import { z } from 'zod';

// Common schemas
export const addressSchema = z.string().min(32).max(64).regex(/^[A-Za-z0-9]+$/, "Invalid address format");

export const chainSchema = z.enum(['SOL', 'ETH', 'BASE', 'ARB', 'OP', 'MATIC', 'BSC']);

export const timeframeSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '1d']);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const tokenQuerySchema = z.object({
  chain: chainSchema.optional().default('SOL'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['volume24h', 'priceChange24h', 'marketCap', 'liquidity']).optional().default('volume24h'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

export const ohlcvQuerySchema = z.object({
  address: z.string().min(1),
  timeframe: timeframeSchema.optional().default('1h'),
  days: z.coerce.number().int().positive().max(365).default(7),
  chain: chainSchema.optional().default('SOL'),
});

export const brainActionSchema = z.object({
  action: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export const backtestCreateSchema = z.object({
  systemId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  initialCapital: z.number().positive().default(1000),
  mode: z.enum(['HISTORICAL', 'PAPER', 'FORWARD']).optional().default('HISTORICAL'),
});

export const tradingSystemCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    'ALPHA_HUNTER', 'SMART_MONEY', 'TECHNICAL',
    'DEFENSIVE', 'BOT_AWARE', 'DEEP_ANALYSIS',
    'MICRO_STRUCTURE', 'ADAPTIVE'
  ]),
  primaryTimeframe: timeframeSchema.optional().default('1h'),
  maxPositionPct: z.number().min(1).max(100).optional().default(5),
  stopLossPct: z.number().min(1).max(50).optional().default(15),
  takeProfitPct: z.number().min(1).max(200).optional().default(40),
});

export const signalQuerySchema = z.object({
  tokenId: z.string().optional(),
  type: z.string().optional(),
  direction: z.enum(['LONG', 'SHORT', 'NEUTRAL']).optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Helper to validate and return typed data or error response
export function validateOrError<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: errors };
}
EOF
echo "  ✅ src/lib/validations.ts creado con schemas Zod"

# ============================================================
# 6. CREAR middleware de seguridad
# ============================================================
echo "📝 6/6 - Creando middleware de seguridad..."
cat > src/middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in-memory, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP
const RATE_LIMIT_MAX_WRITE = 10; // 10 write requests per minute per IP

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string, isWrite: boolean): boolean {
  const key = `${ip}:${isWrite ? 'write' : 'read'}`;
  const maxRequests = isWrite ? RATE_LIMIT_MAX_WRITE : RATE_LIMIT_MAX;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60_000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Health check - always allow
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  // Rate limiting
  if (!checkRateLimit(ip, isWrite)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: 60 },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': isWrite ? String(RATE_LIMIT_MAX_WRITE) : String(RATE_LIMIT_MAX),
        }
      }
    );
  }

  // Security headers
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Add rate limit info headers
  response.headers.set('X-RateLimit-Limit', isWrite ? String(RATE_LIMIT_MAX_WRITE) : String(RATE_LIMIT_MAX));

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
EOF
echo "  ✅ src/middleware.ts creado con rate limiting + security headers"

# ============================================================
# LIMPIAR archivos basura
# ============================================================
echo ""
echo "🧹 Limpiando archivos basura..."
rm -f src/components/dashboard/token-flow.tsxo
rm -f src/components/dashboard/token-flow.tsxo.save
rm -f .server-pid
rm -f monitor-output.json
echo "  ✅ Archivos .tsxo, .save, .pid, monitor-output borrados"

# ============================================================
# MEJORAR .gitignore
# ============================================================
echo ""
echo "📝 Mejorando .gitignore..."
# Add entries if not already present
if ! grep -q "\.pid" .gitignore 2>/dev/null; then
  cat >> .gitignore << 'EOF'

# PID files
*.pid

# Monitor output
monitor-output.json

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Backup files
*.save
*.bak
*.tsxo
EOF
  echo "  ✅ .gitignore mejorado"
else
  echo "  ⏭️  .gitignore ya tiene las entradas"
fi

# ============================================================
# COMMIT Y PUSH
# ============================================================
echo ""
echo "📦 Subiendo cambios a GitHub..."
git add -A
git commit -m "fix: correcciones críticas - env vars, TS strict, ESLint, PrismaClient singleton, Zod validation, security middleware, cleanup" 2>/dev/null || echo "  ⚠️  No hay cambios nuevos para commitear"
git push origin main

echo ""
echo "🎉 ¡TODO LISTO! Correcciones aplicadas y subidas a GitHub."
echo ""
echo "Resumen de cambios:"
echo "  ✅ .env.example completo con todas las variables"
echo "  ✅ next.config.ts - ignoreBuildErrors: false, strictMode: true"  
echo "  ✅ ESLint - no-explicit-any y no-unused-vars como warnings"
echo "  ✅ PrismaClient unificado (singleton db)"
echo "  ✅ Zod validation schemas para API routes críticas"
echo "  ✅ Security middleware con rate limiting + headers"
echo "  ✅ Archivos basura eliminados"
echo "  ✅ .gitignore mejorado"
