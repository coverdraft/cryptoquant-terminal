#!/bin/bash
trap 'echo "RECEIVED SIGHUP at $(date)" >> /home/z/my-project/signal.log' SIGHUP
trap 'echo "RECEIVED SIGINT at $(date)" >> /home/z/my-project/signal.log' SIGINT
trap 'echo "RECEIVED SIGTERM at $(date)" >> /home/z/my-project/signal.log' SIGTERM
trap 'echo "RECEIVED SIGUSR1 at $(date)" >> /home/z/my-project/signal.log' SIGUSR1
trap 'echo "RECEIVED SIGUSR2 at $(date)" >> /home/z/my-project/signal.log' SIGUSR2

cd /home/z/my-project
echo "Starting server at $(date)" >> /home/z/my-project/signal.log
node --max-old-space-size=4096 .next/standalone/server.js 2>&1
EXIT_CODE=$?
echo "Server exited with code $EXIT_CODE at $(date)" >> /home/z/my-project/signal.log
