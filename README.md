# Xiaomi TV Hub V2.1 — V1 Compatible

Trang web TV giữ **toàn bộ luồng V1** và cộng thêm các tiện ích V2.

**Mở trên TV:** https://uschinsu-spec.github.io/TV/

## Các chức năng V1 được giữ nguyên

- Thanh **Mở trang** riêng: nhập URL → Mở trang.
- 8 ô mặc định V1 theo đúng thứ tự: YouTube, Google, Speedtest, Trang TV của tôi, Tin tức, Nhạc, Trang web 1, Trang web 2.
- Đồng hồ, ngày tháng và trạng thái Internet.
- Nút **Toàn màn hình**, **Tải lại**, **Cài đặt ô**.
- Chỉnh icon / tên / URL và lưu bằng localStorage.
- Điều khiển remote D-pad + OK/Enter + Back/Escape.
- Tự đọc lại dữ liệu `tvUtilityTilesV1` cũ nếu TV đã từng dùng V1.

## Tính năng thêm của V2.1

- 4 launcher mở rộng, tổng 12 ô.
- Thanh tìm Google riêng, không thay thế thanh mở URL của V1.
- Wake Lock giữ màn hình sáng nếu browser hỗ trợ.
- Chế độ nhẹ giảm blur/animation.
- Chế độ UI lớn.
- Screensaver đồng hồ 5 / 8 / 15 phút.
- Thông tin thiết bị, độ phân giải, CPU/RAM khi browser cung cấp.
- PWA install khi browser hỗ trợ.
- Safe-area cho overscan TV.
- Offline cache V2.1.

## GitHub Pages

Bật **Settings → Pages → Deploy from a branch → main → /(root)**.

Nếu TV còn hiện bản cũ, tải lại trang một lần để Service Worker đổi sang cache `xiaomi-tv-hub-v2-1`.
