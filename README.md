# Xiaomi TV Home V6.6

Trang chính chỉ có 3 mục: **Xem TV**, **YouTube**, **Game Center**.

## Xem TV
- Mở là tự phát VTV1.
- Có sẵn VTV1 đến VTV9.
- Mỗi kênh có nguồn VTVGo CDN chính và nguồn dự phòng.
- Hỗ trợ HLS.js.
- Vẫn có thể thêm URL/M3U riêng, nhưng không cần nhập gì để xem VTV mặc định.

## YouTube
- Phát bằng YouTube Embed ngay trong TV Home.
- Mở lần đầu có nội dung VTV24; những lần sau nhớ video/playlist gần nhất.
- Có các nút VTV24 mặc định và lịch sử 8 video gần nhất.
- Không chuyển trang sang youtube.com khi xem video.

## Game Center
10 game: Snake, Pong, Breakout, Space Shooter, Car Dodge, Flappy, Asteroids, Catch Coins, 2048, Reaction.

### Logitech F710 / gamepad
Ưu tiên chế độ **XInput (công tắc X)**.
- D-pad / analog trái: di chuyển
- A: chọn / nhảy / bắn / hành động
- B: thoát game về menu
- Start: tạm dừng / tiếp tục
- Tay cầm cũng điều hướng menu TV Home bằng D-pad/analog và A/B.

Bàn phím/remote vẫn hoạt động song song.

Mở: https://uschinsu-spec.github.io/TV/

Cache: `xiaomi-tv-home-v6-6`.


## Android TV 1.6
- Không xóa toàn bộ WebView/Service Worker cache ở mỗi lần mở app.
- Không tải trang hai lần khi khởi động.
- Remote D-pad được bridge riêng, không phụ thuộc hành vi focus mặc định của WebView.
- Gamepad menu được polling theo nhịp thấp thay vì requestAnimationFrame 60 Hz.
- Game canvas nhẹ được giới hạn 30 FPS để giảm CPU/GPU và nhiệt.
- Tắt các hiệu ứng blur/ambient nặng khi chạy trong Android TV wrapper.
- HLS giảm back-buffer để giảm RAM khi xem truyền hình lâu.
