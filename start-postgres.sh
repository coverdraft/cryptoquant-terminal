#!/bin/bash
# Start PostgreSQL for CryptoQuant Terminal
# PostgreSQL 16.4 compiled from source in user space

export PATH=$HOME/pgsql/bin:$PATH
export PGDATA=$HOME/pgdata

# Check if PostgreSQL is already running
if pg_ctl -D $PGDATA status > /dev/null 2>&1; then
  echo "[PG] PostgreSQL already running"
  exit 0
fi

# Start PostgreSQL
echo "[PG] Starting PostgreSQL..."
pg_ctl -D $PGDATA -l $PGDATA/server.log start

# Wait for it to be ready
for i in {1..10}; do
  if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "[PG] PostgreSQL ready on localhost:5432"
    exit 0
  fi
  sleep 1
done

echo "[PG] ERROR: PostgreSQL failed to start. Check $PGDATA/server.log"
exit 1
