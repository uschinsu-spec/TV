# Xiaomi TV Hub V3

TV Hub tối ưu cho Xiaomi Android TV, giữ launcher V1/V2 và bổ sung **12 tiện ích chạy trực tiếp trong trang**.

**Mở trên TV:** https://uschinsu-spec.github.io/TV/

## 12 tiện ích trực tiếp

1. Timer — đếm ngược và báo âm thanh.
2. Stopwatch — bấm giờ.
3. Máy tính — điều khiển bằng remote.
4. Lịch — xem và chuyển tháng.
5. Ghi chú — lưu localStorage trên TV.
6. Video Player — file từ bộ nhớ/USB hoặc URL video.
7. Music Player — file audio hoặc URL.
8. IPTV Player — stream URL, file/nội dung M3U và danh sách kênh.
9. Test mạng — online, connection API, RTT/downlink và phản hồi GitHub Pages.
10. Test màn hình — màu đơn, gradient, checkerboard toàn màn hình.
11. Test loa — tone trái/phải/cả hai bằng Web Audio.
12. Test remote — xem key, keyCode và code của remote Xiaomi.

Các tiện ích này mở trong chính TV Hub, không chuyển sang website khác.

## V1/V2 vẫn giữ

- 12 ô launcher tùy biến.
- Thanh mở URL riêng và tìm Google.
- Đồng hồ, ngày, trạng thái mạng.
- Fullscreen, Reload, cài đặt ô.
- Wake Lock, chế độ nhẹ, UI lớn, screensaver, thông tin thiết bị và PWA khi browser hỗ trợ.
- Điều khiển D-pad + OK/Enter + Back/Escape.

## Lưu ý IPTV

TV Hub phát HLS/M3U8 bằng khả năng media native của browser/firmware. Nếu browser Xiaomi cụ thể không hỗ trợ HLS native, stream đó có thể không phát dù URL đúng.

## GitHub Pages

Settings → Pages → Deploy from a branch → main → /(root).

Cache hiện tại: xiaomi-tv-hub-v3.
