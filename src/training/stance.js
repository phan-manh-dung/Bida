import {OUTER_X,OUTER_Z,UNITS_PER_MM} from '../table-model.js';

// A geometric suggestion, not a body/reach simulation. Handedness changes
// the body side, never the shot direction or its simulated outcome.
export function suggestStance(lesson,shot,hand='right',wide=false){
  const cue=lesson.balls.find(b=>b.id===0);
  const d={x:Math.cos(shot.angle),z:Math.sin(shot.angle)};
  const tx=Math.abs(d.x)<1e-8?Infinity:(OUTER_X+Math.sign(d.x)*cue.x)/Math.abs(d.x);
  // Intersect the ray behind the cue ball with the outside of the rail.
  const tz=Math.abs(d.z)<1e-8?Infinity:(OUTER_Z+Math.sign(d.z)*cue.z)/Math.abs(d.z);
  const distance=Math.min(tx,tz);
  const edge=tx<tz?(d.x>0?'cạnh ngắn giữa lỗ 1–4':'cạnh ngắn giữa lỗ 3–6'):(d.z>0?'cạnh dài có lỗ 2':'cạnh dài có lỗ 5');
  const base={x:cue.x-d.x*(distance+.12),z:cue.z-d.z*(distance+.12)};
  const side=hand==='left'?-1:1,spread=wide?.48:.3;
  const feet=[base,{x:base.x-d.z*side*spread-d.x*.12,z:base.z+d.x*side*spread-d.z*.12}];
  const reachCm=Math.max(0,distance-.65)/UNITS_PER_MM/10;
  return {feet,edge,reachCm,needsRest:reachCm>75,bridge:{x:cue.x-d.x*.65,z:cue.z-d.z*.65},cue};
}

export function spinExplanation(tip){
  const vertical=tip.y>.1?'Cu-lê tạo xoáy tiến: bi cái có xu hướng đi tiếp sau va chạm.':tip.y<-.1?'Trô tạo xoáy lùi: bi cái có thể kéo về sau va chạm nếu còn đủ xoáy.':'Đặt ngang tâm: tập trung giữ hướng và lực; bi vẫn có thể lăn tiến trước khi chạm bi mục tiêu.';
  const horizontal=Math.abs(tip.x)>.1?` Ép phê ${tip.x<0?'trái':'phải'}: nhìn từ trên xuống, bi xoay ${tip.x<0?'cùng':'ngược'} chiều kim đồng hồ quanh trục đứng. Xoáy ngang làm thay đổi góc bật băng; không có nghĩa bi tự chạy sang ${tip.x<0?'trái':'phải'}. Nếu đánh vuông góc vào băng phía trước, bi bật lệch về bên ${tip.x<0?'trái':'phải'} của người đánh so với cú không ép phê. Với góc vào băng khác, xem đường xanh của cú mẫu.`:'';
  return vertical+horizontal+' Kết quả còn tùy lực, góc chạm và quãng đường. Trái/phải tính khi nhìn dọc cơ.';
}
