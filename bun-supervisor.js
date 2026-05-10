const { spawn } = require('child_process');
const http = require('http');

let child = null;
let restarts = 0;
const PORT = 3000;

function start() {
  restarts++;
  console.log(`[${new Date().toISOString()}] Starting bun server (#${restarts})...`);
  
  child = spawn('bun', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, PORT: String(PORT), HOSTNAME: '0.0.0.0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  
  child.on('exit', (code, sig) => {
    console.log(`[${new Date().toISOString()}] Server exited (${code}/${sig}). Restarting in 2s...`);
    child = null;
    setTimeout(start, 2000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    child = null;
    setTimeout(start, 2000);
  });
}

process.on('SIGTERM', () => console.log('SIGTERM - ignoring'));
process.on('SIGINT', () => console.log('SIGINT - ignoring'));

start();
