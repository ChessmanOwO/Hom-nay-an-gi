#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
ENV_FILE="$APP_DIR/.env.vps"
FIREBASE_CONFIG="$APP_DIR/config/firebase-web.json"
fail() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
TEMP_ENV=""
cleanup() { if [[ -n "$TEMP_ENV" && -e "$TEMP_ENV" ]]; then rm -f -- "$TEMP_ENV"; fi; }
trap cleanup EXIT

command -v sudo >/dev/null || fail 'sudo is required.'
command -v openssl >/dev/null || fail 'openssl is required to generate the database password.'

if [[ ! -f "$ENV_FILE" ]]; then
  read -r -p 'Domain (example.com or https://example.com): ' DOMAIN
  DOMAIN="${DOMAIN#https://}"
  DOMAIN="${DOMAIN#http://}"
  DOMAIN="${DOMAIN%/}"
  [[ "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$ ]] || fail 'Enter a public DNS hostname without a path or port.'
  DOMAIN="${DOMAIN,,}"
  PUBLIC_ORIGIN="https://$DOMAIN"

  read -r -p 'Firebase project ID: ' FIREBASE_PROJECT_ID
  [[ "$FIREBASE_PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || fail 'Invalid Firebase project ID.'
  read -r -p 'Super Admin Google email(s), comma separated: ' ADMIN_EMAILS
  [[ -n "${ADMIN_EMAILS//[[:space:]]/}" ]] || fail 'At least one Super Admin email is required.'
  IFS=',' read -ra ADMIN_LIST <<< "$ADMIN_EMAILS"
  for email in "${ADMIN_LIST[@]}"; do
    email="${email//[[:space:]]/}"
    [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || fail 'One of the admin email addresses is invalid.'
  done
  DATABASE_PASSWORD="$(openssl rand -hex 32)"
  TEMP_ENV="$(mktemp "$APP_DIR/.env.vps.XXXXXX")"
  chmod 600 "$TEMP_ENV"
  {
    printf 'PUBLIC_ORIGIN=%s\n' "$PUBLIC_ORIGIN"
    printf 'FIREBASE_PROJECT_ID=%s\n' "$FIREBASE_PROJECT_ID"
    printf 'ADMIN_EMAILS=%s\n' "${ADMIN_EMAILS//[[:space:]]/}"
    printf 'MODERATOR_EMAILS=\n'
    printf 'TRUSTED_PROXY_IPS=172.29.0.1\n'
    printf 'DATABASE_URL=postgresql://hnag:%s@postgres:5432/hnag\n' "$DATABASE_PASSWORD"
    printf 'PG_POOL_MAX=10\n'
    printf 'POSTGRES_PASSWORD=%s\n' "$DATABASE_PASSWORD"
  } > "$TEMP_ENV"
  mv -- "$TEMP_ENV" "$ENV_FILE"
  printf 'Created .env.vps with owner-only permissions. Keep it off GitHub and out of archives.\n'
else
  chmod 600 "$ENV_FILE"
  PUBLIC_ORIGIN="$(sed -n 's/^PUBLIC_ORIGIN=//p' "$ENV_FILE" | tail -n 1)"
  FIREBASE_PROJECT_ID="$(sed -n 's/^FIREBASE_PROJECT_ID=//p' "$ENV_FILE" | tail -n 1)"
  [[ -n "$PUBLIC_ORIGIN" && -n "$FIREBASE_PROJECT_ID" ]] || fail '.env.vps must set PUBLIC_ORIGIN and FIREBASE_PROJECT_ID.'
  [[ "$PUBLIC_ORIGIN" =~ ^https://([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$ ]] || fail 'PUBLIC_ORIGIN must be an HTTPS origin without path or port.'
  DOMAIN="${PUBLIC_ORIGIN#https://}"
fi

python3 - "$ENV_FILE" <<'PY'
from urllib.parse import unquote, urlparse
import sys

values = {}
with open(sys.argv[1], encoding="utf-8") as file:
    for line in file:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key] = value.strip().strip('"').strip("'")
required = ("DATABASE_URL", "POSTGRES_PASSWORD", "ADMIN_EMAILS")
if any(not values.get(key) for key in required):
    raise SystemExit("ERROR: .env.vps must set DATABASE_URL, POSTGRES_PASSWORD and ADMIN_EMAILS.")
if unquote(urlparse(values["DATABASE_URL"]).password or "") != values["POSTGRES_PASSWORD"]:
    raise SystemExit("ERROR: the PostgreSQL URL password and POSTGRES_PASSWORD must match.")
PY

[[ -f "$FIREBASE_CONFIG" ]] || fail 'Create config/firebase-web.json from Firebase Console before running deployment.'
python3 - "$FIREBASE_CONFIG" "$FIREBASE_PROJECT_ID" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as file:
    config = json.load(file)
if config.get("projectId") != sys.argv[2] or not config.get("apiKey") or "YOUR_" in config.get("apiKey", ""):
    raise SystemExit("ERROR: Firebase web config is a placeholder or uses a different project.")
PY

read -r -p 'Email for TLS certificate notices: ' CERTBOT_EMAIL
[[ "$CERTBOT_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || fail 'Enter a valid certificate contact email.'

printf 'Installing Docker, Nginx and Certbot packages...\n'
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx curl
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

printf 'Building and starting PostgreSQL and the application...\n'
sudo docker compose --env-file .env.vps -f compose.vps.yaml up -d --build
HEALTHY=0
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3000/healthz >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 2
done
if [[ "$HEALTHY" != 1 ]]; then
  sudo docker compose --env-file .env.vps -f compose.vps.yaml logs --tail=100 web postgres >&2
  fail 'Application health check failed. Database and app volumes were preserved.'
fi

sudo tee /etc/nginx/conf.d/homnayangi-limits.conf >/dev/null <<'EOF'
limit_req_zone $binary_remote_addr zone=hnag_requests:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=hnag_conn:10m;
EOF
sudo mkdir -p /var/www/html
CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [[ ! -s "$CERT_FILE" ]]; then
  sudo tee /etc/nginx/sites-available/homnayangi >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 503; }
}
EOF
  sudo ln -sfn /etc/nginx/sites-available/homnayangi /etc/nginx/sites-enabled/homnayangi
  sudo nginx -t
  sudo systemctl reload nginx
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect
  [[ -s "$CERT_FILE" ]] || fail 'TLS certificate was not created; the app is not exposed over plain HTTP.'
fi

sudo tee /etc/nginx/sites-available/homnayangi >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 308 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name $DOMAIN;
    ssl_certificate $CERT_FILE;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 4m;
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    limit_req_status 429;
    limit_conn_status 429;
    limit_conn hnag_conn 40;
    location / {
        limit_req zone=hnag_requests burst=60 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
}
EOF
sudo ln -sfn /etc/nginx/sites-available/homnayangi /etc/nginx/sites-enabled/homnayangi
sudo nginx -t
sudo systemctl reload nginx
curl -fsS "https://$DOMAIN/healthz" >/dev/null || fail 'HTTPS health check failed.'
printf 'Deployment is healthy at %s\n' "$PUBLIC_ORIGIN"
printf 'Keep .env.vps and config/firebase-web.json private. This single web container can have brief restart downtime.\n'
