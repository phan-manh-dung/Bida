import './match-presentation.css';
import {TURN_DURATION_MS} from './match.js';
import {TABLES} from './match-rules.js';
import {clubIcon} from './club-icons.js';

export function mountMatchPresentation({home,settings,help,views,setup,practice}) {
  const shell=document.createElement('div');shell.className='match-presentation';
  shell.innerHTML=`<header class="match-topbar"><button class="match-brand" aria-label="NOIR — về trang chủ">N<span class="match-logo-ball">⑧</span>IR<small>BILLIARDS CLUB</small></button><nav class="match-navigation" aria-label="Điều hướng trong trận"><button data-match-home><span aria-hidden="true">⌂</span> Trang chủ</button><button data-match-setup class="active" aria-current="page"><span aria-hidden="true">♧</span> Chế độ chơi</button><button data-match-practice><span aria-hidden="true">♜</span> Tập luyện</button><button data-match-help><span aria-hidden="true">▥</span> Hướng dẫn</button></nav><div class="match-top-actions"><button data-match-views>Góc nhìn</button><button data-match-settings aria-label="Cài đặt trận đấu">⚙</button></div></header>
    <aside class="match-info-panel"><div class="match-info-card"><p class="match-info-label"><span class="match-info-title">BÀN ĐẤU CỦA BẠN</span><span class="match-info-nine" role="img" aria-label="Bi 9"><b>9</b></span></p><div class="match-info-row"><span aria-hidden="true">◉</span><div><strong>Luật chơi</strong><small data-match-game></small></div></div><div class="match-info-row"><span aria-hidden="true">▱</span><div><strong>Bàn đấu</strong><small data-match-table></small></div></div><div class="match-info-row"><span aria-hidden="true">◷</span><div><strong>Thời gian lượt</strong><small>30 giây / lượt</small></div></div></div><div class="match-tip"><strong>✦ Mẹo nhỏ</strong><p>Ngắm kỹ điểm chạm, chọn lực vừa đủ. Kéo cơ xuống rồi thả để đánh.</p></div></aside>
    `;
  document.querySelector('#game').appendChild(shell);
  for(const [name,icon] of [['home','home'],['setup','game'],['practice','trophy'],['help','chart']])shell.querySelector(`[data-match-${name}] span`).innerHTML=clubIcon(icon);
  shell.querySelector('.match-brand').onclick=home;
  shell.querySelector('[data-match-home]').onclick=home;
  shell.querySelector('[data-match-setup]').onclick=setup;
  shell.querySelector('[data-match-practice]').onclick=practice;
  shell.querySelector('[data-match-help]').onclick=help;
  shell.querySelector('[data-match-views]').onclick=views;
  shell.querySelector('[data-match-settings]').onclick=settings;
  return {render(match){
    if(!match)return;
    shell.querySelector('[data-match-game]').textContent=match.config.game==='9'?'9 bi · 9-ball':'15 bi · 8-ball';
    shell.querySelector('[data-match-table]').textContent=`${TABLES[match.config.table]?.label||match.config.table} · 9 feet`;
    shell.querySelector('.match-info-row:last-child small').textContent=`${TURN_DURATION_MS/1000} giây / lượt`;
  }};
}
