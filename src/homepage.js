import './homepage.css';
import './match-layout.css';
import './homepage-landing.css';
import './match-setup.css';
import { LEVELS, TABLES, POCKET_NAMES, normalizeConfig, competitionRack, groupOf } from './match-rules.js';
import { TURN_DURATION_MS } from './match.js';

export function mountHomepage({startMatch,startPractice,startTraining,goHome,settings,help,onSetup}) {
  const root=document.createElement('section');root.id='lobby';root.className='noir-landing';
  root.innerHTML=`
    <header class="lobby-header"><a class="brand" href="#home" aria-label="NOIR trang chủ">N<span class="brand-ball">O</span>IR<small>BILLIARDS CLUB</small></a><nav class="landing-nav" aria-label="Điều hướng trang chủ"><button data-practice>Tập luyện</button><button data-help>Hướng dẫn</button></nav></header>
    <section id="home-screen" aria-labelledby="home-title">
      <div class="home-heading"><p class="eyebrow">BILLIARDS CLUB NOIR</p><h1 id="home-title">Không chỉ là chơi bi-a,<br><span>đó là phong cách sống.</span></h1><p class="hero-description">Không gian hiện đại <i>·</i> Cộng đồng đam mê <i>·</i> Trải nghiệm đỉnh cao</p><div class="hero-actions"><button class="landing-explore" data-modes><span aria-hidden="true">▷</span> Khám phá NOIR</button></div></div>
      <div class="mode-grid" id="home-modes" aria-label="Chọn chế độ chơi">
        <button class="mode-card featured" id="ai-start"><span class="mode-number">01 / ĐỐI KHÁNG</span><span class="mode-art ai-art" aria-hidden="true"><i class="lobby-ball black-ball">8</i><i class="orbit-ring"></i></span><span class="mode-title">Chơi với máy <b>↗</b></span><span class="mode-description">Chọn đối thủ, thiết lập trận đấu<br>và thử sức qua từng cấp độ.</span><span class="mode-footer">TỪ HẠNG I ĐẾN CHUYÊN NGHIỆP <b>→</b></span></button>
        <button class="mode-card coming" disabled aria-label="Chơi online, sắp ra mắt"><span class="mode-number">02 / KẾT NỐI <em>SẮP RA MẮT</em></span><span class="mode-art" aria-hidden="true"><i class="lobby-ball small-ball">9</i><i class="lobby-ball second-ball">2</i></span><span class="mode-title">Chơi online</span><span class="mode-description">Hẹn nhau bên bàn bida.<br>Tính năng đang được phát triển.</span><span class="mode-footer">THI ĐẤU CÙNG BẠN BÈ</span></button>
        <button class="mode-card" id="practice-start"><span class="mode-number">03 / TỰ DO</span><span class="mode-art practice-art" aria-hidden="true"><i class="lobby-ball white-ball"></i><i class="practice-line"></i></span><span class="mode-title">Tập luyện <b>↗</b></span><span class="mode-description">Một bàn riêng, không áp lực.<br>Tập ngắm và kiểm soát lực cơ.</span><span class="mode-footer">VÀO BÀN NGAY <b>→</b></span></button>
      </div>
    </section>
    <section id="setup-screen" hidden aria-labelledby="setup-title">
      <div class="setup-heading"><span class="setup-target" aria-hidden="true">⌖</span><div><h1 id="setup-title">Thiết lập <span>trận đấu</span></h1><p>Chọn đối thủ, luật chơi và bắt đầu.</p></div></div>
      <form id="match-form" class="setup-grid">
        <div class="setup-panel setup-options"><h2><span aria-hidden="true">⚙</span> Thiết lập trận</h2>
          <div class="setup-fields">
            <div class="setup-field level-field"><label for="ai-level"><span aria-hidden="true">◈</span> Cấp độ AI</label><div class="level-shortcuts" role="group" aria-label="Chọn nhanh cấp độ AI">${[['I','Dễ'],['F','Trung bình'],['B','Khó'],['PRO','Chuyên nghiệp']].map(([id,label])=>`<button type="button" data-level="${id}" aria-pressed="false">${label}</button>`).join('')}</div><select name="level" id="ai-level" aria-label="Tất cả cấp độ AI">${LEVELS.map(l=>`<option value="${l.id}">${l.label}</option>`).join('')}</select></div>
            <div class="setup-field"><label for="game-type"><span aria-hidden="true">◉</span> Loại trò chơi</label><select name="game" id="game-type"><option value="9">9 bi · 9-ball</option><option value="8">15 bi · 8-ball trơn/sọc</option></select></div>
            <div class="setup-field"><label for="rack-type"><span aria-hidden="true">△</span> Cách xếp bi</label><select name="rack" id="rack-type"></select></div>
            <div class="setup-field"><label for="table-type"><span aria-hidden="true">▱</span> Loại bàn</label><select name="table" id="table-type">${Object.entries(TABLES).map(([id,t])=>`<option value="${id}" ${id==='club'?'selected':''}>${t.label}</option>`).join('')}</select></div>
            <div class="setup-field"><label for="race-target"><span aria-hidden="true">◎</span> Mục tiêu trận đấu</label><div class="race-input"><input name="target" id="race-target" type="number" min="1" max="100" step="1" value="5" required /><span>ván thắng</span></div></div>
            <div class="setup-field"><label for="setup-aid"><span aria-hidden="true">⌖</span> Loại hỗ trợ</label><select id="setup-aid" name="aid"><option value="ghost">Bi ảo + đường ngắm</option><option value="line">Đường ngắm</option><option value="none">Không hỗ trợ</option></select></div>
            <div class="setup-field"><label for="player-name"><span aria-hidden="true">♙</span> Tên người chơi</label><input id="player-name" name="name" maxlength="24" value="Người chơi 1" autocomplete="nickname" placeholder="Người chơi 1" /></div>
            <div class="setup-field"><label for="ai-opponent"><span aria-hidden="true">♙</span> Chọn đối thủ</label><div class="opponent-picker"><select name="opponent" id="ai-opponent"></select><button type="button" id="random-opponent" aria-label="Chọn ngẫu nhiên đối thủ trong cấp độ này">⤨</button></div></div>
          </div>
          <details class="setup-rules"><summary>Chi tiết luật & bàn đấu</summary><p class="field-note" id="rack-note"></p><p class="field-note"><span id="race-note">Ai thắng 5 ván trước sẽ thắng trận.</span> Từ 1 đến 100 ván.</p><p class="field-note" id="table-note"></p><p class="field-note">Các hạng là mức AI trong trò chơi. Độ chính xác ngắm và lực đánh tăng theo cấp độ.</p></details>
        </div>
        <aside class="setup-panel players-panel"><h2><span aria-hidden="true">♧</span> Đối thủ</h2>
          <div class="setup-matchup"><div class="setup-player"><span class="avatar human-avatar" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="16" cy="10" r="5"/><path d="M6 27v-3c0-9 20-9 20 0v3Z"/></svg></span><strong>Bạn</strong><small id="human-caption">Người chơi 1</small></div><span class="setup-vs">VS</span><div class="setup-player"><span class="avatar ai-avatar" aria-hidden="true">AI</span><strong>Đối thủ</strong><small id="opponent-caption"></small></div></div>
          <div class="setup-rack-heading"><span aria-hidden="true">△</span> Xếp bi <small id="setup-game-caption">9-ball</small></div>
          <div id="setup-ball-strip" class="setup-ball-strip" aria-label="Bi trong trận đấu"></div>
          <div class="rack-preview" id="rack-preview" aria-label="Minh họa cách xếp bi"></div>
          <p class="start-note">Thi băng giành quyền phá · Luân phiên phá mỗi ván</p>
          <p id="setup-error" role="alert"></p><button class="primary-action" id="start-match" type="submit"><span aria-hidden="true">▷</span> Bắt đầu chơi</button>
        </aside>
      </form>
    </section>
    <footer class="lobby-footer"><div class="footer-detail"><span aria-hidden="true">◎</span><p>Bàn đấu của bạn<small>9 feet · Bi 65 mm · 8-ball & 9-ball</small></p></div><div class="footer-detail"><span aria-hidden="true">◷</span><p>Luyện tập bất cứ lúc nào<small>Cùng huấn luyện viên của NOIR</small></p></div><div class="footer-signature">NOIR BILLIARDS CLUB<small>More Than A Game</small></div><div class="footer-tools"><button id="home-settings">⚙ Cài đặt</button><button id="home-help">? Trợ giúp</button></div></footer>`;
  document.querySelector('#app').appendChild(root);
  const q=s=>root.querySelector(s),form=q('#match-form');
  function highlightNavigation(selector){
    root.querySelectorAll('.landing-nav button').forEach(button=>{
      const active=!!selector&&button.matches(selector);
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
  }
  highlightNavigation('[data-home]');
  function opponentCaption(){q('#opponent-caption').textContent=q('#ai-opponent').selectedOptions[0]?.textContent||'';}
  function opponents(){const level=LEVELS.find(l=>l.id===q('#ai-level').value);q('#ai-opponent').innerHTML=level.opponents.map(o=>`<option value="${o.id}">${o.name}</option>`).join('');opponentCaption();root.querySelectorAll('[data-level]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level.id)));}
  function rack(){const nine=q('#game-type').value==='9';q('#rack-type').innerHTML=nine?'<option value="nine-wpa">WPA hiện hành · bi 9 trên điểm cuối bàn</option><option value="nine-classic">Truyền thống · bi 1 trên điểm cuối bàn</option>':'<option value="eight">Tam giác · bi 8 ở giữa, hai góc khác nhóm</option>';preview();}
  function preview(){
    const nine=q('#game-type').value==='9',modern=q('#rack-type').value==='nine-wpa';
    q('#rack-note').textContent=nine?(modern?'Hình thoi: bi 1 ở đỉnh, bi 9 trên foot spot. Khi phá, tối thiểu 3 bi vào lỗ hoặc qua vạch bếp (cộng hai nhóm).':'Hình thoi: bi 1 trên foot spot, bi 9 ở giữa. Không áp dụng điều kiện 3 bi qua vạch bếp.'):'Bi 8 ở giữa, một bi trơn và một bi sọc ở hai góc sau. Các bi còn lại xếp ngẫu nhiên đúng luật.';
    const balls=competitionRack({game:nine?'9':'8',rack:q('#rack-type').value},()=>.43).filter(b=>b.id&&!b.pocketed);
    const minX=Math.min(...balls.map(b=>b.x));
    const colors=['#e5af1e','#1975bf','#d93740','#7846a5','#e56e23','#20946d','#903845','#161e27'];
    q('#setup-game-caption').textContent=nine?'9-ball':'8-ball';
    q('#setup-ball-strip').innerHTML=Array.from({length:nine?9:15},(_,i)=>`<span class="setup-mini-ball ${i>7?'striped':''}" style="--ball-color:${colors[i%8]}" aria-label="Bi ${i+1}"><b>${i+1}</b></span>`).join('');
    q('#rack-preview').innerHTML=`<svg viewBox="0 0 260 125" role="img" aria-label="${nine?'9 bi hình thoi':'15 bi tam giác'}"><defs><radialGradient id="setup-ball-shine" cx="30%" cy="22%" r="80%"><stop stop-color="#ffffff" stop-opacity=".65"/><stop offset=".4" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".55"/></radialGradient></defs>${balls.map(b=>{const x=75+(b.x-minX)*130,y=62+b.z*130,color=colors[(b.id-1)%8];return `<circle cx="${x}" cy="${y}" r="11.8" fill="${b.id>8?'#ecece1':color}" stroke="#ffffff35"/>${b.id>8?`<path d="M${x-11},${y}h22" stroke="${color}" stroke-width="13"/>`:''}<circle cx="${x}" cy="${y}" r="11.8" fill="url(#setup-ball-shine)"/><circle cx="${x}" cy="${y}" r="5.8" fill="#f3f0e2"/><text x="${x}" y="${y+2.8}" text-anchor="middle" fill="#14202b" font-size="8" font-weight="700">${b.id}</text>`;}).join('')}</svg>`;
  }
  function showSetup(){onSetup?.();highlightNavigation(null);root.hidden=false;root.classList.add('is-setup');q('#home-screen').hidden=true;q('#setup-screen').hidden=false;root.scrollTop=0;q('#setup-title').tabIndex=-1;q('#setup-title').focus();}
  q('#ai-start').onclick=showSetup;
  q('.brand').onclick=e=>{e.preventDefault();goHome();};
  q('#practice-start .mode-footer').textContent='◎  Chọn cách luyện tập →';
  q('#ai-start .mode-footer').textContent='♧  Từ hạng I đến chuyên nghiệp';
  q('.coming .mode-footer').textContent='Sẵn sàng cho những kết nối mới';
  q('#practice-start').onclick=()=>{root.hidden=true;startTraining();};q('#home-settings').onclick=settings;q('#home-help').onclick=help;
  root.querySelectorAll('[data-play]').forEach(button=>button.onclick=()=>q('#ai-start').click());
  root.querySelectorAll('[data-modes]').forEach(button=>button.onclick=()=>{show();highlightNavigation('[data-modes]');q('#ai-start').focus({preventScroll:true});q('#home-modes').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});});
  q('[data-practice]').onclick=()=>q('#practice-start').click();q('[data-help]').onclick=help;
  q('#ai-level').onchange=opponents;q('#game-type').onchange=rack;q('#rack-type').onchange=preview;
  root.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>{q('#ai-level').value=button.dataset.level;opponents();});
  q('#ai-opponent').onchange=opponentCaption;
  q('#random-opponent').onclick=()=>{const select=q('#ai-opponent');select.selectedIndex=(select.selectedIndex+1+Math.floor(Math.random()*(select.options.length-1)))%select.options.length;opponentCaption();};
  q('#player-name').oninput=()=>q('#human-caption').textContent=q('#player-name').value.trim()||'Người chơi 1';
  q('#race-target').oninput=()=>q('#race-note').textContent=`Ai thắng ${q('#race-target').value||'…'} ván trước sẽ thắng trận.`;
  const tableNote=()=>q('#table-note').textContent=`${TABLES[q('#table-type').value].description}. Tất cả là bàn 9 feet, bi 65 mm.`;
  q('#table-type').onchange=tableNote;opponents();rack();tableNote();
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;
    try{const values=Object.fromEntries(new FormData(form));values.follow=false;const config=normalizeConfig(values);q('#setup-error').textContent='';root.hidden=true;startMatch(config);}catch(error){root.hidden=false;q('#setup-error').textContent=error.message;}
  };
  function show(){highlightNavigation('[data-home]');root.classList.remove('is-setup');root.hidden=false;q('#home-screen').hidden=false;q('#setup-screen').hidden=true;root.scrollTop=0;}
  return {show,showSetup,root};
}

export function mountMatchHUD({callChanged,choose,home}) {
  const hud=document.createElement('section');hud.id='match-hud';hud.hidden=true;
  hud.innerHTML=`<div class="match-header"><div id="human-score" class="player-card"><div class="player-avatar"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#3b514c"/><path d="M12 64c0-23 40-23 40 0" fill="#c1b388"/><rect x="18" y="13" width="28" height="33" rx="14" fill="#e5bb91"/><path d="M24 27h3m10 0h3M27 36q5 4 10 0" stroke="#29333c" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M17 25q-3-18 16-17 15 1 14 17l-8-10-20 10" fill="#282d32"/></svg></div><div class="player-info"><span class="score-name"></span><small></small></div><b class="player-score">0</b><div class="player-balls" aria-label="Bi đã vào lỗ"></div></div><span class="score-target"></span><div id="ai-score" class="player-card"><div class="player-avatar"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#342e58"/><path d="M12 64c0-23 40-23 40 0" fill="#ac97d0"/><rect x="18" y="13" width="28" height="33" rx="8" fill="#dfd8ee"/><path d="M24 27h3m10 0h3M27 36q5 4 10 0" stroke="#29333c" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M32 13V7m-3 0h6" stroke="#c4b3e0" stroke-width="3"/></svg></div><div class="player-info"><span class="score-name"></span><small></small></div><b class="player-score">0</b><div class="player-balls" aria-label="Bi đã vào lỗ"></div></div></div><aside class="match-sidebar"><p id="match-status" role="status"></p><div id="match-decisions"></div><div id="shot-call"><label>Gọi bi <select id="called-ball"></select></label><label>Gọi lỗ <select id="called-pocket">${POCKET_NAMES.map((n,i)=>`<option value="${i}">${i+1} · ${n}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" id="safety-call" /> An toàn</label></div><label id="push-call" class="check-label"><input type="checkbox" id="push-out" /> Push out</label><p class="push-help" hidden>Ngay sau phá hợp lệ: bỏ yêu cầu chạm bi nhỏ nhất và chạm băng. Đối thủ được nhận hoặc trả lượt.</p></aside>`;
  document.querySelector('#game').appendChild(hud);
  const target=hud.querySelector('.score-target'),scoreCentre=document.createElement('div');scoreCentre.className='match-score-centre';
  target.replaceWith(scoreCentre);
  const scoreLine=document.createElement('div');scoreLine.className='match-score-line';scoreLine.setAttribute('aria-live','polite');
  const scoreNodes=[...hud.querySelectorAll('.player-score')];
  scoreLine.append(scoreNodes[0],document.createTextNode(' - '),scoreNodes[1]);scoreCentre.append(scoreLine,target);
  const nextRack=document.createElement('button');nextRack.id='next-rack';nextRack.className='next-rack';nextRack.textContent='Ván tiếp theo';nextRack.hidden=true;nextRack.onclick=()=>choose('next');hud.appendChild(nextRack);
  const foulPopup=document.createElement('div');foulPopup.className='foul-popup';foulPopup.hidden=true;foulPopup.setAttribute('role','alert');hud.appendChild(foulPopup);
  hud.querySelectorAll('.player-avatar').forEach(avatar=>{
    avatar.insertAdjacentHTML('beforeend','<svg class="turn-clock" viewBox="0 0 56 56" aria-hidden="true"><rect class="clock-track" x="2" y="2" width="52" height="52" rx="13"/><rect class="clock-progress" x="2" y="2" width="52" height="52" rx="13" pathLength="100"/></svg><span class="turn-seconds"></span>');
  });
  let clockFrame=null;
  function renderClock(m){
    cancelAnimationFrame(clockFrame);clockFrame=null;
    const active=!!m?.turnDeadline&&!m.disposed&&!m.foulNotice&&!m.physics.moving;
    const remaining=active?Math.max(0,m.turnDeadline-performance.now()):0;
    [hud.querySelector('#human-score'),hud.querySelector('#ai-score')].forEach((card,i)=>{
      const running=active&&(m.phase==='lag-ready'?i===0:m.turn===i);
      card.classList.toggle('clock-running',running);
      card.querySelector('.clock-progress').style.strokeDashoffset=String(100*(1-remaining/TURN_DURATION_MS));
      card.querySelector('.turn-seconds').textContent=running?`${Math.ceil(remaining/1000)}s`:'';
      card.querySelector('.player-avatar').setAttribute('aria-label',running?`${m.names[i]}: còn ${Math.ceil(remaining/1000)} giây`:m?.names[i]||'');
    });
    if(active)clockFrame=requestAnimationFrame(()=>renderClock(m));
  }
  const q=s=>hud.querySelector(s);
  const getCall=()=>({ball:Number(q('#called-ball').value),pocket:Number(q('#called-pocket').value),safety:q('#safety-call').checked,push:q('#push-out').checked});
  hud.addEventListener('change',()=>callChanged?.(getCall()));
  let stamp='';
  function render(m){hud.hidden=!m;document.querySelector('#game').classList.toggle('foul-paused',!!m?.foulNotice);renderClock(m);if(!m)return;
    [q('#human-score'),q('#ai-score')].forEach((node,i)=>{node.querySelector('.score-name').textContent=m.names[i];scoreNodes[i].textContent=m.score[i];node.querySelector('small').textContent=m.groups[i]==='solid'?'Bi trơn':m.groups[i]==='stripe'?'Bi sọc':m.config.game==='9'?'':'Bàn mở';node.classList.toggle('your-turn',m.turn===i&&m.phase==='playing');});
    scoreLine.setAttribute('aria-label',`${m.names[0]} ${m.score[0]} - ${m.score[1]} ${m.names[1]}`);
    nextRack.hidden=m.phase!=='rack-over';nextRack.disabled=!!m.foulNotice;
    q('.score-target').textContent=`CHẠM ${m.config.target}`;q('#match-status').textContent=m.message;q('#match-status').classList.toggle('is-foul',!!m.foulNotice);
    q('#match-status').hidden=!!m.foulNotice||m.physics.moving||m.phase==='playing'||m.phase==='lag-running';
    foulPopup.hidden=!m.foulNotice;foulPopup.textContent=m.foulNotice?m.message:'';
    const colors=['#e4ac18','#2468c0','#d63a35','#823fad','#ec7b20','#228e58','#863746','#141719'];
    [q('#human-score'),q('#ai-score')].forEach((card,player)=>{
      const ids=m.captured?.[player]||[],slots=Math.max(9,ids.length);
      card.querySelector('.player-balls').innerHTML=Array.from({length:slots},(_,i)=>{const id=ids[i];return id?'<div class="capture-slot filled hud-ball" style="--ball:'+colors[(id-1)%8]+'" aria-label="Bi '+id+' đã vào lỗ"><span>'+id+'</span></div>':'<div class="capture-slot" aria-label="Ô bi trống"></div>';}).join('');
    });
    const active=m.canHumanShoot&&m.phase==='playing'&&!m.breaking;
    q('#shot-call').hidden=!(active&&m.config.game==='8');q('#push-call').hidden=!(active&&m.config.game==='9'&&m.pushAvailable);q('.push-help').hidden=q('#push-call').hidden;
    const nextStamp=`${m.rackNumber}:${m.physics.shots}:${m.phase}:${m.turn}`;
    if(stamp!==nextStamp){stamp=nextStamp;q('#safety-call').checked=false;q('#push-out').checked=false;const selected=Number(q('#called-ball').value);q('#called-ball').innerHTML=m.targets.map(id=>`<option value="${id}">Bi ${id}</option>`).join('');if(m.targets.includes(selected))q('#called-ball').value=selected;}
    const decisions=q('#match-decisions');decisions.replaceChildren();
    const button=(label,action)=>{const b=document.createElement('button');b.className='match-action';b.textContent=label;b.disabled=!!m.foulNotice;b.onclick=()=>choose(action);decisions.appendChild(b);};
    if(m.phase==='lag-retry')button('Thi băng lại','retry');
    if(m.phase==='lag-choice'&&m.lagWinner===0){button('Tôi phá trước','take');button('Nhường máy phá','give');}
    if(m.phase==='match-over'){const b=document.createElement('button');b.className='match-action';b.textContent='Về trang chủ';b.onclick=home;decisions.appendChild(b);}
    if(m.phase==='choice'&&m.turn===0){
      if(m.choice==='illegal-eight'){button('Nhận bàn hiện tại','accept');button('Xếp lại, tôi phá','rerack-self');button('Cho máy phá lại','rerack-other');}
      else if(m.choice==='eight-break'||m.choice==='eight-foul'){button(m.choice==='eight-foul'?'Đặt lại bi 8 · bi cái trong bếp':'Đặt lại bi 8 · tiếp tục','accept');button('Xếp lại và phá','rerack-self');}
      else if(m.choice==='break-foul'){if(!m.physics.cueBall.pocketed)button('Nhận bàn hiện tại','accept');button('Đặt bi cái trong bếp','hand');}
      else {button('Nhận lượt đánh','accept');button('Trả lượt cho máy','return');}
    }
  }
  return {render,getCall,hud};
}
