#!/bin/bash
# CryptoQuant Terminal - Auto-restart API Server
# Automatically restarts the API server if it crashes

PORT=3001
LOG="/home/z/my-project/download/api-server.log"
SCRIPT="/home/z/my-project/scripts/api-server.cjs"

mkdir -p /home/z/my-project/download

echo "[$(date)] Starting CryptoQuant API Server with auto-restart on :${PORT}" | tee -a "$LOG"

while true; do
  echo "[$(date)] Starting server..." | tee -a "$LOG"
  node "$SCRIPT" 2>&1 | tee -a "$LOG"
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." | tee -a "$LOG"
  sleep 3
done
