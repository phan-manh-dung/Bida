# Chỉnh hình lỗ bằng thông số

## Một chỗ để chỉnh

Mở **`src/pocket-svg.js`**, tìm `// ===== POCKET VISUAL TUNING =====` và sửa **`POCKET_TUNING`**. Lưu file để Vite tải lại bàn.

Trong dev, lưu `pocket-svg.js`, `table-visual.js`, `corner.svg` hoặc `side.svg` cập nhật riêng mesh bàn ngay trên canvas hiện tại, không tải lại trang. Camera, bi và phiên tập được giữ nguyên. Các tài nguyên mesh/vật liệu cũ được giải phóng sau khi thay bàn. Sửa các file ứng dụng khác vẫn có thể cần tải lại trang; cơ chế khôi phục màn tập tiếp tục hỗ trợ trường hợp đó.

| Nhóm | Thành phần |
| --- | --- |
| `corner.trim` | Bạch kim ở bốn lỗ góc |
| `corner.mouth` | Miệng đen ở bốn lỗ góc |
| `side.trim` | Bạch kim ở hai lỗ giữa |
| `side.mouth` | Miệng đen ở hai lỗ giữa |
| `corner.jaws`, `side.jaws` | Dịch riêng đầu băng trái/phải |
| `side.jawSpread` | Nới đều hai đầu băng lỗ giữa; hiện 0.034 |
| `cushion.widthRatio` | Bề rộng băng top-down so với băng chuẩn; hiện 0.6 |
| `cushion.upperOffsetZ` | Dịch dải băng phía trên xuống ảnh top-down; hiện 0 |

Mỗi `trim`/`mouth` có:

```js
mouth: {
  scaleX: 1,      // 0.9 = thu chiều X 10%; 1.1 = tăng 10%
  scaleY: 1,      // Tương tự cho chiều Y
  rotateDeg: 0,  // Độ; dương = xoay thuận chiều kim đồng hồ
  offsetX: 0,    // Dương = sang phải trong hệ tọa độ SVG đã parse
  offsetY: 0,    // Dương = xuống trong hệ tọa độ SVG đã parse
},
```

Đơn vị offset là đơn vị bàn: **0.02 = 10 đơn vị SVG**. Trục X/Y là trục cục bộ của SVG sau các `transform` có sẵn, trước khi xoay/phản chiếu cho từng lỗ. Với lỗ góc, trục này có thể chéo so với màn hình. Cả bốn góc nhận cùng một chỉnh sửa và phản chiếu nhất quán.

Pivot là tâm hộp bao của từng contour sau khi parse SVG gốc, được cố định trước tuning. Thứ tự: trừ pivot → scale X/Y → xoay → cộng pivot → offset. Không thay đổi từng điểm điều khiển của path.

**Các phép biến đổi đang có trong SVG vẫn được giữ.** Ví dụ `corner.svg` đã có `scale(0.82)` ở mouth: tuning `scaleX: 1` giữ mức đó; tuning `scaleX: 0.82` thu nhỏ thêm một lần nữa. Mặc định mọi scale bằng 1, xoay/offset bằng 0 nên hình hiện tại không đổi.

## Dịch đầu băng

```js
jaws: {
  leftOffsetX: 0,
  leftOffsetY: 0,
  rightOffsetX: 0,
  rightOffsetY: 0,
},
```

Chỉ tịnh tiến, không thay góc/độ cong. Tên trái/phải theo hệ SVG đã parse. Logic băng góc hiện có vẫn giữ kiểu cắt ngang đã duyệt và phản chiếu sang băng dọc. Offset của hai đầu băng vẫn chỉnh độc lập, không kéo theo vị trí miệng lỗ hoặc tấm bạc.

## Kiểm tra

- Game: `http://127.0.0.1:5173/` → góc nhìn từ trên để xem tuning thực tế.
- `pocket-design.html`: đối chiếu **vector SVG gốc**, chưa áp dụng tuning. Chọn file ở đây chỉ xem thử, không ghi vào source.
- `npm run test:pocket-tuning`: kiểm tra giá trị trung tính, scale/rotation/offset, phản chiếu, dịch jaw và thay riêng từng thành phần trong mesh.
- `npm run test:pocket-svg`: kiểm tra parser, validation và dựng mesh.

Tuning mouth cập nhật đường khoét nỉ, lớp lót và đáy lỗ. Tuning trim chỉ đổi tấm bạc; các mốc kết thúc rail và viền ngoài vẫn dựa trên SVG gốc để không kéo đổi hình bàn. Điều chỉnh lớn có thể khiến hai thành phần không khớp; chúng không tự biến dạng để bù cho nhau.

## Khi cần sửa đường vẽ gốc

- `side.svg`: dùng cho hai lỗ giữa.
- `corner.svg`: dùng cho bốn lỗ góc.
- Giữ khung `viewBox="0 0 1000 1000"` và các ID `trim`, `mouth`, `jaw-left`, `jaw-right`.
- `trim` và `mouth` là đường khép kín; hai jaw là đường mở. Không dùng ảnh, mask, filter hoặc clone.
- `src/pocket-svg.js` vẫn kiểm tra SVG trước khi áp dụng tuning; `parsePocketSvg()` vẫn trả hình gốc, `getPocketDesign()` áp dụng tuning rồi phản chiếu.
- `getTablePocketDesign()` đặt cụm góc vào băng theo các mốc jaw gốc; tuning không làm các mốc này tự dịch theo.

Toàn bộ cấu hình trên chỉ ảnh hưởng hình vẽ. Vật lý, va chạm, tọa độ bắt lỗ, bi, cơ, AI và logic trận/luyện tập không thay đổi.
