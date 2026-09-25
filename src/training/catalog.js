// Original layouts for NOIR, informed by the linked skill references.
// Stable IDs are also progress keys. Add lessons here without changing the UI.
export const SOURCES = [
  {title:'Dr. Dave — chiều xoáy và cách dùng ép phê ngang',url:'https://drdavepoolinfo.com/tutorial/sidespin/'},
  {title:'Dr. Dave — cu-lê, trô và tác động ép phê ngang',url:'https://drdavepoolinfo.com/faq/follow/accuracy/'},
  {title:'Billiard University — nhóm kỹ năng',url:'https://billiarduniversity.org/resources/learning/'},
  {title:'Dr. Dave — ngắm bằng bi ảo',url:'https://drdavepoolinfo.com/faq/aiming/ghost-ball/'},
  {title:'Dr. Dave — lực và xoáy khi đánh băng',url:'https://drdavepoolinfo.com/faq/bank-kick/effects/'},
];
const lesson=(id,title,group,cue,object,pocket,advice,extra={})=>({id,title,group,balls:[{id:0,x:cue[0],z:cue[1]},{id:1,x:object[0],z:object[1]}],target:1,pocket,advice:advice+(['draw','follow','stop'].includes(extra.skill)?' Bài này cần điều bi trực tiếp, không để bi cái chạm băng.':''),goal:'Đưa bi 1 vào lỗ được đánh dấu, không làm bi cái rơi lỗ.',...extra});
export const LESSONS = [
  lesson('straight-short','Đường thẳng gần lỗ','Ngắm cơ bản',[1.5,.75],[3,1.5],5,'Ngắm tâm bi ảo. Với thế thẳng, thử đầu cơ thấp để bi cái không chạy theo bi mục tiêu xuống lỗ.'),
  lesson('straight-long','Đường thẳng dài','Ngắm cơ bản',[-2,-1],[2,1],5,'Khoảng cách dài làm sai lệch hướng rõ hơn. Chỉnh hướng nhỏ, rồi giữ nguyên khi kéo cơ.'),
  lesson('cut-gentle','Cắt bi góc nhẹ','Ngắm cơ bản',[0,.4],[2.7,1.1],5,'Nhìn đường từ bi mục tiêu tới lỗ. Tâm bi ảo nằm phía sau bi mục tiêu trên đường đó.'),
  lesson('cut-left','Cắt về bên trái','Ngắm cơ bản',[1,1],[-2,-.8],0,'Lệch hướng ngắm để cắt bi không đồng nghĩa với đặt đầu cơ lệch trái. Thử đầu cơ gần tâm trước.'),
  lesson('cut-thin','Cắt bi góc lớn','Ngắm cơ bản',[.4,1.5],[2.1,.3],2,'Bi mục tiêu nhận ít tốc độ hơn khi cắt mỏng. Quan sát cả hướng và lực, đừng chỉ tăng lực nếu đánh trượt.'),
  lesson('side-pocket','Chọn lỗ giữa','Chọn lỗ',[-1.3,1.2],[-.25,-.65],1,'Lỗ giữa có góc tiếp cận riêng. So sánh các cách chạm đầu cơ trong cùng một đường vào lỗ.'),
  lesson('near-rail','Bi gần băng dài','Gần băng',[.2,.8],[2.7,1.92],5,'Bi gần băng cần điểm tiếp xúc chính xác. Đường mẫu đã được thử với má lỗ và băng của bàn này.'),
  lesson('near-pocket','Bi ngay cửa lỗ','Kiểm soát lực',[1,.5],[3.85,1.92],5,'Bi gần lỗ chưa chắc cần cú mạnh. Chú ý bi cái sau va chạm để tránh rơi theo.'),
  lesson('stop','Dừng bi sau va chạm','Điều bi',[1.2,.6],[2.6,1.3],5,'Muốn dừng bi ở cú thẳng, cần giảm xoáy tiến hoặc lùi tại thời điểm chạm. Điểm đầu cơ phụ thuộc cả lực và khoảng cách.',{skill:'stop',goal:'Vào bi 1 và giữ bi cái gần vị trí tiếp xúc (trong vùng bán kính khoảng 12 cm).'}),
  lesson('draw','Trô bi trở lại','Điều bi',[1.7,.85],[2.8,1.4],5,'Đặt đầu cơ dưới tâm. Cần giữ đủ xoáy lùi tới va chạm; kéo thấp nhưng quá nhẹ có thể không tạo được trô.',{skill:'draw',goal:'Vào bi 1 và đưa bi cái lùi ít nhất khoảng 7 cm so với vị trí tiếp xúc.'}),
  lesson('follow','Cu-lê có kiểm soát','Điều bi',[.6,.3],[2.2,1.1],5,'Đầu cơ phía trên tạo xoáy tiến. Chọn lực để bi cái tiến thêm nhưng dừng trước cửa lỗ.',{skill:'follow',goal:'Vào bi 1 và đưa bi cái tiến ít nhất khoảng 9 cm sau tiếp xúc, không rơi lỗ.'}),
  lesson('bank','Bi mục tiêu qua một băng','Một băng',[-.1,1.8],[.8,.25],5,'Bi 1 phải chạm băng trước khi vào lỗ. Hướng phản chiếu chỉ là điểm bắt đầu; lực và phản ứng của băng quyết định đường ra.',{skill:'bank',bank:true,goal:'Đưa bi 1 qua băng rồi vào lỗ đánh dấu, giữ bi cái trên bàn.'}),
];
export const getLesson=id=>LESSONS.find(lesson=>lesson.id===id);
