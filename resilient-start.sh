#!/bin/bash
# CryptoQuant Terminal - Resilient Production Start
# Auto-restarts on crash with cooldown
cd /home/z/my-project

MAX_CRASHES=5
CRASH_COUNT=0
COOLDOWN=5

while [ $CRASH_COUNT -lt $MAX_CRASHES ]; do
  echo "[$(date -Iseconds)] Starting server (attempt $((CRASH_COUNT+1))/$MAX_CRASHES)..."
  NODE_ENV=production PORT=3000 node .next/standalone/server.js
  
  EXIT_CODE=$?
  echo "[$(date -Iseconds)] Server exited with code $EXIT_CODE"
  
  CRASH_COUNT=$((CRASH_COUNT+1))
  
  if [ $CRASH_COUNT -lt $MAX_CRASHES ]; then
    echo "[$(date -Iseconds)] Restarting in ${COOLDOWN}s..."
    sleep $COOLDOWN
    COOLDOWN=$((COOLDOWN * 2))  # Exponential backoff
    COOLDOWN=$((COOLDOWN > 60 ? 60 : COOLDOWN))  # Cap at 60s
  fi
done

echo "[$(date -Iseconds)] Max crashes reached. Stopping."
