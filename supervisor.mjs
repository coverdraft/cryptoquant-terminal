import { spawn } from 'child_process';
import http from 'http';

const PORT = 3000;
const MAX_RESTARTS = 50;
let restarts = 0;
let child = null;

function startServer() {
  console.log(`[Supervisor] Starting server (attempt ${restarts + 1}/${MAX_RESTARTS})`);
  
  child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
    stdio: 'inherit',
  });
  
  child.on('exit', (code) => {
    console.log(`[Supervisor] Server exited with code ${code}`);
    restarts++;
    if (restarts < MAX_RESTARTS) {
      setTimeout(startServer, 3000);
    } else {
      console.log('[Supervisor] Max restarts reached');
    }
  });
  
  child.on('error', (err) => {
    console.error(`[Supervisor] Server error: ${err.message}`);
  });
}

function healthCheck() {
  const req = http.get(`http://localhost:${PORT}/`, (res) => {
    if (res.statusCode === 200) {
      // Server healthy
    } else {
      console.log(`[Supervisor] Health check failed: ${res.statusCode}`);
    }
    res.resume();
  });
  req.on('error', () => {
    console.log('[Supervisor] Server not responding, will restart on next check');
    if (child) {
      child.kill('SIGTERM');
    }
  });
  req.setTimeout(5000, () => {
    req.destroy();
  });
}

startServer();

// Health check every 30 seconds
setInterval(healthCheck, 30000);
