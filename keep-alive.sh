#!/bin/bash
cd /home/z/my-project
LOGFILE="/home/z/my-project/server.log"
echo "[$(date)] keep-alive started" >> "$LOGFILE"

while true; do
  echo "[$(date)] Starting Next.js server..." >> "$LOGFILE"
  node --max-old-space-size=512 .next/standalone/server.js >> "$LOGFILE" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> "$LOGFILE"
  
  # Wait before restarting to avoid tight loop
  sleep 3
done
