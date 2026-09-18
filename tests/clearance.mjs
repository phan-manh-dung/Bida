import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.locator('#practice-start').click();
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {cueElevation,cuePose}=await import('/src/cue-pose.js');
  const {RAIL_SURFACE_Y}=await import('/src/table-visual.js');
  const {scene:s}=window.__noir;
  // Use all table meshes, excluding balls, contact planes, guide and floor.
  const objects=s.scene.children.filter(o=>o.isMesh && ![...s.ballMeshes.values(),...s.ballShadows.values(),s.ghost].includes(o) && o.position.y>-.7);
  s.scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  let count=0;const failures=[];
  const fixtures=[[-2.45,.1,-.281],[4.295,.5,Math.PI],[1,2.095,-Math.PI/2],[0,-2.095,Math.PI/2],[4.12,1.94,-2.35],[-4.12,-1.94,.78],[3.6,1.8,-2.6]];
  for(const [x,z,angle] of fixtures) for(const power of [0,.5,1]) {
   const elevation=cueElevation({x,z},angle,RAIL_SURFACE_Y),pose=cuePose({x,z},angle,power,elevation);
   const orientation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),new THREE.Vector3(...pose.axis));
   for(const part of s.cue.children) {
    const {radiusTop,radiusBottom,height}=part.geometry.parameters;
    for(let i=0;i<=16;i++) {
     const local=part.position.x-height/2+i/16*height,radius=radiusBottom+(radiusTop-radiusBottom)*i/16;
     for(const azimuth of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      const p=new THREE.Vector3(local,radius*Math.cos(azimuth),radius*Math.sin(azimuth)).applyQuaternion(orientation).add(new THREE.Vector3(...pose.position));
      if(Math.abs(p.x)<4.38 && Math.abs(p.z)<2.18)continue;
      ray.ray.origin.set(p.x,5,p.z);
      const hit=ray.intersectObjects(objects,false)[0];count++;
      if(hit && hit.point.y>p.y+.001) failures.push({x,z,angle,power,local,point:p.toArray(),surface:hit.point.y,name:hit.object.name});
     }
    }
   }
  }
  return {count,failures:failures.slice(0,12)};
 });
 console.log(JSON.stringify(result));assert.deepEqual(result.failures,[]);
}finally{await browser.close();}
