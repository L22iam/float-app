#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Starting Float..."
echo ""

# Backend
cd backend
if [ ! -d "venv" ]; then
  echo "📦 Setting up Python environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
else
  source venv/bin/activate
fi

echo "✅ Backend starting on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install --silent
fi

echo "✅ Frontend starting on http://localhost:5173"
npx vite --host &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════"
echo "  Float is running!"
echo "  Open: http://localhost:5173"
echo "  Press Ctrl+C to stop"
echo "═══════════════════════════════════════"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
