# Xiaomi TV Home V6.6 + Android TV APK 1.6

Trang chính vẫn chỉ có **Xem TV**, **YouTube** và **Game Center**.

## APK 1.6
- Native bridge cho remote Xiaomi/Android TV: D-pad, OK/Enter và Back.
- Giữ nguyên native bridge cho Logitech F710/gamepad.
- Chỉ tải TV Home **một lần khi mở app**.
- Không còn xóa WebView cache, Cache Storage và unregister Service Worker mỗi lần khởi động.
- WebView dùng cache mặc định; web tự cập nhật nhờ asset version + Service Worker network-first.
- Không còn reload lần hai sau `onPageFinished()`.

## Tối ưu web V6.6
- Bỏ vòng `requestAnimationFrame` 60 FPS chỉ để hiển thị trạng thái gamepad ở menu.
- Browser Gamepad fallback ở menu chỉ kiểm tra khoảng 8–10 lần/giây khi tay cầm đang kết nối, chậm hơn khi chưa có tay cầm.
- Khi chơi game, game loop mới đọc input theo frame để giữ độ phản hồi.

## Điều khiển
- Remote: D-pad → di chuyển, OK → chọn, Back → quay lại.
- F710: D-pad/analog → di chuyển, A → chọn/hành động, B → quay lại, Start → pause trong game.

Mở web: https://uschinsu-spec.github.io/TV/

APK artifact: `TVUtility-AndroidTV-v1.6.apk`
