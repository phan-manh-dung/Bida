import { createRack, RADIUS, HALF_X, HALF_Z } from './physics.js';
import { FOOT_SPOT_X, HEAD_STRING_X } from './table-model.js';

export const TABLES = {
  novice: { label: 'Novice', friction: .013, description: 'Vải chậm · dễ kiểm soát lực' },
  club: { label: 'Club', friction: .010, description: 'Vải vừa · cân bằng' },
  tournament: { label: 'Tournament', friction: .0085, description: 'Vải nhanh · cần kiểm soát lực tốt' },
};
export const LEVELS = ['I','H','G','F','E','D','C','B','A','PRO'].map((id,index)=>({
  id, label:id==='PRO'?'Chuyên nghiệp':`Hạng ${id}`, error:[.050,.040,.032,.025,.019,.014,.009,.006,.003,.0015][index],
  opponents:(id==='B'?['Bảo','Bình','Bách','Băng']:['An','Minh','Lâm']).map((name,n)=>({id:`${id}-${n}`,name:`${name} · ${id==='PRO'?'Pro':id}`})),
}));
export const POCKET_NAMES=['Góc đầu trái','Giữa trái','Góc cuối trái','Góc đầu phải','Giữa phải','Góc cuối phải'];
export function normalizeConfig(input) {
  const level=LEVELS.find(l=>l.id===input.level)||LEVELS[0];
  const target=Number(input.target);
  if(!Number.isInteger(target)||target<1||target>100)throw new Error('Mục tiêu phải là số nguyên từ 1 đến 100.');
  const game=input.game==='9'?'9':'8';
  return {game,level:level.id,target,table:TABLES[input.table]?input.table:'club',
    rack:game==='8'?'eight':input.rack==='nine-classic'?'nine-classic':'nine-wpa',
    name:String(input.name||'').trim().slice(0,24)||'Người chơi 1',
    opponent:level.opponents.find(o=>o.id===input.opponent)||level.opponents[0],
    aid:['none','line','ghost'].includes(input.aid)?input.aid:'ghost',follow:!!input.follow};
}
function shuffle(values,random) {
  const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function competitionRack(config,random=Math.random) {
  const balls=createRack('rack');let order,rows,apex=FOOT_SPOT_X;
  if(config.game==='9') {
    const others=shuffle([2,3,4,5,6,7,8],random);
    order=[1,others[0],others[1],others[2],9,...others.slice(3)];rows=[1,2,3,2,1];
    if(config.rack!=='nine-classic')apex-=2*RADIUS*Math.sqrt(3)*1.001;
  } else {
    order=shuffle(Array.from({length:15},(_,i)=>i+1),random);
    const swap=(id,index)=>{const at=order.indexOf(id);[order[at],order[index]]=[order[index],order[at]];};
    swap(8,4);const solid=1+Math.floor(random()*7),stripe=9+Math.floor(random()*7);
    swap(solid,10);swap(stripe,14);rows=[1,2,3,4,5];
  }
  for(const b of balls)b.pocketed=b.id>Number(config.game==='9'?9:15);
  let index=0;rows.forEach((count,row)=>{for(let col=0;col<count;col++){
    const id=order[index++],b=balls.find(b=>b.id===id);
    b.x=b.px=apex+row*RADIUS*Math.sqrt(3)*1.001;b.z=b.pz=(col-(count-1)/2)*RADIUS*2*1.001;
  }});
  Object.assign(balls[0],{x:HEAD_STRING_X-.15,px:HEAD_STRING_X-.15,z:0,pz:0});return balls;
}
export const groupOf=id=>id>0&&id<8?'solid':id>8?'stripe':null;
export function legalTargets(game,group,remaining,breaking=false) {
  if(game==='9')return remaining.length?[Math.min(...remaining)]:[];
  if(breaking)return remaining;
  if(!group){
    if(!remaining.some(id=>groupOf(id)==='solid')||!remaining.some(id=>groupOf(id)==='stripe'))return remaining;
    return remaining.filter(id=>id!==8);
  }
  const ids=remaining.filter(id=>groupOf(id)===group);return ids.length?ids:[8];
}
// Pure adjudication: consumes events recorded in their physical order.
export function judgeShot(state,shot) {
  const ids=shot.pockets.map(p=>p.id),objects=ids.filter(Boolean),other=1-state.turn;
  const targets=legalTargets(state.game,state.groups[state.turn],shot.remaining,state.breaking);
  const result={next:other,foul:null,winner:null,spot:[],hand:null,group:null,choice:null,pushAvailable:false};
  if(ids.includes(0)||shot.off.includes(0))result.foul='Bi cái vào lỗ hoặc ra ngoài bàn';
  else if(shot.off.length)result.foul='Bi mục tiêu ra ngoài bàn';
  else if(!shot.push && shot.first===null)result.foul='Không chạm bi mục tiêu';
  else if(!shot.push && !targets.includes(shot.first))result.foul='Chạm sai bi đầu tiên';
  else if(shot.firstInKitchenWithoutCross)result.foul='Chưa đưa bi cái qua vạch bếp';
  else if(!shot.push && !objects.length && !shot.railAfter)result.foul='Không có bi chạm băng sau va chạm';
  const called=shot.pockets.some(p=>p.id===shot.call?.ball&&p.pocketIndex===shot.call?.pocket);
  if(state.game==='9') {
    if(state.breaking && !objects.length && shot.rails.size<4)result.foul='Phá bi: chưa có 4 bi mục tiêu chạm băng';
    if((result.foul||shot.push)&&ids.includes(9)||shot.off.includes(9))result.spot=[9];
    if(result.foul){result.hand='any';if(state.fouls[state.turn]>=2)result.winner=other;return result;}
    if(shot.push){result.choice='push';return result;}
    if(state.breaking && state.rack==='nine-wpa' && new Set([...objects,...shot.crossed]).size<3){result.choice='illegal-nine';if(ids.includes(9))result.spot=[9];return result;}
    if(ids.includes(9)){result.winner=state.turn;return result;}
    if(objects.length)result.next=state.turn;
    result.pushAvailable=state.breaking;return result;
  }
  if(state.breaking) {
    if(ids.includes(8)||shot.off.includes(8)){result.spot=[8];result.choice=result.foul?'eight-foul':'eight-break';result.next=result.foul?other:state.turn;return result;}
    if(result.foul){result.choice='break-foul';return result;}
    if(!objects.length && shot.rails.size<4){result.foul=null;result.choice='illegal-eight';return result;}
    if(objects.length)result.next=state.turn;return result;
  }
  if(ids.includes(8)||shot.off.includes(8)) {
    const cleared=targets.includes(8);
    result.winner=!result.foul&&cleared&&called&&shot.call?.ball===8&&!shot.safety?state.turn:other;
    if(result.winner===other&&!result.foul)result.foul='Bi 8 vào sớm, sai lỗ gọi hoặc ra ngoài bàn';return result;
  }
  if(result.foul){result.hand='any';return result;}
  if(!shot.safety&&called&&targets.includes(shot.call.ball)){
    result.next=state.turn;if(!state.groups[state.turn])result.group=groupOf(shot.call.ball);
  }
  return result;
}
export function lagResult(balls,records) {
  const invalid=records.map((r,i)=>r.bad||r.foot!==1||balls[i].pocketed||balls[i].x < -HALF_X+RADIUS-.005||Math.abs(balls[i].z)>HALF_Z-RADIUS);
  if(invalid.every(Boolean))return {winner:null,reason:'Cả hai phạm lỗi. Thi lại.'};
  if(invalid[0]!==invalid[1])return {winner:invalid[0]?1:0,reason:'Một người phạm lỗi thi băng.'};
  const distances=balls.map(b=>b.x+HALF_X-RADIUS);
  if(Math.abs(distances[0]-distances[1])<.005)return {winner:null,reason:'Hai bi quá sát nhau. Thi lại.'};
  return {winner:distances[0]<distances[1]?0:1,reason:'Bi gần băng đầu bàn hơn.',distances};
}
