#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "=== Buzzlit - Development Server ==="

[[ -f .env ]] && export $(grep -v '^#' .env | xargs) && echo "[OK] .env loaded"

echo "[Starting] Backend on http://localhost:8000"
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
PID1=$!

echo "[Starting] Frontend on http://localhost:3000"
cd frontend
eval "$(~/scoop/shims/fnm env)" 2>/dev/null
npm run dev &
PID2=$!
cd ..

echo ""
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $PID1 $PID2 2>/dev/null" EXIT
wait
