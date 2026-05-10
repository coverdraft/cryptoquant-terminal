/**
 * Server Warmup Script
 * 
 * Pre-compiles all API routes on server startup so that
 * the first real user request doesn't cause a compilation spike.
 * Run this after the server starts.
 */

const WARMUP_ENDPOINTS = [
  '/api/health',
  '/api/tokens?limit=1',
  '/api/market/tokens?limit=1',
  '/api/market/summary',
  '/api/signals?limit=1',
  '/api/brain/status',
  '/api/dashboard/stats',
  '/api/data-monitor/summary',
];

async function warmup(baseUrl: string = 'http://localhost:3000') {
  console.log(`[Warmup] Warming up ${WARMUP_ENDPOINTS.length} endpoints...`);
  
  for (const endpoint of WARMUP_ENDPOINTS) {
    try {
      const start = Date.now();
      const res = await fetch(`${baseUrl}${endpoint}`);
      const duration = Date.now() - start;
      console.log(`[Warmup] ${endpoint}: ${res.status} (${duration}ms)`);
    } catch (err: any) {
      console.warn(`[Warmup] ${endpoint}: FAILED - ${err.message}`);
    }
    // Wait 2s between warmup calls to avoid memory spike
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('[Warmup] Complete! All routes pre-compiled.');
}

// Run if called directly
const url = process.argv[2] || 'http://localhost:3000';
warmup(url).catch(console.error);
