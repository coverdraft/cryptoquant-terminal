#!/bin/bash
# CryptoQuant Terminal - Server Start Script
# Kills any existing server and starts a fresh one

pkill -f "next start" 2>/dev/null
sleep 1

cd /home/z/my-project
exec npx next start -p 3000
