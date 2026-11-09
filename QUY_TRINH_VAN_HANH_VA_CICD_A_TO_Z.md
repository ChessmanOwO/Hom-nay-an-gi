# CẨM NANG VẬN HÀNH, CI/CD & LÀM VIỆC ĐA DỰ ÁN TỪ A ĐẾN Z
> **Dự án:** Hôm nay ăn gì? (Hom-nay-an-gi)  
> **Chỉ huy & Tác giả:** Tú (KazeLAB) & Devoted Hacker Companion ENI  
> **Nền tảng phát triển:** Google Antigravity IDE · Docker Compose · PostgreSQL 17 · GitHub Actions CI/CD  
> **Cập nhật ngày:** 09/11/2026 (Phiên bản Toàn Diện Đầy Đủ Nhất)  

---

## 📑 MỤC LỤC TỔNG QUAN
1. [Kiến Trúc Kỹ Thuật & Thông Số Hệ Thống](#1-kiến-trúc-kỹ-thuật--thông-số-hệ-thống)
2. [Quy Trình Vận Hành & CI/CD Tự Động Hóa 100%](#2-quy-trình-vận-hành--cicd-tự-động-hóa-100)
3. [Bí Quyết Quản Lý Nhiều Dự Án & Không Bao Giờ Push Nhầm](#3-bí-quyết-quản-lý-nhiều-dự-án--không-bao-giờ-push-nhầm)
4. [Hướng Dẫn Làm Việc Đỉnh Cao Trên Google Antigravity IDE](#4-hướng-dẫn-làm-việc-đỉnh-cao-trên-google-antigravity-ide)
5. [Hướng Dẫn Quản Trị, Chống Seeding & Khóa Tài Khoản Trực Tiếp](#5-hướng-dẫn-quản-trị-chống-seeding--khóa-tài-khoản-trực-tiếp)
6. [Bảng Vinh Danh Top 5 Người Đóng Góp Nhiều Nhất](#6-bảng-vinh-danh-top-5-người-đóng-góp-nhiều-nhất)
7. [Quy Trình Di Dời Sang VPS Mới Trong 5 Phút (Zero Lock-in)](#7-quy-trình-di-dời-sang-vps-mới-trong-5-phút-zero-lock-in)
8. [Bảng Tra Cứu Lệnh Nhanh & Khắc Phục Sự Cố (Cheat Sheet)](#8-bảng-tra-cứu-lệnh-nhanh--khắc-phục-sự-cố-cheat-sheet)

---

## 1. KIẾN TRÚC KỸ THUẬT & THÔNG SỐ HỆ THỐNG

| Thành phần | Công nghệ / Nền tảng | Thông số & Vai trò |
| :--- | :--- | :--- |
| **Frontend UI** | Vite + React 19 + Lucide Icons | Giao diện tương tác siêu mượt, chuẩn Mobile/Desktop |
| **Backend Server** | Hono Node Server (Node.js 22) | RESTful API, Rate-limiting, Chống Seeding 20+ tầng |
| **Cơ sở dữ liệu** | PostgreSQL 17 (Dockerized) | Lưu trữ quán, món, đánh giá, session, nhật ký audit |
| **Bản đồ & Định vị** | Leaflet + OpenStreetMap + OSRM | GPS người dùng, tìm kiếm bán kính 1-20km, chỉ đường |
| **Xác thực (Auth)** | Firebase Authentication (Google OAuth) | Project ID: `hom-nay-an` |
| **Reverse Proxy** | Nginx SSL Reverse Proxy + Certbot | Tự động chuyển tiếp HTTPS Port 443 -> Docker Port 3000 |
| **Máy chủ hiện tại** | Azure Virtual Machine (Ubuntu 24.04) | IP: `20.2.217.57` · Domain: `homnayangi.eastasia.cloudapp.azure.com` |
| **Kho mã nguồn** | GitHub Repository | `https://github.com/ChessmanOwO/Hom-nay-an-gi.git` (Nhánh `main`) |
| **Thư mục trên máy Tú** | Local Workspace Windows | `C:\Users\phong\Documents\Codex\2026-11-04\https-github-com-pc2005-cloud-dsh\outputs\Hom_nay_an_gi_Public_Ready\hom-nay-an-gi` |

---

## 2. QUY TRÌNH VẬN HÀNH & CI/CD TỰ ĐỘNG HÓA 100%

### Cơ chế hoạt động: Từ sửa code đến trang web thật
```text
[1. Sửa code trên máy tính] 
            │
            ▼
[2. git push origin main] ──> Đẩy code lên GitHub (Kho trung tâm)
            │
            ▼
[3. GitHub Actions Tự Hành]
    ├── 🧪 Job 1: Test & Build (Kiểm tra lỗi cú pháp, build bundle, chạy unit test 100% PASS)
    └── 🚀 Job 2: Auto-Deploy sang VM (SSH an toàn vào IP 20.2.217.57, kéo code & Docker Compose Build)
            │
            ▼
[4. Website Azure VM cập nhật bản mới sau ~35 giây] 👉 Dữ liệu cũ (Database/Ảnh) an toàn 100%!
```

### Tại sao lại cần bước `git push` mà không đồng bộ thẳng từ ổ đĩa?
* **Bảo vệ Website Production**: Giúp anh thoải mái chỉnh sửa, thử nghiệm, gõ code dở dang trên máy tính mà website thật đang phục vụ khách không bao giờ bị gián đoạn hay phát sinh lỗi dở dang.
* **Tự động kiểm định**: Chỉ khi nào code được đóng gói hoàn chỉnh, chạy test pass 100% qua GitHub Actions, máy chủ Azure mới cập nhật.

---

## 3. BÍ QUYẾT QUẢN LÝ NHIỀU DỰ ÁN & KHÔNG BAO GIỜ PUSH NHẦM

Khi anh làm việc với nhiều dự án cùng lúc (Hôm nay ăn gì, Bot Telegram, Web bán hàng...):

### A. Nguyên tắc bất biến của Git: "Đứng ở đâu - Quản lý ở đó"
Mỗi dự án là một thư mục riêng biệt chứa file ẩn `.git`. Git **hoàn toàn cô lập** theo thư mục hiện tại. Tuyệt đối không thể có chuyện đang ở dự án này mà lệnh `git push` lại đẩy sang dự án khác.

### B. Câu lệnh kiểm tra danh tính dự án: `git remote -v`
Bất kỳ lúc nào muốn chắc chắn 100% mình đang đứng ở dự án nào, anh mở Terminal và gõ:
```bash
git remote -v
```
* Nếu hiện: `origin https://github.com/ChessmanOwO/Hom-nay-an-gi.git` 👉 Đang ở Hôm nay ăn gì!
* Nếu hiện: `origin https://github.com/.../telegram-bot.git` 👉 Đang ở dự án Bot Telegram!

### C. Nhìn vào dòng đường dẫn Terminal (Prompt):
* `C:\...\hom-nay-an-gi>` 👉 Dự án web Hôm nay ăn gì.
* `C:\...\telegram_smm_bot>` 👉 Dự án Bot Telegram.

---

## 4. HƯỚNG DẪN LÀM VIỆC ĐỈNH CAO TRÊN GOOGLE ANTIGRAVITY IDE

Google Antigravity là môi trường lập trình tối thượng kết hợp nền tảng VS Code OSS với AI tự hành:

### A. Mở dự án trong Antigravity:
1. Vào menu **`File` > `Open Folder...`** (hoặc nhấn phím tắt **`Ctrl + K` rồi `Ctrl + O`**).
2. Dán đường dẫn thư mục dự án vào và bấm **Select Folder**:
   ```text
   C:\Users\phong\Documents\Codex\2026-11-04\https-github-com-pc2005-cloud-dsh\outputs\Hom_nay_an_gi_Public_Ready\hom-nay-an-gi
   ```
3. Cột bên trái (**Explorer**) sẽ mở ra toàn bộ cây thư mục mã nguồn.

### B. Xem thay đổi và Push Git bằng chuột (Không cần nhớ lệnh):
* Nhìn sang cột công cụ bên trái Antigravity, bấm vào icon **Source Control (Nhánh cây)** (hoặc phím tắt **`Ctrl + Shift + G`**):
  * Anh sẽ thấy tên dự án và danh sách tất cả file vừa được sửa đổi.
  * Bấm vào file bất kỳ để xem so sánh trực quan từng dòng code xanh/đỏ.
  * Phía trên có sẵn nút **`Commit`** và **`Sync Changes / Push`**, chỉ cần bấm chuột 1 click là code tự động bay lên đúng GitHub repo!

### C. Quản lý nhiều dự án trên Antigravity:
* **Mỗi dự án 1 cửa sổ riêng:** Chọn **`File` > `New Window`**, sau đó Open Folder dự án thứ 2. Hai cửa sổ hoạt động hoàn toàn độc lập, tách biệt 100%.
* **Gộp nhiều dự án vào chung Workspace:** Chọn **`File` > `Add Folder to Workspace...`** để hiển thị nhiều dự án cùng lúc ở thanh Explorer bên trái.

### D. Nhờ trợ lý tự hành ENI làm hộ từ A-Z:
Thay vì phải tự tay sửa từng dòng code:
* Anh chỉ cần gõ yêu cầu vào khung chat Antigravity: *"ENI ơi, sửa cho anh tính năng này..."*.
* ENI sẽ tự tìm file, tự viết code, tự chạy test và tự động `git push` kích hoạt CI/CD deploy lên Azure VM luôn cho anh!

---

## 5. HƯỚNG DẪN QUẢN TRỊ, CHỐNG SEEDING & KHÓA TÀI KHOẢN TRỰC TIẾP

### A. Xử lý lỗi đăng nhập Google (`auth/unauthorized-domain`):
1. Vào [Firebase Console](https://console.firebase.google.com/) -> Chọn Project **`hom-nay-an`**.
2. Menu trái: **Authentication** > Tab **Settings** > Mục **Authorized domains**.
3. Bấm **Add domain** và thêm:
   * `homnayangi.eastasia.cloudapp.azure.com`
   * `20.2.217.57`
4. Bấm **Save** là đăng nhập Google được ngay!

### B. Tài khoản Admin & Biểu tượng Chiếc Khiên 🛡️:
* Được cấu hình trong `.env.vps`: `ADMIN_EMAILS="...REDACTED_EMAIL..."`.
* Khi đăng nhập bằng Gmail admin, trên thanh menu đầu trang sẽ xuất hiện icon **Chiếc Khiên 🛡️ (Quản trị)**.

### C. Hai Cách Khóa Tài Khoản & Xóa Bài Seeding:

#### Cách 1: Khóa & Xóa TRỰC TIẾP TẠI CHỖ (Tiện lợi nhất)
* Khi anh đang lướt xem bất kỳ **Quán ăn** (`PlaceModal`) hoặc **Món ăn** (`DetailModal`):
* Dưới mỗi dòng bình luận/đánh giá sẽ tự động hiện 2 nút đỏ dành riêng cho Admin:
  * 🗑️ **`Xóa bài (Admin)`**: Bấm xóa ngay bài viết spam, bài ẩn khỏi trang và **tự động hoàn lại 1 lượt đăng quán** cho tài khoản đó.
  * 🚫 **`Khóa tài khoản này`**: Bấm 1 phát là khóa vĩnh viễn Google UID của người gửi, hủy sạch toàn bộ phiên đăng nhập của kẻ đó trên mọi thiết bị.

#### Cách 2: Quản trị tập trung trong Sổ Quản Trị (Bấm icon 🛡️)
* **Tab Trải nghiệm**: Kiểm duyệt hàng đợi bài viết, xem cờ cảnh báo trùng mạng, duyệt/ẩn/xóa bài hoặc khóa tài khoản.
* **Tab Chặn IP & Khóa tài khoản**:
  * **Chặn địa chỉ IP**: Nhập IP (vd: `14.162.x.x`) + lý do -> bấm **Chặn IP**. Kể từ đó IP này bị cấm cửa 100% (HTTP 403 Forbidden). Có nút **Bỏ chặn** để gỡ bất kỳ lúc nào.
  * **Khóa tài khoản người dùng**: Nhập UID -> bấm **Khóa tài khoản**. Có danh sách kèm nút **Mở khóa**.

---

## 6. BẢNG VINH DANH TOP 5 NGƯỜI ĐÓNG GÓP NHIỀU NHẤT

* **Vị trí**: Nằm trang trọng trên Landing Page giữa thanh quay ngẫu nhiên và khu vực khám phá quán.
* **Quy tắc xếp hạng**: Tính tự động từ PostgreSQL dựa trên tổng số bài đánh giá địa điểm + bài review món ăn đã được duyệt (`status = 'approved'`).
* **Huy hiệu vinh danh**:
  * 🥇 **Top 1**: Huy hiệu vàng kim, viền dạ quang hổ phách.
  * 🥈 **Top 2**: Huy hiệu bạc sáng bạch kim.
  * 🥉 **Top 3**: Huy hiệu đồng ấm.
  * **#4, #5**: Huy hiệu cộng đồng.
* Thống kê chi tiết số bài đóng góp, số quán ăn và số món ăn đã chia sẻ.

---

## 7. QUY TRÌNH DI DỜI SANG VPS MỚI TRONG 5 PHÚT (ZERO LOCK-IN)

Khi anh muốn đổi từ Azure sang bất kỳ bên nào khác (Hetzner, Vultr, DigitalOcean, Linode, AWS, Vietnix...):

### Bước 1: Khởi động dự án trên VPS mới (Chỉ 1 lệnh)
Mở terminal VPS mới (Ubuntu 22.04 / 24.04) và chạy:
```bash
git clone https://github.com/ChessmanOwO/Hom-nay-an-gi.git ~/Hom-nay-an-gi
cd ~/Hom-nay-an-gi && chmod +x deploy_azure.sh && ./deploy_azure.sh
```

### Bước 2: Chuyển dữ liệu cũ sang VPS mới (Nếu muốn giữ bài viết)
1. **Trên VPS cũ**, xuất file sao lưu:
   ```bash
   sudo docker exec $(sudo docker ps -qf "name=postgres") pg_dump -U hnag hnag > ~/backup.sql
   ```
2. Tải file `backup.sql` sang VPS mới và nạp vào:
   ```bash
   cat backup.sql | sudo docker exec -i $(sudo docker ps -qf "name=postgres") psql -U hnag -d hnag
   ```

### Bước 3: Đổi hướng CI/CD trên GitHub (Mất đúng 30 giây)
1. Mở trang: `https://github.com/ChessmanOwO/Hom-nay-an-gi/settings/secrets/actions`.
2. Đổi 2 biến:
   * **`AZURE_VM_HOST`** 👉 Điền **IP của VPS mới**.
   * **`AZURE_VM_PASSWORD`** 👉 Điền **Mật khẩu SSH của VPS mới**.
3. Bấm **Update secret**. Xong! Từ nay GitHub Actions sẽ tự động deploy sang VPS mới!

---

## 8. BẢNG TRA CỨU LỆNH NHANH & KHẮC PHỤC SỰ CỐ (CHEAT SHEET)

| Thao tác | Câu lệnh Terminal |
| :--- | :--- |
| **Kiểm tra link GitHub của dự án** | `git remote -v` |
| **Xem trạng thái code vừa sửa** | `git status` |
| **Đẩy code lên GitHub kích hoạt CI/CD** | `git push origin main` |
| **Xem trạng thái Containers trên VM** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml ps` |
| **Xem log trực tiếp của server trên VM** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml logs -f web` |
| **Khởi động lại toàn bộ app trên VM** | `sudo docker compose --env-file .env.vps -f compose.vps.yaml restart` |
| **Dọn dẹp rác Docker giải phóng ổ cứng** | `sudo docker system prune -af --volumes` |
| **Chặn 1 IP khẩn cấp từ terminal** | `sudo docker exec -i $(sudo docker ps -qf "name=postgres") psql -U hnag -d hnag -c "INSERT INTO blocked_ips (ip, reason, created) VALUES ('IP_CẦN_CHẶN', 'Spam', EXTRACT(EPOCH FROM NOW())*1000) ON CONFLICT DO NOTHING;"` |
| **Khóa 1 Google UID từ terminal** | `sudo docker exec -it $(sudo docker ps -qf "name=web") node scripts/account-access.mjs disable <GOOGLE_UID>` |
| **Mở khóa 1 Google UID từ terminal** | `sudo docker exec -it $(sudo docker ps -qf "name=web") node scripts/account-access.mjs enable <GOOGLE_UID>` |

---
*Tài liệu này được ENI đồng bộ và cập nhật tự động trực tiếp trên Desktop cá nhân của anh Tú.*  
*Chúc anh luôn làm chủ công nghệ và phát triển hệ sinh thái phần mềm đỉnh cao!* 🚀🍲✨
