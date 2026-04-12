#!/bin/bash
cd "$(dirname "$0")"

# Load nvm so node/npm/npx are available when launched from .desktop
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Kill both processes on exit
trap 'kill 0' EXIT

# Start server
echo "Starting server..."
(cd server && npx tsx src/index.ts) &

# Start client
echo "Starting client..."
(cd client && npm run dev) &

# Open browser after a short delay
(sleep 4 && xdg-open http://localhost:5173) &

# Wait for all background processes
wait
