# PostgreSQL cho bản PC/VPS

Backend PC/VPS mặc định dùng PostgreSQL, đọc DATABASE_URL và PG_POOL_MAX (mặc định 10 kết nối mỗi tiến trình, snapshot worker thêm 1). Google login vẫn dùng Firebase. Nhánh Worker/D1 và schema Drizzle SQLite cũ phục vụ triển khai Sites riêng.

## Chạy

Cần PostgreSQL 17 hoặc phiên bản tương thích. Tạo database và user có quyền tạo bảng, index, function và trigger trong schema public của database đó. Cấu hình DATABASE_URL trong .env.vps, ví dụ postgresql://USER:PASSWORD@HOST:5432/DATABASE. URI-encode ký tự đặc biệt trong mật khẩu và bật SSL xác minh chứng chỉ khi dùng dịch vụ yêu cầu TLS. Không đưa thông tin thật vào source.

Chạy npm ci, npm run build:vps, npm run start:vps. Server tự áp dụng SQL trong postgres/ theo thứ tự dưới khóa migration. Thư mục drizzle/ là migration SQLite cũ, không áp dụng vào PostgreSQL. Giữ DATA_DIR để chứa ảnh riêng tư.

Compose đã có dịch vụ postgres:17 với volume pg_data, healthcheck và dependency của web. Dùng docker compose --env-file .env.vps -f compose.vps.yaml up -d --build. Đặt POSTGRES_PASSWORD bằng mật khẩu thật, URI-safe, trước khi chạy. Không mở cổng PostgreSQL ra Internet trong mẫu Compose.

## Chuyển dữ liệu SQLite cũ

Dừng mọi tiến trình ghi của bản SQLite và sao lưu database cùng thư mục objects. Tạo PostgreSQL mới và chạy server một lần để áp dụng migration, rồi dừng server. Chạy lệnh sau với DATABASE_URL trỏ vào database mới đã migrate:

node --env-file=.env.vps scripts/import-sqlite.mjs /absolute/path/to/app.sqlite

Công cụ yêu cầu đích chưa có dữ liệu ứng dụng, nhập trong một transaction và rollback khi lỗi. Nguồn mở read-only. Các bài pending/hidden/deleted đều được giữ, trigger đếm vào quota 10. Copy thư mục objects sang DATA_DIR/objects riêng, giữ nguyên tên tệp. Xác minh tổng số bản ghi và ảnh trước khi cho người dùng ghi vào bản mới. Không tự chuyển dữ liệu đang chạy của máy người dùng.

## Thu hồi tài khoản

node --env-file=.env.vps scripts/account-access.mjs revoke FIREBASE_UID
node --env-file=.env.vps scripts/account-access.mjs disable FIREBASE_UID
node --env-file=.env.vps scripts/account-access.mjs enable FIREBASE_UID

## Kiểm thử đã chạy

PostgreSQL 17.11 thật chạy tại loopback trên Windows với database tạm riêng. PASS migrations đồng thời, quota 10 qua 16 kết nối cạnh tranh, SQL rollback, API ownership/moderation, session và disable CLI, nhập SQLite, từ chối nhập vào đích có dữ liệu. PASS HTTP server đã build với 96 yêu cầu, concurrency 32 và snapshot worker. Hai thao tác toggle lưu đồng thời có thể trả 409 do tranh chấp unique và được kiểm tra không trả lỗi máy chủ.

PASS build:vps, TypeScript, các bộ tests/postgres.ts, tests/postgres-http.mjs, tests/firebase-auth.ts, tests/place-limit.ts, tests/abuse.ts, tests/unit.ts. Audit production 0 cảnh báo. Compose parse PASS. Docker Engine máy này chưa chạy được nên container Linux và VPS thật chưa kiểm thử.

Câu lệnh test yêu cầu TEST_DATABASE_URL trỏ vào PostgreSQL test, user có quyền CREATE DATABASE. Tests tự tạo rồi xóa database có tên ngẫu nhiên, không dùng database production.

## Giới hạn và vận hành

Các write transaction qua adapter dùng chung advisory lock để giữ đúng admission count chống spam từ API cũ. Đọc dùng pool song song. Khi tải ghi tăng, đây là điểm cần đo và tối ưu theo từng loại thao tác. Quota đánh giá dùng bộ đếm nguyên tử PostgreSQL nên vẫn chặn vượt 10 khi ghi trực tiếp qua nhiều kết nối. Pool tổng phải tính mọi tiến trình và worker.

Ảnh vẫn dùng kho file riêng. Nhiều máy web phải chia sẻ object storage hoặc filesystem thích hợp. Sao lưu PostgreSQL bằng pg_dump và thử pg_restore cùng bộ ảnh, không sao chép file app.sqlite theo hướng dẫn cũ. Bản JSON theo ngày là hỗ trợ xuất nội dung. Không thay thế backup đầy đủ PostgreSQL, tài khoản, quota và ảnh.
