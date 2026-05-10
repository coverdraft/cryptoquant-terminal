#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_ENV=production PORT=3000 node .next/standalone/server.js
  echo "[$(date)] Server died, restarting in 3s..."
  sleep 3
done
