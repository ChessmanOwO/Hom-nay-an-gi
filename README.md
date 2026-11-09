# Hôm nay ăn gì?

Web cộng đồng bằng Vinext / React, Cloudflare Worker, D1 và R2.

## Chức năng
- Tìm món theo tên, khu vực, nhóm món, bữa ăn, món chay, giá và ảnh mặt tiền.
- Vị trí hiện tại theo quyền trình duyệt; bán kính 1/3/5/10/20 km; khoảng cách lọc Haversine (đường chim bay).
- Bản đồ OpenStreetMap / Leaflet có ghim quán và phạm vi quanh bạn.
- Bản đồ tuyến ô tô bằng OSRM, quãng đường và thời gian chưa tính giao thông trực tiếp; luôn có liên kết Google Maps để chọn điểm xuất phát/phương tiện. Dịch vụ OSRM công cộng là dịch vụ demo, không có SLA; thay nhà cung cấp định tuyến trước khi tăng quy mô.
- Tìm địa chỉ Nominatim chỉ khi bấm nút; không autocomplete liên tục. Tọa độ có thể nhập hoặc đặt bằng ghim.
- Đăng nhập do Sites cung cấp qua ChatGPT. Hồ sơ hiển thị dùng tên riêng, không hiển thị email.
- Bài trải nghiệm: giá thực trả, ngày, số người/phần, đơn vị giá, ảnh, điểm, khẩu phần, hương vị, đáng tiền, tài trợ. Có sửa, xóa mềm, duyệt lại và lưu lịch sử giá.
- Lưu món/quán, chia sẻ liên kết món, đánh dấu hữu ích và báo cáo.
- Quản trị duyệt/ẩn bài, chỉnh quán, đóng/mở quán, duyệt/đổi/gộp loại món, gộp quán không xung đột, xử lý báo cáo và nhật ký.
- Random tính ở backend: >=10 loại chuẩn hóa được duyệt, có quán hoạt động, món công khai và trải nghiệm được duyệt. Mỗi quán đủ bộ lọc có xác suất ngang nhau, loại quán vừa chọn nếu còn quán khác. Đóng quán/ẩn nội dung làm số loại giảm sẽ khóa lại.
- Không seed đánh giá, địa chỉ, ảnh món/quán giả vào dữ liệu thật. Ảnh bìa chỉ minh họa có ghi nguồn Pexels.

## Cấu hình và chạy cục bộ
Yêu cầu Node >=22.13, các dependency trong package-lock.json.
1. `npm ci`
2. Cấu hình `.openai/hosting.json`: `d1: "DB"`, `r2: "BUCKET"`.
3. `npm run build`
4. Áp dụng từng SQL migration trong `drizzle/` theo thứ tự, chỉ một lần, vào database local:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<migration>.sql`
5. Tạo `.dev.vars` (không commit): `ADMIN_EMAILS="seedy@sites.test"` để quản trị giả lập local.
6. `npm run dev -- --hostname 127.0.0.1`
7. Mở `/signin-with-chatgpt?return_to=/` trong local để đăng nhập giả lập. Cơ chế này chỉ ở preview loopback; không được đưa nó thành tài khoản production.

## Production trên Sites
Dùng Site ID trong `.openai/hosting.json`, giữ nguyên tích hợp `sites()` trong Vite và Worker. Sites cấp D1/R2, áp dụng migrations và xử lý đăng nhập. Không triển khai như static export.
Biến runtime duy nhất cần đặt là `ADMIN_EMAILS`: danh sách email quản trị, phân tách dấu phẩy. Đặt bằng Sites environment variables, đánh dấu secret. Không lưu giá trị production vào mã nguồn. Không dùng cơ chế tự phong admin cho người đầu tiên đăng nhập.
Bản đầu được xuất bản riêng tư. Đổi quyền truy cập trong Sites khi chủ sở hữu quyết định chia sẻ; không tự mở công khai.
MFA và khôi phục tài khoản do nhà cung cấp đăng nhập quản lý. Chủ tài khoản cần bật MFA; ứng dụng không tự xác nhận mức bảo đảm MFA của phiên. Trước vận hành cộng đồng lớn, rà soát yêu cầu xác thực quản trị và chính sách lưu dữ liệu.

## Dữ liệu
Schema: `db/schema.ts`. Migrations là schema-only, không chứa dữ liệu demo.
- food_types: loại chuẩn hóa, tên, key không dấu, trạng thái.
- restaurants: địa chỉ, tọa độ, ảnh mặt tiền, giờ do cộng đồng cung cấp, trạng thái.
- offerings: món tại quán, type, nhóm lọc/bữa ăn.
- reviews: một bài hiện hành cho mỗi user/món tại quán, trạng thái duyệt và nội dung.
- price_history: ảnh chụp lịch sử giá của mỗi lần sửa, chỉ truy cập công khai khi bài hiện hành được duyệt.
- photos: metadata quyền sở hữu ảnh; binary ở R2.
- saves, votes, reports, audit, limits: tương tác và vận hành.
Không lưu tọa độ cá nhân vào database. Việc dùng bản đồ/định tuyến gửi tọa độ cho nhà cung cấp tương ứng khi người dùng dùng chức năng đó.

## Ảnh và bảo mật
Ảnh upload chỉ JPEG/PNG, tối đa 3 MB sau xử lý, 6 ảnh/bài. Client nén, server kiểm tra cấu trúc và loại bỏ metadata ảnh. Ảnh chờ duyệt chỉ chủ ảnh hoặc admin xem; ảnh đã công khai mới có thể xem cộng đồng. Ảnh chưa gắn bài không tự công khai.
Backend dùng bind parameters cho SQL, kiểm tra quyền chủ sở hữu, admin allowlist, kiểm Origin cho mutation và giới hạn tần suất theo user. React render text, không nhúng HTML bài viết. Có giới hạn kích thước body theo stream. Worker thêm nosniff, Referrer-Policy, HSTS trên HTTPS và hạn chế quyền trình duyệt.
Đây là các biện pháp MVP, không phải chứng nhận pentest hay cam kết an toàn tuyệt đối. WAF/DDoS, cảnh báo tập trung, ngưỡng rate theo tải và kiểm thử bảo mật độc lập cần được cấu hình theo hạ tầng vận hành.

## Sao lưu và phục hồi
Sau thao tác API ghi thành công đầu tiên trong mỗi ngày UTC, Worker lên lịch snapshot logic D1 vào R2 riêng tư `backups/YYYY-MM-DD.json`. Giữ 30 ngày. Không có thao tác ghi thì không tạo snapshot ngày đó; đây không phải cron chạy lúc cố định. Tải snapshot qua nút trong trang quản trị hoặc `/api/backup?day=YYYY-MM-DD`.
Snapshot ở cùng nhà cung cấp, chưa phải bản sao ngoại vi; binary ảnh nằm ở R2 và không được nhân đôi trong JSON. Nên định kỳ tải JSON và xuất riêng bucket ảnh sang nơi lưu độc lập, giám sát cảnh báo `Daily database snapshot failed` trong Worker logs.
Khôi phục an toàn: tạo database staging trống theo đúng migrations, nhập các bảng trong JSON bằng prepared inserts theo schema, kiểm số hàng/địa chỉ/ảnh và quyền truy cập; chỉ chuyển database sau khi kiểm tra. Giữ R2 ảnh nguyên khóa. Chưa có nút ghi đè database production để tránh khôi phục nhầm.

## Kiểm tra
`npx tsc --noEmit`, `npm run build`.
Kiểm tra tích hợp local đã dùng D1/R2 thật trong preview, dữ liệu kiểm thử chỉ ở local và đã dọn trước bàn giao. Không đưa `.wrangler`, `.dev.vars`, node_modules hoặc outputs kiểm thử vào mã triển khai.

## Nguồn ảnh và dịch vụ
- Ảnh bìa: https://www.pexels.com/photo/cooked-noodles-1001773/ (ảnh minh họa, không phải đánh giá của người dùng).
- Leaflet 1.9.4 qua unpkg, tiles và geocoding OpenStreetMap/Nominatim; giữ attribution và tuân thủ chính sách sử dụng dịch vụ công cộng.
- Định tuyến: https://router.project-osrm.org ; cần dịch vụ có SLA/tự host khi vận hành nhiều người.
- Google Maps deep links không yêu cầu API key; chỉ mở khi người dùng chọn.

## Bộ chọn món mở rộng
Khu khám phá có 23 lựa chọn, chia Bữa no / Ăn chơi / Uống gì / Ăn chay. Có chọn nhiều lựa chọn (OR), nhóm món, giá nhanh và vị trí tách riêng. `lib/discovery.ts` là cấu hình dùng chung cho UI, bộ lọc backend và nhóm món được phép khi đăng bài. Tham số `food` lặp lại cho chọn nhiều và `family` cho nhóm lớn; `category` cũ vẫn được hỗ trợ. Các bài cũ trong nhóm Bún / Phở và Đồ uống được nhận diện theo tên món/loại chuẩn hóa khi lọc chi tiết. Không sửa dữ liệu hiện có hoặc tự tách loại món đã duyệt.
Các lựa chọn khám phá là bộ lọc giao diện, không phải 23 loại món đã được cộng đồng duyệt và không tham gia trực tiếp vào ngưỡng mở random. Không thay đổi cơ chế tính đủ 10 loại hợp lệ.

## Tasks 1–5: bảo mật, hiệu năng và UX
- `ADMIN_EMAILS`: Super Admin. `MODERATOR_EMAILS`: kiểm duyệt viên; nếu cùng có trong hai danh sách thì Super Admin được ưu tiên. Moderator chỉ được approve/hide/resolve; không xem audit hoặc danh mục quản trị kỹ thuật và không tải backup. Biến MODERATOR_EMAILS để trống nếu chưa có người được chỉ định, không tự cấp quyền cho tài khoản mới.
- Migration `0002_lean_jack_power.sql` thêm unique `(owner,target)` cho báo cáo, giữ cả kiểm tra API và xử lý race tại DB. Nếu hệ thống cũ có báo cáo trùng, cần xuất lưu dữ liệu và xử lý trùng có chủ đích trước khi áp migration; migration không tự xóa báo cáo.
- `/api/state?page=1&limit=24`: trả `items,total,page,limit,hasMore`; limit tối đa 50. Các điều kiện lọc áp dụng trước khi phân trang; saved được lọc tại server. Random dùng toàn bộ tập hợp hợp lệ, không dùng trang catalog. Frontend đổi bộ lọc sẽ quay về trang 1, bỏ phản hồi tải thêm của bộ lọc cũ.
- `/api/lookups?q=...` chỉ tải khi mở form, tối đa 200 gợi ý quán; tìm theo tên/địa chỉ/thành phố. State chỉ trả danh sách thành phố thay vì toàn bộ bản ghi quán và loại món. Lọc chi tiết catalog vẫn thực hiện phía server bằng JS để giữ logic danh mục cũ; việc đưa tất cả điều kiện xuống SQL là hướng tối ưu tiếp khi dữ liệu lớn.
- Components tách tại `components/`, hộp thoại tại `components/modals/`. Form, admin, chi tiết, lightbox, route, Leaflet được tải theo nhu cầu.
- Skeleton 6 thẻ giữ cấu trúc ảnh/nội dung; CLS toàn trang còn phụ thuộc font, ảnh và số kết quả thực tế, không coi đây là cam kết CLS=0 trong mọi môi trường.
- Lightbox hỗ trợ next/prev, phím mũi tên và Escape; đóng lightbox không đóng hộp thoại bên dưới.
- Google Maps dùng tham số chính thức `travelmode=two-wheeler` (dấu gạch ngang), thay vì `two_wheeler` trong spec. Có chọn Xe máy/Ô tô/Đi bộ; tuyến OSRM trong web vẫn ghi rõ là ô tô, không giả lập tuyến xe máy. Nguồn: https://developers.google.com/maps/documentation/urls/get-started
- Giờ mở cửa: múi giờ Việt Nam, hỗ trợ qua đêm và nhiều khoảng mỗi ngày; giờ trống, không hợp lệ hoặc lịch theo ngày chưa hỗ trợ sẽ không gắn huy hiệu chắc chắn.

### Kiểm tra local
`npx esbuild tests/unit.ts --bundle --platform=node --format=esm --outfile=outputs/spec-unit.mjs` rồi `node outputs/spec-unit.mjs`.
`tests/integration.mjs` chỉ gọi loopback 8787; yêu cầu Worker local có ADMIN_EMAILS=super@example.test và MODERATOR_EMAILS=mod@example.test. Script tạo fixture SPEC cục bộ, không gọi production. `tests/browser.mjs` chạy trên preview 5173, yêu cầu fixture integration và Chrome trên macOS; chỉnh đường dẫn Playwright nếu chuyển máy. Dọn fixture bằng SQL `outputs/spec-cleanup.sql` sau khi kiểm tra.
Cuối cùng chạy `npx tsc --noEmit` và `npm run build`.
