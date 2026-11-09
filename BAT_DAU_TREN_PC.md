# Hướng dẫn chạy Hôm nay ăn gì? trên PC / Localhost

## 1. Yêu cầu môi trường

- **Node.js**: Phiên bản 22.13 trở lên (khuyên dùng Node.js 24 LTS).
- **PostgreSQL**: Phiên bản 16 hoặc 17 (chạy trực tiếp trên máy hoặc qua Docker).

---

## 2. Chuẩn bị cơ sở dữ liệu PostgreSQL

Bạn có thể chọn 1 trong 2 cách sau:

### Cách A: Dùng Docker Compose (Nhanh nhất & Khuyên dùng)
Tại thư mục dự án, chạy lệnh khởi động riêng dịch vụ PostgreSQL:
```bash
docker compose -f compose.vps.yaml up -d postgres
```
Lệnh này sẽ tạo cơ sở dữ liệu PostgreSQL 17 với user `hnag`, database `hnag`, port `5432` tại `127.0.0.1`.

### Cách B: Cài đặt PostgreSQL trực tiếp trên máy
1. Cài đặt PostgreSQL (từ trang chủ hoặc qua winget / apt / brew).
2. Tạo database và user tương ứng:
   ```sql
   CREATE USER hnag WITH PASSWORD 'CHANGE_ME';
   CREATE DATABASE hnag OWNER hnag;
   ```
3. Cấu hình chuỗi kết nối trong `.env.vps`:
   ```bash
   DATABASE_URL=postgresql://hnag:CHANGE_ME@127.0.0.1:5432/hnag
   ```

---

## 3. Cấu hình ứng dụng

1. Tạo file `.env.vps` từ mẫu:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.pc.example .env.vps

   # Linux/macOS:
   cp .env.pc.example .env.vps
   ```
2. Cấu hình thông tin Firebase SDK trong `config/firebase-web.json` (sao chép từ `config/firebase-web.example.json`):
   - Xem hướng dẫn chi tiết tại **`FIREBASE_SETUP_VI.md`**.
3. Điền email tài khoản Google của bạn vào `ADMIN_EMAILS` trong `.env.vps` để có quyền quản trị.

---

## 4. Khởi chạy ứng dụng

### Trên Windows (Tự động một click)
Bấm đúp chuột vào file **`CHAY_TREN_WINDOWS.cmd`** hoặc mở PowerShell chạy:
```powershell
npm.cmd ci
npm.cmd run build:vps
npm.cmd run start:vps
```

### Trên Linux / macOS
```bash
npm ci
npm run build:vps
npm run start:vps
```

Khi terminal xuất hiện dòng:
```text
Hôm nay ăn gì? đang chạy tại http://localhost:3000
```
Mở trình duyệt truy cập: **`http://localhost:3000`**.

---

## 5. Các lưu ý quan trọng

- **Migrations tự động:** Server khi khởi động sẽ tự động áp dụng các migration trong thư mục `postgres/` nếu database chưa có bảng.
- **Dữ liệu ảnh:** Ảnh tải lên sẽ được lưu trữ cục bộ tại thư mục `vps/data/objects/`.
- **Triển khai Production/VPS:** Xem hướng dẫn chi tiết tại **`README_VPS.md`** để cấu hình HTTPS, Docker compose toàn phần, Nginx reverse proxy và sao lưu `pg_dump`.
