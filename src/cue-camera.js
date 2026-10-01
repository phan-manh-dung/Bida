import * as THREE from 'three';
import {CLOTH_Y,RADIUS,OUTER_X,OUTER_Z} from './table-model.js';

// Fit the actual table rectangle, with one distance for the entire elevation range.
export function mountCueCamera(scene){
  const {camera,controls}=scene;
  const target=new THREE.Vector3(0,CLOTH_Y+RADIUS,0);
  let ownTurn=true,shooter=null,elevation=.66,heading=scene.angle,transition=false;
  let wasMoving=false,lastShots=scene.physics.shots;
  function distance(theta){
    const area=scene.playArea(),aspect=area.width/area.height;
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const right=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta));
    let radius=6;
    // Reserve only a small border, instead of fitting a large enclosing sphere.
    for(let i=0;i<=24;i++){
      const e=.30+(1.24-.30)*i/24;
      const direction=new THREE.Vector3(Math.sin(theta)*Math.cos(e),Math.sin(e),Math.cos(theta)*Math.cos(e));
      const vertical=new THREE.Vector3().crossVectors(direction,right);
      for(const x of [-OUTER_X,OUTER_X])for(const z of [-OUTER_Z,OUTER_Z]){
        const corner=new THREE.Vector3(x,.12,z).sub(target),depth=corner.dot(direction);
        radius=Math.max(radius,depth+Math.abs(corner.dot(right))/(tan*aspect*.95),depth+(Math.abs(corner.dot(vertical))+.12)/(tan*.95));
      }
    }
    return radius;
  }
  function pose(dt=0){
    const desired=Math.atan2(-Math.cos(heading),-Math.sin(heading));
    const current=new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const turn=Math.atan2(Math.sin(desired-current.theta),Math.cos(desired-current.theta));
    const alpha=dt?1-Math.exp(-7*dt):1;
    current.theta+=turn*alpha;current.phi+=(Math.PI/2-elevation-current.phi)*alpha;
    current.radius=distance(current.theta);
    controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(current));
    if(Math.abs(turn)<.002)transition=false;
  }
  function setShooter(id,local=true){
    if(shooter===id&&ownTurn===local)return;
    shooter=id;ownTurn=local;followAim();
  }
  function followAim(){heading=ownTurn?scene.angle:Math.PI/2;transition=true;}
  function reset(){followAim();pose();controls.update();transition=false;}
  function configure(cue){
    controls.enableZoom=false;controls.enableRotate=!cue&&scene.view==='orbit';
    controls.touches.TWO=null;
    controls.minDistance=1.6;controls.maxDistance=60;
    controls.minPolarAngle=.02;controls.maxPolarAngle=Math.PI*.44;
    camera.fov=36;camera.updateProjectionMatrix();
  }
  scene.renderer.domElement.addEventListener('wheel',event=>{
    if(scene.view!=='cue'||!controls.enabled||scene.striking)return;
    event.preventDefault();
    const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?300:1);
    elevation=THREE.MathUtils.clamp(elevation-amount*.0012,.30,1.24);
    pose();controls.update();
  },{passive:false});
  // Two-finger vertical movement provides the same elevation adjustment on touch.
  const touches=new Map();let previousY=null;
  const canvas=scene.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touches.set(e.pointerId,e.clientY);if(touches.size===2){scene.cameraGesture=true;previousY=[...touches.values()].reduce((a,b)=>a+b)/2;}}},true);
  canvas.addEventListener('pointermove',e=>{
    if(!touches.has(e.pointerId))return;touches.set(e.pointerId,e.clientY);
    if(scene.view!=='cue'||touches.size!==2||!controls.enabled)return;
    const y=[...touches.values()].reduce((a,b)=>a+b)/2;
    if(previousY!==null){elevation=THREE.MathUtils.clamp(elevation+(y-previousY)*.004,.30,1.24);pose();controls.update();}previousY=y;
  },true);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{touches.delete(e.pointerId);previousY=null;},true);
  function update(dt=1/60){
    const moving=scene.physics.moving,newShot=lastShots!==scene.physics.shots;
    if(newShot&&moving){heading=ownTurn?scene.angle:Math.PI/2;transition=true;}
    if(wasMoving&&!moving)followAim();
    lastShots=scene.physics.shots;wasMoving=moving;
    if(scene.view!=='cue')return;
    if(!moving&&!scene.striking)heading=ownTurn?scene.angle:Math.PI/2;
    pose(transition?dt:0);
  }
  return {configure,reset,update,constrain(){},setShooter,followAim};
}
