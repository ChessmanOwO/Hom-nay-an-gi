# Hướng dẫn thiết lập Google Sign-in (Firebase Authentication)

## 1. Chuẩn bị Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một dự án mới (hoặc dùng dự án hiện có).
2. Vào **Build** → **Authentication** → Bấm **Get Started**.
3. Tại tab **Sign-in method**, kích hoạt nhà cung cấp **Google**.
4. Vào **Project Settings** (biểu tượng bánh răng) → Cuộn xuống **Your apps** → Chọn **Web app** (`</>`) để đăng ký ứng dụng Web.
5. Sao chép thông tin cấu hình SDK Firebase vào file `config/firebase-web.json` (dựa trên mẫu `config/firebase-web.example.json`):
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "YOUR_PROJECT.firebaseapp.com",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_PROJECT.firebasestorage.app",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```

## 2. Hoạt động của hệ thống

- Firebase Authentication chỉ dùng để quản lý danh tính và cấp JWT ID Token (Google OAuth 2.0).
- Backend xác thực JWT trực tiếp qua public JWK Set của Google (`https://securetoken.google.com/YOUR_PROJECT_ID`) bằng thuật toán RS256.
- Toàn bộ dữ liệu thành viên, bài viết, đánh giá và ảnh được lưu trữ cục bộ trong PostgreSQL và private object storage; không gửi dữ liệu người dùng lên Firestore hay dịch vụ đám mây bên thứ ba.
- Phiên đăng nhập được quản lý bằng cookie bảo mật `__Host-hnag_session` (HttpOnly, SameSite=Lax, Secure).

## 3. Triển khai và Cấp phép tên miền (Authorized Domains)

1. Khi chạy local: Firebase mặc định đã cấp quyền cho `localhost`.
2. Khi đưa lên máy chủ / VPS:
   - Thêm tên miền máy chủ của bạn vào **Authentication** → **Settings** → **Authorized domains** trên Firebase Console.
   - Thiết lập `PUBLIC_ORIGIN` trong `.env.vps` khớp với URL HTTPS của bạn (ví dụ: `https://an.example.com`).
   - Thiết lập `FIREBASE_PROJECT_ID` trong `.env.vps` khớp với `projectId` trong `config/firebase-web.json`.

Tài liệu tham khảo chính thức:
- [Firebase Web Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Token Verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
