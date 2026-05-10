const { spawn } = require('child_process');

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting PRODUCTION server...`);
  const child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=256',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
    },
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited code=${code} signal=${signal}. Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    setTimeout(startServer, 2000);
  });
}

startServer();
