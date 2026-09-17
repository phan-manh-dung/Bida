# NOIR — Billiards Club

Web bida 3D luyện tập một người, giao diện tiếng Việt. Bản 09 giảm lực kéo tổng thể, bỏ bóng động của cơ và kiểm tra tỷ lệ bi 57,2 mm trên mặt chơi 254 × 127 cm. Xem [cơ sở kỹ thuật](RESEARCH.md).

## Chạy

Node.js 22.12+ hoặc 24, Chrome/Edge có WebGL 2.

Trên máy đã cài thư viện, nhấp đúp **Mo-Bida.cmd** để chạy web và mở trình duyệt. Máy chủ chạy nền; sau khi khởi động lại máy chỉ cần mở file này lại. Nếu có lỗi, xem `.cache/server-error.log`.

```powershell
cd H:\Bida
npm install
npm run dev -- --port 5173
```

Mở **http://127.0.0.1:5173/** trên máy chạy dự án. Chưa triển khai website công khai.

```powershell
npm run build
npm run preview
```

`dist` chứa bản đóng gói cho hosting tĩnh. Bàn, bi, cơ và vật liệu được dựng bằng mã; không cần mô hình, font hoặc ảnh từ mạng bên ngoài.

## Điều khiển

- Nhấp/chạm lên mặt bàn để ngắm.
- Trước cú phá đầu tiên, giữ/kéo trực tiếp bi trắng sang hai bên dọc vạch bếp. Escape hoặc hủy cảm ứng trả về chỗ cũ. Sau cú đầu, chức năng đặt bi này khóa lại.
- Kéo cây cơ ở mép phải **từ trên xuống**, thả để đánh. Khoảng kéo quyết định lực.
- Kéo về vị trí ban đầu hoặc nhấn Escape để hủy. Mất tiêu điểm/cảm ứng bị hủy không tạo cú đánh.
- Kéo trên bàn để xoay, cuộn hoặc chụm hai ngón để thu phóng.
- Ba nút dưới bên phải: 3D, từ trên, theo cơ.
- Nút dưới trái mở menu: thống kê, ván mới, cách chơi, toàn màn hình.
- Nút trên phải mở tùy chọn: màu nỉ, đường ngắm, ngắm tinh và âm thanh.
- ←/→ chỉnh hướng, Shift để chỉnh nhỏ. Space giữ để lấy lực rồi thả để đánh.
- Khi cây cơ được chọn bằng Tab: ↓/↑ chỉnh lực, Enter đánh, Home/Escape hủy.

Đưa 15 bi vào lỗ theo thứ tự bất kỳ. Bi trắng vào lỗ được đặt lại sau khi bi dừng. Khi mở trò chơi hoặc bắt đầu ván mới, 15 bi xếp tam giác ở đầu bàn đối diện; bi đầu trên dấu chữ thập, bi 8 ở giữa, hai góc cuối khác nhóm. Tâm bi trắng nằm trên vạch bếp. Vạch bếp và dấu chữ thập được vẽ mờ. Màu bàn/đường ngắm được lưu trên thiết bị; ván chơi không được lưu khi tải lại. Đây vẫn là chế độ luyện tập, chưa áp dụng toàn bộ luật 8-ball.

## Các thay đổi của bản 09

- Giảm 25% vận tốc ban đầu ở mọi mức kéo; tối đa 24,225 đơn vị cảnh/giây (khoảng 7 m/s). Không đổi cách truyền lực qua cụm bi.
- Cơ biến mất ngay khi chạm bi, không đổ bóng; bi không có đĩa bóng, bóng động hoặc vệt bám phía sau. Giảm độ gắt của phản chiếu, đặc biệt trên bi trắng.
- Mặt chơi 2540 × 1270 mm, tất cả bi 57,2 mm; hình ảnh và vật lý dùng chung tỷ lệ. Khung ngoài không bị ép về 274 × 137 cm vì phủ bì phụ thuộc cấu tạo băng/khung, không phải kích thước mặt chơi 9 feet.
- Kiểm tra 27 tình huống vật lý, 10 cú phá với lực giảm, kích thước 16 viên bi dựng trong trình duyệt và nội suy ở các khoảng khung hình không đều.

## Các thay đổi của bản 08

- Mặc định mặt nỉ xám sẫm, màu lì; các màu khác vẫn chọn được và giữ sau tải lại. Giảm vùng tối sát băng, phản chiếu viền đen và bóng tự đổ trên băng.
- Đẩy cơ tuyến tính trong 60 ms, đồng bộ cú chạm với cập nhật bi ngay trong khung hình đó. Bỏ nhịp tăng tốc hoạt ảnh và trễ một khung hình trước đây; giữ mô phỏng lực phá và va chạm của bản 07.
- Kiểm tra cú đánh chỉ phát một lần, bi hiện chuyển động ngay khung chạm và vận tốc giảm sau cú đánh, không có tăng tốc trễ.

## Các thay đổi của bản 07

- Bi cái có bốn chấm đen quanh thân, lớn hơn trước; bỏ các chấm đỏ và chấm ở hai cực.
- Tâm bi cái nằm giữa vạch bếp; kéo sang hai bên trước cú phá.
- Truyền lực đồng thời qua các tiếp xúc trong cụm bi, không phụ thuộc thứ tự mảng. Chia bước nhỏ khi sắp va chạm và giữ nội suy khung hình ngoài. Tăng phần lực cuối hành trình kéo, giữ cú kéo nhẹ ngắn.
- Mặt nỉ và băng nhận cùng ánh sáng khuếch tán, màu thống nhất, hạt vải nhỏ không theo lưới. Không thêm bóng chạy theo bi.
- Rút ngắn má và lòng lỗ góc; giữ nguyên độ rộng miệng, góc má và chiều sâu shelf.
- 25 kiểm thử vật lý đạt, gồm 10 vị trí phá, đảo thứ tự bi và kiểm tra năng lượng/âm thanh một va chạm. Trình duyệt kiểm tra điều khiển, chấm bi, vạch bếp và hình học cơ.

## Các thay đổi của bản 06

- Gộp hình học tĩnh: 91 → 29 lượt vẽ mỗi khung; giới hạn độ phân giải dựng hình trên màn hình DPI cao.
- Nỉ chuyển sáng mềm, thành băng thấp với mũi bo tròn; tư thế cơ dùng chung tiết diện băng để tránh xuyên thành.
- Hướng sọc/số ban đầu khác nhau giữa các bi, giữ nội suy xoay và không thêm bóng chạy theo bi.
- Thêm trình khởi động web độc lập với phiên trợ lý.

## Các thay đổi của bản 05

- Bỏ hoàn toàn đĩa bóng tiếp xúc riêng của từng bi để tránh cảm giác một quầng bóng chạy theo. Giữ tạo khối bằng ánh sáng trên cầu và bóng của bàn/cơ.
- Xếp tam giác ở foot spot (1/4 chiều dài tính từ băng cuối), vạch bếp ở đầu đối diện; vị trí hình vẽ và vị trí bi dùng chung hằng số.
- Kéo bi trắng trước cú phá bằng chuột hoặc cảm ứng, khóa xoay camera/lấy lực trong lúc đặt bi. Vị trí được giới hạn cách băng; không thể kéo đặt bi sau cú đầu.

## Các thay đổi của bản 04

- Bi dùng phản xạ một vùng đèn rộng, bề mặt bóng mềm và bỏ clearcoat kép. Giảm các đốm sáng nhỏ và viền phản xạ gắt khi bi lăn.
- Mặt nỉ/băng và sàn dùng vật liệu khuếch tán nhẹ hơn; bi 48 × 32 đoạn. Giữ nội suy vị trí/hướng xoay, không dùng bóng dư hay tích lũy khung hình để che giật.
- Đo Chrome headless 1600 × 900, DPR 1, Intel UHD: trung vị khung hình 20,8 → 13,9 ms; p95 27,7 → 14 ms. Đây là số đo trên máy kiểm tra, không bảo đảm mọi thiết bị.
- Miệng góc 4,5 inch, giữa 5 inch; má lỗ ngang 142°/104°, back draft 14°, shelf góc 1,5 inch và giữa 0,25 inch. Kích thước nose và va chạm dùng chung; tham chiếu mục 9 của [WPA](https://www.wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf).
- Cơ điều khiển dài 90% thanh, khi kéo trượt khuất qua mép dưới; lực kéo giữ như bản 03.

## Các thay đổi của bản 03

- Cơ nâng đuôi theo băng phía sau bi, giữ góc cầu cơ xuyên suốt thao tác kéo và đánh.
- Nội suy vị trí và hướng xoay cùng bước mô phỏng; mỗi bi chỉ có một bóng tiếp xúc, tránh bóng chồng và rung trên nỉ. Bản đồ bóng bàn chỉ cập nhật khi cơ đổi tư thế.
- Hành trình kéo bằng 45% chiều cao điều khiển. Đường lực mới cho phép đánh nhẹ; 10% lực đi khoảng 0,1 đơn vị cảnh, lực tối đa vẫn giữ cú phá mạnh.
- Mũi băng bo, mặt trên và má lỗ có khối; viền da/lòng lỗ có chiều sâu. Bỏ phần thân bàn che lỗ và bề mặt lòng lỗ chồng nhau.
- Thêm tiếng phá bi, ba đoạn va chạm và tiếng vào lỗ từ bản thu người dùng; nguồn và các mốc cắt ghi trong `public/audio/SOURCE.md`.

## Bố cục và cách chơi giữ lại từ bản 02

- Bỏ toàn bộ thông báo chúc mừng, tiêu đề ngoài bàn, nhãn trang trí, khay bi, footer và bảng điều khiển luôn mở.
- Bỏ thanh lực ngang và nút đánh. Thay bằng cây cơ kéo–thả, có hoạt ảnh lùi cơ và chạm bi.
- Miệng lỗ khoét trong nỉ/slate, có shelf, má băng vát, lòng lỗ và nắp góc kim loại; không còn các vòng tròn nổi.
- Mô tả hình học chung cho băng và va chạm. Đường ngắm tính cả má lỗ, có bán kính bi.
- Mô phỏng trượt và lăn riêng, vận tốc góc, giảm tốc lăn đều, nội suy giữa các bước 1/360 giây, bi rơi xuống lỗ.
- Bi cầu mịn, texture lớn, chống răng cưa và vật liệu bóng, bỏ bóng tự đổ gây viền trên bi.
- Camera tự bố trí theo chiều ngang/dọc và chừa chỗ cho cơ kéo. Phối cảnh cận cơ cho phép quan sát gần; 3D và nhìn từ trên vừa toàn bàn.

## Âm thanh từ bản thu

Đã tích hợp bản thu từ `amthanh.mp3`, `phá bi.MP3` và `đánh bi rớt xuống lỗ.MP3`. Đoạn phá phát khi bi trắng chạm cụm bi ở cú phá đủ mạnh; tạm bỏ các tiếng va chạm riêng trong đoạn phá để không chồng âm. Tiếng vào lỗ dùng bản thu riêng. Chưa gán tiếng cơ và băng vì chưa có đoạn xác định được.

Công cụ phiên làm việc không nghe được âm đầu vào. Loại âm dựa trên mô tả/tên file của người dùng và các mốc cắt dựa trên tín hiệu; cần nghe thực tế để đánh giá chính xác độ tự nhiên. Không có âm tổng hợp thay thế.

Tùy chọn → Thêm bản thu âm thanh cho phép nạp WAV/MP3/OGG được trình duyệt hỗ trợ cho từng loại: cơ chạm bi, bi chạm bi, bi chạm băng, bi rơi vào lỗ. Có thể chọn nhiều bản thu mỗi loại để luân phiên. Những tệp này chỉ dùng trong phiên hiện tại, không được tải lên máy chủ.

Để tích hợp bản thu lâu dài, thêm file vào `public/audio` và khai báo URL trong [manifest.json](public/audio/manifest.json), ví dụ:

```json
{
  "shot": ["/audio/cue-hit.wav"],
  "collision": ["/audio/ball-hit-1.wav", "/audio/ball-hit-2.wav"],
  "cushion": ["/audio/cushion-hit.wav"],
  "pocket": ["/audio/pocket-drop.wav"]
}
```

Bộ phát giữ nguyên cao độ bản thu, thay đổi âm lượng theo vận tốc va chạm và vị trí stereo theo camera. Cú chạm nhẹ phát nhỏ; tiếng rơi vẫn nghe được khi bi lăn chậm vào lỗ.

## Kiểm tra

```powershell
npm test
npm run test:browser
npm run test:clearance
npm run test:break
npm run capture
```

Kiểm tra trình duyệt/capture cần Vite tại cổng 5173 và Chrome cài trên máy. Chrome được chạy ẩn, dùng hồ sơ riêng; ảnh lưu tại `artifacts`.

Kiểm tra cơ dùng 7.337 điểm trên các phần thân cơ ở bảy vị trí/hướng sát băng và ba mức kéo, đối chiếu trực tiếp với mesh bàn trong Chrome.

22 bài kiểm tra mô phỏng/điều khiển: va chạm, băng, lỗ, đặt lại bi trắng, cú phá, ngắm, chuyển trượt–lăn, dừng, hướng xoay nhất quán 30/144 Hz, lực nhẹ, hành trình kéo, cơ vượt băng, kích thước miệng/má/shelf, bi rơi qua cả sáu lỗ, cấu trúc tam giác và đặt bi trắng trước phá. Kiểm tra Chrome gồm đặt bi chuột/cảm ứng, hủy đặt, khóa camera/cú đánh, reset ván, cùng các kiểm tra điều khiển và bố cục trước đó. WAV im lặng chỉ được tạo trong bài kiểm tra bộ phát. Có thể đổi máy chủ kiểm tra bằng biến `BASE_URL`.

## Giới hạn

Chưa có bot/online, luật thi đấu 8-ball/9-ball, điều khiển xoáy, nhảy bi hoặc mô phỏng đàn hồi 3D đầy đủ. Phần bật băng là mô hình xấp xỉ đã hiệu chỉnh, không phải đo kiểm bàn thi đấu ngoài đời. Kiểm tra cảm ứng dùng giả lập Chrome; cần tiếp tục chơi thử trên điện thoại thật.

## Mã nguồn

- `src/main.js`: giao diện, menu, kéo cơ, bàn phím.
- `src/scene.js`: camera, bi, cơ, ánh sáng, nội suy hình ảnh.
- `src/table-model.js`: kích thước, các đoạn băng, má lỗ và vị trí lỗ chung.
- `src/table-visual.js`: mặt nỉ, slate có lỗ, băng vát, nắp góc và vật liệu.
- `src/physics.js`: chuyển động, va chạm và trạng thái bi.
- `src/audio.js`: phát bản thu âm thanh.
- `src/style.css`: giao diện toàn khung, cây cơ, các menu.
- `RESEARCH.md`: cơ sở kỹ thuật và giới hạn.
