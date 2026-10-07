import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__noir);
 const checks=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const {buildTournamentTable,getTablePocketDesign,POCKET_TUNING:config}=await import('/src/table-visual.js');
  const getPocketDesign=getTablePocketDesign;
  const {POCKET_DETAILS,CUSHIONS,pocketPoint}=await import('/src/table-model.js');
  window.__noir.startPractice();const game=window.__noir.scene;cancelAnimationFrame(game.frame);
  const baselineConfig=JSON.parse(JSON.stringify(config));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const snapshot=()=>POCKET_DETAILS.map(p=>{
   const d=getTablePocketDesign(p);return {trim:d.contour('trim'),mouth:d.contour('mouth'),jaw:[d.jaw(false,0),d.jaw(true,.5)]};
  });
  const meshData=scene=>scene.children.filter(m=>m.userData.pocketSvg).map(m=>({type:m.userData.pocketSvg.type,positions:Array.from(m.geometry.attributes.position.array)}));
  const baseline=snapshot(),symmetric=()=>{
   const corners=POCKET_DETAILS.filter(p=>!p.side);
   return ['trim','mouth'].every(id=>{
    const shapes=corners.map(p=>getTablePocketDesign(p).contour(id).map(([l,d])=>{
     const [x,z]=pocketPoint(p,l,d);return [Math.abs(p.x)/p.x*x,Math.abs(p.z)/p.z*z];
    }));
    return shapes.every(points=>points.every((v,i)=>Math.hypot(v[0]-shapes[0][i][0],v[1]-shapes[0][i][1])<1e-9));
   });
  };
  const identity=POCKET_DETAILS.every(p=>['trim','mouth'].every(id=>same(getPocketDesign(p).contour(id),getPocketDesign(p).rawContour(id))));
  const baseScene=new T.Scene();buildTournamentTable(baseScene,game.renderer);const baseMeshes=meshData(baseScene);
  config.corner.mouth.scaleX=.7;
  const mouth=snapshot();const mouthScene=new T.Scene();buildTournamentTable(mouthScene,game.renderer);
  const mouthOnly=mouth.every((d,i)=>same(d.trim,baseline[i].trim)&&same(d.jaw,baseline[i].jaw)&&(POCKET_DETAILS[i].side?same(d.mouth,baseline[i].mouth):!same(d.mouth,baseline[i].mouth)));
  const mouthSymmetry=symmetric();const mouthKeepsTrim=same(meshData(mouthScene),baseMeshes);
  config.corner.mouth.scaleX=1;config.corner.trim.scaleX=1.12;
  const trim=snapshot();const trimScene=new T.Scene();buildTournamentTable(trimScene,game.renderer);const trimMeshes=meshData(trimScene);
  const trimOnly=trim.every((d,i)=>same(d.mouth,baseline[i].mouth)&&same(d.jaw,baseline[i].jaw)&&(POCKET_DETAILS[i].side?same(d.trim,baseline[i].trim):!same(d.trim,baseline[i].trim)));
  const trimChangesOnlyCorners=trimMeshes.every((m,i)=>m.type==='side'?same(m,baseMeshes[i]):!same(m,baseMeshes[i]));
  const trimSymmetry=symmetric();
  config.corner.trim.scaleX=1;
  const sample=POCKET_DETAILS.find(p=>!p.side&&p.x*p.z<0),raw=getPocketDesign(sample).rawContour('mouth');
  const xs=raw.map(p=>p[0]),ys=raw.map(p=>-p[1]);const px=(Math.min(...xs)+Math.max(...xs))/2,py=(Math.min(...ys)+Math.max(...ys))/2;
  Object.assign(config.corner.mouth,{scaleX:.82,scaleY:.86,rotateDeg:-8,offsetX:.02,offsetY:-.03});
  const angle=-8*Math.PI/180,transformed=getPocketDesign(sample).contour('mouth');
  const transformOrder=transformed.every(([l,d],i)=>{
   const x=(raw[i][0]-px)*.82,y=(-raw[i][1]-py)*.86;
   return Math.abs(l-(px+x*Math.cos(angle)-y*Math.sin(angle)+.02))<1e-12&&Math.abs(d+(py+x*Math.sin(angle)+y*Math.cos(angle)-.03))<1e-12;
  });
  const combinedSymmetry=symmetric();
  Object.assign(config.corner.mouth,baselineConfig.corner.mouth);
  config.side.mouth.scaleY=.9;const side=snapshot();
  const sideOnly=side.every((d,i)=>same(d.trim,baseline[i].trim)&&same(d.jaw,baseline[i].jaw)&&(POCKET_DETAILS[i].side?!same(d.mouth,baseline[i].mouth):same(d.mouth,baseline[i].mouth)));
  Object.assign(config.side.mouth,baselineConfig.side.mouth);
  config.corner.jaws.leftOffsetX=.02;config.corner.jaws.leftOffsetY=-.01;
  const jaw=snapshot();
  const jawOnly=jaw.every((d,i)=>same(d.trim,baseline[i].trim)&&same(d.mouth,baseline[i].mouth)&&(POCKET_DETAILS[i].side?same(d.jaw,baseline[i].jaw):!same(d.jaw,baseline[i].jaw)));
  const cornerJawTranslations=POCKET_DETAILS.filter(p=>!p.side).every(p=>{
   const right=p.x*p.z>0;
   const tuned=getTablePocketDesign(p),a=tuned.jaw(right,.2),b=tuned.jaw(right,.8);
   Object.assign(config.corner.jaws,baselineConfig.corner.jaws);
   const raw=getTablePocketDesign(p),ra=raw.jaw(right,.2),rb=raw.jaw(right,.8);
   Object.assign(config.corner.jaws,{leftOffsetX:.02,leftOffsetY:-.01});
   return Math.abs((a[0]-ra[0])-(b[0]-rb[0]))<1e-12&&Math.abs((a[1]-ra[1])-(b[1]-rb[1]))<1e-12;
  });
  Object.assign(config.corner.jaws,baselineConfig.corner.jaws);
  // Keep independently rendered variant scenes for screenshot inspection.
  const camera=new T.OrthographicCamera(-5.7,5.7,5.7/game.camera.aspect,-5.7/game.camera.aspect,.1,30);
  camera.position.set(0,10,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
  for(const scene of [baseScene,mouthScene,trimScene])for(const light of game.scene.children.filter(o=>o.isLight))scene.add(light.clone());
  window.__tuningCheck={scenes:[baseScene,mouthScene,trimScene],camera};
  return {identity,mouthOnly,mouthSymmetry,mouthKeepsTrim,trimOnly,trimChangesOnlyCorners,trimSymmetry,transformOrder,combinedSymmetry,sideOnly,jawOnly,cornerJawTranslations,sixPockets:baseMeshes.length===6,restored:same(config,baselineConfig)};
 });
 for(const [name,ok] of Object.entries(checks))assert.equal(ok,true,name);
 for(const [i,name] of ['baseline','corner-mouth','corner-trim'].entries()){
  await page.evaluate(i=>{const s=window.__noir.scene,c=window.__tuningCheck;s.renderer.setClearColor('#202326',1);s.renderer.render(c.scenes[i],c.camera);},i);
  await page.locator('#scene canvas').screenshot({path:`artifacts/pocket-tuning-${name}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS: '+Object.keys(checks).join(', '));
} finally {await browser.close();}
