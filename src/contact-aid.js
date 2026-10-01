import * as THREE from 'three';
import {CLOTH_Y,RADIUS,HALF_X,HALF_Z} from './table-model.js';

export function mountContactAid(scene){
  const group=new THREE.Group();group.name='live-contact-aid';group.visible=false;scene.scene.add(group);
  function line(count,color,dashed=false){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
    const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.04,gapSize:.025,depthTest:false}):new THREE.LineBasicMaterial({color,depthTest:false});
    const mesh=new THREE.Line(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=15;group.add(mesh);return mesh;
  }
  function points(mesh,values){const a=mesh.geometry.attributes.position;values.forEach((p,i)=>a.setXYZ(i,...p));a.needsUpdate=true;if(mesh.material.isLineDashedMaterial)mesh.computeLineDistances();}
  const path=line(2,'#4fe5ff',true),out=line(5,'#ffd379');
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.025,16,12),new THREE.MeshBasicMaterial({color:'#ff5757',depthTest:false}));dot.name='live-contact-point';dot.renderOrder=20;group.add(dot);
  const ghost=new THREE.Group();ghost.name='live-contact-ghost';group.add(ghost);
  const ring=new THREE.Mesh(new THREE.RingGeometry(RADIUS*.94,RADIUS*1.06,96),new THREE.MeshBasicMaterial({color:'#fff9e8',depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  ring.renderOrder=16;ghost.add(ring);
  return {update(){
    const active=scene.contactAidEnabled&&scene.view==='cue'&&scene.physics.canShoot&&!scene.striking&&scene.showCue!==false&&scene.canInteract?.()!==false;
    group.visible=!!active;if(!active)return '';
    const cue=scene.physics.cueBall,hit=scene.physics.aimTarget(scene.angle),y=CLOTH_Y+RADIUS;
    const aimLength=Math.hypot(hit.x-cue.x,hit.z-cue.z),end=Math.max(0,aimLength-RADIUS*1.08);
    points(path,[[cue.x,y,cue.z],[cue.x+Math.cos(scene.angle)*end,y,cue.z+Math.sin(scene.angle)*end]]);
    const target=hit.target;dot.visible=ghost.visible=out.visible=!!target;
    if(!target)return 'Hướng cơ hiện tại chưa chạm bi nào trước băng. Chỉnh hướng ngắm để thấy điểm chạm.';
    ghost.position.set(hit.x,y,hit.z);
    ghost.quaternion.copy(scene.camera.quaternion);
    const dx=target.x-hit.x,dz=target.z-hit.z,d=Math.hypot(dx,dz),nx=dx/d,nz=dz/d;
    dot.position.set(target.x-nx*RADIUS,y,target.z-nz*RADIUS);
    // Only show the initial object-ball direction, stopping before a rail.
    let length=.65;
    for(const [p,v,bound] of [[target.x,nx,HALF_X-RADIUS],[target.z,nz,HALF_Z-RADIUS]])if(Math.abs(v)>1e-8)length=Math.min(length,Math.max(0,(Math.sign(v)*bound-p)/v));
    const ex=target.x+nx*length,ez=target.z+nz*length,head=Math.min(.10,length*.3);
    points(out,[[target.x,y,target.z],[ex,y,ez],[ex-nx*head-nz*head*.5,y,ez-nz*head+nx*head*.5],[ex,y,ez],[ex-nx*head+nz*head*.5,y,ez-nz*head-nx*head*.5]]);
    const overlap=Math.max(0,1-Math.abs(Math.cos(scene.angle)*nz-Math.sin(scene.angle)*nx));
    return `Bi ${target.id}: ${overlap>.9?'gần trúng tâm':overlap>.62?'chạm dày':overlap>.38?'khoảng nửa bi':'cắt mỏng'} · chồng ${Math.round(overlap*100)}%. Đỏ: điểm chạm · Trắng nét đứt: bi cái lúc chạm · Vàng: hướng ban đầu của bi mục tiêu (ước tính).`;
  }};
}
