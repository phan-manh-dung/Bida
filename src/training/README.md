# Học cùng HLV

Giao diện hiện tại gộp điểm ngắm, phần chồng hai bi, hình đặt đầu cơ/lực và mẹo ngắn vào cùng một thẻ. Không còn ba tab hướng dẫn. `options.js` sắp xếp bản sao danh sách theo độ phức tạp thao tác, giữ nguyên lời giải và ID bài; cách đơn giản nhất trong bài được gắn “Tập sự · thử trước”, không khẳng định đây là thống kê mức phổ biến ngoài đời. Phần so sánh/chạy sơ đồ nằm trong mục mở rộng. Dấu dừng bi cái trên bàn nhấp nháy chậm bằng callback render, tôn trọng reduced-motion và được hủy cùng overlay khi đánh, tự tập hoặc rời bài.

Thư viện mở, không đặt tổng số bài cố định. Có 12 thế bi gốc và các phương án đầu cơ được chạy thử với vật lý NOIR. HLV mặc định hiển thị hướng dẫn có hình, chia ba bước: điểm ngắm, đầu cơ/lực, đường chạy/vị trí dừng. Có nút tự đánh để ẩn trợ giúp và ghi nhận hoàn thành độc lập. Đây không phải bản sao các bài thi có bản quyền hay một bộ giải tổng quát cho mọi thế bi.

## Gọi lại và mở rộng

- `catalog.js`: `LESSONS`, `getLesson(id)`, nguồn tham khảo, mục tiêu, tọa độ và yêu cầu kỹ thuật. ID ổn định dùng để lưu tiến độ.
- `engine.js`: `loadLayout(physics, lesson)`, `simulateLesson(lesson, shot, trace)`, `evaluateLesson(lesson, physics, events)`. Không phụ thuộc DOM/Three.js; dùng lại được cho kiểm tra hoặc dịch vụ gợi ý.
- `solutions.json`: các cú mẫu đã kiểm chứng, tách khỏi lời hướng dẫn. Mỗi bài có nhiều phương án khi tìm được; không giả định mọi thế đều có nhiều lỗ khả thi.
- `progress.js`: đọc/ghi tiến độ có phiên bản, phân biệt hoàn thành có trợ giúp và tự đánh; lỗi lưu trữ không chặn chơi.
- `overlay.js`: vẽ đường mẫu của bi cái/bi mục tiêu, lỗ cần đánh và điểm dừng; giải phóng geometry/material khi đổi bài.
- `coach.js`: phân tích va chạm mẫu để giải thích dày/mỏng, mức chồng hình chiếu hai bi, lực và kết quả; dựng SVG minh họa theo từng cú, không dùng ảnh tĩnh chung cho mọi bài. Tỉ lệ chồng là bề rộng hình chiếu, không phải phần trăm diện tích.
- `view.js`: các bước hướng dẫn, sơ đồ chuyển động 6 giây và so sánh phương án. Sơ đồ chạy trên dữ liệu mô phỏng đã lưu đệm, không đánh vào bàn thật hoặc ghi tiến độ. Cùng mốc thời gian cho hai bi; đây là phát chậm/nhanh theo thời lượng cố định, không phải tốc độ thật.
- `index.js`: `mountTraining(...)` nhận adapter điều khiển bàn. Trả về `open()`, `start(id)`, `close()`, `event(e)`, `canShoot`.

Thêm bài vào catalog, chạy `npm run training:calibrate`, `npm run training:expand`, sau đó `npm test`. Công cụ expand bổ sung ép phê ngang khi vượt qua kiểm tra và tìm đường/lỗ thay thế cho bài 3. Trường `pocket`/`bank` của phương án đi qua `resolveLesson()` để hướng dẫn, vẽ và chấm bài cùng một mục tiêu. Nếu không tìm được cú đạt mục tiêu, không xuất một gợi ý chưa kiểm chứng. Khi vật lý hoặc kích thước bi/bàn thay đổi phải kiểm tra lại toàn bộ lời giải. `node tests/coach-browser.mjs` kiểm tra hướng dẫn, xem mẫu, phương án một băng đổi lỗ và tự đánh.

Đường mẫu là dự đoán của phương án đang chọn, không phải đường dự đoán trực tiếp theo chuột. Người chơi tự kéo lực; nút đặt mẫu chỉ đặt hướng và đầu cơ. Bài được chấm theo sự kiện và vị trí thực tế, không yêu cầu sao chép chính xác cú mẫu. Mỗi lượt chỉ một cú, rồi thử lại hoặc chuyển bài. Thời gian tìm lời giải nằm ở công cụ tác giả, không chạy tìm kiếm hàng nghìn cú trong giao diện.

## Nghiên cứu và lộ trình nội dung

Tham khảo ngày 24/09/2026:

- https://billiarduniversity.org/resources/learning/ — Exam I liệt kê 8 chủ đề, Exam II liệt kê 10 chủ đề; đây là cấu trúc bài thi của BU, không phải tổng số thế bi trong bida. Dùng cách phân nhóm kỹ năng để tổ chức thư viện.
- https://drdavepoolinfo.com/faq/aiming/ghost-ball/ — nền tảng hình học của vị trí bi ảo.
- https://drdavepoolinfo.com/faq/aiming/fractional/ — phần chồng hình chiếu hai bi hỗ trợ hình dung dày/mỏng. Phân số là mốc trực quan, không thay thế hướng ngắm liên tục của từng thế.
- https://drdavepoolinfo.com/faq/bank-kick/effects/ — góc phản xạ băng phải xét lực và xoáy, cần kiểm chứng qua mô phỏng.
- https://drdavepoolinfo.com/faq/drill/why-do-drills/ — luyện tập có mục tiêu thay vì chỉ lặp cho đủ số lần.

Các nhóm có thể bổ sung: cắt nhiều góc/khoảng cách, điều tốc độ, dừng/stun/trô/cu-lê, ép phê và đường ra băng, đặt bi theo vùng, chuỗi 2–3 bi trong 9 bi, chọn lỗ thay thế, bi sát băng, bank/kick một hoặc nhiều băng, đánh kết hợp, phòng thủ và thoát che bi. Jump/massé và lời khuyên phụ thuộc throw/squirt cần nâng vật lý trước. Mỗi nhóm có nhiều biến thể, không có số lượng thế đánh hữu hạn để “cóp đủ”.

Chưa có trong bản đầu: tự sinh thế biến thể, giải mọi đường/lỗ, giọng nói, dự đoán xác suất, đồng bộ tài khoản/online, bán trợ giúp. Nội dung tiếng Việt và tọa độ bài tập do dự án tự biên soạn; không chép hình/video hoặc toàn bộ giáo trình nguồn.
