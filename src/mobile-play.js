import './mobile-play.css';
export function mountMobilePlay(scene,cancel){
  const game=document.querySelector('#game');
  const help=document.createElement('button');help.id='phone-coach';help.textContent='HLV / Đặt bi';help.setAttribute('aria-expanded','false');
  const camera=document.createElement('button');camera.id='phone-camera';camera.textContent='Góc nhìn';camera.setAttribute('aria-expanded','false');
  game.append(help,camera);
  // Activate taps explicitly after a canvas drag; some mobile browsers suppress
  // the next compatibility click. Ignore its duplicate if the browser emits it.
  let tap=null,lastTap=null;
  game.addEventListener('pointerdown',e=>{const button=e.target.closest('button');if(e.pointerType==='touch'&&button&&!button.disabled)tap={button,id:e.pointerId,x:e.clientX,y:e.clientY};},true);
  game.addEventListener('pointercancel',()=>{tap=null;},true);
  game.addEventListener('pointermove',e=>{if(tap&&e.pointerId===tap.id&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>10)tap=null;},true);
  game.addEventListener('pointerup',e=>{
    const t=tap;tap=null;if(!t||e.pointerId!==t.id||!t.button.contains(e.target)||Math.hypot(e.clientX-t.x,e.clientY-t.y)>10)return;
    e.preventDefault();lastTap={button:t.button,time:performance.now()};t.button.click();
  },true);
  game.addEventListener('click',e=>{if(e.isTrusted&&lastTap&&performance.now()-lastTap.time<700&&lastTap.button.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
  const views=document.createElement('div');views.id='phone-views';views.innerHTML='<button data-phone-view="top">Từ trên</button><button data-phone-view="cue">Theo cơ</button><button data-phone-view="orbit">3D</button><small>Chạm và kéo thân cơ để xoay. Kéo thanh lực để đánh.</small>';game.append(views);
  views.querySelectorAll('button').forEach(button=>button.onclick=()=>document.querySelector(`[data-view="${button.dataset.phoneView}"]`)?.click());
  function drawers(which=null){
    game.classList.toggle('phone-help-open',which==='help');game.classList.toggle('phone-camera-open',which==='camera');
    help.setAttribute('aria-expanded',String(which==='help'));camera.setAttribute('aria-expanded',String(which==='camera'));
    help.textContent=which==='help'?'Đóng HLV':'HLV / Đặt bi';camera.textContent=which==='camera'?'Đóng góc nhìn':'Góc nhìn';
  }
  help.onclick=()=>drawers(game.classList.contains('phone-help-open')?null:'help');camera.onclick=()=>drawers(game.classList.contains('phone-camera-open')?null:'camera');
  if(scene)scene.closePhonePanels=()=>drawers();
  game.addEventListener('pointerdown',e=>{if(game.classList.contains('phone-play')&&e.target.tagName==='CANVAS'&&(game.classList.contains('phone-help-open')||game.classList.contains('phone-camera-open'))){drawers();e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('click',e=>{
    if(!game.classList.contains('phone-play'))return;
    if(e.target.closest('[data-ready],[data-execute],[data-independent],#menu-toggle,#settings-toggle,[data-back],[data-library],[data-exit]'))drawers();
    if(e.target.closest('[data-edit],[data-edit-result]'))drawers('help');
  });
  function resize(){
    const phone=innerWidth<=600||(innerWidth<=1000&&innerHeight<=500)||(matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<=600);
    const portrait=phone&&innerHeight>innerWidth;
    if(game.classList.contains('phone-portrait')!==portrait){cancel();scene?.cancelTouchAim?.();}
    game.classList.toggle('phone-play',phone);game.classList.toggle('phone-portrait',portrait);
    const tools=game.querySelector('.cue-camera-tools');if(tools)(phone?views:scene.container).append(tools);
    requestAnimationFrame(()=>scene?.resize());
  }
  window.addEventListener('resize',resize);resize();
  const result=game.querySelector('#training-result');if(result)new MutationObserver(()=>{if(!result.hidden)drawers();}).observe(result,{attributes:true,attributeFilter:['hidden']});
}
