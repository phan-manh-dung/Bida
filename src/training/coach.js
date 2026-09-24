import {RADIUS,HALF_X,HALF_Z,POCKET_DETAILS} from '../table-model.js';
import {resolveLesson} from './engine.js';

export function describeShot(lesson,shot,preview){
 const effective=resolveLesson(lesson,shot),ball=lesson.balls.find(b=>b.id===lesson.target);
 const impact=preview.impact,dx=impact.object.x-impact.cue.x,dz=impact.object.z-impact.cue.z,d=Math.hypot(dx,dz);
 const forward={x:Math.cos(shot.angle),z:Math.sin(shot.angle)};
 const along=(dx*forward.x+dz*forward.z)/d,side=(-dx*forward.z+dz*forward.x)/d;
 const overlap=Math.max(0,Math.min(1,1-Math.abs(side))),angle=Math.acos(Math.min(1,Math.max(-1,along)))*180/Math.PI;
 const thickness=overlap>.9?'Gần như trúng tâm':overlap>.62?'Chạm dày':overlap>.38?'Khoảng nửa bi':'Cắt mỏng';
 const end=preview.physics.cueBall;
 const rails=preview.events.filter(e=>e.type==='cushion'&&e.id===0&&!e.jaw).length;
 const distance=Math.hypot(end.x-impact.cue.x,end.z-impact.cue.z)*2.54/8.8*100;
 const zone=`${end.z<-.55?'phía trên':end.z>.55?'phía dưới':'dải giữa'} · ${end.x<-1.4?'bên trái':end.x>1.4?'bên phải':'giữa bàn'}`;
 const tipWords=[shot.tip.y<-.1?'dưới tâm (trô)':shot.tip.y>.1?'trên tâm (cu-lê)':'ngang tâm',shot.tip.x<-.1?'lệch trái':shot.tip.x>.1?'lệch phải':'không lệch ngang'].join(', ');
 const nearRail=Math.min(HALF_X-Math.abs(ball.x),HALF_Z-Math.abs(ball.z))-RADIUS<.3;
 const pocket=POCKET_DETAILS[effective.pocket],nearPocket=Math.hypot(ball.x-pocket.x,ball.z-pocket.z)<.9;
 let tip=nearRail?'Bi gần băng không có nghĩa là luôn cắt mỏng. Ở phương án này, nhìn phần chồng hai bi bên dưới để biết chạm dày hay mỏng; giữ đúng đường vào cửa lỗ.':nearPocket?'Bi đã gần cửa lỗ. Hãy để ý đường xanh của bi cái: vào được bi mục tiêu nhưng bi trắng rơi theo vẫn là lỗi.':overlap<.38?'Cắt mỏng là chỉ chạm một phần nhỏ bên mép bi. Nếu không vào, hãy chỉnh hướng một chút trước; tăng lực không sửa được hướng ngắm sai.':'“Chạm dày” nghĩa là bi trắng che nhiều phần bi vàng khi nhìn dọc đường cơ. Không cần ép phê ngang chỉ để cắt bi.';
 if(effective.bank)tip='Đường vàng chạm băng trước rồi mới tới lỗ. Hãy giữ đúng cả lực mẫu: đổi lực có thể làm điểm bật băng thay đổi.';
 const spinNote=Math.abs(shot.tip.x)>.1?(rails?'Phương án có ép phê ngang: theo đường xanh để xem bi cái đổi hướng khi chạm băng.':'Cú này bi cái không chạm băng. Ép phê ngang chưa tạo lợi ích rõ trong mô phỏng hiện tại; ưu tiên phương án tâm để dễ tập hơn.') : shot.tip.y<-.1?'Đặt thấp tạo xoáy lùi ban đầu. Bi có lùi thật sau va chạm hay không còn phụ thuộc lực và quãng đường tới bi vàng.':shot.tip.y>.1?'Đặt cao tạo xoáy tiến. Quan sát vùng dừng xanh để tránh đánh mạnh khiến bi cái chạy quá xa.':'Bắt đầu với đầu cơ ở tâm để bớt một thao tác. Lực vẫn quyết định bi trắng sẽ đi xa bao nhiêu.';
 return {effective,overlap,angle,side,along,thickness,tip,tipWords,spinNote,rails,distance,zone,
  finish:`Bi cái ${rails?`chạm băng ${rails} lần rồi `:''}dừng ở ${zone}. Cách điểm chạm khoảng ${Math.round(distance)} cm.`,
  title:shot.bank?'Một băng':shot.pocket!==undefined&&shot.pocket!==lesson.pocket?'Đổi lỗ':Math.abs(shot.tip.x)>.1?(shot.tip.x<0?'Ép phê trái':'Ép phê phải'):shot.tip.y<-.1?'Đầu cơ thấp':shot.tip.y>.1?'Đầu cơ cao':'Tâm bi · thử trước',
 };
}
const f=n=>Number(n.toFixed(2));
const svg=(label,content,view='0 0 320 190')=>`<svg class="coach-diagram" role="img" aria-label="${label}" viewBox="${view}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
export function contactDiagram(info){
 const gx=137,gy=117,r=26,ox=gx+info.side*r*2,oy=gy-info.along*r*2;
 return svg('Phóng to vị trí hai bi khi chạm: ngắm tâm vòng bi trắng nét đứt',`
 <text x="12" y="18" fill="#bdcece">NHÌN TỪ TRÊN · PHÓNG TO</text>
 <path d="M ${gx} 182 V ${gy}" stroke="#8aead5" stroke-width="3" stroke-dasharray="5 4"/>
 <path d="M ${ox} ${oy} l ${f(info.side*38)} ${f(-info.along*38)}" stroke="#ffd379" stroke-width="3"/>
 <circle cx="${f(ox)}" cy="${f(oy)}" r="${r}" fill="#e8b637"/><text x="${f(ox)}" y="${f(oy+5)}" text-anchor="middle" fill="#17222a" font-size="17">1</text>
 <circle cx="${gx}" cy="${gy}" r="${r}" fill="#eff9f518" stroke="#eff9f5" stroke-width="2" stroke-dasharray="5 3"/>
 <circle cx="${gx}" cy="${gy}" r="3" fill="#fff"/>
 <path d="M ${gx+7} ${gy} H 213" stroke="#eff9f5"/>
 <text x="218" y="112" fill="#eff9f5">Ngắm vào</text><text x="218" y="129" fill="#eff9f5">tâm vòng này</text>
 <circle cx="${f((gx+ox)/2)}" cy="${f((gy+oy)/2)}" r="4" fill="#ff756f"/>
 <text x="12" y="207" fill="#b9cece">Vòng nét đứt = vị trí bi trắng lúc chạm.</text>`, '0 0 320 220');
}
export function overlapDiagram(info){
 const shift=-info.side*48;
 return svg('Phần chồng hai bi khi nhìn dọc cơ',`<circle cx="90" cy="35" r="24" fill="#e8b637"/><circle cx="${f(90+shift)}" cy="35" r="24" fill="#e7f6f577" stroke="#e7f6f5"/><text x="178" y="31" fill="#fff">${info.thickness}</text><text x="178" y="49" fill="#b9cece">Chồng khoảng ${Math.round(info.overlap*100)}%</text><text x="12" y="83" fill="#b9cece">Nhìn dọc cơ · tỉ lệ giúp hình dung điểm ngắm</text>`,'0 0 320 96');
}
export function tipDiagram(shot){
 const x=90+shot.tip.x*39,y=78-shot.tip.y*39;
 return svg('Vị trí đầu cơ nhìn trực diện bi trắng: trên cu-lê, dưới trô, trái phải ép phê',`
 <circle cx="90" cy="78" r="45" fill="#f2f1e8"/><path d="M45 78 H135 M90 33 V123" stroke="#8d9b9b" stroke-dasharray="3 3"/>
 <text x="90" y="20" text-anchor="middle" fill="#cee0df">Trên · cu-lê</text><text x="90" y="146" text-anchor="middle" fill="#cee0df">Dưới · trô</text>
 <text x="17" y="83" fill="#cee0df">T</text><text x="151" y="83" fill="#cee0df">P</text>
 <circle cx="${f(x)}" cy="${f(y)}" r="7" fill="none" stroke="#d93952" stroke-width="3"/>
 <text x="192" y="65" fill="#fff">Chấm đỏ:</text><text x="192" y="86" fill="#fff">đặt đầu cơ tại đây</text><text x="192" y="115" fill="#91e1ca">Lực ${f(shot.power*100)}%</text>`,'0 0 320 160');
}
export function tableDiagram(lesson,preview,animate=false){
 const x=v=>f(20+(v+HALF_X)/(HALF_X*2)*280),z=v=>f(20+(v+HALF_Z)/(HALF_Z*2)*140);
 const max=Math.max(...Object.values(preview.paths).map(p=>p.length));
 let content='<rect x="12" y="12" width="296" height="156" rx="13" fill="#28494b" stroke="#547073" stroke-width="8"/>';
 POCKET_DETAILS.forEach((p,i)=>{content+=`<circle cx="${x(p.x)}" cy="${z(p.z)}" r="7" fill="#09171d" stroke="${i===lesson.pocket?'#ffd379':'#647a7d'}"/><text x="${x(p.x)}" y="${z(p.z)+3}" fill="#eee" text-anchor="middle" font-size="8">${i+1}</text>`;});
 for(const [id,points] of Object.entries(preview.paths)){
  const color=Number(id)===0?'#8aead5':'#ffd379';
  content+=`<polyline points="${points.map(p=>`${x(p[0])},${z(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  if(animate){
   const padded=Array.from({length:max},(_,i)=>points[Math.min(i,points.length-1)]);
   content+=`<circle cx="${x(points[0][0])}" cy="${z(points[0][1])}" r="4.5" fill="${Number(id)===0?'#fff':color}"><animate attributeName="cx" values="${padded.map(p=>x(p[0])).join(';')}" dur="6s" fill="freeze"/><animate attributeName="cy" values="${padded.map(p=>z(p[1])).join(';')}" dur="6s" fill="freeze"/></circle>`;
  }else{const p=points[0];content+=`<circle cx="${x(p[0])}" cy="${z(p[1])}" r="4.5" fill="${Number(id)===0?'#fff':color}"/>`;}
 }
 const b=preview.physics.cueBall;content+=`<circle cx="${x(b.x)}" cy="${z(b.z)}" r="8" fill="none" stroke="#8aead5" stroke-dasharray="2 2"/><text x="12" y="189" fill="#b9cece">Vàng: bi 1 → lỗ ${lesson.pocket+1} · Xanh: bi cái → vòng dừng</text>`;
 return svg('Sơ đồ riêng nhìn từ trên: đường bi vàng, đường bi trắng và vòng dừng',content,'0 0 320 202');
}
