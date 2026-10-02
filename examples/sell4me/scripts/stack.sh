#!/usr/bin/env bash
# Start (or stop) a local Pawabase stack for Sell4me on SQLite, with the project's code loaded.
#
#   scripts/stack.sh start [state dir]     # default state dir: /tmp/sell4me-stack
#   scripts/stack.sh stop
#   scripts/stack.sh restart [state dir]   # same data, fresh processes: picks up code changes
#
# Gateway: http://127.0.0.1:18080. Needs the Pawabase virtualenv (PAWABASE_VENV, default <repo>/.venv).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
STATE="${2:-/tmp/sell4me-stack}"
VENV="${PAWABASE_VENV:-$REPO/.venv}"
UVICORN="$VENV/bin/uvicorn"

stop() {
  for port in 8001 8002 8003 18080; do
    pid=$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)
    [ -n "$pid" ] && kill $pid && echo "stopped :$port"
  done
}

start() {
  mkdir -p "$STATE/logs"
  export SILLO_ENV_FILE=""
  # Only Pawabase itself is importable: the functions arrive by `pawabase deploy`, with their helper package inside the bundle.
  export PYTHONPATH="$REPO"
  export PAWABASE_APP_ENV=local
  export PAWABASE_INTERNAL_SECRET="${PAWABASE_INTERNAL_SECRET:-dev-internal-secret-change-me-please}"
  export PAWABASE_JWT_MASTER_SECRET="${PAWABASE_JWT_MASTER_SECRET:-dev-jwt-master-secret-change-me-please}"
  export PAWABASE_MASTER_KEY="${PAWABASE_MASTER_KEY:-dev-master-key-change-me-please-0000}"
  export PAWABASE_DB_GENERATE_SCHEMAS=true
  export PAWABASE_PUBLIC_URL=http://127.0.0.1:18080
  export PAWABASE_PUBLIC_GATEWAY_URL=http://127.0.0.1:18080
  export PAWABASE_ADMIN_EMAIL=admin@pawabase.local
  export PAWABASE_ADMIN_PASSWORD='Pawabase!admin1'
  export PAWABASE_INLINE_SCHEDULER=true
  run() { # name port env...
    local name=$1 port=$2; shift 2
    (cd "$REPO/$name" && env "$@" nohup "$UVICORN" app.main:app --host 127.0.0.1 --port "$port" --log-level warning </dev/null >"$STATE/logs/$name.log" 2>&1 &)
  }
  run api 8001 PAWABASE_DATABASE_URL="sqlite://$STATE/api.db" PAWABASE_DEFAULT_DATA_URL="sqlite://$STATE/data/{project}__{env}.db" \
      PAWABASE_STORAGE_ROOT="$STATE/objects" PAWABASE_CODE_PATH="$STATE/code" SELL4ME_NODE_DIR="$HERE"
  run akountz 8002 PAWABASE_DATABASE_URL="sqlite://$STATE/akountz.db"
  run angula 8003
  # Emulating is chatty (a request per database statement), and the suite makes thousands of calls: lift the per-key limit for local work.
  run gateway 18080 PAWABASE_RATE_LIMIT=1000000
  for port in 8001 8002 8003 18080; do
    for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:$port/health" >/dev/null && break || sleep 0.5; done
  done
  echo "stack up: gateway http://127.0.0.1:18080 (logs in $STATE/logs)"
}

case "${1:-start}" in start) start ;; stop) stop ;; restart) stop; sleep 1; start ;; *) echo "usage: $0 start|stop|restart [state dir]"; exit 2 ;; esac
