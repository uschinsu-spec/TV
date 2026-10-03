# TV Utility

Trang web tĩnh tối ưu cho Android TV, điều khiển bằng remote.

## Upload lên GitHub Pages

1. Tạo repository mới trên GitHub, ví dụ `tv-utility`.
2. Upload toàn bộ 5 file trong thư mục này vào nhánh `main`.
3. Vào **Settings → Pages**.
4. Ở **Build and deployment**, chọn **Deploy from a branch**.
5. Branch: `main`, Folder: `/ (root)`, rồi Save.
6. Đợi GitHub Pages deploy xong.
7. Mở trên TV bằng địa chỉ dạng:
   `https://TEN_GITHUB.github.io/tv-utility/`

> Không mở đường dẫn repository dạng `github.com/...` để dùng như app. Android TV nên mở URL GitHub Pages `github.io/...`.

## Điều khiển

- Mũi tên: di chuyển focus.
- OK / Enter: mở nút đang chọn.
- Back / Escape: đóng cửa sổ cài đặt.
- Nút **Cài đặt ô**: sửa tên, icon và URL. Dữ liệu được lưu bằng `localStorage` trên TV.

## Tùy biến mặc định

Mở `app.js`, sửa mảng `defaultTiles`.
