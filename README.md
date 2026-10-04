# Xiaomi TV Home V8.2 + Android TV APK 1.7

TV Home dành riêng cho Android TV theo kiểu **10-foot UI**: chữ lớn, card lớn, focus rõ, điều khiển bằng remote/gamepad và không cần thao tác kéo chuột kiểu PC.

## Web V8.2
- Home Android TV landscape: **3 app chính luôn nằm cùng một hàng**, không bị breakpoint tablet ép thành danh sách dọc.
- Giao diện 960–1080 CSS px được thu gọn để vừa một màn hình và ưu tiên D-pad trái/phải.
- Home TV-first với 3 mục chính: **Xem TV**, **YouTube**, **Game Center**.
- **TV Mode** mặc định bật: ưu tiên D-pad / OK / Back.
- **Tự động toàn màn hình** khi mở ứng dụng.
- Xem TV và YouTube theo bố cục video-first, hạn chế cuộn trang.
- Khi chọn một game, game mở thành màn hình toàn phần; B/Back quay về danh sách game.
- Game loop giới hạn khoảng 30 FPS để giảm tải cho Android TV.
- Cache Service Worker dùng namespace V8.2 để tránh giữ giao diện 6.x cũ.

## APK 1.7
- Giữ native bridge cho remote Xiaomi/Android TV.
- Giữ native game mode tối ưu cho Logitech F710.
- D-pad/analog → di chuyển.
- A/OK → chọn/hành động.
- B/Back → quay lại.
- Start → tạm dừng trong game.

Mở web: https://uschinsu-spec.github.io/TV/

APK artifact: `TVUtility-AndroidTV-v1.7.apk`

## Game Center V8.2 — game tự tạo

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


### Asset đồ họa riêng cho NEON ARENA
- Poster Game Center: `assets/game01/neon-arena/poster.svg`
- Phi thuyền player: `player.svg`
- Quái: `enemy-drone.svg`, `enemy-runner.svg`, `enemy-tank.svg`
- Đạn: `bullet.svg`
- Pickup: `pickup-heal.svg`, `pickup-bomb.svg`
- Nền arena: `arena-bg.svg`
- Tất cả là SVG vector nhẹ, sắc nét trên TV 1080p/4K và có fallback Canvas nếu asset chưa tải xong.


## APK 2.1 — Low-Latency Game Mode
- Chế độ độ trễ thấp **chỉ bật khi game thực sự đang chạy**; Home, TV, YouTube và Game Center menu vẫn dùng input nhẹ bình thường.
- Android giữ trạng thái F710 trong native memory qua `TVNativeInput`; game đọc trực tiếp ở 60 Hz thay vì nhận chuỗi `evaluateJavascript()` liên tục.
- Analog/physics GAME 01 chạy 60 Hz, render giữ khoảng 30 Hz để giảm độ trễ nhưng hạn chế tải GPU.
- Deadzone F710 trong gameplay giảm từ 0.16 xuống 0.10; ngoài gameplay vẫn giữ 0.16.
- Khi thoát game bằng B/Back, low-latency mode tắt ngay.
- APK version: `2.1.0` / versionCode `12`.


## APK 2.2 — Ultra Game Mode
- Tối ưu **ở tầng APK**, không chỉnh riêng GAME 01.
- WebView dùng hardware acceleration và APK ưu tiên display mode gần **60 Hz** ở đúng độ phân giải TV.
- Low-latency native gamepad state tiếp tục chỉ bật khi game gọi Game Mode; Home/TV/YouTube/menu giữ chế độ nhẹ.
- Deadzone native trong Game Mode giảm xuống **0.07** và remap lại toàn hành trình cần để phản hồi sớm hơn.
- Trigger analog trong Game Mode dùng response curve nhạy hơn.
- Native bridge giữ một pulse cho cú bấm cực nhanh để game không hụt A/B/X/Y/Start/D-pad giữa hai lần đọc.
- Không còn tạo tên thiết bị lại trên mỗi sample analog trong Game Mode.
- Có thêm `readPacked()` cho các game tương lai muốn đọc state native với overhead thấp hơn.
- APK version: `2.2.0` / versionCode `13`.
