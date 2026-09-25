import * as THREE from 'three';
import {CLOTH_Y,RADIUS} from './table-model.js';

// Camera actions never write the shot angle, tip or physics state.
export function mountCueCamera(scene){
  const {camera,controls,container}=scene;
  const ui=document.createElement('div');ui.className='cue-camera-tools';ui.hidden=true;
  ui.innerHTML='<div role="group" aria-label="Quan sát theo cơ"><button data-camera="left" aria-label="Xoay nhìn sang trái">↶</button><button data-camera="right" aria-label="Xoay nhìn sang phải">↷</button><button data-camera="up" aria-label="Nâng tầm mắt">↑</button><button data-camera="down" aria-label="Hạ tầm mắt">↓</button><button data-camera="near" aria-label="Nhìn gần hơn">＋</button><button data-camera="far" aria-label="Nhìn xa hơn">−</button><button data-camera="reset">Về đường ngắm</button></div><small>Chuột phải: xoay · Cuộn: gần/xa · Điện thoại: hai ngón kéo/chụm</small>';
  container.append(ui);
  const high=document.createElement('button');high.dataset.camera='high';high.textContent='Nhìn từ cao';
  ui.querySelector('[data-camera="reset"]').before(high);
  const aid=document.createElement('button');aid.dataset.camera='contact';aid.textContent='Điểm chạm';aid.setAttribute('aria-pressed','false');high.after(aid);
  const contactNote=document.createElement('p');contactNote.className='contact-aid-note';contactNote.hidden=true;ui.append(contactNote);
  ui.querySelector('small').textContent='Chuột phải kéo dọc: nâng/hạ · Kéo ngang: xoay · Cuộn: gần/xa · Hai ngón trên điện thoại';
  let manual=false,lastAngle=scene.angle;
  const pointers=new Set();
  scene.renderer.domElement.addEventListener('pointerdown',e=>{
    if(pointers.size===0)scene.cameraGesture=false;
    pointers.add(e.pointerId);
    if(scene.view==='cue'&&(e.button===2||pointers.size>1)){manual=true;if(pointers.size>1)scene.cameraGesture=true;}
  },true);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])scene.renderer.domElement.addEventListener(event,e=>pointers.delete(e.pointerId),true);
  function change(action){
    if(scene.view!=='cue'||!controls.enabled||scene.striking)return;
    if(action==='contact'){scene.contactAidEnabled=!scene.contactAidEnabled;aid.setAttribute('aria-pressed',String(scene.contactAidEnabled));if(scene.contactAidEnabled)scene.onAimAid?.();return;}
    if(action==='reset'){reset();return;}
    // Flush damping before applying an exact button step.
    controls.enableDamping=false;controls.update();
    const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
    if(action==='near')s.radius*=.85;
    if(action==='far')s.radius/= .85;
    if(action==='left'){s.theta-=.12;manual=true;}
    if(action==='right'){s.theta+=.12;manual=true;}
    if(action==='up')s.phi-=.08;
    if(action==='down')s.phi+=.08;
    if(action==='high'){
      const b=scene.physics.cueBall,hit=scene.physics.aimTarget(scene.angle);
      const distance=Math.hypot(hit.x-b.x,hit.z-b.z);
      controls.target.set((b.x+hit.x)/2,CLOTH_Y+RADIUS,(b.z+hit.z)/2);
      s.theta=Math.atan2(-Math.cos(scene.angle),-Math.sin(scene.angle));
      s.phi=.06;s.radius=Math.max(5,(distance*.5+.6)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
      manual=false;lastAngle=scene.angle;
    }
    s.radius=THREE.MathUtils.clamp(s.radius,controls.minDistance,controls.maxDistance);
    s.phi=THREE.MathUtils.clamp(s.phi,controls.minPolarAngle,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();controls.enableDamping=true;
  }
  ui.querySelectorAll('button').forEach(button=>button.onclick=()=>change(button.dataset.camera));
  function reset(){
    const b=scene.physics.cueBall,dx=Math.cos(scene.angle),dz=Math.sin(scene.angle);
    controls.enableDamping=false;controls.update();
    controls.target.set(b.x+dx*.65,CLOTH_Y+RADIUS,b.z+dz*.65);
    camera.position.set(b.x-dx*3.3,1.65,b.z-dz*3.3);
    controls.update();controls.enableDamping=true;manual=false;lastAngle=scene.angle;
  }
  function configure(cue){
    ui.hidden=!cue;
    controls.enableZoom=cue;controls.enableRotate=cue||scene.view==='orbit';
    controls.minDistance=cue?1.6:3;controls.maxDistance=cue?16:28;
    controls.minPolarAngle=.02;controls.maxPolarAngle=cue?1.40:Math.PI*.44;
    controls.rotateSpeed=cue?.45:.18;
    controls.touches.TWO=cue?THREE.TOUCH.DOLLY_ROTATE:null;
    camera.fov=cue?45:36;camera.updateProjectionMatrix();
  }
  function update(){
    if(scene.view!=='cue')return;
    contactNote.hidden=!scene.contactAidText;
    if(contactNote.textContent!==scene.contactAidText)contactNote.textContent=scene.contactAidText||'';
    ui.querySelectorAll('button').forEach(button=>button.disabled=!controls.enabled||!!scene.striking);
    if(!manual&&!scene.physics.moving&&!scene.striking&&scene.angle!==lastAngle){
      const b=scene.physics.cueBall,pivot=new THREE.Vector3(b.x,CLOTH_Y+RADIUS,b.z),delta=scene.angle-lastAngle;
      camera.position.sub(pivot).applyAxisAngle(new THREE.Vector3(0,1,0),-delta).add(pivot);
      controls.target.sub(pivot).applyAxisAngle(new THREE.Vector3(0,1,0),-delta).add(pivot);
    }
    lastAngle=scene.angle;
  }
  return {configure,reset,update};
}
