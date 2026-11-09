# Bản PostgreSQL

Hướng dẫn hiện hành ở POSTGRESQL.md. Backend PC/VPS dùng DATABASE_URL, ảnh ở DATA_DIR. Phần dưới là tài liệu lịch sử SQLite, chỉ áp dụng cho bản cũ.

# Hôm nay ăn gì? — bản Google Sign-in cho máy chủ riêng

Bản này dùng cùng giao diện và các API nghiệp vụ với bản Sites. Có đường chạy riêng bằng Node.js, SQLite và thư mục ảnh riêng tư, không cần Cloudflare Worker/D1 để chạy. Mục tiêu ban đầu: khoảng 100 người truy cập/ngày. Chưa kiểm thử tải để cam kết một cấu hình VPS cụ thể.

## Trạng thái đăng nhập

- Đã bật Google Sign-in trên dự án Firebase `hom-nay-an` và đăng ký ứng dụng web.
- Bản VPS có nút **Tiếp tục với Google**, tạo hồ sơ sau khi backend xác minh thành công và đăng xuất.
- Firebase Authentication lưu danh tính Google. PostgreSQL lưu hồ sơ ứng dụng và liên kết bài/quán theo `firebase:<UID>`.
- Server chỉ chấp nhận JWT RS256 đúng chữ ký Google, đúng issuer/audience/project, còn hạn, email đã xác minh và `sign_in_provider=google.com`. Không tin UID/email/quyền quản trị do trình duyệt tự khai.
- Phiên ứng dụng dùng cookie HttpOnly, SameSite=Lax, Secure với HTTPS. Database lưu hash của mã phiên, không lưu token Google hoặc mã phiên gốc. Phiên hết hạn không muộn hơn Firebase ID token (khoảng một giờ); Firebase SDK đồng bộ lại phiên khi refresh token.
- Không cần service-account private key cho kiểm tra chữ ký JWT. Hiện không kiểm tra thu hồi token/khóa tài khoản Firebase tức thời; cookie đã cấp có thể dùng đến hết hạn. Đăng xuất ứng dụng hủy phiên hiện tại.
- Không tự nối dữ liệu tài khoản Sites cũ theo email. Việc chuyển quyền bài cũ cần được xử lý rõ khi chuyển dữ liệu, tránh nhận nhầm chủ sở hữu.
- Bản đang chạy trên `chatgpt.site` giữ đăng nhập Sites/ChatGPT. Google Sign-in này thuộc bản VPS/local, chưa tự xuất hiện trên URL Sites.

## Chạy thử trên máy hiện tại

Yêu cầu Node.js 24 và npm. Không dùng `npm start` để chạy bản VPS — lệnh đó vẫn là preview Worker cũ.

```sh
npm ci
npm run build:vps
PUBLIC_ORIGIN=http://localhost:3000 APP_HOST=127.0.0.1 DATA_DIR=vps/data npm run start:vps
```

Mở **http://localhost:3000**, bấm Đăng nhập → Tiếp tục với Google. Dùng hostname `localhost` đã được cấu hình trong Firebase; `127.0.0.1` là hostname khác cho OAuth.

`npm run start:vps` tự nạp `.env.vps` nếu file có tồn tại. Biến đã được hệ điều hành/Docker cấp sẽ được ưu tiên. Không dùng `.dev.vars` cho backend Node. File `.env.vps` trên máy phát triển là cấu hình local; khi đưa lên production phải cấu hình lại hostname HTTPS, thư mục dữ liệu và trusted proxy.

Nếu muốn tài khoản của bạn có quyền quản trị, đặt `ADMIN_EMAILS` ở môi trường máy chủ thành email Google đã xác minh. Mặc định không có quản trị viên; không có cơ chế người đăng ký đầu tiên tự thành admin. Danh sách `MODERATOR_EMAILS` chỉ có quyền kiểm duyệt.

Dữ liệu mặc định nằm trong `vps/data/app.sqlite` và ảnh trong `vps/data/objects/`. Không phục vụ thư mục objects bằng Nginx/static: mọi lần xem ảnh phải đi qua API kiểm tra quyền/công khai. Ảnh chỉ JPEG/PNG, tối đa 5 ảnh/bài, server giới hạn 3 MB/ảnh sau xử lý. Bản VPS đầu tiên lưu ảnh trong volume, chưa có CDN/S3/R2 ngoài máy chủ; theo dõi dung lượng và sao lưu riêng ảnh.

## Đưa lên VPS

Cấu hình khởi đầu dự kiến: 1 vCPU, RAM 2 GB, SSD 40 GB cho tải nhẹ. Build Docker trên CI/máy khác nếu VPS ít RAM. Các bước dưới đây chỉ chạy khi đã có máy chủ; chưa có VPS nào được cấu hình hoặc thanh toán trong tác vụ này.

1. Sao chép mã nguồn; không sao chép `.wrangler`, nhật ký Firebase, `.dev.vars` hoặc file môi trường máy phát triển.
2. Sao chép `.env.vps.example` thành `.env.vps`, thay `PUBLIC_ORIGIN` bằng tên miền HTTPS thật và điền `ADMIN_EMAILS`. Không commit file `.env.vps`.
3. Trong Firebase Console → Authentication → Settings → Authorized domains, thêm đúng hostname của tên miền thật. Không có giao thức/đường dẫn/cổng trong trường này.
4. Build và chạy:

   ```sh
   docker compose --env-file .env.vps -f compose.vps.yaml up -d --build
   ```

5. Dùng mẫu `vps/nginx.conf.example` trên host, thay tên miền và cấu hình chứng chỉ TLS. Mẫu cổng 80 là bước ban đầu; production phải phục vụ HTTPS khớp `PUBLIC_ORIGIN`.
6. Cổng ứng dụng chỉ công bố ở `127.0.0.1:3000`. Mẫu Compose dùng gateway `172.29.0.1`; `TRUSTED_PROXY_IPS` phải khớp gateway này. Nginx ghi đè `X-Real-IP` bằng `$remote_addr`. Không nhận IP do client tự khai. Nếu dùng subnet khác, cập nhật cả hai chỗ. Nếu dùng Cloudflare proxy phía trước Nginx, phải cấu hình trusted real IP của Cloudflare đúng trước khi bật, không tin toàn bộ X-Forwarded-For.
7. Kiểm tra `/healthz`, đăng nhập/đăng xuất Google, gửi bài/duyệt bài và thử tài khoản thứ hai trước khi mời người dùng.

Không mở trực tiếp cổng SQLite hoặc thư mục ảnh ra Internet. Docker chạy bằng tài khoản không phải root và volume giữ dữ liệu qua lần cập nhật container.

## Sao lưu và chuyển dữ liệu

Sao lưu cả SQLite lẫn thư mục objects/volume. Không chỉ sao chép file `.sqlite` trong lúc đang ghi mà bỏ qua WAL: dùng backup API của SQLite hoặc dừng ứng dụng trong lúc sao chép volume. Thử khôi phục trên một thư mục/máy thử trước khi dựa vào bản sao.

Bản JSON cộng đồng tự tạo sau lượt ghi nghiệp vụ thành công đầu tiên trong ngày, lưu riêng tư 30 ngày, không thay thế backup đầy đủ volume. Bản xuất đó không chứa phiên đăng nhập và không mang theo nội dung các file ảnh.

Dữ liệu Sites cũ và dữ liệu local/VPS chưa được gộp hoặc chuyển. Không đưa dữ liệu SPEC trong tests lên production. UID Firebase và ID tài khoản Sites là hai không gian riêng; phải có quy trình chuyển quyền rõ ràng trước khi cho tài khoản Firebase chỉnh bài cũ.

## Kiểm tra bản bàn giao

```sh
npx tsc --noEmit
npm run test:auth
npm run build:vps
npm run build
```

Kiểm thử token dùng khóa sinh trong bộ nhớ và bộ xác minh được truyền vào riêng tiến trình test. Server production không có biến môi trường để tin khóa test, token giả hoặc header danh tính Sites do client gửi. Kiểm thử này không giả vờ một tài khoản Google thật đã đăng nhập qua giao diện.

Đã nhận đăng nhập Google thật trên localhost và tạo hồ sơ trong bản local. Vẫn cần xác nhận OAuth trên hostname production khi triển khai máy chủ thật. Cấu hình Docker/Nginx cần được kiểm tra trên VPS thật; Docker daemon trên máy phát triển chưa chạy nên chưa build/chạy image Docker tại đây.


## Thu hồi phiên và khóa tài khoản tại ứng dụng

Sau khi đã chạy migration 0010, người vận hành có quyền truy cập VPS có thể dùng Firebase UID:

```sh
docker compose -f compose.vps.yaml exec web node scripts/account-access.mjs revoke FIREBASE_UID
docker compose -f compose.vps.yaml exec web node scripts/account-access.mjs disable FIREBASE_UID
docker compose -f compose.vps.yaml exec web node scripts/account-access.mjs enable FIREBASE_UID
```

revoke xóa toàn bộ phiên ứng dụng và từ chối token có auth_time trước hoặc bằng thời điểm thu hồi. Thành viên phải đăng nhập Google lại. disable khóa tài khoản đồng thời thu hồi phiên. enable mở khóa, vẫn yêu cầu token sau thời điểm thu hồi.

Công cụ chỉ cập nhật database ứng dụng. Khóa hoặc thu hồi tài khoản trong Firebase Console chưa tự đồng bộ về ứng dụng. Khi xử lý sự cố phải thực hiện cả thao tác tại Firebase và lệnh tương ứng tại VPS. Người có quyền chạy lệnh phải được quản lý như quản trị hệ thống.

Ở production, khi không lấy được IP tin cậy, API tạo phiên trả 503 để yêu cầu sửa cấu hình proxy. Khi chạy development, API áp dụng giới hạn dự phòng 120 lần thử mỗi 10 phút. Nhiều người dùng cùng đường proxy sai có thể cùng chạm giới hạn. Cần xác minh TRUSTED_PROXY_IPS và X-Real-IP trên máy triển khai.
