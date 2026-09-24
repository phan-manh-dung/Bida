import './style.css';
import { PoolPhysics } from './physics.js';
import { PoolScene } from './scene.js';
import { PoolAudio } from './audio.js';
import { pullTravel, pullPower } from './shot-control.js';
import { mountHomepage, mountMatchHUD } from './homepage.js';
import { PoolMatch } from './match.js';
import { mountSpinControl } from './cue-spin.js';
import { mountTraining } from './training/index.js';

const paths = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  settings: '<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  cube: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5m-9 5L3 8m9 5v9"/>',
  top: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 9h.01M17 15h.01M7 15h.01M17 9h.01"/>',
  cue: '<path d="m4 20 12-12m-9 9 2 2"/><circle cx="19" cy="5" r="3"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 2v.5"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const $ = selector => document.querySelector(selector);
const read = (key, fallback) => { try { return localStorage.getItem(`noir:${key}`) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(`noir:${key}`, value); } catch { /* Optional preferences. */ } };
const close = '<button class="icon-button close-dialog" data-close aria-label="Đóng">' + icon('close') + '</button>';

$('#app').innerHTML = `
  <main id="game" aria-label="Bàn bida luyện tập">
    <div id="scene"><div id="loading"><span class="loading-ball">8</span><p>Đang chuẩn bị bàn…</p></div></div>
    <button class="icon-button floating menu-toggle" id="menu-toggle" aria-label="Mở menu" aria-haspopup="dialog">${icon('menu')}</button>
    <button class="icon-button floating settings-toggle" id="settings-toggle" aria-label="Mở tùy chọn" aria-haspopup="dialog">${icon('settings')}</button>
    <div class="cue-control" id="cue-control">
      <div class="pull-cue" id="pull-cue" role="slider" tabindex="0" aria-label="Kéo cơ xuống rồi thả để đánh" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 phần trăm lực" aria-describedby="cue-instructions">
        <div class="cue-ruler" aria-hidden="true"></div>
        <div class="cue-stick" aria-hidden="true"><i class="cue-tip"></i><i class="cue-ferrule"></i><i class="cue-shaft"></i><i class="cue-joint"></i><i class="cue-grip"></i><i class="cue-butt"></i></div>
        <div class="force-track" aria-hidden="true"><div id="force-fill"></div></div>
        <output id="power-value" aria-hidden="true">0</output>
      </div>
      <span class="cue-hint" id="cue-instructions">Kéo xuống · Thả</span>
    </div>
    <p class="sr-only" id="game-status" role="status">Sẵn sàng.</p>
  </main>
  <dialog id="menu-dialog" class="menu-dialog" aria-labelledby="menu-title">${close}
    <p class="overline">BILLIARDS CLUB</p><h1 id="menu-title">NOIR</h1>
    <p class="muted">Người chơi tự do · Luyện tập 15 bi</p>
    <section class="menu-views" aria-labelledby="view-title">
      <h2 id="view-title">Góc nhìn</h2>
      <div class="camera-control" role="group" aria-label="Góc nhìn">
        <button class="camera-button" data-view="orbit" aria-label="Góc nhìn 3D" aria-pressed="false">${icon('cube')}<span>3D</span></button>
        <button class="camera-button active" data-view="top" aria-label="Góc nhìn từ trên" aria-pressed="true">${icon('top')}<span>Từ trên</span></button>
        <button class="camera-button" data-view="cue" aria-label="Góc nhìn theo cơ" aria-pressed="false">${icon('cue')}<span>Theo cơ</span></button>
      </div>
    </section>
    <button class="menu-item" id="new-game">${icon('reset')} Ván mới ${icon('chevron')}</button>
    <button class="menu-item" id="help">${icon('help')} Cách chơi ${icon('chevron')}</button>
    <button class="menu-item" id="fullscreen">${icon('expand')} <span>Toàn màn hình</span> ${icon('chevron')}</button>
    <button class="menu-item" id="menu-settings">${icon('settings')} Tùy chọn ${icon('chevron')}</button>
    <button class="menu-item home-exit" id="exit-home">← Kết thúc & về trang chủ</button>
  </dialog>
  <dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">${close}
    <p class="overline">BÀN CỦA BẠN</p><h2 id="settings-title">Tùy chọn</h2>
    <div class="setting-row"><label for="guide">Đường ngắm</label><input type="checkbox" id="guide" class="switch" role="switch" checked /></div>
    <div class="setting-row"><span>Màu mặt bàn</span><div class="cloth-options" role="group" aria-label="Màu mặt bàn">
      <button data-cloth="gray" class="cloth-swatch" aria-label="Xám sẫm" aria-pressed="false"></button>
      <button data-cloth="blue" class="cloth-swatch" aria-label="Xanh dương" aria-pressed="false"></button>
      <button data-cloth="green" class="cloth-swatch" aria-label="Xanh ngọc" aria-pressed="false"></button>
      <button data-cloth="wine" class="cloth-swatch" aria-label="Đỏ rượu" aria-pressed="false"></button>
    </div></div>
    <div class="setting-row"><label for="sound">Âm thanh</label><input type="checkbox" id="sound" class="switch" role="switch" /></div>
    <p class="setting-note" id="audio-status">Chưa có bản thu bida thật. Âm thanh tạm tắt.</p>
    <details class="audio-import"><summary>Thêm bản thu âm thanh</summary><p class="setting-note">Chọn đoạn thu riêng cho từng va chạm. Tệp bạn chọn chỉ dùng trong phiên chơi này.</p>
      ${[['shot','Cơ chạm bi'],['collision','Bi chạm bi'],['cushion','Bi chạm băng'],['pocket','Bi rơi vào lỗ']].map(([type,label]) => `<label class="audio-file">${label}<input type="file" data-audio="${type}" accept="audio/*" multiple /><span data-audio-state="${type}">Chưa có bản thu</span></label>`).join('')}
    </details>
  </dialog>
  <dialog id="reset-dialog" aria-labelledby="reset-title">${close}<p class="overline">VÁN MỚI</p><h2 id="reset-title">Xếp lại bàn bi</h2><p class="muted">Xếp đủ 15 bi thành tam giác. Trước cú phá, bạn có thể kéo bi trắng sang hai bên dọc vạch bếp.</p><button class="layout-option" data-layout="rack">Xếp bi và bắt đầu ${icon('chevron')}</button></dialog>
  <dialog id="help-dialog" aria-labelledby="help-title">${close}<p class="overline">CÁCH CHƠI</p><h2 id="help-title">Ngắm. Kéo. Thả.</h2><ol><li>Chạm hoặc nhấp lên mặt bàn để chọn hướng ngắm.</li><li>Kéo cây cơ ở mép phải từ trên xuống. Kéo càng xa, lực càng mạnh. Thả để đánh.</li><li>Kéo cơ lên lại vị trí ban đầu hoặc nhấn Escape để hủy cú đánh.</li><li>Ở góc 3D, giữ chuột phải để xoay nhẹ; bàn tự vừa màn hình, đã khóa phóng to/thu nhỏ. Mở menu ba gạch → Góc nhìn để chọn 3D, Từ trên hoặc Theo cơ.</li></ol><p class="setting-note">Bàn phím: ← → chỉnh hướng, Shift để chỉnh nhỏ. Khi chọn cây cơ bằng Tab, ↓ ↑ chỉnh lực và Enter để đánh. Space giữ để lấy lực, thả để đánh.</p><p class="setting-note">Luyện tập một người, bi vào theo thứ tự bất kỳ. Bi trắng vào lỗ sẽ tự đặt lại. Chọn điểm chạm trên quả bi cạnh thanh cơ: trên cu-lê, dưới trô, trái/phải ép phê. Chạm vào tâm quả bi để đặt lại điểm chạm.</p></dialog>
`;

let scene, drag = null, spaceStart = null, spaceFrame = null, power = 0, releasing = false;
let match=null,lobby,matchHUD,training,mode='home';
const spinControl=mountSpinControl($('#cue-control'),point=>{if(scene){scene.tip=point;scene.bridgeKey=null;}});
const canUserShoot=()=>mode==='practice'||mode==='training'&&!!training?.canShoot||mode==='match'&&!!match?.canHumanShoot;
const audio = new PoolAudio();
const physics = new PoolPhysics(event => {
  match?.event(event);
  training?.event(event);
  if(event.type==='pocket'&&match)matchHUD?.render(match);
  if (['shot', 'collision', 'cushion', 'pocket'].includes(event.type)) {
    const projection = scene?.project(event.x, event.z);
    audio.play(event, projection ? projection.x / innerWidth * 2 - 1 : 0);
  }
  if (event.type === 'shot' || event.type === 'pocket' || event.type === 'settled') renderState();
  if (event.type === 'settled') {
    if (scene?.view === 'cue') scene.setView('cue');
    $('#game-status').textContent = physics.scratch ? 'Bi trắng đã được đặt lại.' : physics.canShoot ? 'Sẵn sàng.' : 'Đã hết bi trên bàn. Mở menu để xếp ván mới.';
  }
});
try {
  scene = new PoolScene($('#scene'), physics);
  scene.onPlacement = renderState;
  $('#loading').remove();
} catch (error) {
  console.error(error);
  $('#scene canvas')?.remove();
  $('#loading').innerHTML = '<span class="loading-ball">8</span><p>Không mở được bàn 3D.<br>Hãy bật tăng tốc đồ họa trong Chrome hoặc Edge rồi tải lại trang.</p>';
}

function renderState() {
  const total = match?.config.game === '9' ? 9 : 15;
  const count = physics.balls.filter(b => b.id > 0 && b.id <= total && b.pocketed).length;

  const disabled = !scene || !canUserShoot() || !physics.canShoot || releasing || !!scene.placingCue;
  $('#pull-cue').setAttribute('aria-disabled', String(disabled));
  $('#cue-control').classList.toggle('disabled', disabled);
  spinControl.setEnabled(!disabled&&!drag&&spaceStart===null);
  $('#cue-instructions').textContent = physics.moving ? 'Đợi bi dừng' : count === total ? 'Mở menu · Ván mới' : 'Kéo xuống · Thả';
}
function setPower(value) {
  power = Math.min(1, Math.max(0, value));
  const percent = Math.round(power * 100);
  const maxTravel = drag?.travel ?? pullTravel($('#pull-cue').clientHeight);
  $('#pull-cue').style.setProperty('--pull', `${power * maxTravel}px`);
  $('#force-fill').style.height = `${percent}%`;
  $('#power-value').textContent = percent;
  $('#pull-cue').setAttribute('aria-valuenow', String(percent));
  $('#pull-cue').setAttribute('aria-valuetext', `${percent} phần trăm lực`);
  $('#cue-control').classList.toggle('charged', power > 0);
  if (scene) scene.power = power;
}
function lockAim(locked) {
  if (!scene) return;
  scene.inputLocked = locked || !canUserShoot(); scene.controls.enabled = !locked;
}
function cancelPull() {
  scene?.cancelPlacement?.();
  drag = null; spaceStart = null; cancelAnimationFrame(spaceFrame);
  $('#cue-control').classList.remove('dragging'); setPower(0);
  if (!releasing) lockAim(false);
  renderState();
}
function releaseShot() {
  const chosenPower = power;
  drag = null; spaceStart = null; cancelAnimationFrame(spaceFrame);
  $('#cue-control').classList.remove('dragging');
  if (!scene || !canUserShoot() || scene.placingCue || !physics.canShoot || chosenPower < 0.025 || releasing) { cancelPull(); return; }
  releasing = true; lockAim(true); renderState();
  $('#cue-control').classList.add('releasing');
  setPower(0);
  const angle = scene.angle;
  const call=matchHUD?.getCall();
  const tip=spinControl.point;
  scene.strike(chosenPower, () => {
    if(match)match.shootHuman(angle,chosenPower,call,tip);else physics.shoot(angle, chosenPower,tip);
    spinControl.reset();
    releasing = false; lockAim(false); renderState();
    $('#cue-control').classList.remove('releasing');
  });
}

const pull = $('#pull-cue');
pull.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || !scene || !canUserShoot() || scene.placingCue || !physics.canShoot || releasing || document.querySelector('dialog[open]')) return;
  event.preventDefault(); pull.focus({ preventScroll: true });
  audio.unlock().catch(() => {});
  drag = { id: event.pointerId, y: event.clientY, x: event.clientX, travel: pullTravel(pull.clientHeight) };
  pull.setPointerCapture(event.pointerId); setPower(0); lockAim(true);
  $('#cue-control').classList.add('dragging');
  spinControl.setEnabled(false);
});
pull.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  if (Math.abs(event.clientX - drag.x) > 130) { cancelPull(); return; }
  setPower(pullPower(event.clientY - drag.y, drag.travel));
});
pull.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) releaseShot(); });
pull.addEventListener('pointercancel', cancelPull);
pull.addEventListener('lostpointercapture', () => { if (drag) cancelPull(); });
pull.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'Enter', 'Space', 'Home', 'Escape'].includes(event.code)) event.preventDefault();
  if (!canUserShoot() || !physics.canShoot || releasing || scene?.placingCue) return;
  if (event.code === 'ArrowDown') setPower(power + 0.05);
  if (event.code === 'ArrowUp') setPower(power - 0.05);
  if (event.code === 'Home' || event.code === 'Escape') cancelPull();
  if (event.code === 'Enter' && !event.repeat) { audio.unlock().catch(() => {}); releaseShot(); }
});
function nudge(value, fine = false) {
  if(!canUserShoot())return;
  if (!scene || !physics.canShoot || scene.inputLocked) return;
  scene.angle += value * (fine ? 0.15 : 0.7) * Math.PI / 180;
  scene.guideKey=null;
  if (scene.view === 'cue') scene.setView('cue');
}
window.addEventListener('keydown', event => {
  if (!canUserShoot() || document.querySelector('dialog[open]') || /INPUT|BUTTON|SUMMARY|SELECT/.test(event.target.tagName) || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code === 'Escape') { cancelPull(); return; }
  if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') { event.preventDefault(); nudge(event.code === 'ArrowLeft' ? -1 : 1, event.shiftKey); }
  if (event.code === 'Space' && !event.repeat && physics.canShoot && !releasing && !drag && !scene?.placingCue) {
    spinControl.setEnabled(false);
    event.preventDefault(); audio.unlock().catch(() => {}); spaceStart = performance.now(); lockAim(true);
    const charge = now => { if (spaceStart === null) return; setPower((now - spaceStart) / 1600); spaceFrame = requestAnimationFrame(charge); };
    spaceFrame = requestAnimationFrame(charge);
  }
});
window.addEventListener('keyup', event => { if (event.code === 'Space' && spaceStart !== null) { event.preventDefault(); releaseShot(); } });
window.addEventListener('blur', cancelPull);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelPull(); });

function openDialog(selector) {
  if (releasing) return;
  cancelPull();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $(selector).showModal();
}
$('#menu-toggle').addEventListener('click', () => openDialog('#menu-dialog'));
$('#settings-toggle').addEventListener('click', () => openDialog('#settings-dialog'));
$('#menu-settings').addEventListener('click', () => openDialog('#settings-dialog'));
$('#help').addEventListener('click', () => openDialog('#help-dialog'));
$('#new-game').addEventListener('click', () => {if(mode==='training'){closeDialogs();if(!releasing&&!physics.moving)training.open();}else if(match)goHome();else openDialog('#reset-dialog');});
$('#exit-home').addEventListener('click',goHome);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  if (!scene || releasing || drag || scene.placingCue) return;
  scene.setView(button.dataset.view);
  $('#menu-dialog').close();
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
}));
document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => {
  cancelPull(); physics.reset(button.dataset.layout);
  if (scene) { scene.angle = button.dataset.layout === 'rack' ? 0 : -0.281; scene.guideKey = null; scene.syncBalls(0); if (scene.view === 'cue') scene.setView('cue'); }
  $('#reset-dialog').close(); renderState();
}));
function setCloth(color) {
  const selected = ['gray', 'blue', 'green', 'wine'].includes(color) ? color : 'gray';
  scene?.setCloth(selected); save('cloth', selected);
  document.querySelectorAll('[data-cloth]').forEach(button => {
    const active = button.dataset.cloth === selected;
    button.setAttribute('aria-pressed', String(active)); button.innerHTML = active ? icon('check') : '';
  });
}
document.querySelectorAll('[data-cloth]').forEach(button => button.addEventListener('click', () => setCloth(button.dataset.cloth)));
// Apply the requested charcoal surface once; subsequent colour choices persist.
setCloth(read('surface-v8', '') ? read('cloth', 'gray') : 'gray');
save('surface-v8', '1');
$('#guide').checked = read('guide', 'true') === 'true'; if (scene) scene.aimVisible = $('#guide').checked;
$('#guide').addEventListener('change', e => { if (scene) scene.aimVisible = e.target.checked; if(mode==='training'&&e.target.checked)training.markAssisted(); save('guide', String(e.target.checked)); });
$('#fullscreen').addEventListener('click', async () => {
  $('#menu-dialog').close();
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('#game-status').textContent = 'Trình duyệt chưa hỗ trợ toàn màn hình.'; }
});
document.addEventListener('fullscreenchange', () => { $('#fullscreen span').textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình'; });

function renderAudio() {
  $('#sound').checked = audio.enabled && audio.ready;
  $('#sound').disabled = !audio.ready;
  $('#audio-status').textContent = audio.ready ? 'Phát bản thu thật theo lực và vị trí va chạm.' : 'Chưa có bản thu bida thật. Âm thanh tạm tắt.';
  for (const [type, clips] of audio.buffers) {
    const state = $(`[data-audio-state="${type}"]`);
    if (state) state.textContent = `${clips.length} bản thu đã sẵn sàng`;
  }
}
$('#sound').addEventListener('change', event => { audio.enabled = event.target.checked; audio.unlock().catch(() => {}); });
document.querySelectorAll('[data-audio]').forEach(input => input.addEventListener('change', async () => {
  try { await audio.loadFiles(input.dataset.audio, input.files); audio.enabled = true; renderAudio(); }
  catch (error) { $('#audio-status').textContent = `Không đọc được bản thu. ${error.message}`; }
}));
audio.loadManifest().then(renderAudio).catch(() => { $('#audio-status').textContent = 'Không tải được bản thu âm thanh. Bạn có thể chọn tệp bên dưới.'; });
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function renderMatch(m){
  if(!m.canHumanShoot)spinControl.reset();
  if(m.foulNotice){releasing=false;cancelPull();$('#cue-control').classList.remove('releasing');}
  matchHUD?.render(m);
  $('#menu-dialog .muted').textContent=`${m.config.game==='9'?'9-ball':'8-ball · 15 bi'} · Chạm ${m.config.target} · ${m.names[1]}`;
  if(scene){scene.inputLocked=!m.canHumanShoot;scene.showCue=m.phase==='lag-ready'||m.phase==='playing';scene.pocketLabels.visible=m.phase==='playing'&&m.config.game==='8'&&!m.breaking;}
  renderState();
}
function enterGame(){closeDialogs();$('#game').classList.toggle('match-layout',mode==='match');$('#game').hidden=false;if(scene){scene.suspended=false;scene.resize();scene.setView('top');document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view==='top');b.setAttribute('aria-pressed',String(b.dataset.view==='top'));});}}
function goHome(){
  training?.close();$('#game').classList.remove('training-layout');
  match?.dispose();match=null;releasing=false;mode='home';cancelPull();closeDialogs();
  physics.reset();if(scene){scene.striking=null;scene.suspended=true;scene.followBall=false;scene.pocketLabels.visible=false;}
  spinControl.reset();
  $('#game').hidden=true;matchHUD?.render(null);lobby?.show();
}
function startPractice(){
  training?.close();$('#game').classList.remove('training-layout');
  $('#menu-dialog .muted').textContent='Người chơi tự do · Luyện tập 15 bi';
  $('#guide').checked=read('guide','true')==='true';
  match?.dispose();match=null;mode='practice';releasing=false;physics.reset('rack');enterGame();
  scene.angle=0;scene.inputLocked=false;scene.showCue=true;scene.ghostEnabled=true;scene.aimVisible=$('#guide').checked;scene.followBall=false;scene.pocketLabels.visible=false;scene.syncBalls(0);matchHUD.render(null);renderState();
}
function startMatch(config){
  training?.close();$('#game').classList.remove('training-layout');
  if(!scene)throw new Error('Không mở được bàn 3D. Hãy bật tăng tốc đồ họa trong trình duyệt.');
  match?.dispose();match=null;mode='match';releasing=false;enterGame();
  scene.aimVisible=config.aid!=='none';scene.ghostEnabled=config.aid==='ghost';scene.followBall=false;
  $('#guide').checked=scene.aimVisible;
  match=new PoolMatch(physics,scene,config,renderMatch);renderMatch(match);
}
matchHUD=mountMatchHUD({choose:action=>match?.choose(action),home:goHome});
if(scene)training=mountTraining({physics,scene,home:goHome,practice:startPractice,
  changed:renderState,
  isBusy:()=>releasing||physics.moving,
  resetControls:()=>{cancelPull();spinControl.reset();},
  setShot:shot=>{scene.angle=shot.angle;spinControl.setPoint(shot.tip);scene.guideKey=null;scene.bridgeKey=null;},
  enter:()=>{match?.dispose();match=null;mode='training';releasing=false;lobby.root.hidden=true;$('#game').classList.add('training-layout');enterGame();scene.inputLocked=false;scene.showCue=true;scene.followBall=false;scene.pocketLabels.visible=false;matchHUD.render(null);},
});
function startTraining(){if(!training)return;goHome();lobby.root.hidden=true;training.open();}
lobby=mountHomepage({startMatch,startPractice,startTraining,goHome,settings:()=>openDialog('#settings-dialog'),help:()=>openDialog('#help-dialog')});
$('#help-dialog .setting-note:last-child').textContent='Chơi với máy: chọn 9-ball hoặc 8-ball, thi băng để giành quyền chọn người phá. 8-ball cần gọi bi và lỗ trước cú đánh; 9-ball phải chạm bi nhỏ nhất trước. Sau lỗi, kéo bi trắng đến vị trí hợp lệ. Tập luyện: đánh tự do, không tính thắng thua.';
if(scene)scene.canInteract=canUserShoot;
goHome();renderState();renderAudio();
if (import.meta.env.DEV) window.__noir = { physics, scene, audio, cancelPull, get match(){return match;},startMatch,startPractice,goHome };
