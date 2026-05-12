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
