# Đối chiếu video — bản 06, 17/09/2026

Đã trích hình tổng quan và chuỗi 16 khung liên tiếp ở tốc độ ghi gốc từ cả hai video người dùng cung cấp. Không dùng hình/âm thanh của game tham khảo làm tài nguyên cho dự án.

- Video web: 1920 × 1020, 27,57 giây, tốc độ ghi trung bình khoảng 24 fps. Chuỗi ở giây 7 và 17 cho thấy bi dịch chuyển đều; đốm phản chiếu nhỏ, hình khối ổn định; mặt nỉ có chuyển sáng mềm sát băng.
- Video app: 71,66 giây, 30 fps, có thông tin xoay và khoảng đen lớn; vùng chơi thực tế nhỏ. Chuỗi ở giây 12 và 38 cho thấy chuyển camera và bi khá đều, thành băng thấp, mặt nỉ ít lóe sáng.
- Không thể suy ra FPS thật của hai game từ video đã ghi hoặc so hiệu năng trực tiếp với bản của mình: độ phân giải vùng chơi, camera và thiết bị khác nhau.

## Thay đổi thực hiện

Gộp hình học tĩnh theo vật liệu, giảm lượt vẽ; giới hạn bộ đệm hình ảnh khoảng 2,2 triệu pixel trên màn hình DPI cao. Giữ bước mô phỏng 360 Hz và nội suy vị trí/hướng xoay, không tạo ảnh dư hoặc bóng riêng chạy theo bi.

Mặt nỉ có ánh sáng tĩnh chuyển mềm, không tính bóng động trên nỉ. Hạ chiều cao thành và ốp kim loại, làm tròn tiết diện mũi băng, dùng cùng tiết diện đó để nâng cơ. Giữ nguyên kích thước miệng lỗ và mô hình va chạm. Đổi hướng ban đầu từng viên bi để sọc/số không đồng loạt quay cùng một phía.

## Đo trước/sau

Cùng Chrome headless, Intel UHD, 1600 × 900, DPR 1, bàn đỏ, góc 3D, cú phá lực 75%, lấy mẫu 4 giây:

| Chỉ số | Bản 05 | Bản 06 |
|---|---:|---:|
| Lượt vẽ/khung | 91 | 29 |
| Thời gian render phía CPU trung bình | 1,32 ms | 0,74 ms |
| Khoảng khung hình trung vị | 13,9 ms | 13,8 ms |
| Khoảng khung hình p95 | 20,9 ms | 14,0 ms |
| Khoảng khung lớn nhất | 21,1 ms | 27,7 ms |

Đây là một lượt đo so sánh, không phải cam kết FPS trên mọi máy. Bản 06 vẫn có một khung chậm đơn lẻ; cần người dùng đánh giá cảm giác trên màn hình thật. Phần vật lý không đổi luật chuyển động trong lần này; cải thiện tập trung vào tải dựng hình và hình ảnh ổn định.
