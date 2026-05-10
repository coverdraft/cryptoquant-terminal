#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..."
  node --max-old-space-size=4096 .next/standalone/server.js 2>&1 | tee -a server.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
