import * as THREE from 'three';
import {CLOTH_Y,POCKET_DETAILS,RADIUS} from '../table-model.js';
// Own every geometry/material so changing lessons never leaks GPU resources.
export function createTrainingOverlay(scene){
  const root=new THREE.Group();scene.add(root);
  const clear=()=>{for(const child of [...root.children]){child.geometry?.dispose();child.material?.dispose();root.remove(child);}};
  function ring(x,z,r,color){const m=new THREE.Mesh(new THREE.RingGeometry(r-.015,r,64),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.85}));m.rotation.x=-Math.PI/2;m.position.set(x,CLOTH_Y+.014,z);root.add(m);return m;}
  function show(lesson,preview){
    clear();const p=POCKET_DETAILS[lesson.pocket];ring(p.x,p.z,.28,'#ffce66');
    if(!preview)return;
    if(preview.impact){const {cue,object}=preview.impact;ring(cue.x,cue.z,RADIUS,'#ffffff');ring((cue.x+object.x)/2,(cue.z+object.z)/2,.035,'#ff756f');}
    for(const [id,points] of Object.entries(preview.paths)){
      if(points.length<2)continue;
      const color=Number(id)===0?'#7aefcd':'#ffce66';
      const geometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,z])=>new THREE.Vector3(x,CLOTH_Y+.025,z)));
      root.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.85})));
    }
    const b=preview.physics.cueBall;if(!b.pocketed){
      const target=ring(b.x,b.z,.19,'#7aefcd');target.name='training-destination';target.renderOrder=5;
      const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      target.onBeforeRender=()=>{const pulse=reduced?1:(1+Math.sin(performance.now()/1000*Math.PI*1.5))/2;target.material.opacity=.3+.65*pulse;target.scale.setScalar(1+.18*pulse);};
      const dot=new THREE.Mesh(new THREE.CircleGeometry(RADIUS*.75,48),new THREE.MeshBasicMaterial({color:'#dffff5',transparent:true,opacity:.28,side:THREE.DoubleSide,depthTest:false}));
      dot.rotation.x=-Math.PI/2;dot.position.set(b.x,CLOTH_Y+.03,b.z);dot.renderOrder=4;root.add(dot);
    }
  }
  return {show,clear,dispose(){clear();scene.remove(root);}};
}
