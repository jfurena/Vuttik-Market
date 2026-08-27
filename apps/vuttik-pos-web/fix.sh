export NODE_HOME=/home/sinagjwx/nodejs
export PATH=$NODE_HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH

echo "Killing all node processes to free resources..."
ps aux | grep -v grep | grep node | awk '{print $2}' | xargs kill -9 2>/dev/null
pkill -9 -f "node index.js" 2>/dev/null
pkill -9 -f "tsx index.ts" 2>/dev/null

cd /home/sinagjwx/domains/vuttik.com/server

echo "Fixing package.json..."
sed -i 's/npx npx tsx/tsx/g' package.json
sed -i 's/npx tsx/tsx/g' package.json

echo "Starting backend..."
nohup npm start > backend.log 2>&1 &
echo "Done!"
