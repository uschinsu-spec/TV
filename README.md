# Xiaomi TV Hub V2

Web launcher tĩnh tối ưu cho Xiaomi Android TV / Google TV, chạy trực tiếp bằng GitHub Pages.

**Trang chạy:** https://uschinsu-spec.github.io/TV/

## Tính năng V2

- Điều khiển ưu tiên remote D-pad: ← ↑ ↓ →, OK/Enter, Back/Escape.
- 12 ô launcher tùy biến, tự chuyển dữ liệu từ bản V1.
- Một ô chung để tìm Google hoặc mở URL.
- Fullscreen khi browser hỗ trợ.
- Screen Wake Lock để giữ màn hình sáng khi browser hỗ trợ.
- Chế độ nhẹ: tắt blur/animation để giảm tải GPU trên TV cấu hình thấp.
- Cỡ giao diện lớn cho TV xem xa.
- Màn hình chờ đồng hồ sau 5 / 8 / 15 phút, vị trí đồng hồ tự dịch chuyển.
- Trạng thái Internet và thông tin connection khi browser cung cấp.
- Hộp thông tin màn hình, viewport, CPU logic, RAM ước tính và user agent.
- PWA: nút cài ứng dụng tự xuất hiện khi Android TV browser hỗ trợ.
- Offline cache cho chính TV Hub.
- Safe-area lớn quanh mép để hạn chế overscan/cắt giao diện trên TV.
- Không có analytics, quảng cáo hay tracker.

## GitHub Pages

Repo đã có đầy đủ file ở nhánh `main`. Bật:

**Settings → Pages → Deploy from a branch → main → /(root)**

Sau đó mở:

`https://uschinsu-spec.github.io/TV/`

## Ghi chú Android TV

Một số browser Android TV không cung cấp Fullscreen API, Wake Lock, thông tin RAM hoặc PWA install. TV Hub kiểm tra khả năng hỗ trợ trước khi dùng nên các API thiếu sẽ không làm hỏng launcher.

Để remote hoạt động tốt nhất, nên dùng Chrome/Chromium TV browser hoặc browser Android TV hỗ trợ keyboard/D-pad events.
