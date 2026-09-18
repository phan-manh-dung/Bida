import './homepage.css';
import './match-layout.css';
import { LEVELS, TABLES, POCKET_NAMES, normalizeConfig, competitionRack, groupOf } from './match-rules.js';

export function mountHomepage({startMatch,startPractice,goHome,settings,help}) {
  const root=document.createElement('section');root.id='lobby';
  root.innerHTML=`
    <header class="lobby-header"><a class="brand" href="#home" aria-label="NOIR trang chủ">NOIR<span>BILLIARDS CLUB</span></a><span class="local-label"><i></i> Sẵn sàng vào bàn</span></header>
    <section id="home-screen" aria-labelledby="home-title">
      <div class="home-heading"><p class="eyebrow">MỘT BÀN ĐẤU. NHIỀU THỬ THÁCH.</p><h1 id="home-title">Chọn cách bạn chơi<span>.</span></h1><p>Luyện đường cơ. Thử sức đối thủ. Tìm nhịp chơi của bạn.</p></div>
      <div class="mode-grid">
        <button class="mode-card featured" id="ai-start"><span class="mode-number">01 / ĐỐI KHÁNG</span><span class="mode-art ai-art" aria-hidden="true"><i class="lobby-ball black-ball">8</i><i class="orbit-ring"></i></span><span class="mode-title">Chơi với máy <b>↗</b></span><span class="mode-description">Chọn đối thủ, thiết lập trận đấu<br>và thử sức qua từng cấp độ.</span><span class="mode-footer">TỪ HẠNG I ĐẾN CHUYÊN NGHIỆP <b>→</b></span></button>
        <button class="mode-card coming" disabled aria-label="Chơi online, sắp ra mắt"><span class="mode-number">02 / KẾT NỐI <em>SẮP RA MẮT</em></span><span class="mode-art" aria-hidden="true"><i class="lobby-ball small-ball">9</i><i class="lobby-ball second-ball">2</i></span><span class="mode-title">Chơi online</span><span class="mode-description">Hẹn nhau bên bàn bida.<br>Tính năng đang được phát triển.</span><span class="mode-footer">THI ĐẤU CÙNG BẠN BÈ</span></button>
        <button class="mode-card" id="practice-start"><span class="mode-number">03 / TỰ DO</span><span class="mode-art practice-art" aria-hidden="true"><i class="lobby-ball white-ball"></i><i class="practice-line"></i></span><span class="mode-title">Tập luyện <b>↗</b></span><span class="mode-description">Một bàn riêng, không áp lực.<br>Tập ngắm và kiểm soát lực cơ.</span><span class="mode-footer">VÀO BÀN NGAY <b>→</b></span></button>
      </div>
    </section>
    <section id="setup-screen" hidden aria-labelledby="setup-title">
      <button class="back-link" id="setup-back">← Trang chủ</button><div class="setup-heading"><p class="eyebrow">CHƠI VỚI MÁY</p><h1 id="setup-title">Thiết lập trận đấu<span>.</span></h1><p>Một đối thủ vừa sức. Một trận đấu theo cách của bạn.</p></div>
      <form id="match-form" class="setup-grid">
        <div class="setup-panel"><h2><span>01</span> Bàn đấu</h2>
          <div class="form-pair"><label>Cấp độ AI<select name="level" id="ai-level">${LEVELS.map(l=>`<option value="${l.id}">${l.label}</option>`).join('')}</select></label><label>Loại trò chơi<select name="game" id="game-type"><option value="9">9 bi · 9-ball</option><option value="8">15 bi · 8-ball trơn/sọc</option></select></label></div>
          <label>Cách xếp bi<select name="rack" id="rack-type"></select></label><p class="field-note" id="rack-note"></p>
          <div class="form-pair"><label>Mục tiêu trận đấu<div class="race-input"><input name="target" id="race-target" type="number" min="1" max="100" step="1" value="5" required /><span>ván thắng</span></div></label><label>Loại bàn<select name="table" id="table-type">${Object.entries(TABLES).map(([id,t])=>`<option value="${id}" ${id==='club'?'selected':''}>${t.label}</option>`).join('')}</select></label></div>
          <p class="field-note"><span id="race-note">Ai thắng 5 ván trước sẽ thắng trận.</span> Từ 1 đến 100 ván.</p><p class="field-note" id="table-note"></p>
          <div class="form-divider"></div><h2><span>02</span> Công cụ hỗ trợ</h2>
          <label>Hỗ trợ ngắm<select name="aid"><option value="ghost">Ghost ball + đường ngắm</option><option value="line">Đường ngắm</option><option value="none">Không hỗ trợ</option></select></label>
        </div>
        <aside class="setup-panel players-panel"><h2><span>03</span> Người chơi</h2>
          <div class="player-heading"><span class="avatar human-avatar">01</span><div><strong>Bạn</strong><small>Người chơi 1</small></div></div>
          <label for="player-name">Tên người chơi</label><input id="player-name" name="name" maxlength="24" value="Người chơi 1" autocomplete="nickname" placeholder="Người chơi 1" />
          <div class="versus"><span></span> VS <span></span></div>
          <div class="player-heading"><span class="avatar ai-avatar">AI</span><div><strong>Đối thủ của bạn</strong><small id="opponent-caption">Người chơi 2 · Hạng I</small></div></div>
          <label>Chọn đối thủ<select name="opponent" id="ai-opponent"></select></label><p class="field-note">Các hạng là mức AI trong trò chơi. Độ chính xác ngắm và lực đánh tăng theo cấp độ.</p>
          <div class="rack-preview" id="rack-preview" aria-label="Minh họa cách xếp bi"></div>
          <p class="start-note">Mở đầu bằng thi băng giành quyền phá.<br>Các ván tiếp theo luân phiên người phá.</p>
          <p id="setup-error" role="alert"></p><button class="primary-action" id="start-match" type="submit">Bắt đầu chơi <span>→</span></button>
        </aside>
      </form>
    </section>
    <footer class="lobby-footer"><div><button id="home-settings">⚙ Cài đặt</button><button id="home-help">? Trợ giúp</button></div><span>9 FEET <i>·</i> 57,2 MM <i>·</i> NOIR</span></footer>`;
  document.querySelector('#app').appendChild(root);
  const q=s=>root.querySelector(s),form=q('#match-form');
  function opponents(){const level=LEVELS.find(l=>l.id===q('#ai-level').value);q('#ai-opponent').innerHTML=level.opponents.map(o=>`<option value="${o.id}">${o.name}</option>`).join('');q('#opponent-caption').textContent=`Người chơi 2 · ${level.label}`;}
  function rack(){const nine=q('#game-type').value==='9';q('#rack-type').innerHTML=nine?'<option value="nine-wpa">WPA hiện hành · bi 9 trên điểm cuối bàn</option><option value="nine-classic">Truyền thống · bi 1 trên điểm cuối bàn</option>':'<option value="eight">Tam giác · bi 8 ở giữa, hai góc khác nhóm</option>';preview();}
  function preview(){
    const nine=q('#game-type').value==='9',modern=q('#rack-type').value==='nine-wpa';
    q('#rack-note').textContent=nine?(modern?'Hình thoi: bi 1 ở đỉnh, bi 9 trên foot spot. Khi phá, tối thiểu 3 bi vào lỗ hoặc qua vạch bếp (cộng hai nhóm).':'Hình thoi: bi 1 trên foot spot, bi 9 ở giữa. Không áp dụng điều kiện 3 bi qua vạch bếp.'):'Bi 8 ở giữa, một bi trơn và một bi sọc ở hai góc sau. Các bi còn lại xếp ngẫu nhiên đúng luật.';
    const balls=competitionRack({game:nine?'9':'8',rack:q('#rack-type').value},()=>.43).filter(b=>b.id&&!b.pocketed);
    const minX=Math.min(...balls.map(b=>b.x));
    q('#rack-preview').innerHTML=`<svg viewBox="0 0 260 125" role="img" aria-label="${nine?'9 bi hình thoi':'15 bi tam giác'}">${balls.map(b=>{const x=75+(b.x-minX)*130,y=62+b.z*130,color=b.id===8?'#151b1f':b.id>8?'#bdae7f':'#557868';return `<circle cx="${x}" cy="${y}" r="11.8" fill="${color}" stroke="#ffffff35"/><text x="${x}" y="${y+3.5}" text-anchor="middle" fill="#fff" font-size="10">${b.id}</text>`;}).join('')}</svg>`;
  }
  q('#ai-start').onclick=()=>{q('#home-screen').hidden=true;q('#setup-screen').hidden=false;root.scrollTop=0;q('#setup-title').tabIndex=-1;q('#setup-title').focus();};
  q('#setup-back').onclick=()=>show();q('.brand').onclick=e=>{e.preventDefault();goHome();show();};
  q('#practice-start').onclick=()=>{root.hidden=true;startPractice();};q('#home-settings').onclick=settings;q('#home-help').onclick=help;
  q('#ai-level').onchange=opponents;q('#game-type').onchange=rack;q('#rack-type').onchange=preview;
  q('#race-target').oninput=()=>q('#race-note').textContent=`Ai thắng ${q('#race-target').value||'…'} ván trước sẽ thắng trận.`;
  const tableNote=()=>q('#table-note').textContent=`${TABLES[q('#table-type').value].description}. Tất cả là bàn 9 feet, bi 57,2 mm.`;
  q('#table-type').onchange=tableNote;opponents();rack();tableNote();
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;
    try{const values=Object.fromEntries(new FormData(form));values.follow=false;const config=normalizeConfig(values);q('#setup-error').textContent='';root.hidden=true;startMatch(config);}catch(error){root.hidden=false;q('#setup-error').textContent=error.message;}
  };
  function show(){root.hidden=false;q('#home-screen').hidden=false;q('#setup-screen').hidden=true;root.scrollTop=0;}
  return {show,root};
}

export function mountMatchHUD({callChanged,choose,home}) {
  const hud=document.createElement('section');hud.id='match-hud';hud.hidden=true;
  hud.innerHTML=`<div class="match-header"><div id="human-score" class="player-card"><div class="player-avatar"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#3b514c"/><path d="M12 64c0-23 40-23 40 0" fill="#c1b388"/><rect x="18" y="13" width="28" height="33" rx="14" fill="#e5bb91"/><path d="M24 27h3m10 0h3M27 36q5 4 10 0" stroke="#29333c" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M17 25q-3-18 16-17 15 1 14 17l-8-10-20 10" fill="#282d32"/></svg></div><div class="player-info"><span class="score-name"></span><small></small></div><b class="player-score">0</b><div class="player-balls" aria-label="Bi đã vào lỗ"></div></div><span class="score-target"></span><div id="ai-score" class="player-card"><div class="player-avatar"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#342e58"/><path d="M12 64c0-23 40-23 40 0" fill="#ac97d0"/><rect x="18" y="13" width="28" height="33" rx="8" fill="#dfd8ee"/><path d="M24 27h3m10 0h3M27 36q5 4 10 0" stroke="#29333c" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M32 13V7m-3 0h6" stroke="#c4b3e0" stroke-width="3"/></svg></div><div class="player-info"><span class="score-name"></span><small></small></div><b class="player-score">0</b><div class="player-balls" aria-label="Bi đã vào lỗ"></div></div></div><aside class="match-sidebar"><p id="match-status" role="status"></p><div id="match-decisions"></div><div id="shot-call"><label>Gọi bi <select id="called-ball"></select></label><label>Gọi lỗ <select id="called-pocket">${POCKET_NAMES.map((n,i)=>`<option value="${i}">${i+1} · ${n}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" id="safety-call" /> An toàn</label></div><label id="push-call" class="check-label"><input type="checkbox" id="push-out" /> Push out</label><p class="push-help" hidden>Ngay sau phá hợp lệ: bỏ yêu cầu chạm bi nhỏ nhất và chạm băng. Đối thủ được nhận hoặc trả lượt.</p></aside>`;
  document.querySelector('#game').appendChild(hud);
  const q=s=>hud.querySelector(s);
  const getCall=()=>({ball:Number(q('#called-ball').value),pocket:Number(q('#called-pocket').value),safety:q('#safety-call').checked,push:q('#push-out').checked});
  hud.addEventListener('change',()=>callChanged?.(getCall()));
  let stamp='';
  function render(m){hud.hidden=!m;document.querySelector('#game').classList.toggle('foul-paused',!!m?.foulNotice);if(!m)return;
    [q('#human-score'),q('#ai-score')].forEach((node,i)=>{node.querySelector('.score-name').textContent=m.names[i];node.querySelector('b').textContent=m.score[i];node.querySelector('small').textContent=m.groups[i]==='solid'?'Bi trơn':m.groups[i]==='stripe'?'Bi sọc':m.config.game==='9'?'9-ball':'Bàn mở';node.classList.toggle('your-turn',m.turn===i&&m.phase==='playing');});
    q('.score-target').textContent=`CHẠM ${m.config.target}`;q('#match-status').textContent=m.message;q('#match-status').classList.toggle('is-foul',!!m.foulNotice);
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
    if(m.phase==='rack-over')button('Ván tiếp theo','next');
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
