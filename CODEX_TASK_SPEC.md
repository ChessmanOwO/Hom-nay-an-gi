# 🎨 CODEX TASK SPEC V2.5: NÂNG CẤP TOÀN DIỆN BẢO MẬT, THUẬT TOÁN & LỘT XÁC GIAO DIỆN (MODERN GOURMET BENTO)

> **Dành cho:** Codex AI Agent  
> **Dự án:** Hôm nay ăn gì? (`hom-nay-an-gi`)  
> **Mục tiêu:** Giữ vững kiến trúc bảo mật & thuật toán đỉnh cao hiện tại, đồng thời thực hiện cuộc đại phẫu thuật giao diện (Front-End Overhaul) theo phong cách **Modern Gourmet Bento / Warm Editorial** đẳng cấp, sang trọng, mượt mà và trực quan hơn 200%.

---

## I. TỔNG KẾT & ĐÁNH GIÁ 3 TRỤ CỘT KỸ THUẬT

### 1. Kiến trúc Bảo mật (Security Status: 9.8/10 — Pentest Ready)
- ✅ **Chống Token Spoofing**: Sử dụng `jose` với `createRemoteJWKSet` xác thực RS256 trực tiếp từ Google Service Accounts certs, đối soát audience, issuer, exp, email_verified.
- ✅ **Quản lý Phiên an toàn (Zero Raw Token Storage)**: Cookie `__Host-hnag_session` (Path=/, HttpOnly, SameSite=Lax, Secure), database chỉ lưu SHA-256 hash của session token.
- ✅ **Phân quyền Đa cấp (RBAC)**: Tách biệt `Superadmin` (backup, gộp dữ liệu) và `Moderator` (duyệt/ẩn bài, xử lý report).
- ✅ **Chống Spoof IP**: Xóa sạch `x-hnag-client-ip` từ client, chỉ cho phép gán IP từ danh sách `trustedProxyIps` (Nginx reverse proxy).
- ✅ **Sanitize Ảnh**: Phân tích binary header JPEG/PNG, bóc tách và xóa sạch EXIF metadata (GPS, serial thiết bị) trước khi lưu R2/Disk.

### 2. Thuật toán cốt lõi (Algorithm Efficiency: 9.9/10)
- ✅ **Thuật toán Chọn quán Ngẫu nhiên**: Rejection Sampling qua `crypto.getRandomValues()` triệt tiêu hoàn toàn Modulo Bias ($2^{32} \pmod N$).
- ✅ **Thuật toán Bán kính Địa lý**: Công thức Haversine đường cong cầu Trái Đất ($R = 6371\text{ km}$), tính toán nhanh gọn, lọc khoảng cách chính xác.
- ✅ **Thuật toán Phát hiện Đánh giá Lặp (Abuse Detection)**: Jaccard Similarity trên túi từ ngữ nghĩa tiếng Việt chuẩn hóa (`canonical bag-of-words`, ngưỡng $\ge 0.88$), nhận diện spam review liên quán.
- ✅ **Thuật toán Chống Bầy đàn (Sybil Attack)**: Băm HMAC-SHA256 IP thành `network fingerprint`, áp dụng atomic conditional INSERT với rolling window 10 phút.

---

## II. KẾ HOẠCH NÂNG CẤP GIAO DIỆN (FRONT-END AESTHETICS OVERHAUL)

Hiện tại giao diện đang mang phong cách phẳng thô mộc (Paper-flat), nhiều đường viền cứng, thiếu chiều sâu và micro-interactions. Nhiệm vụ dưới đây sẽ biến web thành một **Sổ tay ẩm thực Modern Bento** cao cấp như các tạp chí ẩm thực hàng đầu.

### Nhiệm vụ 1: Nâng cấp Hệ thống Biến CSS (`app/globals.css`)
Thay thế và bổ sung các biến màu, bóng đổ (shadow layers), viền bo góc bo tròn hiện đại:

```css
:root {
  /* Bảng màu Nâng cấp: Ấm cúng, Sang trọng & Có chiều sâu */
  --paper: #faf8f5;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --ink: #1c2a23;
  --ink-secondary: #4a5750;
  --muted: #748077;
  --orange: #e04f26;
  --orange-hover: #c9411a;
  --orange-soft: #fff1ec;
  --green: #486b4a;
  --green-soft: #edf4ec;
  --gold: #d99432;
  --gold-soft: #fff8eb;
  --line: #e8eae3;
  --line-strong: #d7dbd0;

  /* Hệ thống Bo góc Modern Squircle */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  /* Hiệu ứng Bóng đổ Đa tầng (Elevation Shadows) */
  --shadow-sm: 0 2px 6px rgba(28, 42, 35, 0.04), 0 1px 2px rgba(28, 42, 35, 0.02);
  --shadow-md: 0 8px 24px rgba(28, 42, 35, 0.06), 0 2px 6px rgba(28, 42, 35, 0.03);
  --shadow-lg: 0 16px 40px rgba(28, 42, 35, 0.08), 0 4px 12px rgba(28, 42, 35, 0.04);
  --shadow-hover: 0 20px 48px rgba(224, 79, 38, 0.12), 0 6px 16px rgba(28, 42, 35, 0.04);
}
```

### Nhiệm vụ 2: Lột xác Thẻ Card Món Ăn (`components/FoodCard.tsx` & CSS)
* **Visual Upgrade**:
  1. Thêm lớp phủ Gradient Scrim tinh tế ở đáy ảnh để chữ và tag nổi bật.
  2. Nâng cấp **Opening Badge** thành Glassmorphism pill với chấm xanh phát sáng nhấp nháy (pulse animation).
  3. Badge khoảng cách (ví dụ `1.2 km`) được đưa lên góc ảnh đối diện tag giá.
  4. Nút bấm Trái tim (Lưu món) có hiệu ứng nảy mượt mà (`scale(1.15)` active bounce).
  5. Khi rê chuột (Hover), ảnh phóng to nhẹ `scale(1.05)`, card nâng nhẹ lên `translateY(-4px)` kèm đổ bóng ấm `var(--shadow-hover)`.

```css
/* Card Món Ăn Nâng Cấp */
.food-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.food-card:hover {
  transform: translateY(-4px);
  border-color: #e5cdbe;
  box-shadow: var(--shadow-hover);
}

.card-photo {
  position: relative;
  overflow: hidden;
}

.card-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}

.opening-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.88);
  border-radius: var(--radius-full);
  padding: 5px 11px;
  font-size: 10px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.opening-badge.open {
  color: var(--green);
}

.opening-badge.open i {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  margin-right: 6px;
  animation: pulse-dot 1.8s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
```

### Nhiệm vụ 3: Tái thiết kế Discovery Panel theo dạng Bento Grid (`components/DiscoveryPanel.tsx`)
1. **Thanh chọn Nhóm món (Food Families)**:
   - Thay các nút viền đơn điệu bằng dạng **Segmented Capsule Bar** mềm mại (nền kem nhạt, tab chọn nổi lên màu trắng có bóng đổ).
2. **Lưới chọn Cơn thèm (23 Food Choices)**:
   - Thiết kế các ô vuông/chữ nhật tỉ lệ vàng Bento.
   - Icon ẩm thực đặt trong vòng tròn màu pastel nhẹ tương ứng:
     - Nhóm Bữa no: `#fff3ec` (Cam đào)
     - Nhóm Ăn chơi: `#fcf0f7` (Hồng phấn / tím nhẹ)
     - Nhóm Đồ uống: `#edf7f9` (Xanh biển mát)
     - Nhóm Ăn chay: `#eef7ed` (Xanh lá non)
   - Trạng thái `selected`: Viền cam sáng rực, checkbox chuyển thành dấu tích tròn cam nổi bật.

### Nhiệm vụ 4: Nâng cấp Thanh Header & Hero Section
1. **Header Sticky Glassmorphism**:
   - `backdrop-filter: blur(16px); background: rgba(250, 248, 245, 0.85);`
   - Header cố định mượt mà khi cuộn trang, giúp người dùng luôn truy cập được nút "Góp một món" và "Bộ chọn ngẫu nhiên".
2. **Hero Section Mesh Gradient**:
   - Thêm một quầng sáng ấm (`radial-gradient`) phía sau ảnh bìa phở để tạo không gian rạng rỡ và ngon miệng.
   - Typography của Tiêu đề chính (*Hôm nay ăn gì nhỉ?*) kết hợp cân đối giữa chữ in đậm và chữ nghiêng nghệ thuật (*em*).

### Nhiệm vụ 5: Tinh chỉnh Modal & Popup Bản Đồ
1. **Modal Animation**:
   - Hiệu ứng mở modal mượt mà với `transform: scale(0.96) -> scale(1)` và `opacity: 0 -> 1` trong 200ms.
   - Backdrop làm mờ tinh xảo (`backdrop-filter: blur(6px); background: rgba(20, 32, 26, 0.45);`).
2. **Popup Leaflet Map**:
   - Bo góc 16px cho popup bản đồ, ảnh quán xem trước mini tròn, nút bấm "Xem chi tiết" màu cam rực rỡ.

---

## III. QUY TRÌNH THỰC THI CHO CODEX

1. Đọc và áp dụng bộ CSS mới vào `app/globals.css`.
2. Cập nhật các class và cấu trúc layout trong `components/FoodCard.tsx`, `components/DiscoveryPanel.tsx`, `app/page.tsx`.
3. Chạy kiểm tra:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
4. Đảm bảo toàn bộ hiệu ứng mới chạy mượt mà trên cả máy tính và điện thoại di động (60 FPS).
