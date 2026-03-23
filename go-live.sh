#!/bin/bash
set -e
cd "$(dirname "$0")"

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# ── Start backend ──────────────────────────────────────────
cd backend
if [ ! -d "venv" ]; then
  echo "Setting up Python environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
else
  source venv/bin/activate
fi

uvicorn main:app --reload --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 2

# ── Start frontend ─────────────────────────────────────────
cd ../frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install --silent
fi

npx vite --host > /dev/null 2>&1 &
FRONTEND_PID=$!
sleep 3

# ── Start tunnel ──────────────────────────────────────────
cd ..

# Check for ngrok in common locations
NGROK=""
if [ -x "./ngrok" ]; then
  NGROK="./ngrok"
elif [ -x "/tmp/ngrok" ]; then
  NGROK="/tmp/ngrok"
elif command -v ngrok &> /dev/null; then
  NGROK="ngrok"
fi

# Download ngrok if not found
if [ -z "$NGROK" ]; then
  echo "Downloading ngrok..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-arm64.tgz"
  else
    URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.tgz"
  fi
  curl -sL "$URL" -o /tmp/ngrok.tgz && tar xzf /tmp/ngrok.tgz -C /tmp && rm /tmp/ngrok.tgz
  NGROK="/tmp/ngrok"
fi

$NGROK http 5173 --log=stdout > /tmp/float-ngrok.log 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL
echo ""
echo "Starting tunnel..."
for i in {1..15}; do
  sleep 1
  URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    t = json.load(sys.stdin)['tunnels']
    print(t[0]['public_url'] if t else '')
except: pass
" 2>/dev/null)
  if [ -n "$URL" ]; then
    break
  fi
done

if [ -z "$URL" ]; then
  echo "ERROR: Tunnel failed to start. Check /tmp/float-ngrok.log"
  echo "You may need to run: ngrok config add-authtoken YOUR_TOKEN"
  echo ""
  echo "Get a free token at: https://dashboard.ngrok.com/get-started/your-authtoken"
  echo ""
  echo "App is still running locally at: http://localhost:5173"
  wait
else
  echo ""
  echo "═══════════════════════════════════════════════"
  echo ""
  echo "   Float is LIVE!"
  echo ""
  echo "   $URL"
  echo ""
  echo "   Open this link on any device."
  echo "   Press Ctrl+C to stop."
  echo ""
  echo "═══════════════════════════════════════════════"
  echo ""
  wait
fi
