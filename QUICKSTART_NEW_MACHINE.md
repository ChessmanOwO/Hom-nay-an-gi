# Khởi chạy Hôm nay ăn gì? trên máy mới

Có hai đường chạy riêng: bản Node/VPS dùng Google và bản Sites/Cloudflare dùng danh tính Sites. Không trộn dữ liệu hay cấu hình đăng nhập giữa hai bản.

## Node.js / Google — local

Yêu cầu Node.js 24 và npm.

```sh
npm ci
npm run build:vps
cp .env.vps.example .env.vps
```

Trong `.env.vps`, đặt `PUBLIC_ORIGIN=http://localhost:3000` khi chạy local và điền email Google đã xác minh của bạn vào `ADMIN_EMAILS`. Không đặt `NODE_ENV=production` nếu thử bằng HTTP. Không sao chép file môi trường của người khác hoặc commit `.env.vps` vào Git.

```sh
npm run start:vps
```

Lệnh này tự đọc `.env.vps`. Mở http://localhost:3000 và đăng nhập Google. SQLite sẽ tự áp dụng toàn bộ migrations khi khởi động; không chỉ chạy riêng migration cuối. Mặc định dữ liệu là `vps/data/app.sqlite` và `vps/data/objects/`, trừ khi bạn cấu hình `DATA_DIR` khác.

Email nằm trong `ADMIN_EMAILS` chỉ nhận quyền quản trị ứng dụng sau khi backend xác minh đăng nhập. Đây không phải quyền IAM quản trị Firebase/Google Cloud. Người đăng ký đầu tiên không tự thành admin.

## Docker / VPS

Dùng `.env.vps` riêng trên máy chủ, theo `.env.vps.example`:

- `PUBLIC_ORIGIN` phải là tên miền HTTPS thật. Compose ép chế độ production; dùng HTTP localhost trong Compose production sẽ không được chấp nhận.
- `ADMIN_EMAILS` và `MODERATOR_EMAILS` được truyền vào backend qua `env_file`.
- Thêm hostname thật vào Authorized domains của Firebase `hom-nay-an`.
- Cấu hình Nginx/TLS và trusted proxy theo `README_VPS.md`.

```sh
docker compose --env-file .env.vps -f compose.vps.yaml up -d --build
```

Dữ liệu nằm trong Docker volume `app_data`, bên trong container là `/data/app.sqlite` và `/data/objects/`. Không phải thư mục `data/uploads/` trên host. Sao lưu cả database và ảnh, thử khôi phục trước khi mở dùng thật. Image Docker và Nginx cần kiểm chứng trên VPS thật; không coi build Node thành công là đã kiểm chứng triển khai Docker production.

## Sites / Cloudflare — local

`.dev.vars` chỉ dành cho môi trường chạy thử Worker. Preview mặc định dùng mock identity của Sites, không phải Google/Firebase; email admin phải khớp mock identity nếu muốn kiểm thử quyền. Cấu hình production Sites nằm ở biến môi trường do nền tảng cấp.

```sh
npm ci
npm run build
npm run dev -- --hostname 127.0.0.1
```

Cổng dev mặc định của dự án là **5173**, hoặc cổng được terminal thông báo. Với D1 local hoàn toàn mới, cần áp dụng toàn bộ migrations theo thứ tự, không chỉ file 0007; không chạy lại các migrations đã áp dụng trên database đang có dữ liệu.

## Dữ liệu ban đầu và kiểm tra

Máy mới có database trống. Random chỉ mở khi đủ 10 loại món thật được chuẩn hóa, có quán hoạt động và đánh giá được duyệt. Không tạo món/đánh giá giả hoặc tính dữ liệu minh họa để mở khóa production.

```sh
npx tsc --noEmit
npm run test:auth
npm run build:vps
npm run build
```

Chi tiết về cookie, quyền sở hữu tài khoản, lưu trữ và triển khai: `README_VPS.md`.
