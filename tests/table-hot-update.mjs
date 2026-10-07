import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const originals=new Map(),written=new Map();
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];let navigations=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__noir?.previewReloadReady);
 page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++;});
 await page.evaluate(()=>{
  const n=window.__noir;n.startPractice();n.scene.setView('top');n.physics.shots=4;
  n.physics.balls[0].x=-1.7;n.physics.balls[0].px=-1.7;
  window.__previewOriginal={scene:n.scene,canvas:n.scene.renderer.domElement,physics:n.physics,balls:n.physics.balls,camera:n.scene.camera.position.toArray(),ballMesh:n.scene.ballMeshes.get(0)};
 });
 navigations=0;
 for(const file of ['src/pocket-svg.js','src/pocket-designs/corner.svg','src/pocket-designs/side.svg','src/table-visual.js']){
  const before=await page.evaluate(()=>window.__noir.scene.tableVisualRevision||0);
  const original=await readFile(file,'utf8');originals.set(file,original);
  const changed=original+(file.endsWith('.svg')?'\n<!-- hot-update test -->\n':'\n// hot-update test\n');written.set(file,changed);
  console.log('Updating',file);await writeFile(file,changed);
  await page.waitForFunction(before=>(window.__noir?.scene.tableVisualRevision||0)>before,before);
  assert.equal(navigations,0,`No page reload for ${file}`);
  assert.equal(await page.evaluate(()=>{
   const n=window.__noir,o=window.__previewOriginal;
   return n.scene===o.scene&&n.scene.renderer.domElement===o.canvas&&n.physics===o.physics&&n.physics.balls===o.balls&&n.scene.ballMeshes.get(0)===o.ballMesh&&n.physics.balls[0].x===-1.7&&n.physics.shots===4&&!document.querySelector('#game').hidden&&n.scene.camera.position.toArray().every((v,i)=>Math.abs(v-o.camera[i])<1e-6)&&n.scene.scene.children.filter(m=>m.userData.pocketSvg).length===6;
  }),true,file);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: config, both SVGs and table code update in place; zero navigations; same canvas, camera, physics, balls and six pockets.');
}finally{await browser.close();for(const [file,original] of originals)if(await readFile(file,'utf8')===written.get(file))await writeFile(file,original);}
