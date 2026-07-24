#!/usr/bin/env bash
# Launch the JMT Family Platform locally: Django backend (with Celery worker) + Vite frontend.
# Requires: PostgreSQL and Redis running locally, and backend/.venv already created
# with `python -m venv .venv && pip install -r requirements.txt`, plus frontend
# dependencies installed with `npm install` in frontend/.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_PY="$BACKEND_DIR/.venv/bin/python"

if [[ ! -x "$VENV_PY" ]]; then
  echo "Backend virtualenv not found at backend/.venv. Create it first:" >&2
  echo "  cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies not found. Install them first:" >&2
  echo "  cd frontend && npm install" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "backend/.env not found. Copy backend/.env.example to backend/.env and fill it in first." >&2
  exit 1
fi

if command -v pg_isready >/dev/null 2>&1 && ! pg_isready -q; then
  echo "Warning: PostgreSQL doesn't appear to be running (pg_isready failed)." >&2
fi

if command -v redis-cli >/dev/null 2>&1 && ! redis-cli ping >/dev/null 2>&1; then
  echo "Warning: Redis doesn't appear to be running (redis-cli ping failed)." >&2
fi

PIDS=()
cleanup() {
  echo
  echo "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Applying database migrations..."
(cd "$BACKEND_DIR" && "$VENV_PY" manage.py migrate --noinput)

echo "Starting Django backend on http://127.0.0.1:8000 ..."
(cd "$BACKEND_DIR" && exec "$VENV_PY" manage.py runserver 8000) &
PIDS+=("$!")

echo "Starting Celery worker..."
(cd "$BACKEND_DIR" && exec "$VENV_PY" -m celery -A config worker --loglevel=info) &
PIDS+=("$!")

echo "Starting Vite frontend on http://127.0.0.1:5173 ..."
(cd "$FRONTEND_DIR" && exec npm run dev) &
PIDS+=("$!")

echo
echo "All services started. Press Ctrl+C to stop."
wait
