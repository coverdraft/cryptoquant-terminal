const { spawn, fork } = require('child_process');
const http = require('http');

const PORT = 3000;
const MAX_MEMORY_MB = 400;
const CHECK_INTERVAL = 5000;
const RESTART_DELAY = 2000;

let child = null;
let restartCount = 0;

function startServer() {
  restartCount++;
  console.log(`[${new Date().toISOString()}] Starting server (attempt #${restartCount})...`);
  
  child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=256',
      PORT: String(PORT),
      HOSTNAME: '0.0.0.0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  
  child.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.log(`[SERVER] ${line}`);
  });
  
  child.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line) console.error(`[SERVER ERR] ${line}`);
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited code=${code} signal=${signal}`);
    child = null;
    setTimeout(startServer, RESTART_DELAY);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err.message);
    child = null;
    setTimeout(startServer, RESTART_DELAY);
  });
}

// Health check - if server doesn't respond, kill and restart
setInterval(() => {
  if (!child || child.exitCode !== null) return;
  
  const req = http.get(`http://localhost:${PORT}/api/market/summary`, { timeout: 8000 }, (res) => {
    if (res.statusCode === 200) {
      // Server is healthy
    } else {
      console.log(`[${new Date().toISOString()}] Unhealthy response: ${res.statusCode}`);
    }
  });
  
  req.on('error', (err) => {
    console.log(`[${new Date().toISOString()}] Health check failed: ${err.message}`);
  });
  
  req.on('timeout', () => {
    console.log(`[${new Date().toISOString()}] Health check timeout - killing server`);
    req.destroy();
    if (child) child.kill('SIGKILL');
  });
}, 30000); // Check every 30s

startServer();
