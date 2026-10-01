// Pull directly opposite the cue's projected direction. Touch keeps its own controls.
export function mountMouseShot(scene,{canStart,start,power,release,cancel}){
  const canvas=scene.renderer.domElement;
  let drag=null;
  function clear(){const previous=drag;drag=null;scene.resetMouseAim?.();if(previous&&canvas.hasPointerCapture(previous.id))canvas.releasePointerCapture(previous.id);}
  scene.cancelMouseShot=clear;
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0||!event.isPrimary||!canStart())return;
    const b=scene.physics.cueBall;
    const origin=scene.project(b.x,b.z),back=scene.project(b.x-Math.cos(scene.angle),b.z-Math.sin(scene.angle));
    const length=Math.hypot(back.x-origin.x,back.y-origin.y);
    if(length<1)return;
    event.preventDefault();event.stopImmediatePropagation();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:(back.x-origin.x)/length,dy:(back.y-origin.y)/length,travel:Math.max(100,Math.min(230,canvas.clientHeight*.3))};
    start();canvas.setPointerCapture(event.pointerId);
  },true);
  canvas.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    event.preventDefault();event.stopImmediatePropagation();
    power(Math.max(0,Math.min(1,((event.clientX-drag.x)*drag.dx+(event.clientY-drag.y)*drag.dy)/drag.travel)));
  },true);
  canvas.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    event.preventDefault();event.stopImmediatePropagation();clear();release();
  },true);
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{if(drag){clear();cancel();}});
}
