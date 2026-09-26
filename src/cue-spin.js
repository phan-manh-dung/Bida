// UI coordinates: x right, y up. The playable disc maps to a half-radius
// contact offset, avoiding unreliable contacts at the miscue limit.
import {localPointer} from './screen-coordinates.js';
export const MAX_TIP_OFFSET = 0.5;
export function normalizeTip(point = {}) {
  let x = Number.isFinite(point?.x) ? point.x : 0;
  let y = Number.isFinite(point?.y) ? point.y : 0;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y };
}

export function mountSpinControl(container, onChange) {
  container.insertAdjacentHTML('beforeend', `<div class="spin-control disabled">
    <button type="button" class="spin-ball" aria-label="Điểm chạm đầu cơ: tâm bi"><span class="spin-marker"></span></button>
  </div>`);
  const root=container.querySelector('.spin-control'),ball=root.querySelector('.spin-ball');
  let point={x:0,y:0},enabled=false,drag=null;
  function set(value) {
    point=normalizeTip(value);
    ball.style.setProperty('--tip-x',`${50+point.x*39}%`);
    ball.style.setProperty('--tip-y',`${50-point.y*39}%`);
    const vertical=point.y>.1?'cu-lê':point.y<-.1?'trô':'';
    const side=point.x>.1?'ép phê phải':point.x<-.1?'ép phê trái':'';
    ball.setAttribute('aria-label',`Điểm chạm đầu cơ: ${[vertical,side].filter(Boolean).join(', ')||'tâm bi'}`);
    onChange({...point});
  }
  function move(e) {
    const p=localPointer(ball,e);set({x:(p.u-.5)/.39,y:(.5-p.v)/.39});
  }
  ball.addEventListener('pointerdown',e=>{
    if(!enabled||!e.isPrimary||e.button!==0)return;
    e.preventDefault();ball.focus({preventScroll:true});drag={id:e.pointerId,start:{...point}};ball.setPointerCapture(e.pointerId);move(e);
  });
  ball.addEventListener('pointermove',e=>{if(enabled&&drag?.id===e.pointerId)move(e);});
  ball.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){drag=null;if(ball.hasPointerCapture(e.pointerId))ball.releasePointerCapture(e.pointerId);}});
  function cancel(){if(drag){const previous=drag;drag=null;set(previous.start);if(ball.hasPointerCapture(previous.id))ball.releasePointerCapture(previous.id);}}
  ball.addEventListener('pointercancel',cancel);ball.addEventListener('lostpointercapture',cancel);window.addEventListener('blur',cancel);
  ball.addEventListener('keydown',e=>{
    if(!enabled)return;
    const delta={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.code];
    if(delta){e.preventDefault();e.stopPropagation();set({x:point.x+delta[0],y:point.y+delta[1]});}
    if(['KeyR','Home','Escape'].includes(e.code)){e.preventDefault();cancel();set({x:0,y:0});}
  });
  return { setPoint:set, get point(){return {...point};},reset:()=>{cancel();set({x:0,y:0});},setEnabled(value){enabled=!!value;if(!enabled)cancel();root.classList.toggle('disabled',!enabled);ball.disabled=!enabled;} };
}
