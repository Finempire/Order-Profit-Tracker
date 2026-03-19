#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Server-side deploy script for ManufacturePro
# Called by GitHub Actions CI/CD on every push to master.
# Run manually:  bash /var/www/order-profit-tracker/scripts/deploy.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/var/www/order-profit-tracker"
APP_NAME="manufacturing-app"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_PREFIX="[deploy ${TIMESTAMP}]"

log() { echo "${LOG_PREFIX} $*"; }

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Starting deployment..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# ── 1. Pull latest code ───────────────────────────────────────
log "[1/6] Pulling latest code from master..."
git fetch origin master
git reset --hard origin/master

# ── 2. Install dependencies ───────────────────────────────────
log "[2/6] Installing dependencies..."
npm ci

# ── 3. Prisma: generate + migrate ────────────────────────────
log "[3/6] Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# ── 4. Build ──────────────────────────────────────────────────
log "[4/6] Building Next.js application..."
npm run build

# ── 5. Zero-downtime reload with PM2 ─────────────────────────
log "[5/6] Reloading application (zero-downtime)..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

# ── 6. Health check ───────────────────────────────────────────
log "[6/6] Running health check..."
sleep 3
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "302" ]; then
  log "✓ Health check passed (HTTP ${HTTP_STATUS})"
else
  log "✗ Health check returned HTTP ${HTTP_STATUS} — showing PM2 logs:"
  pm2 logs "$APP_NAME" --lines 30 --nostream
  exit 1
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✓ Deployment complete!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status
