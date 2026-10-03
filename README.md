# Xiaomi TV Home V7.2 + Android TV APK 1.7

TV Home dành riêng cho Android TV theo kiểu **10-foot UI**: chữ lớn, card lớn, focus rõ, điều khiển bằng remote/gamepad và không cần thao tác kéo chuột kiểu PC.

## Web V7.2
- Home Android TV landscape: **3 app chính luôn nằm cùng một hàng**, không bị breakpoint tablet ép thành danh sách dọc.
- Giao diện 960–1080 CSS px được thu gọn để vừa một màn hình và ưu tiên D-pad trái/phải.
- Home TV-first với 3 mục chính: **Xem TV**, **YouTube**, **Game Center**.
- **TV Mode** mặc định bật: ưu tiên D-pad / OK / Back.
- **Tự động toàn màn hình** khi mở ứng dụng.
- Xem TV và YouTube theo bố cục video-first, hạn chế cuộn trang.
- Khi chọn một game, game mở thành màn hình toàn phần; B/Back quay về danh sách game.
- Game loop giới hạn khoảng 30 FPS để giảm tải cho Android TV.
- Cache Service Worker dùng namespace V7.2 để tránh giữ giao diện 6.x cũ.

## APK 1.7
- Giữ native bridge cho remote Xiaomi/Android TV.
- Giữ native game mode tối ưu cho Logitech F710.
- D-pad/analog → di chuyển.
- A/OK → chọn/hành động.
- B/Back → quay lại.
- Start → tạm dừng trong game.

Mở web: https://uschinsu-spec.github.io/TV/

APK artifact: `TVUtility-AndroidTV-v1.7.apk`


## Game Center HTML5
- Đã bỏ toàn bộ mini-game canvas cũ: Snake, Pong, Breakout, Space Shooter, Car Dodge, Flappy, Asteroids, Catch Coins, 2048 và Reaction.
- Thay bằng thư viện game HTML5 chính chủ, chơi trực tiếp trong WebView, không cần cài game riêng.
- Danh sách hiện tại: High On Track, Vampire Survivors, Vapor Trails, Fohh, Turbo OutRun Reimagined, Nymphiad, Virtuous Vanquisher of Evil.
- Game Center dùng lưới 4×2 cho TV, focus lớn và ưu tiên F710/remote.
- Khi mở game bên ngoài TV Home, Android WebView trả input gamepad trực tiếp cho game; Remote Back quay lại lịch sử và TV Home tự mở lại Game Center.
