// Custom server with built-in resilience
const { createServer } = require('http');
const next = require('next');

const dev = false;
const app = next({ dev, dir: '/home/z/my-project' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });
  
  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
  
  // Keep process alive
  setInterval(() => {
    const mem = process.memoryUsage();
    // Log memory every 30s for debugging
  }, 30000);
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// Prevent crashes from unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
