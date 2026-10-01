import './hub.css';
import {clubIcon} from '../club-icons.js';

const art={
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  edit:'<path d="m4 16-1 5 5-1L21 7l-4-4Zm10-10 4 4M4 16l4 4"/>',
  rack:'<path d="M10 4a2 2 0 0 1 4 0l8 15a2 2 0 0 1-2 3H4a2 2 0 0 1-2-3Z"/><circle cx="12" cy="10" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="16" r="1.5"/>',
  saved:'<path d="M6 3h12v19l-6-4-6 4Z"/>',
};
const icon=name=>`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[name]}</svg>`;
function rackArtwork(){
  const colors=['#e4b222','#247ac5','#d53b43','#8b53b2','#e57b27','#219d73','#853c46','#172435'];
  let id=0;
  return `<svg class="hub-rack-illustration" viewBox="0 0 200 170" aria-hidden="true"><defs><radialGradient id="hub-ball-light" cx="30%" cy="25%"><stop stop-color="#fff" stop-opacity=".65"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs><path d="M100 8 190 156H10Z" fill="#071320" stroke="#d0ad63" stroke-width="5"/>${Array.from({length:5},(_,row)=>Array.from({length:row+1},(_,col)=>{const n=++id,x=100+(col-row/2)*30,y=35+row*26;return `<circle cx="${x}" cy="${y}" r="15" fill="${colors[(n-1)%8]}"/><circle cx="${x}" cy="${y}" r="15" fill="url(#hub-ball-light)"/><circle cx="${x}" cy="${y}" r="6" fill="#f2eee2"/><text x="${x}" y="${y+3}" text-anchor="middle" fill="#101925" font-size="8" font-family="Arial">${n}</text>`;}).join('')).join('')}</svg>`;
}

export function renderTrainingHub(root,{home,setup,help,lessons,custom,practice,saved}) {
  root.classList.add('training-hub');
  const cards=[
    ['training-start','book','Học từng thế bi','Bài mẫu, hướng dẫn và theo dõi tiến bộ.',lessons],
    ['custom-training-start','edit','Tự đặt thế bi & HLV','Đặt bi tùy ý, tự đánh hoặc nhờ HLV phân tích.',custom],
    ['free-practice-start','rack','Bàn tập tự do','Xếp đủ 15 bi và tập đánh.',practice],
    ['saved-training-start','saved','Thế bi của tôi','Mở thế bi đã lưu, sao lưu hoặc nhập từ thiết bị khác.',saved],
  ];
  root.innerHTML=`<header class="training-hub-header"><button class="training-hub-logo" aria-label="NOIR — về trang chủ">N<span>⑧</span>IR<small>BILLIARDS CLUB</small></button><nav aria-label="Điều hướng tập luyện"><button data-hub-setup>${clubIcon('game')} Chế độ chơi</button><button data-hub-help>${clubIcon('chart')} Hướng dẫn</button></nav></header><div class="training-hub-content"><h1>Chọn cách <span>tập luyện</span></h1><div class="training-hub-grid">${cards.map(([id,type,title,description],i)=>`<button id="${id}" class="training-hub-card hub-${type}"><span class="hub-card-art" aria-hidden="true">${type==='rack'?rackArtwork():''}</span><span class="hub-card-icon">${icon(type)}</span><span class="hub-card-copy"><strong>${title}</strong><span>${description}</span></span><span class="hub-card-arrow" aria-hidden="true">→</span></button>`).join('')}</div></div>`;
  root.querySelector('.training-hub-logo').onclick=home;
  root.querySelector('[data-hub-setup]').onclick=setup;
  root.querySelector('[data-hub-help]').onclick=help;
  cards.forEach(([id,,,,handler])=>root.querySelector(`#${id}`).onclick=handler);
  root.scrollTop=0;
}
