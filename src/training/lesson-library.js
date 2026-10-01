import './lesson-library.css';
import {clubIcon} from '../club-icons.js';
import {HALF_X,HALF_Z} from '../table-model.js';

export function lessonThumbnail(lesson){
  const point=b=>({x:18+(b.x+HALF_X)/(2*HALF_X)*264,y:16+(b.z+HALF_Z)/(2*HALF_Z)*128});
  const cue=point(lesson.balls.find(b=>b.id===0)),target=point(lesson.balls.find(b=>b.id===lesson.target));
  const gradient=`lesson-shine-${lesson.id}`;
  return `<svg class="lesson-thumbnail" viewBox="0 0 300 160" aria-hidden="true"><defs><radialGradient id="${gradient}" cx="30%" cy="25%"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs><rect x="3" y="4" width="294" height="152" rx="14" fill="#075071" stroke="#7a8997" stroke-width="7"/>${[[12,12],[150,10],[288,12],[12,148],[150,150],[288,148]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8" fill="#01080f"/>`).join('')}<path d="M${cue.x} ${cue.y}L${target.x} ${target.y}" stroke="#cdeaff66" stroke-dasharray="4 5"/>${lesson.balls.map(b=>{const p=point(b);return `<circle cx="${p.x}" cy="${p.y}" r="9" fill="${b.id?'#e9b936':'#fcfcf1'}"/><circle cx="${p.x}" cy="${p.y}" r="9" fill="url(#${gradient})"/>`;}).join('')}</svg>`;
}

export function decorateLessonLibrary(root,{home,setup,help}){
  root.classList.add('lesson-library');
  const header=document.createElement('header');header.className='lessons-header';
  header.innerHTML=`<button class="lessons-logo" aria-label="NOIR — về trang chủ">NOIR<small>BILLIARDS CLUB</small></button><nav aria-label="Điều hướng thư viện"><button data-lesson-setup>${clubIcon('game')} Chế độ chơi</button><span>${clubIcon('trophy')} Tập luyện</span><button data-lesson-help>${clubIcon('chart')} Hướng dẫn</button></nav>`;
  root.prepend(header);header.querySelector('.lessons-logo').onclick=home;header.querySelector('[data-lesson-setup]').onclick=setup;header.querySelector('[data-lesson-help]').onclick=help;
  root.querySelector('h1').innerHTML='Từng thế bi. <span>Từng bước tiến.</span>';
}
