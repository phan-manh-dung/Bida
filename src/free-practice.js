import './free-practice.css';
import {BREAK_CUE_X,HALF_X,HALF_Z} from './table-model.js';
import {clubIcon} from './club-icons.js';

export function mountFreePractice({physics,scene,back,cancel,changed,isBusy}){
  const game=document.querySelector('#game'),panel=document.createElement('aside');panel.id='free-practice-panel';
  panel.innerHTML=`<button data-free-back>← Quay lại</button><p class="free-eyebrow">TẬP LUYỆN</p><h2>Tùy chỉnh <span>bài tập</span></h2><p class="free-description">Thiết lập bàn bida để tự tập theo nhu cầu của bạn.</p><div class="free-section"><label for="free-layout">${clubIcon('rack')} Cách xếp bi</label><select id="free-layout"><option value="rack">Tam giác tiêu chuẩn (15 bi)</option><option value="practice">Bi rải sẵn (15 bi)</option></select></div><div class="free-section"><p>Vị trí bi cái</p><div class="free-position"><button data-place="manual">⌖ Đặt tay</button><button data-place="head">Đầu bàn</button><button data-place="random">⤨ Ngẫu nhiên</button></div></div><label class="free-switch-row" for="free-guide">${clubIcon('bolt')}<span><strong>Hiển thị đường ngắm</strong><small>Hỗ trợ căn góc khi tập luyện.</small></span><input id="free-guide" class="switch" type="checkbox" checked></label><label class="free-switch-row" for="free-power">${clubIcon('chart')}<span><strong>Trợ giúp lực đánh</strong><small>Hiển thị thanh lực đánh.</small></span><input id="free-power" class="switch" type="checkbox" checked></label><p class="free-status" role="status"></p><div class="free-actions"><button data-free-reset>${clubIcon('reset')} Đặt lại</button><button data-free-start>${clubIcon('play')} Bắt đầu tập</button></div>`;
  const toggle=document.createElement('button');toggle.id='free-practice-toggle';toggle.textContent='Bài tập';toggle.setAttribute('aria-expanded','false');game.append(panel,toggle);
  const q=s=>panel.querySelector(s);let position='manual';
  function drawer(open){game.classList.toggle('free-panel-open',open);toggle.setAttribute('aria-expanded',String(open));}
  toggle.onclick=()=>{scene.closePhonePanels?.();drawer(!game.classList.contains('free-panel-open'));};
  game.addEventListener('click',e=>{if(e.target.closest('#phone-camera,#menu-toggle,#settings-toggle'))drawer(false);});
  function status(text){q('.free-status').textContent=text;}
  function allowed(){if(isBusy()){status('Đợi bi dừng rồi thay đổi bài tập.');return false;}cancel();return true;}
  function place(value){
    physics.hand='any';let placed=true;
    if(value==='head')placed=physics.placeCue(0,BREAK_CUE_X);
    if(value==='random'){placed=false;for(let i=0;i<100&&!placed;i++)placed=physics.placeCue((Math.random()-.5)*(HALF_Z*2-.5),(Math.random()-.5)*(HALF_X*2-.5));}
    physics.hand=value==='manual'?'any':null;
    if(placed){position=value;panel.querySelectorAll('[data-place]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.place===value)));}
    status(!placed?'Vị trí chưa trống. Chọn đặt tay hoặc thử lại.':value==='manual'?'Kéo bi trắng trên bàn đến vị trí bạn muốn.':'Đã đặt bi cái. Bạn có thể ngắm và đánh.');
    scene.guideKey=null;scene.syncBalls(0);changed();
  }
  function reset(){physics.reset(q('#free-layout').value);scene.angle=0;scene.tip={x:0,y:0};scene.showCue=true;scene.inputLocked=false;place(position);}
  q('#free-layout').onchange=()=>{if(allowed())reset();else q('#free-layout').value=physics.layout;};
  panel.querySelectorAll('[data-place]').forEach(button=>button.onclick=()=>{if(allowed())place(button.dataset.place);});
  q('[data-free-reset]').onclick=()=>{if(allowed())reset();};
  q('[data-free-start]').onclick=()=>{if(allowed()){physics.hand=null;drawer(false);status('Sẵn sàng. Ngắm, kéo cơ rồi thả để đánh.');changed();}};
  q('[data-free-back]').onclick=()=>{cancel();drawer(false);back();};
  q('#free-guide').onchange=()=>{const guide=document.querySelector('#guide');guide.checked=q('#free-guide').checked;guide.dispatchEvent(new Event('change'));};
  document.querySelector('#guide').addEventListener('change',()=>q('#free-guide').checked=document.querySelector('#guide').checked);
  q('#free-power').onchange=()=>game.classList.toggle('free-hide-power',!q('#free-power').checked);
  return {open(){drawer(false);position='manual';q('#free-layout').value='rack';q('#free-guide').checked=scene.aimVisible;q('#free-power').checked=true;game.classList.remove('free-hide-power');place('manual');}};
}
