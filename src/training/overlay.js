import * as THREE from 'three';
import {CLOTH_Y,POCKET_DETAILS,RADIUS} from '../table-model.js';
import {suggestStance} from './stance.js';
// Own every geometry/material so changing lessons never leaks GPU resources.
export function createTrainingOverlay(scene){
  const root=new THREE.Group();scene.add(root);
  const clear=()=>{for(const child of [...root.children]){child.geometry?.dispose();child.material?.dispose();root.remove(child);}};
  function ring(x,z,r,color){const m=new THREE.Mesh(new THREE.RingGeometry(r-.015,r,64),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.85}));m.rotation.x=-Math.PI/2;m.position.set(x,CLOTH_Y+.014,z);root.add(m);return m;}
  function show(lesson,preview,shot,hand,wide){
    clear();const p=POCKET_DETAILS[lesson.pocket];ring(p.x,p.z,.28,'#ffce66');
    if(!preview)return;
    if(shot&&hand){
      const stance=suggestStance(lesson,shot,hand,wide);
      const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      for(const [i,foot] of stance.feet.entries()){
        const mark=ring(foot.x,foot.z,.14,'#ffd379');mark.name=`training-stance-${i}`;
        mark.scale.set(1,1.7,1);mark.rotation.z=-shot.angle-Math.PI/2;mark.renderOrder=10;
        mark.onBeforeRender=()=>{mark.material.opacity=reduced?.9:.35+.6*(1+Math.sin(performance.now()/600))/2;};
        const sole=new THREE.Mesh(new THREE.CircleGeometry(.105,32),new THREE.MeshBasicMaterial({color:'#ffd379',side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.5}));
        sole.rotation.copy(mark.rotation);sole.position.copy(mark.position);sole.scale.set(1,1.7,1);sole.renderOrder=9;
        sole.onBeforeRender=()=>{sole.material.opacity=mark.material.opacity*.65;};root.add(sole);
      }
      const bridge=ring(stance.bridge.x,stance.bridge.z,.075,'#ffd379');bridge.name='training-bridge';bridge.renderOrder=10;
      const line=new THREE.BufferGeometry().setFromPoints([stance.feet[0],stance.cue].map(p=>new THREE.Vector3(p.x,CLOTH_Y+.04,p.z)));
      root.add(new THREE.Line(line,new THREE.LineDashedMaterial({color:'#ffd379',depthTest:false,transparent:true,opacity:.55,dashSize:.12,gapSize:.1})).computeLineDistances());
    }
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
