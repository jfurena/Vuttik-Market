import paramiko
import sys

HOST = "2.24.222.145"
USER = "root"
PASSWORD = "O3R&.sG;CWf8Sq7R"

with open("vps_deploy_key.pub", "r") as f:
    pub_key = f.read().strip()

SETUP_SCRIPT = """#!/bin/bash
set -e

echo "======================================"
echo " VUTTIK VPS SETUP"
echo "======================================"

export DEBIAN_FRONTEND=noninteractive

echo "--- Updating system ---"
apt-get update -y -q
apt-get upgrade -y -q -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" 2>/dev/null

echo "--- Installing Node.js 20 ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
apt-get install -y -q nodejs
echo "Node: $(node --version)"

echo "--- Installing PM2 ---"
npm install -g pm2 --silent
echo "PM2: $(pm2 --version)"

echo "--- Installing Nginx ---"
apt-get install -y -q nginx
systemctl enable nginx
systemctl start nginx

echo "--- Installing Certbot ---"
apt-get install -y -q certbot python3-certbot-nginx

echo "--- Configuring Firewall ---"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo "--- Creating Directories ---"
mkdir -p /var/www/vuttik/marketplace/public_html
mkdir -p /var/www/vuttik/pos/public_html
mkdir -p /var/www/vuttik/data
mkdir -p /var/www/vuttik/backend
mkdir -p /var/www/vuttik/logs

echo "--- Adding deploy SSH key ---"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
PUB_KEY=\"""" + pub_key + """\"
if ! grep -qF "$PUB_KEY" /root/.ssh/authorized_keys 2>/dev/null; then
  echo "$PUB_KEY" >> /root/.ssh/authorized_keys
fi
chmod 600 /root/.ssh/authorized_keys
echo "Deploy key added."

echo "--- Nginx config: vuttik.com ---"
cat > /etc/nginx/sites-available/vuttik.com << 'NGINXEOF'
server {
    listen 80;
    server_name vuttik.com www.vuttik.com;
    root /var/www/vuttik/marketplace/public_html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3005/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
NGINXEOF

echo "--- Nginx config: pos.vuttik.com ---"
cat > /etc/nginx/sites-available/pos.vuttik.com << 'NGINXEOF'
server {
    listen 80;
    server_name pos.vuttik.com;
    root /var/www/vuttik/pos/public_html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3005/pos/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
NGINXEOF

echo "--- Enabling Nginx sites ---"
ln -sf /etc/nginx/sites-available/vuttik.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/pos.vuttik.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "--- Creating PM2 ecosystem config ---"
cat > /var/www/vuttik/ecosystem.config.cjs << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'vuttik-backend',
    script: '/var/www/vuttik/backend/server/index.js',
    cwd: '/var/www/vuttik/backend/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: '3005',
      VUTTIK_DB_PATH: '/var/www/vuttik/data/vuttik.db',
      VUTTIK_DB_JSON_PATH: '/var/www/vuttik/data/db.json',
      SESSION_SECRET: 'vuttik-prod-secure-secret-2026-xA9kP2'
    },
    error_file: '/var/www/vuttik/logs/pm2-error.log',
    out_file: '/var/www/vuttik/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
PM2EOF

echo "--- Creating deploy.sh helper ---"
cat > /var/www/vuttik/deploy.sh << 'DEPLOYEOF'
#!/bin/bash
set -e
echo "[Deploy] Started at $(date)"
cd /var/www/vuttik

# Backend
echo "[Deploy] Deploying backend..."
mkdir -p /tmp/vuttik_backend_extract
tar -xzf /tmp/vuttik_backend.tar.gz -C /tmp/vuttik_backend_extract
rsync -a --delete /tmp/vuttik_backend_extract/ /var/www/vuttik/backend/
rm -rf /tmp/vuttik_backend_extract

echo "[Deploy] Installing backend dependencies..."
cd /var/www/vuttik/backend/server
npm install --production --silent

# Frontend (marketplace)
echo "[Deploy] Deploying marketplace frontend..."
mkdir -p /tmp/vuttik_marketplace
tar -xzf /tmp/vuttik_marketplace.tar.gz -C /tmp/vuttik_marketplace
rsync -a --delete /tmp/vuttik_marketplace/ /var/www/vuttik/marketplace/public_html/
rm -rf /tmp/vuttik_marketplace

# Frontend (POS)
echo "[Deploy] Deploying POS frontend..."
mkdir -p /tmp/vuttik_pos
tar -xzf /tmp/vuttik_pos.tar.gz -C /tmp/vuttik_pos
rsync -a --delete /tmp/vuttik_pos/ /var/www/vuttik/pos/public_html/
rm -rf /tmp/vuttik_pos

# Restart backend
echo "[Deploy] Restarting backend with PM2..."
cd /var/www/vuttik
pm2 startOrRestart ecosystem.config.cjs
pm2 save

echo "[Deploy] Done at $(date)"
pm2 list
DEPLOYEOF
chmod +x /var/www/vuttik/deploy.sh

echo "--- Setting up PM2 startup ---"
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>&1 | tail -1 | bash || true

echo ""
echo "======================================"
echo " SETUP COMPLETE!"
echo "======================================"
node --version
npm --version
pm2 --version
nginx -v 2>&1
ufw status | head -3
"""

def run_ssh(ssh, command, timeout=300):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout, get_pty=True)
    output = ""
    while True:
        chunk = stdout.read(4096)
        if not chunk:
            break
        decoded = chunk.decode('utf-8', errors='replace')
        output += decoded
        sys.stdout.buffer.write(chunk)
        sys.stdout.flush()
    return stdout.channel.recv_exit_status(), output

print("=== Connecting to VPS ===")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print("Connected!")

sftp = ssh.open_sftp()
with sftp.open('/tmp/vps_setup.sh', 'w') as f:
    f.write(SETUP_SCRIPT)
sftp.chmod('/tmp/vps_setup.sh', 0o755)
sftp.close()
print("Setup script uploaded. Running...")

exit_code, output = run_ssh(ssh, "bash /tmp/vps_setup.sh", timeout=600)

if exit_code == 0:
    print("\n=== SETUP SUCCESSFUL ===")
else:
    print(f"\n=== SETUP FAILED (exit code: {exit_code}) ===")
    
ssh.close()
