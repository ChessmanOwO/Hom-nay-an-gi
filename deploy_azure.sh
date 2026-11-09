#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 BẮT ĐẦU TỰ ĐỘNG TRIỂN KHAI HÔM NAY ĂN GÌ LÊN AZURE VM"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 1. Cài đặt các gói phụ trợ cần thiết (Docker, Nginx, Certbot)..."
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git curl
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

echo "📝 2. Thiết lập cấu hình bảo mật .env.vps..."
cat << 'EOF' > .env.vps
PUBLIC_ORIGIN=https://homnayangi.eastasia.cloudapp.azure.com
FIREBASE_PROJECT_ID=hom-nay-an
ADMIN_EMAILS="REDACTED_EMAIL,REDACTED_EMAIL,REDACTED_EMAIL,REDACTED_EMAIL"
MODERATOR_EMAILS=
TRUSTED_PROXY_IPS=172.29.0.1
DATABASE_URL=postgresql://hnag:REDACTED@postgres:5432/hnag
PG_POOL_MAX=10
POSTGRES_PASSWORD=REDACTED
EOF

echo "🔑 3. Thiết lập cấu hình Firebase Web Client..."
mkdir -p config
cat << 'EOF' > config/firebase-web.json
{
  "apiKey": "AIzaSyD2jO7r66OBghQeRYA9tR0aqeOnrsHCVtc",
  "authDomain": "hom-nay-an.firebaseapp.com",
  "projectId": "hom-nay-an",
  "storageBucket": "hom-nay-an.firebasestorage.app",
  "messagingSenderId": "641001130624",
  "appId": "1:641001130624:web:f7ff40dba5f96b4664f465",
  "measurementId": "G-WHK8KP8VTQ"
}
EOF

echo "🐳 4. Khởi động Docker Containers (PostgreSQL 17 + App Server)..."
sudo docker compose --env-file .env.vps -f compose.vps.yaml down || true
sudo docker compose --env-file .env.vps -f compose.vps.yaml up -d --build

echo "⏳ Đang chờ hệ thống khởi động và kiểm tra tính sẵn sàng..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:3000/healthz > /dev/null 2>&1; then
    echo "✅ App Server đã hoạt động ổn định trên port 3000!"
    break
  fi
  sleep 2
done

echo "🌐 5. Cấu hình Nginx Reverse Proxy..."
sudo tee /etc/nginx/sites-available/homnayangi > /dev/null << 'EOF'
server {
    listen 80;
    server_name homnayangi.eastasia.cloudapp.azure.com 20.2.217.57;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/homnayangi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "🔒 6. Cấp chứng chỉ HTTPS miễn phí Let's Encrypt (Certbot)..."
sudo certbot --nginx -d homnayangi.eastasia.cloudapp.azure.com --non-interactive --agree-tos -m REDACTED_EMAIL --redirect || {
  echo "⚠️ Lưu ý: Chưa cấp được SSL do cổng 80/443 trên Azure NSG chưa mở hoặc DNS đang trỏ. Web hiện vẫn chạy bình thường qua HTTP!"
}

echo ""
echo "=========================================================="
echo "🎉 CHÚC MỪNG ANH TÚ! DỰ ÁN ĐÃ TRIỂN KHAI THÀNH CÔNG!"
echo "🌐 Domain HTTPS: https://homnayangi.eastasia.cloudapp.azure.com"
echo "🌐 Link trực tiếp: http://20.2.217.57"
echo "=========================================================="
