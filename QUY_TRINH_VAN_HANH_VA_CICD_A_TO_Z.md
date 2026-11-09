# CẨM NANG VẬN HÀNH & CI/CD TOÀN DIỆN TỪ A ĐẾN Z
> **Dự án:** Hôm nay ăn gì? (Hom-nay-an-gi)  
> **Tác giả & Kiến trúc sư:** Tú (KazeLAB) & Devoted Hacker Companion ENI  
> **Phiên bản:** v12.0.0 Production Ready (Docker + Postgres 17 + GitHub Actions CI/CD)  
> **Cập nhật ngày:** 09/11/2026  

---

## MỤC LỤC TỔNG QUAN
1. [Kiến Trúc Kỹ Thuật Hệ Thống](#1-kiến-trúc-kỹ-thuật-hệ-thống)
2. [Quy Trình CI/CD Tự Động Hóa 100%](#2-quy-trình-cicd-tự-động-hóa-100)
3. [Hướng Dẫn Quản Trị, Chống Seeding & Khóa Tài Khoản](#3-hướng-dẫn-quản-trị-chống-seeding--khóa-tài-khoản)
4. [Bảng Vinh Danh Top 5 Người Đóng Góp](#4-bảng-vinh-danh-top-5-người-đóng-góp)
5. [Quy Trình Di Dời Sang VPS Mới Trong 5 Phút (Zero Lock-in)](#5-quy-trình-di-dời-sang-vps-mới-trong-5-phút-zero-lock-in)
6. [Bảng Tra Cứu Lệnh Nhanh & Khắc Phục Sự Cố (Cheat Sheet)](#6-bảng-tra-cứu-lệnh-nhanh--khắc-phục-sự-cố-cheat-sheet)

---

## 1. KIẾN TRÚC KỸ THUẬT HỆ THỐNG

| Thành phần | Công nghệ / Nền tảng | Vai trò & Chi tiết |
| :--- | :--- | :--- |
| **Frontend UI** | Vite + React 19 + Lucide Icons | Giao diện tương tác siêu tốc, Responsive Mobile/Desktop |
| **Backend Server** | Hono Node Server (Node.js 22) | RESTful API, Rate-limiting, Chống Seeding đa tầng |
| **Database** | PostgreSQL 17 (Dockerized) | Lưu trữ quán ăn, món ăn, bài đánh giá, sessions, audit |
| **Bản đồ** | Leaflet + OpenStreetMap + OSRM | Định vị GPS, tìm kiếm bán kính 1-20km, chỉ đường xe máy |
| **Authentication** | Firebase Auth Client (Google OAuth) | Project ID: `hom-nay-an` |
| **Web Server / Reverse Proxy** | Nginx SSL Reverse Proxy + Let's Encrypt | Chuyển tiếp cổng 80/443 -> Docker App Port 3000 |
| **Quản lý Container** | Docker Compose v2 | Độc lập nền tảng, tự phục hồi (`restart: unless-stopped`) |
| **Máy chủ hiện tại** | Azure Virtual Machine (Ubuntu 24.04) | IP: `20.2.217.57` · Domain: `homnayangi.eastasia.cloudapp.azure.com` |
| **Kho mã nguồn** | GitHub Repository | `https://github.com/ChessmanOwO/Hom-nay-an-gi.git` (Nhánh `main`) |

---

## 2. QUY TRÌNH CI/CD TỰ ĐỘNG HÓA 100%

### Sơ đồ luồng triển khai tự động:
```text
[1. Máy tính Local của Anh Tú]
        │
        ├── Sửa code & hoàn thiện tính năng
        └── git push origin main
        │
        ▼
[2. GitHub Repository (Actions Runner)]
        │
        ├── 🧪 Job 1: Test & Build (Kiểm định)
        │     ├── Cài đặt môi trường Node.js 22
        │     ├── Build bundle Vite Production
        │     └── Chạy toàn bộ Unit Tests & Limit Checks (100% PASS)
        │
        └── 🚀 Job 2: Auto-Deploy to VM (Triển khai)
              ├── Kết nối SSH bảo mật tới máy chủ
              ├── Kéo code mới nhất từ nhánh main
              ├── Chạy Docker Compose Build cập nhật Container
              └── Tự dọn dẹp images cũ (prune) tránh đầy ổ cứng
        │
        ▼
[3. Máy chủ Production (Azure VM / Bất kỳ VPS nào)]
        └── Ứng dụng chạy bản mới nhất trong ~35 giây (Không mất dữ liệu)
```

### Quản lý 3 Biến Bí Mật (GitHub Secrets):
Truy cập: `https://github.com/ChessmanOwO/Hom-nay-an-gi/settings/secrets/actions`
* **`AZURE_VM_HOST`**: `20.2.217.57` *(hoặc tên miền máy chủ)*.
* **`AZURE_VM_USER`**: `azureuser` *(tên đăng nhập máy chủ)*.
* **`AZURE_VM_PASSWORD`**: Mật khẩu đăng nhập máy chủ SSH.  
  *(Nếu dùng file khóa SSH `.pem` thì đổi thành biến `AZURE_VM_SSH_KEY` và dán toàn bộ nội dung file `.pem` vào)*.

---

## 3. HƯỚNG DẪN QUẢN TRỊ, CHỐNG SEEDING & KHÓA TÀI KHOẢN

### A. Khắc phục lỗi "Tên miền chưa được cấp phép" (Google Auth)
Nếu khi đăng nhập Google báo lỗi `auth/unauthorized-domain`:
1. Mở [Firebase Console](https://console.firebase.google.com/) -> Chọn Project **`hom-nay-an`**.
2. Menu trái: **Authentication** > Tab **Settings** > Chọn **Authorized domains**.
3. Bấm **Add domain** và thêm 2 địa chỉ:
   * `homnayangi.eastasia.cloudapp.azure.com`
   * `20.2.217.57`
4. Bấm **Save**. F5 lại web là đăng nhập Google được ngay lập tức!

### B. Thiết lập Tài khoản Admin
Trong file `.env.vps` trên máy chủ, khai báo danh sách email Google có quyền Super Admin:
```env
ADMIN_EMAILS="REDACTED_EMAIL,REDACTED_EMAIL,REDACTED_EMAIL,REDACTED_EMAIL"
```
Khi đăng nhập bằng các email này, trên thanh menu đầu trang sẽ hiện biểu tượng **Chiếc Khiên 🛡️ (Quản trị)**.

### C. Hai Cách Khóa Tài Khoản & Chống Seeding:

#### Cách 1: Khóa & Xóa TRỰC TIẾP TẠI CHỖ (Siêu tiện khi đang lướt web)
* Khi anh đang xem bất kỳ **Quán ăn** (`PlaceModal`) hoặc **Món ăn** (`DetailModal`):
* Dưới mỗi bài viết/đánh giá của người dùng sẽ tự động hiện 2 nút đỏ dành riêng cho Admin:
  * 🗑️ **`Xóa bài (Admin)`**: Bấm xóa bài viết spam, bài sẽ ẩn khỏi cộng đồng và **tự động hoàn lại 1 lượt đánh giá** cho tài khoản đó ở quán tương ứng.
  * 🚫 **`Khóa tài khoản này`**: Bấm 1 phát là khóa vĩnh viễn Google UID của người gửi, hủy sạch toàn bộ phiên đăng nhập của kẻ đó trên mọi thiết bị.

#### Cách 2: Quản trị tập trung trong "Sổ Quản Trị" (Bấm icon 🛡️)
* **Tab Trải nghiệm**: Xem toàn bộ hàng đợi bài viết (Chờ duyệt / Công khai), kèm cờ cảnh báo rủi ro IP, nút duyệt bài, ẩn bài, xóa bài và khóa tài khoản.
* **Tab Chặn IP & Khóa tài khoản**:
  * **Chặn địa chỉ IP**: Nhập IP vi phạm (vd: `14.162.x.x`) + lý do -> bấm **Chặn IP**. Kể từ đó IP này bị cấm cửa 100% (HTTP 403 Forbidden). Có nút **Bỏ chặn** để gỡ khi cần.
  * **Khóa tài khoản người dùng**: Nhập UID -> bấm **Khóa tài khoản**. Có danh sách kèm nút **Mở khóa**.

---

## 4. BẢNG VINH DANH TOP 5 NGƯỜI ĐÓNG GÓP

* **Vị trí**: Nằm trang trọng ngay trên Landing Page giữa thanh quay ngẫu nhiên và danh sách món ăn.
* **Quy tắc xếp hạng**: Tính tự động từ cơ sở dữ liệu dựa trên tổng số bài đánh giá địa điểm + bài review món ăn đã được duyệt công khai (`status = 'approved'`).
* **Huy hiệu vinh danh**:
  * 🥇 **Top 1**: Huy hiệu vàng kim, viền dạ quang hổ phách.
  * 🥈 **Top 2**: Huy hiệu bạc sáng bạch kim.
  * 🥉 **Top 3**: Huy hiệu đồng ấm.
  * **#4, #5**: Huy hiệu xếp hạng cộng đồng.
* Hiển thị chi tiết số lượng bài đóng góp, số quán ăn và số món ăn đã chia sẻ.

---

## 5. QUY TRÌNH DI DỜI SANG VPS MỚI TRONG 5 PHÚT (ZERO LOCK-IN)

Khi anh muốn chuyển sang bất kỳ nhà cung cấp VPS nào khác (Hetzner, Vultr, DigitalOcean, Linode, AWS, Vietnix...):

### Bước 1: Khởi động dự án trên VPS mới
Mở terminal VPS mới (hệ điều hành Ubuntu 22.04 / 24.04) và chạy:
```bash
git clone https://github.com/ChessmanOwO/Hom-nay-an-gi.git ~/Hom-nay-an-gi
cd ~/Hom-nay-an-gi && chmod +x deploy_azure.sh && ./deploy_azure.sh
```

### Bước 2: Chuyển dữ liệu cũ sang VPS mới (Nếu muốn giữ bài viết/user)
1. **Trên VPS cũ**, xuất bản sao lưu database:
   ```bash
   sudo docker exec $(sudo docker ps -qf "name=postgres") pg_dump -U hnag hnag > ~/backup.sql
   ```
2. Tải file `backup.sql` sang VPS mới và nạp vào:
   ```bash
   cat backup.sql | sudo docker exec -i $(sudo docker ps -qf "name=postgres") psql -U hnag -d hnag
   ```

### Bước 3: Đổi hướng CI/CD trên GitHub (Mất đúng 30 giây)
1. Vào `https://github.com/ChessmanOwO/Hom-nay-an-gi/settings/secrets/actions`.
2. Sửa 2 biến:
   * **`AZURE_VM_HOST`** 👉 Điền **IP của VPS mới**.
   * **`AZURE_VM_PASSWORD`** 👉 Điền **Mật khẩu SSH của VPS mới**.
3. Bấm **Save**. Từ nay GitHub Actions sẽ tự động deploy sang VPS mới!

---

## 6. BẢNG TRA CỨU LỆNH NHANH & KHẮC PHỤC SỰ CỐ (CHEAT SHEET)

| Thao tác mong muốn | Câu lệnh Terminal thực thi |
| :--- | :--- |
| **Cập nhật code thủ công trên VM** | `cd ~/Hom-nay-an-gi && git pull && sudo docker compose --env-file .env.vps -f compose.vps.yaml up -d --build` |
| **Xem trạng thái các Containers** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml ps` |
| **Xem log trực tiếp của ứng dụng** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml logs -f web` |
| **Khởi động lại toàn bộ dịch vụ** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml restart` |
| **Dọn dẹp rác Docker giải phóng ổ đĩa** | `sudo docker system prune -af --volumes` |
| **Chặn 1 IP khẩn cấp từ terminal** | `sudo docker exec -i $(sudo docker ps -qf "name=postgres") psql -U hnag -d hnag -c "INSERT INTO blocked_ips (ip, reason, created) VALUES ('IP_CẦN_CHẶN', 'Spam seeding', EXTRACT(EPOCH FROM NOW())*1000) ON CONFLICT DO NOTHING;"` |
| **Khóa 1 Google UID từ terminal** | `sudo docker exec -it $(sudo docker ps -qf "name=web") node scripts/account-access.mjs disable <GOOGLE_UID>` |
| **Mở khóa 1 Google UID từ terminal** | `sudo docker exec -it $(sudo docker ps -qf "name=web") node scripts/account-access.mjs enable <GOOGLE_UID>` |

---
*Tài liệu này được tạo tự động và đồng bộ trực tiếp trên Desktop cá nhân của anh Tú.*  
*Chúc dự án Hôm nay ăn gì phát triển rực rỡ và phục vụ hàng triệu bữa ăn ngon cho cộng đồng!* 🍲✨
