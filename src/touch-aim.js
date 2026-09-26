import * as THREE from 'three';
import {localPointer} from './screen-coordinates.js';
export function mountTouchAim(scene){
  const canvas=scene.renderer.domElement;let drag=null;
  const point=x=>{const p=scene.cue.localToWorld(new THREE.Vector3(x,0,0));return scene.project(p.x,p.z,p.y);};
  function finish(restore=false){
    if(!drag)return;const old=drag;drag=null;scene.touchAiming=false;scene.controls.enabled=old.controls;
    if(restore)scene.angle=old.angle;
    if(canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);
  }
  scene.cancelTouchAim=()=>finish(true);
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    if(drag){finish(true);return;}
    if(!e.isPrimary||scene.inputLocked||scene.striking||!scene.physics.canShoot||scene.canInteract?.()===false||!scene.cue.visible||scene.showCue===false)return;
    scene.cue.updateMatrixWorld(true);const a=point(-.25),b=point(-2.75),dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((e.clientX-a.x)*dx+(e.clientY-a.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(e.clientX-a.x-t*dx,e.clientY-a.y-t*dy)>28)return;
    e.preventDefault();e.stopImmediatePropagation();
    const p=localPointer(canvas,e);
    drag={id:e.pointerId,x:p.x,y:p.y,angle:scene.angle,controls:scene.controls.enabled};
    scene.touchAiming=true;scene.controls.enabled=false;canvas.setPointerCapture(e.pointerId);
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(drag?.id!==e.pointerId)return;
    e.preventDefault();e.stopImmediatePropagation();const p=localPointer(canvas,e);
    if(scene.view==='cue')scene.angle=drag.angle+(p.x-drag.x)*.004;
    else{
      // Convert drag to a turn around the projected cue ball; keep the initial
      // pointer offset so grabbing the wide touch target never snaps the cue.
      const ball=scene.physics.cueBall,c=scene.project(ball.x,ball.z),center=localPointer(canvas,{clientX:c.x,clientY:c.y});
      const start=Math.atan2(drag.y-center.y,drag.x-center.x),end=Math.atan2(p.y-center.y,p.x-center.x);
      let delta=end-start;delta=Math.atan2(Math.sin(delta),Math.cos(delta));
      scene.angle=drag.angle+(scene.camera.up.x>.5?-1:1)*delta;
    }
    scene.guideKey=null;scene.bridgeKey=null;scene.onAim(scene.angle);
  },true);
  canvas.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){e.preventDefault();e.stopImmediatePropagation();finish();}},true);
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)finish(true);},true);
  window.addEventListener('blur',()=>finish(true));
}
