# Phần II — Modern Gourmet Bento / Warm Editorial

Đã thực hiện theo `CODEX_TASK_SPEC.md` V2.5, Phần II. Không sử dụng điểm tự đánh giá bảo mật/hiệu năng trong Phần I làm bằng chứng kiểm định.

- Thay bộ biến màu, nền, viền, bo góc và shadow; giữ alias cho các thành phần cũ để không mất kiểu hiển thị.
- Thẻ món có lớp gradient trên ảnh thật, opening badge dạng glass/pulse, giá và khoảng cách ở hai góc ảnh, nút lưu có trạng thái accessible và phản hồi khi nhấn. Ngày giá hiển thị là ngày ghi nhận trải nghiệm.
- Bộ chọn nhóm thành segmented capsule; 23 lựa chọn giữ nguyên cơ chế mở rộng/lọc, icon có pastel theo nhóm, trạng thái chọn rõ ràng. Thanh nhóm hỗ trợ phím mũi tên/Home/End. Giá và vị trí thành hai khối Bento trên màn hình lớn.
- Header sticky có nền blur, giữ nút góp món và thêm lối tắt random sử dụng đúng điều kiện mở 10 loại món ở backend. Hero giữ ảnh chụp Pexels có ghi nguồn, thêm quầng sáng tĩnh và typography nghiêng.
- Modal có hiệu ứng mở 200 ms; popup Leaflet có ảnh nhỏ tròn, tên/địa chỉ bằng textContent và nút Xem chi tiết. Nội dung quán không được chèn qua innerHTML.
- Responsive ở 320/390/820/1440 px, có chế độ giảm chuyển động cho animation, hover và cuộn tới khu khám phá. Không tự tạo bài, quán hoặc số liệu cộng đồng để lấp giao diện.

Kiểm tra: TypeScript; build Sites; build VPS; kiểm thử thao tác bộ lọc/lưu/random/modal/popup và chế độ reduced motion bằng Chrome; kiểm tra bản Google Sign-in trên desktop/mobile. Mẫu đo hover card gồm 60 khung trên Chrome headless ở máy phát triển đạt khoảng 60 FPS; không phải cam kết hiệu năng mọi thiết bị.

Ảnh kiểm tra giao diện thẻ/map sử dụng fixture chỉ chặn trong tiến trình trình duyệt, không ghi vào database/Firebase và không được đưa lên website công khai.

Phần Google Sign-in trước đó được giữ nguyên. Bản VPS/local đã nhận đăng nhập Google thật và tạo hồ sơ trong SQLite liên kết UID Firebase. Địa chỉ Sites vẫn giữ danh tính Sites; chưa có triển khai máy chủ VPS production trong tác vụ này.
