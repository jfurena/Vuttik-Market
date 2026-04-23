#!/bin/bash
# Vuttik Backend Startup Script (Fixed)

# 1. Environment Setup
export NODE_HOME="/home/sinagjwx/nodejs"
export PATH="$NODE_HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PORT=3005

APP_DIR="/home/sinagjwx/domains/vuttik.com/server"
LOG_FILE="$APP_DIR/backend.log"

cd $APP_DIR || exit 1

echo "--- [$(date)] Starting Vuttik Backend ---" >> "$LOG_FILE"

# 2. Stop existing process on port 3005
# We'll use pkill specifically for the node process in this dir
pkill -f "tsx index.ts" || true

# 3. Start with nohup
echo "Launching npm start..." >> "$LOG_FILE"
# Ensure we use full path to npm if possible, or trust PATH
nohup npm start >> "$LOG_FILE" 2>&1 &

echo "Backend launched in background. Check $LOG_FILE for details."
