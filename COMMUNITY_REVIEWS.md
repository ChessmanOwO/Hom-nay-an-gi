# Đánh giá địa điểm và hạn chế seeding

## Hành vi người dùng

- Bấm tên quán trên thẻ món hoặc “Xem & viết đánh giá quán” trong chi tiết món.
- Mỗi quán có một mục đánh giá riêng, nhiều tài khoản cùng đóng góp. Mỗi tài khoản một bài/quán; quay lại thì cập nhật bài đó, kể cả khôi phục bài đã xóa.
- Điểm trung bình và biểu đồ sao chỉ tính các đánh giá địa điểm được duyệt. Điểm món ăn được tính riêng.
- Ảnh không bắt buộc; tối đa **5 ảnh JPEG/PNG**, nén phía trình duyệt tới cạnh dài 1600 px và JPEG chất lượng 0.84. Backend nhận tối đa 3 MB/ảnh sau xử lý, kiểm tra quyền sở hữu và loại bỏ metadata ảnh. Không có tải lên/phát video.
- Mặc định bài có ảnh đứng trước bài chỉ có chữ, cùng nhóm ưu tiên lượt hữu ích rồi lần cập nhật mới nhất. Không ưu tiên sao cao. Có lựa chọn mới cập nhật/hữu ích nhất, phân trang 12 bài/lần.
- Bài mới và bản sửa luôn chờ duyệt; có tài trợ được ghi rõ. Có ảnh không được tự coi là đã xác minh trải nghiệm.
- Có lưu quán, chỉ đường, chia sẻ liên kết `/?quan=...`, hữu ích và báo cáo. “Của tôi” quản lý cả bài về món và về quán.

## Thuật toán khởi đầu

Áp dụng cho cả đánh giá món và đánh giá địa điểm:

| Tín hiệu | Xử lý |
|---|---|
| Một tài khoản gửi/sửa quá 5 lần trong cửa sổ trượt 1 giờ | Từ lượt thứ 6 trả HTTP 429, kèm Retry-After |
| Một IP gửi/sửa quá 3 lần về cùng quán trong cửa sổ trượt 10 phút | Từ lượt thứ 4 trả 429 nếu có IP đáng tin cậy |
| Hai tài khoản trở lên cùng mạng nhận xét cùng quán trong 10 phút | Gắn cờ để quản trị viên kiểm tra, không kết luận gian lận |
| Nội dung chuẩn hóa trùng bài của người khác tại quán | Chặn gửi và yêu cầu viết trải nghiệm riêng |
| Nội dung gần giống | Gắn cờ, vẫn chờ duyệt |

So sánh nội dung trong tối đa 100 bản đánh giá cập nhật gần nhất của thành viên khác tại quán trong 30 ngày. Chuẩn hóa chữ hoa/thường, dấu tiếng Việt và dấu câu. Nội dung gần giống dùng Jaccard trên tập từ, ngưỡng 0.88, tối thiểu 12 từ khác nhau và 80 ký tự chuẩn hóa. Đây là quy tắc thử nghiệm, cần điều chỉnh theo dữ liệu thật; không phải bộ phát hiện gian lận tuyệt đối. Hiện không nhận diện ảnh đăng lại, không xác minh hóa đơn và không đọc địa chỉ MAC.

Lượt gửi đã vượt qua kiểm tra nội dung được giữ chỗ trước khi ghi bài, bằng một câu SQL nguyên tử. Các lượt cùng đến không thể cùng vượt ngưỡng. Nếu bước ghi bài sau đó thất bại, lượt thử vẫn có thể được tính trong cửa sổ giới hạn. Việc xóa bài không xóa lịch sử chống spam.

## Nguồn IP và quyền riêng tư

Worker xóa mọi giá trị header nội bộ do trình duyệt tự gửi rồi chỉ gán lại khi có ngữ cảnh Cloudflare cùng CF-Connecting-IP hợp lệ. Không tin X-Forwarded-For. Bỏ qua IP loopback, địa chỉ không hợp lệ và IP proxy chung Cloudflare `2a06:98c0:3600::103`.

Thực tế IP người dùng có thể bị nền tảng trung gian che đi. Trang quản trị hiển thị kiểm tra IP có khả dụng trên kết nối đang dùng hay không. Khi thiếu IP đáng tin cậy, không gom toàn bộ người dùng vào cùng một IP giả: chỉ áp dụng giới hạn tài khoản/nội dung và gắn cờ thiếu tín hiệu IP. Chưa xác nhận đường truyền IP trên production bằng nhiều người dùng thật.

Không lưu IP thô trong bảng chống seeding; dùng HMAC-SHA256 với khóa ngẫu nhiên giữ phía server trong D1. Các sự kiện cũ hơn 30 ngày được dọn theo đợt khi có lượt gửi mới. Các bảng chống lạm dụng/khóa HMAC không nằm trong bản xuất dữ liệu cộng đồng. Cửa sổ theo IP có thể bị né bằng VPN/đổi mạng và có thể ảnh hưởng người chung Wi-Fi; vì vậy không dùng nó như bằng chứng kết luận gian lận.

Nguồn kỹ thuật: https://developers.cloudflare.com/fundamentals/reference/http-headers/

## Đăng nhập

Giữ đăng nhập Sites đang chạy. **Google/Firebase riêng chưa tích hợp**; chỉ có yêu cầu dùng Google, bỏ hoàn toàn điện thoại/OTP. Xem `FIREBASE_SETUP_VI.md` để chuẩn bị dự án và xem giới hạn nền tảng. Không tự nối tài khoản theo email hoặc giả vờ xác minh danh tính từ email do trình duyệt gửi.

## Kiểm tra

- `npx tsc --noEmit` và `npm run build`.
- `npx tsx tests/unit.ts`: quyền quản trị, phân trang, giờ mở cửa và chỉ đường.
- `npx tsx tests/abuse.ts`: IP đáng tin cậy, bỏ proxy chung, chuẩn hóa IPv6, nội dung trùng/gần giống, cờ cùng mạng, giới hạn và yêu cầu đồng thời (adapter bộ nhớ).
- Chạy Worker local cổng 8787 với tài khoản thử, rồi `node tests/integration.mjs`, `node tests/place-integration.mjs`, `node tests/place-browser.mjs`. Các kiểm tra này chỉ dùng loopback và dữ liệu SPEC; không gửi đánh giá giả lên production.
- Test HTTP xác nhận giới hạn tài khoản thực bằng D1, header IP nội bộ giả bị xóa, ảnh thuộc đúng tài khoản, ảnh/video không được tải nhầm, chặn ảnh thứ 6, nhiều người cùng quán, duyệt/sửa/xóa, điểm bài đã duyệt và điều kiện random không đổi.

Kết quả trên bản bàn giao: TypeScript/build, unit, HTTP D1 và trình duyệt đều qua. Trình duyệt xác nhận tải ảnh JPEG thật qua biểu mẫu, gửi sửa để duyệt lại, quản trị viên duyệt bài và màn hình 390 px không tràn ngang. Giới hạn 5 ảnh được kiểm tra bằng 5 ID ảnh khác nhau; bài có 6 ảnh bị từ chối. Chỉ dữ liệu thử local được dùng cho các kiểm tra này.
