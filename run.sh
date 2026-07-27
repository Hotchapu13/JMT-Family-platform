#!/usr/bin/env bash
#
# run.sh — start the JMT Family Platform (backend + frontend) for local development.
#
# Usage: ./run.sh [--no-celery] [--install]
#   --no-celery   skip starting the Celery worker even if Redis is reachable
#   --install     force (re)install backend/frontend dependencies before starting
#
# The script checks prerequisites (venv, Postgres, Redis, node_modules, .env),
# warns and degrades gracefully instead of hard-failing where it can, and
# cleans up every process it started on exit (Ctrl+C, error, or normal exit).

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"
LOG_DIR="$ROOT_DIR/.run-logs"
mkdir -p "$LOG_DIR"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

WANT_CELERY=1
FORCE_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --no-celery) WANT_CELERY=0 ;;
    --install) FORCE_INSTALL=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^#//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

# ---------- colors / logging ----------
if [ -t 1 ]; then
  C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[0;33m'; C_BLUE='\033[0;34m'; C_RESET='\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_RESET=''
fi
info()  { echo -e "${C_BLUE}[run]${C_RESET} $*"; }
ok()    { echo -e "${C_GREEN}[ok]${C_RESET} $*"; }
warn()  { echo -e "${C_YELLOW}[warn]${C_RESET} $*"; }
error() { echo -e "${C_RED}[error]${C_RESET} $*" >&2; }

# ---------- process tracking / cleanup ----------
PIDS=()
CLEANED_UP=0

cleanup() {
  [ "$CLEANED_UP" -eq 1 ] && return
  CLEANED_UP=1
  echo
  info "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
    fi
  done
  # give processes a moment to exit cleanly, then force-kill stragglers
  for _ in 1 2 3 4 5; do
    still_running=0
    for pid in "${PIDS[@]:-}"; do
      [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && still_running=1
    done
    [ "$still_running" -eq 0 ] && break
    sleep 1
  done
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      warn "Force-killing stubborn process $pid"
      kill -9 "$pid" 2>/dev/null
    fi
  done
  ok "Stopped. Logs are in $LOG_DIR"
}
trap cleanup EXIT INT TERM

port_in_use() {
  local port="$1"
  (command -v lsof >/dev/null 2>&1 && lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1) \
    || (command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$")
}

require_free_port() {
  local port="$1" name="$2"
  if port_in_use "$port"; then
    error "Port $port is already in use — cannot start $name. Stop whatever is using it and re-run, or set ${name}_PORT to a different value."
    exit 1
  fi
}

# ---------- backend prerequisites ----------
info "Checking backend environment..."

if [ ! -d "$VENV_DIR" ]; then
  warn "No virtualenv found at $VENV_DIR — creating one."
  python3 -m venv "$VENV_DIR" || { error "Failed to create virtualenv."; exit 1; }
  FORCE_INSTALL=1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate" || { error "Failed to activate virtualenv at $VENV_DIR"; exit 1; }
ok "Virtualenv active ($(python3 --version 2>&1))."

if [ "$FORCE_INSTALL" -eq 1 ] || ! python3 -c "import django" >/dev/null 2>&1; then
  info "Installing backend dependencies..."
  pip install -q --upgrade pip
  if ! pip install -q -r "$BACKEND_DIR/requirements.txt"; then
    error "Failed to install backend dependencies. See output above."
    exit 1
  fi
  ok "Backend dependencies installed."
else
  ok "Backend dependencies already present."
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    warn "backend/.env is missing — copying backend/.env.example as a starting point."
    warn "Update backend/.env with real secrets/credentials before relying on this."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  else
    warn "backend/.env and backend/.env.example are both missing. Django may fail without required settings."
  fi
fi

# Pull DB connection info out of backend/.env (fall back to Django defaults).
DB_HOST=$(grep -E '^DB_HOST=' "$BACKEND_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2-)
DB_PORT=$(grep -E '^DB_PORT=' "$BACKEND_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2-)
DB_USER=$(grep -E '^DB_USER=' "$BACKEND_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2-)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-jmt_dev}"

DB_UP=0
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
    ok "PostgreSQL is reachable at $DB_HOST:$DB_PORT."
    DB_UP=1
  else
    warn "PostgreSQL is not reachable at $DB_HOST:$DB_PORT. The backend will likely fail to start."
    warn "Start Postgres and re-run, e.g.: sudo systemctl start postgresql"
  fi
else
  warn "pg_isready not found — skipping Postgres reachability check."
fi

REDIS_UP=0
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    ok "Redis is reachable."
    REDIS_UP=1
  else
    warn "Redis is not reachable. Celery-backed features (background tasks) will be unavailable."
  fi
else
  warn "redis-cli not found — skipping Redis reachability check."
fi

require_free_port "$BACKEND_PORT" "BACKEND"
require_free_port "$FRONTEND_PORT" "FRONTEND"

# ---------- migrations ----------
if [ "$DB_UP" -eq 1 ]; then
  info "Applying database migrations..."
  if ! (cd "$BACKEND_DIR" && python3 manage.py migrate --noinput 2>&1 | tee "$LOG_DIR/migrate.log"); then
    error "Migrations failed — see $LOG_DIR/migrate.log. Continuing, but the app may misbehave."
  else
    ok "Migrations applied."
  fi
else
  warn "Skipping migrations because the database isn't reachable."
fi

# ---------- start backend ----------
info "Starting Django backend on port $BACKEND_PORT..."
(cd "$BACKEND_DIR" && exec python3 manage.py runserver "0.0.0.0:$BACKEND_PORT") \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")

sleep 1
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  error "Backend failed to start. Last lines of $LOG_DIR/backend.log:"
  tail -n 20 "$LOG_DIR/backend.log" >&2
  exit 1
fi
ok "Backend running (pid $BACKEND_PID) — logs: $LOG_DIR/backend.log"

# ---------- start celery worker (optional) ----------
CELERY_PID=""
if [ "$WANT_CELERY" -eq 1 ] && [ "$REDIS_UP" -eq 1 ]; then
  info "Starting Celery worker..."
  (cd "$BACKEND_DIR" && exec celery -A config worker --loglevel=info) \
    > "$LOG_DIR/celery.log" 2>&1 &
  CELERY_PID=$!
  PIDS+=("$CELERY_PID")
  sleep 1
  if kill -0 "$CELERY_PID" 2>/dev/null; then
    ok "Celery worker running (pid $CELERY_PID) — logs: $LOG_DIR/celery.log"
  else
    warn "Celery worker failed to start — see $LOG_DIR/celery.log. Continuing without it."
    tail -n 10 "$LOG_DIR/celery.log" >&2 || true
  fi
elif [ "$WANT_CELERY" -eq 1 ]; then
  warn "Skipping Celery worker (Redis not reachable). Pass --no-celery to silence this."
fi

# ---------- frontend prerequisites ----------
info "Checking frontend environment..."
if ! command -v npm >/dev/null 2>&1; then
  error "npm not found on PATH — cannot start the frontend."
  exit 1
fi

if [ "$FORCE_INSTALL" -eq 1 ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  info "Installing frontend dependencies..."
  if ! (cd "$FRONTEND_DIR" && npm install); then
    error "npm install failed — cannot start the frontend."
    exit 1
  fi
  ok "Frontend dependencies installed."
else
  ok "Frontend dependencies already present."
fi

# ---------- start frontend ----------
info "Starting Vite frontend on port $FRONTEND_PORT..."
(cd "$FRONTEND_DIR" && exec npm run dev -- --port "$FRONTEND_PORT" --strictPort) \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")

sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  error "Frontend failed to start. Last lines of $LOG_DIR/frontend.log:"
  tail -n 20 "$LOG_DIR/frontend.log" >&2
  exit 1
fi
ok "Frontend running (pid $FRONTEND_PID) — logs: $LOG_DIR/frontend.log"

echo
ok "JMT Family Platform is up:"
echo "    Backend:  http://localhost:$BACKEND_PORT"
echo "    Frontend: http://localhost:$FRONTEND_PORT"
[ "$DB_UP" -eq 0 ] && warn "  (Postgres was unreachable — backend requests will likely error until it's started.)"
[ -n "$CELERY_PID" ] || warn "  (Celery is not running — background tasks are disabled.)"
info "Press Ctrl+C to stop everything."

# ---------- supervise ----------
# Wait on any child; if one dies unexpectedly, tear everything down.
while true; do
  for pid in "${PIDS[@]}"; do
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      [ "$CLEANED_UP" -eq 1 ] && exit 0
      error "Process $pid exited unexpectedly. Shutting down the rest."
      exit 1
    fi
  done
  sleep 2
done
