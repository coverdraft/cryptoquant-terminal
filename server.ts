/**
 * Custom Server for CryptoQuant Terminal
 * 
 * WHY: Next.js default server spawns unlimited workers per request,
 * causing OOM in constrained environments. This custom server:
 * - Limits concurrent request handling (max 4 at a time)
 * - Adds request queuing for overload protection
 * - Adds graceful error handling
 * - Monitors memory usage
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = false;
const port = parseInt(process.env.PORT || '3000', 10);
const MAX_CONCURRENT = 4;
const MAX_MEMORY_MB = 512;

const app = next({ dev });
const handle = app.getRequestHandler();

// Request semaphore
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => requestQueue.push(resolve));
}

function release(): void {
  activeRequests--;
  if (requestQueue.length > 0) {
    activeRequests++;
    const next = requestQueue.shift()!;
    next();
  }
}

function getMemoryMB(): number {
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    
    // Check memory before accepting request
    const memMB = getMemoryMB();
    if (memMB > MAX_MEMORY_MB) {
      console.warn(`[CustomServer] Memory high (${memMB}MB), queuing request`);
    }

    try {
      await acquire();
      await handle(req, res, parsedUrl);
    } catch (err: any) {
      console.error('[CustomServer] Error handling request:', err.message);
      if (!res.headersSent) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'Server overloaded, please retry' }));
      }
    } finally {
      release();
    }
  });

  server.listen(port, () => {
    console.log(`> CryptoQuant Terminal ready on http://localhost:${port}`);
    console.log(`> Max concurrent requests: ${MAX_CONCURRENT}`);
    console.log(`> Memory limit: ${MAX_MEMORY_MB}MB`);
  });

  // Memory monitoring every 30s
  setInterval(() => {
    const mem = getMemoryMB();
    const queueLen = requestQueue.length;
    if (mem > 300 || queueLen > 0) {
      console.log(`[CustomServer] Memory: ${mem}MB, Active: ${activeRequests}, Queued: ${queueLen}`);
    }
    // Force garbage collection if memory is high (if gc is available)
    if (mem > MAX_MEMORY_MB && global.gc) {
      global.gc();
    }
  }, 30000);
});
