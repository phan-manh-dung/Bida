# Cơ sở kỹ thuật — bản 09

## Lực, bóng và tỷ lệ ở bản 09

Mọi mức kéo dùng 75% vận tốc bản 07/08, tức `0.75*(0.15*p + 22.15*p^1.8 + 10*p^4)`. Đây là giảm vận tốc đầu 25%, không phải giảm quãng đường đúng 25%. Giữ nguyên mô hình tiếp xúc đồng thời và ma sát. Các bài thử phá vẫn kiểm tra cụm bi bung với lực thấp hơn.

Theo [WPA Equipment Specifications](https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf), bàn 9 feet có mặt chơi 2540 × 1270 mm; bi danh nghĩa 57,15 mm với dung sai nêu trong tài liệu. Dự án chọn đúng 57,2 mm như người dùng yêu cầu. `UNITS_PER_MM` dùng chung cho mặt chơi và bán kính bi; 16 mesh bi không phóng nhỏ riêng. Kích thước phủ bì còn gồm băng/khung, không đồng nhất với cách gọi 9 feet. Khung hiện tại khoảng 297,9 × 170,9 cm, không phải 274 × 137 cm; giữ nguyên hình học khung trong lần chỉnh này.

Bỏ bóng của tất cả phần cây cơ và ẩn cơ ngay tại cú chạm; bi vốn không có bóng động/đĩa bóng riêng. Phản chiếu trên bi dịu hơn để giảm nhấp nháy khi quay. Giữ nội suy vị trí và quaternion đồng bộ; kiểm tra khoảng khung hình xen kẽ 7–17 ms không gây giật tiến/lùi hoặc tăng tốc giả. Chưa thể loại trừ bóng lưu của màn hình vật lý chỉ bằng kiểm tra trình duyệt.

## Sửa cụm bi và mặt bàn ở bản 07

Tái hiện bản cũ: cú phá chính diện hết lực, sau 3 giây bi 8 chỉ cách vị trí đầu khoảng 0,06 đơn vị cảnh; vài bi giữa cụm gần như đứng nguyên. Bộ giải cũ xử lý xung từng cặp theo thứ tự mảng trong một lượt. Bản mới tích lũy lực tiếp xúc đồng thời, chia mỗi bước 1/360 giây thành 20 bước con khi có nguy cơ va chạm. Vị trí/hướng xoay trước bước vẫn lưu ở nhịp 360 Hz để nội suy không bị lệch.

Mô hình lò xo–giảm chấn pháp tuyến là xấp xỉ tiếp xúc đàn hồi hữu hạn, tham khảo công thức Hooke trong [LAMMPS granular](https://docs.lammps.org/stable/pair_granular.html). Chọn khối lượng chuẩn hóa 1, độ cứng 1e6, damping 18,4 (mục tiêu hồi phục xấp xỉ 0,96 cho cặp cô lập). Không thêm xung ngẫu nhiên vào bi giữa; kết quả không phụ thuộc thứ tự mảng. Đây chưa phải mô hình Hertz hiệu chuẩn bằng đo đạc bi thực.

Vận tốc cú đánh hiện là `0.15*p + 22.15*p^1.8 + 10*p^4`, tối đa 32,3 đơn vị/giây, khoảng 9,3 m/s theo tỷ lệ bàn. Phần bổ sung tập trung ở cuối hành trình kéo. Trong 10 vị trí phá thử, sau 3 giây có 14–15 bi mục tiêu từng rời vị trí đầu hơn 0,5 đơn vị; cú chính diện đưa bi 8 đi khoảng 2,9 đơn vị. Một viên có thể đi ít ở cú lệch, không ép mọi bi phải chuyển động bằng nhau.

Nỉ chuyển từ Basic với gradient giả sang Lambert chung màu/ánh sáng với băng, hạt vải nhỏ bất quy tắc và vùng tối sát băng hẹp. Chưa tái tạo hoàn toàn vật liệu của bàn thật trong ảnh. Lòng lỗ góc ngắn hơn 0,095 đơn vị và má góc ngắn hơn 20%, giữ đường miệng/góc cắt/shelf. Tâm bi trắng đặt ngay trên vạch bếp theo thao tác luyện tập người dùng yêu cầu, không khẳng định đây là toàn bộ vùng đặt bi theo luật thi đấu.

Đo Chrome headless 1600 × 900 DPR 1, Intel UHD, cú phá 75% trong 4 giây: trung vị 13,8 ms, p95 14 ms, lớn nhất 20,8 ms; mô phỏng phía CPU trung bình 0,13 ms/khung, lớn nhất 2,6 ms. Đây là một lượt đo sau tối ưu, không bảo đảm FPS mọi thiết bị.

## Xếp bi và đặt bi trước phá

Tham khảo [WPA Rules of Play 2026, phần 8-ball](https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf): bi đầu trên foot spot, bi 8 giữa tam giác, hai góc cuối khác nhóm và bi cái bắt đầu ở phía bếp. Bản 05 đặt foot spot và head string ở hai vị trí 1/4 và 3/4 chiều dài bàn. Theo thao tác người dùng yêu cầu, bi cái chỉ kéo ngang ngay sau vạch bếp; đây là tập con của vùng đặt bi theo luật. Không áp dụng toàn bộ luật thi đấu 8-ball.

Bỏ đĩa bóng tiếp xúc riêng trên nỉ cho tất cả bi. Hướng xoay/vị trí vẫn nội suy đồng bộ, ánh sáng trên bề mặt cầu vẫn giữ; không thêm vệt mờ hoặc bóng trễ để che chuyển động.

## Hình học bàn

Tham khảo ảnh người dùng và [Recommended Equipment Specifications của WPA](https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf): mặt chơi 100 × 50 inch, bi đường kính 2,25 inch; mép mũi băng có độ cao khoảng 63,5% đường kính bi. Miệng lỗ góc nhỏ hơn lỗ giữa và được tạo bởi hai má băng, không phải vòng tròn đặt trên nỉ.

Trong mã, 100 inch tương ứng 8,8 đơn vị cảnh. Miệng góc 4,5 inch; miệng giữa 5 inch. Má lỗ ngang lần lượt 142° và 104°, back draft 14°. Shelf góc 1,5 inch, giữa 0,25 inch, nằm trong khoảng WPA mục 9; phần bắt đầu rơi được đặt sau mép slate. `table-model.js` là nguồn chung cho phần nhìn thấy và va chạm. Lỗ có phần nỉ dẫn vào, cutout ở nỉ và slate, lớp lòng lỗ cùng nắp kim loại. Đây không phải mô hình được chứng nhận đáp ứng mọi thông số WPA; độ rộng toàn bộ băng, vật liệu và đàn hồi vẫn được đơn giản hóa.

## Trượt, lăn và va chạm

Tham khảo [Pool Physics Property Constants — Dr. Dave Alciatore](https://drdavepoolinfo.com/faq/physics/physical-properties/): mômen quán tính cầu đặc là 2/5 mR²; ma sát trượt lớn hơn nhiều so với cản lăn; va chạm bi gần đàn hồi. Bản này chọn hệ số ma sát trượt 0,2, cản lăn 0,010 và đàn hồi bi–bi 0,96 trong các khoảng tham khảo.

Sau cú đánh tâm bi, vận tốc góc bắt đầu từ 0. Vận tốc trượt tại điểm chạm nỉ là v + ω × r. Lực ma sát làm giảm vận tốc tịnh tiến đồng thời tăng độ xoay. Khi hết trượt, chuyển sang giảm tốc lăn đều. Va chạm đổi vận tốc tịnh tiến nhưng không lập tức gán bi quay theo vận tốc mới; nỉ tiếp tục xử lý phần trượt còn lại. Bật băng kết hợp hệ số đàn hồi phụ thuộc lực, giảm thành phần tiếp tuyến và chuyển một phần vận tốc góc; đây vẫn là xấp xỉ.

Tính toán bước cố định 1/360 giây và nội suy hình ảnh giúp giảm rung ở tốc độ khung hình thay đổi. Test kiểm chứng chuyển trượt–lăn ở 5/7 tốc độ ban đầu trong bài toán lý tưởng, dừng không đảo hướng, tính nhất quán giữa 30 Hz và 144 Hz, và các tình huống va chạm/lỗ. Chưa mô phỏng nhảy, biến dạng băng, ma sát giữa hai bi gây throw, massé hoặc điều khiển xoáy theo vị trí đầu cơ.

## Hình ảnh và điều khiển

Three.js WebGL 2, cầu 48 × 32, texture 1024 × 512, vật liệu Standard roughness 0,23 và chống răng cưa. Bản 04 bỏ clearcoat kép và phản xạ nhiều đốm đèn trên bi, thay bằng môi trường phản xạ riêng có một softbox rộng. Từ bản 06, mặt nỉ dùng ánh sáng tĩnh chuyển mềm; băng dùng Lambert. Gộp hình học tĩnh và giới hạn bộ đệm dựng hình khoảng 2,2 triệu pixel để giảm tải GPU. Xem VIDEO-REVIEW.md để đối chiếu hai video và số đo trước/sau. Bóng tự đổ trên bi bị bỏ để tránh viền đen sai; từ bản 05 cũng bỏ đĩa bóng tiếp xúc trên nỉ. Nguồn API: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

Camera vừa toàn bàn theo vùng màn hình dành cho chơi; góc cận cơ có chủ đích nhìn gần nên có thể cắt mép bàn. Cây cơ kéo ở mép phải dùng pointer capture, khóa hướng khi lấy lực, hỗ trợ hủy thao tác và một hoạt ảnh chạm bi trước khi truyền lực. Menu và tùy chọn chỉ mở theo nút, không có thông báo chúc mừng bi vào lỗ.

## Âm thanh

Đã cắt các bản thu người dùng cung cấp thành tiếng phá, va chạm và lọt lỗ. Mốc cắt, nguồn và giới hạn xác định ghi ở `public/audio/SOURCE.md`; công cụ không nghe trực tiếp được nên chưa kiểm chứng độ tự nhiên bằng tai. Bộ phát giữ nguyên cao độ, thay đổi âm lượng theo lực và vị trí stereo. Đoạn phá bắt đầu ở va chạm đầu với cụm bi, không phát sớm lúc cơ chạm bi trắng; tránh chồng thêm tiếng va chạm lên đoạn phá đã có sẵn nhiều tiếng. Chưa gán tiếng cơ/băng.

## Sửa chuyển động và cơ ở bản 03

Hướng xoay được tích phân trong mô phỏng cố định và slerp với cùng hệ số nội suy vị trí. Bỏ lớp bóng động của bi trên shadow map, chỉ giữ bóng tiếp xúc nâng khỏi nỉ để tránh z-fighting. DPR không nhân thêm 1,4; bóng bàn tĩnh được lưu lại, cập nhật khi cơ đổi tư thế.

`cue-pose.js` kiểm tra bao bề mặt băng trên toàn hành trình cơ và nâng đuôi theo góc cần thiết. Đây là xử lý hình ảnh cầu cơ, chưa phải mô phỏng cú đánh nhảy/massé. `shot-control.js` dùng hành trình kéo 45% chiều cao; vận tốc đầu bằng `0.15*p + 22.15*p^1.8`, giúp cú kéo nhỏ đi ngắn mà vẫn giữ vận tốc phá tối đa.
