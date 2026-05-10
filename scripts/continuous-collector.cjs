#!/usr/bin/env node
/**
 * CryptoQuant Terminal - Continuous Data Collection Loop
 * Runs the data collector every 5 minutes with auto-restart
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CWD = '/home/z/my-project';
let iteration = 0;

function runCollection() {
  iteration++;
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] ITERATION #${iteration}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    execSync('node scripts/data-collector.mjs --sync --dna --lifecycle --patterns --validate', {
      cwd: CWD,
      timeout: 240000, // 4 min max per iteration
      stdio: 'inherit',
    });
    console.log(`[${new Date().toISOString()}] Iteration #${iteration} completed successfully`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Iteration #${iteration} failed:`, err.message?.substring(0, 200));
  }
}

// Initial run
runCollection();

// Set up recurring runs
const timer = setInterval(runCollection, INTERVAL_MS);

console.log(`\n🔄 Continuous loop active - running every ${INTERVAL_MS/1000/60} minutes`);
console.log(`   Next run at: ${new Date(Date.now() + INTERVAL_MS).toISOString()}`);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Loop stopped by user');
  clearInterval(timer);
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught error:', err.message);
  // Don't exit - keep the loop running
});
