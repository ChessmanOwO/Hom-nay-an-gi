# Kết quả CODEX_TASK_SPEC.md - Task 1 đến Task 5

Đã triển khai theo thứ tự các task trong file đặc tả; giữ nguyên file đặc tả gốc.

| Task | Triển khai | Kiểm tra |
|---|---|---|
| 1 | Unique index `one_report_per_target`, kiểm tra báo cáo cũ và xử lý xung đột khi gửi đồng thời | Hai request đồng thời chỉ tạo một báo cáo; báo cáo đã resolve không được gửi lại |
| 2 | Super Admin / Moderator; chặn backup và thao tác kỹ thuật ở server; UI moderator chỉ có duyệt bài và báo cáo | Moderator approve/hide/resolve được; type/restaurant/merge/backup bị chặn; không trả audit và dữ liệu quản trị kỹ thuật |
| 3 | Mặc định 24, tối đa 50; total/page/hasMore; load-more và reset khi đổi bộ lọc; saved lọc trước phân trang | Fixture 53 món: 24/24/5, không lặp; saved ở trang cuối vẫn tìm được; random vẫn có 53 quán dù truyền page=999,limit=1 |
| 4 | Tách bản đồ, bộ lọc, card, form, detail, admin, account, route, lightbox; lazy load; lookup form tải theo nhu cầu | Không tải Leaflet CDN khi chưa mở bản đồ; lazy admin/form hoạt động; đo route chunk bên dưới |
| 5 | 6 skeleton cards; lightbox next/prev/phím mũi tên/Escape; chọn xe máy/ô tô/đi bộ; giờ mở cửa Việt Nam | Lightbox đóng không đóng modal cha; huy hiệu 24/7; giờ qua đêm và giờ không rõ được kiểm tra; mobile không tràn ngang |

## Kiểm định bắt buộc
- `npx tsc --noEmit`: PASS, không lỗi TypeScript.
- `npm run build`: PASS, xuất Worker và các chunk client.
- Khung build Vinext có thông báo không phân loại tĩnh được một số route; đây là thông báo của framework, build vẫn hoàn thành thành công.

## Đo bundle
Chunk `app/page.tsx` của build client: 19.149 byte chưa nén (~19,15 KB), 6.557 byte gzip. Mục tiêu dưới 20 KB đạt đối với chunk trang chủ; con số không bao gồm React/framework, CSS và những chunk dùng chung/tải theo nhu cầu. Không diễn giải thành tổng tải mạng toàn ứng dụng dưới 20 KB.

## Kiểm tra bổ sung
- `tests/unit.ts`: quyền theo vai trò, ưu tiên Super Admin, deny mặc định, giới hạn phân trang, giờ Việt Nam/qua đêm/không rõ, URL chỉ đường.
- `tests/integration.mjs`: HTTP thật vào Worker local, D1/R2 local, 53 món giả lập phục vụ kiểm thử; chống báo cáo trùng/race; quyền moderator; không lấy mẫu random từ trang catalog.
- `tests/browser.mjs`: giao diện thật với Chrome, skeleton, 24→48→53 thẻ, lọc, lightbox, link xe máy/đi bộ, form/admin lazy, kích thước điện thoại.
- Kiểm tra thêm UI moderator trên Worker build: không hiển thị backup hoặc danh mục kỹ thuật.
- Dữ liệu SPEC chỉ tồn tại ở môi trường local để kiểm thử, không seed vào production; dọn theo prefix sau kiểm tra.

## Những điểm cần lưu ý
1. Google Maps dùng `travelmode=two-wheeler` theo tài liệu chính thức, thay dấu gạch dưới `two_wheeler` trong ví dụ spec: https://developers.google.com/maps/documentation/urls/get-started . Dịch vụ OSRM trong web vẫn là ô tô; không gắn nhãn tuyến OSRM thành xe máy.
2. Skeleton giảm dịch chuyển khung thẻ, nhưng không cam kết CLS=0 tuyệt đối cho mọi bộ dữ liệu/thiết bị/font. Chưa có đo Core Web Vitals ngoài thực tế.
3. Giờ không có thông tin hoặc chứa lịch theo thứ chưa hỗ trợ sẽ không gắn huy hiệu khẳng định đang đóng/mở.
4. Catalog trả dữ liệu phân trang cho client; lọc chi tiết vẫn thực hiện bằng JS tại server theo phương án slice được cho phép trong spec. Đưa toàn bộ lọc xuống SQL là bước tối ưu thêm cho dữ liệu lớn.
5. Migration 0002 chỉ thêm unique index, không xóa dữ liệu. Preflight production tại thời điểm kiểm tra có 0 báo cáo nên không có nhóm trùng cần xử lý. Với database khác đã có báo cáo trùng, phải xử lý có lưu giữ dữ liệu trước khi áp migration.
6. `MODERATOR_EMAILS` chỉ là cấu hình bổ sung. Không tự thêm người vào danh sách moderator khi chưa được chủ sở hữu chỉ định.
