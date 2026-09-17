# Nguồn âm thanh

Nguồn: tệp `H:\amthanh.mp3` do người dùng cung cấp trong yêu cầu sửa trò chơi.
SHA-256: `4d90231df29820e4db5db4d156353ce41d3738ba800301ffaee9d32ed347f276`.

Người dùng xác nhận khoảng hai giây đầu là tiếng phá bi và cho biết bản thu
có tiếng bi va chạm, tiếng bi lọt lỗ. Công cụ của phiên làm việc này không
hỗ trợ nghe đầu vào MP3 hoặc WAV; các mốc được tìm bằng biên độ và phổ âm.
Không có tuyên bố đã nghe kiểm chứng hoặc xác nhận chính xác mọi loại va chạm.

| Tệp | Khoảng cắt từ bản gốc | Sử dụng |
| --- | --- | --- |
| impact-01.wav | 2,542–2,755 giây | Đoạn xung ngắn, tạm gán cho bi va chạm, chờ nghe kiểm chứng |
| impact-02.wav | 4,778–5,010 giây | Đoạn xung ngắn, tạm gán cho bi va chạm, chờ nghe kiểm chứng |
| impact-03.wav | 6,745–6,990 giây | Đoạn xung ngắn, tạm gán cho bi va chạm, chờ nghe kiểm chứng |

Xử lý: PCM16 mono 44,1 kHz; lọc thông cao 120 Hz và thông thấp 11 kHz bậc hai;
cân đỉnh về 0,72 (khoảng −2,85 dBFS); fade đầu 2 ms, fade cuối 35 ms để tránh
tiếng nổ tại mép cắt. Giữ nguyên cao độ, không thêm âm tổng hợp.

Hai tệp riêng do người dùng cung cấp thêm ngày 17/09/2026:

| Tệp xuất | Bản thu nguồn | Khoảng cắt |
| --- | --- | --- |
| break.wav | phá bi.MP3 | 0,329–1,071 giây |
| pocket.wav | đánh bi rớt xuống lỗ.MP3 | 0,318–1,400 giây |

Loại âm dựa trên tên tệp người dùng cung cấp. Mốc cắt suy luận từ xung đầu
riêng lẻ và cụm xung theo sau để bỏ tiếng đánh đầu cùng khoảng chờ; chưa nghe
kiểm chứng. Hai đoạn mới chỉ bỏ DC, cân đỉnh 0,72, fade đầu 2 ms/cuối 45 ms,
xuất PCM16 mono 44,1 kHz. Hash và mốc chính xác nằm trong `source-cuts.json`.

Chưa gán âm cho đầu cơ hoặc băng vì chưa có đoạn riêng xác định được.
Đoạn phá bi phát ở lần chạm cụm bi đầu tiên của lượt phá đủ mạnh, đồng thời
tạm bỏ các tiếng bi va chạm riêng trong thời lượng đoạn thu để tránh chồng âm.
