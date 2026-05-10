#!/bin/bash
# CryptoQuant Terminal - Auto-respawn server
LOG="/home/z/my-project/server.log"
while true; do
  echo "[$(date +%H:%M:%S)] Starting..." >> "$LOG"
  cd /home/z/my-project && node --max-old-space-size=256 .next/standalone/server.js >> "$LOG" 2>&1
  echo "[$(date +%H:%M:%S)] Exited, restarting in 1s..." >> "$LOG"
  sleep 1
done
