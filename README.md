# Xiaomi TV Home V8.0 + Android TV APK 1.7

TV Home dành riêng cho Android TV theo kiểu **10-foot UI**: chữ lớn, card lớn, focus rõ, điều khiển bằng remote/gamepad và không cần thao tác kéo chuột kiểu PC.

## Web V8.0
- Home Android TV landscape: **3 app chính luôn nằm cùng một hàng**, không bị breakpoint tablet ép thành danh sách dọc.
- Giao diện 960–1080 CSS px được thu gọn để vừa một màn hình và ưu tiên D-pad trái/phải.
- Home TV-first với 3 mục chính: **Xem TV**, **YouTube**, **Game Center**.
- **TV Mode** mặc định bật: ưu tiên D-pad / OK / Back.
- **Tự động toàn màn hình** khi mở ứng dụng.
- Xem TV và YouTube theo bố cục video-first, hạn chế cuộn trang.
- Khi chọn một game, game mở thành màn hình toàn phần; B/Back quay về danh sách game.
- Game loop giới hạn khoảng 30 FPS để giảm tải cho Android TV.
- Cache Service Worker dùng namespace V8.0 để tránh giữ giao diện 6.x cũ.

## APK 1.7
- Giữ native bridge cho remote Xiaomi/Android TV.
- Giữ native game mode tối ưu cho Logitech F710.
- D-pad/analog → di chuyển.
- A/OK → chọn/hành động.
- B/Back → quay lại.
- Start → tạm dừng trong game.

Mở web: https://uschinsu-spec.github.io/TV/

APK artifact: `TVUtility-AndroidTV-v1.7.apk`

## Game Center V8 — game tự tạo

- Đã gỡ toàn bộ 8 game web bên ngoài khỏi Game Center.
- Game đầu tiên: **NEON ARENA** — arena survival 2D nguyên bản, chạy trực tiếp bằng Canvas 1280×720, không phụ thuộc asset/game bên thứ ba.
- Tối ưu khoảng **30 FPS** cho Android TV.
- Điều khiển Logitech F710:
  - Cần trái / D-pad: di chuyển.
  - Cần phải: ngắm.
  - A hoặc R2: bắn.
  - X: dash.
  - Y: bom diện rộng.
  - Start: tạm dừng.
  - B / Back: thoát game về Game Center.
- Có wave quái tăng dần, nhiều loại địch, HP, điểm, vật phẩm hồi máu/bom và Game Over/chơi lại.
- Cấu trúc đã tách `games/neon-arena.js` để dễ thêm GAME 02, GAME 03 về sau.
