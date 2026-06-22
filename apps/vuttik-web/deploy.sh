#!/bin/bash
set -e

echo "--- Vuttik Deployment Start ---"

echo "Deploying frontend..."
cd /home/sinagjwx/domains/vuttik.com/public_html
# Safe removal of assets (to avoid deleting the parent folder permissions)
find assets -mindepth 1 -delete || true
tar -xzf /home/sinagjwx/dist.tar.gz --strip-components=1

echo "Deploying backend..."
cd /home/sinagjwx/domains/vuttik.com/server
tar -xzf /home/sinagjwx/server.tar.gz --strip-components=1

echo "Setting permissions..."
chmod -R 755 /home/sinagjwx/domains/vuttik.com/public_html/assets
find /home/sinagjwx/domains/vuttik.com/public_html/assets -type f -exec chmod 644 {} \;

echo "Restarting server..."
# Check if start.sh exists and is executable
if [ -f "start.sh" ]; then
  chmod +x start.sh
  ./start.sh
else
  # Fallback: kill existing node process and start anew
  pkill -f "node index.js" || true
  nohup node index.js > backend.log 2>&1 &
fi

echo "--- Vuttik Deployment Complete! ---"
