const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js server...`);
  
  const child = spawn('node', [
    '--max-old-space-size=512',
    path.join(__dirname, '.next/standalone/server.js')
  ], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' },
    stdio: 'inherit'
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code=${code} signal=${signal}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 2000);
  });
}

startServer();
