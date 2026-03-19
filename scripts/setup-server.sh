#!/bin/bash
# One-time Linode server setup script for Order Profit Tracker
set -e

APP_DIR="/var/www/order-profit-tracker"
REPO_URL="https://github.com/Finempire/Order-Profit-Tracker.git"

echo "=== 1. Update system ==="
apt-get update -y
apt-get upgrade -y

echo "=== 2. Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "=== 3. Install PM2 ==="
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo "=== 4. Install Git ==="
apt-get install -y git

echo "=== 5. Install PostgreSQL ==="
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo "=== 6. Create PostgreSQL database and user ==="
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'AppSecure2024!';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE order_profit_tracker OWNER appuser;" 2>/dev/null || echo "DB already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE order_profit_tracker TO appuser;" 2>/dev/null

echo "=== 7. Install Nginx ==="
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

echo "=== 8. Clone repository ==="
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
  echo "Directory exists, pulling latest..."
  cd "$APP_DIR"
  git pull origin master
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "=== 9. Install dependencies ==="
cd "$APP_DIR"
npm ci

echo "=== 10. Create .env file ==="
cat > "$APP_DIR/.env" << 'EOF'
DATABASE_URL="postgresql://appuser:AppSecure2024!@localhost:5432/order_profit_tracker"
NEXTAUTH_SECRET="CHANGE_ME_RUN_openssl_rand_base64_32"
NEXTAUTH_URL="http://172.237.41.84"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=10
NEXT_PUBLIC_APP_NAME="Order Profit Tracker"
NEXT_PUBLIC_CURRENCY_SYMBOL="₹"
EOF

echo ""
echo "!!! IMPORTANT: Edit /var/www/order-profit-tracker/.env"
echo "!!! Replace NEXTAUTH_SECRET with: $(openssl rand -base64 32)"
echo ""

echo "=== 11. Run Prisma migrations ==="
cd "$APP_DIR"
npx prisma migrate deploy

echo "=== 12. Seed database ==="
npx tsx prisma/seed.ts || echo "Seed skipped (tsx might not be installed, install with: npm i -g tsx)"

echo "=== 13. Build app ==="
npm run build

echo "=== 14. Start with PM2 ==="
pm2 start ecosystem.config.js --env production
pm2 save

echo "=== 15. Configure Nginx ==="
cat > /etc/nginx/sites-available/order-profit-tracker << 'NGINX'
server {
    listen 80;
    server_name 172.237.41.84;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/order-profit-tracker/uploads/;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/order-profit-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "  App URL: http://172.237.41.84"
echo "  PM2 Status:"
pm2 status
echo "========================================="
