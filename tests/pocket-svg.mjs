import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const source=await readFile('src/pocket-designs/side.svg','utf8');
const cornerSupplied=await readFile('src/pocket-designs/source/corner-final.svg','utf8');
const base=process.env.BASE_URL||'http://127.0.0.1:5173/';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(new URL('pocket-design.html',base).href,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.status:not(.error)').count(),2);
 const panels=await page.locator('.pair').evaluateAll(pairs=>pairs.map(p=>{
  const a=p.querySelector('img').getBoundingClientRect(),b=p.querySelector('canvas').getBoundingClientRect();
  return Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1;
 }));
 assert.deepEqual(panels,[true,true]);
 await page.screenshot({path:'artifacts/pocket-svg-preview.png',fullPage:true});
 const checks=await page.evaluate(async source=>{
  const {parsePocketSvg}=await import('/src/pocket-svg.js');
  const original=parsePocketSvg(source);
  const shifted=parsePocketSvg(source.replace('id="mouth"','id="mouth" transform="translate(10 0)"'));
  const a=original.contour('mouth'),b=shifted.contour('mouth');
  const exact=a.every((p,i)=>Math.abs(b[i][0]-p[0]-.02)<1e-7&&Math.abs(b[i][1]-p[1])<1e-7);
  let rejected=0;
  for(const invalid of [source.replace('id="mouth"','id="lost"'),source.replace('0 0 1000 1000','0 0 500 500'),source.replace('id="jaw-left"','id="jaw-left" transform="scale(-1 1)"')]){
   try{parsePocketSvg(invalid);}catch{rejected++;}
  }
  return {exact,rejected};
 },source);
 assert.deepEqual(checks,{exact:true,rejected:3});
 await page.locator('input[type=file]').first().setInputFiles({name:'changed.svg',mimeType:'image/svg+xml',buffer:Buffer.from(source.replace('id="mouth"','id="mouth" transform="translate(10 0)"'))});
 assert.equal(await page.locator('.status.error').count(),0);
 await page.locator('input[type=file]').first().setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from(source.replace('id="trim"','id="missing"'))});
 await page.waitForFunction(()=>document.querySelector('.status.error'));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__noir);
 await page.evaluate(()=>window.__noir.startPractice());
 const straightRails=await page.evaluate(async()=>{
  const {CUSHIONS}=await import('/src/table-model.js');
  const {cushionGeometry}=await import('/src/table-visual.js');
  return CUSHIONS.every(c=>{
   const {body,facings}=cushionGeometry(c),p=body.attributes.position;
   const axis=Math.abs(c.nose[0][1]-c.nose[1][1])<1e-6?2:0;
   let straight=true;
   for(let i=0;i<p.count;i+=2){
    if(Math.abs(p.getComponent(i,axis)-p.getComponent(i+1,axis))>1e-6||Math.abs(p.getY(i)-p.getY(i+1))>1e-6)straight=false;
   }
   body.dispose();facings.dispose();return straight;
  });
 });
 assert.ok(straightRails,'Every rail cross-section must remain straight between its pocket ends.');
 const cornerEntries=await page.evaluate(async()=>{
  const {CUSHIONS,POCKET_DETAILS,pocketCoordinates,pocketPoint}=await import('/src/table-model.js');
  const {cushionGeometry,getTablePocketDesign}=await import('/src/table-visual.js');
  return CUSHIONS.every(c=>{
   const {body,facings}=cushionGeometry(c),positions=body.attributes.position;
   const ok=c.nose.every(nose=>{
    if(Math.abs(nose[0])<1)return true;
    const p=POCKET_DETAILS.find(p=>!p.side&&Math.sign(p.x)===Math.sign(nose[0])&&Math.sign(p.z)===Math.sign(nose[1]));
    const right=pocketCoordinates(p,...nose).lateral>0;
    const [x,z]=pocketPoint(p,...getTablePocketDesign(p).jaw(right,0));
    let distance=Infinity;
    for(let i=0;i<positions.count;i++)distance=Math.min(distance,Math.hypot(positions.getX(i)-x,positions.getZ(i)-z));
    return distance<1e-5;
   });
   body.dispose();facings.dispose();return ok;
  });
 });
 assert.ok(cornerEntries,'All eight corner jaw entries must be present, not cropped away to fit the rail.');
 const trimErrors=await page.evaluate(async()=>{
  const {POCKET_DETAILS,pocketPoint}=await import('/src/table-model.js');
  const {getTablePocketDesign:getPocketDesign}=await import('/src/table-visual.js');
  return POCKET_DETAILS.map((p,i)=>{
   const positions=window.__noir.scene.scene.getObjectByName(`svg-pocket-trim-${i}`).geometry.attributes.position;
   const expected=getPocketDesign(p).contour('trim').map(([l,d])=>pocketPoint(p,l,d));
   let error=0;
   for(let j=0;j<positions.count;j++)error=Math.max(error,Math.min(...expected.map(([x,z])=>Math.hypot(positions.getX(j)-x,positions.getZ(j)-z))));
   return error;
  });
 });
 assert.ok(trimErrors.every(error=>error<1e-5),'All six trim meshes must follow their registered SVG contours.');
 async function vertices(){return page.evaluate(()=>{
  const meshes=window.__noir.scene.scene.children.filter(m=>m.userData.pocketSvg);
  return meshes.map(m=>({name:m.name,type:m.userData.pocketSvg.type,vertices:Array.from(m.geometry.attributes.position.array)}));
 });}
 const before=await vertices();assert.equal(before.length,6);
 // Change an SVG path at the import boundary and verify the LIVE GAME meshes
 // change only for the two side pockets, without changing a JS shape formula.
 const changed=source.replace('id="trim"','id="trim" transform="translate(10 0)"');
 await page.route(url=>url.pathname.endsWith('/src/pocket-designs/side.svg')&&url.searchParams.has('raw'),route=>route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(changed)};`}));
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__noir);
 await page.evaluate(()=>window.__noir.startPractice());
 const after=await vertices();
 for(let i=0;i<before.length;i++){
  if(before[i].type==='corner')assert.deepEqual(after[i],before[i]);
  else {
   assert.equal(after[i].vertices.length,before[i].vertices.length);
   const xs=vertices=>vertices.filter((_,i)=>i%3===0);
   const shift=Math.min(...xs(after[i].vertices))-Math.min(...xs(before[i].vertices));
   assert.ok(Math.abs(Math.abs(shift)-.02)<1e-6,`SVG shift was ${shift}`);
   // Earcut may choose a different triangle ordering after translation; compare
   // the geometric vertex set rather than incidental triangle indices.
   const key=(x,y,z)=>[x,y,z].map(v=>v.toFixed(5)).join(':');
   const expected=new Set();
   for(let j=0;j<before[i].vertices.length;j+=3)expected.add(key(before[i].vertices[j]+shift,before[i].vertices[j+1],before[i].vertices[j+2]));
   for(let j=0;j<after[i].vertices.length;j+=3)assert.ok(expected.has(key(...after[i].vertices.slice(j,j+3))));

  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: SVG transforms preserve coordinates; invalid files rejected; preview imports work; live table changes exactly with SVG, mirrored across both side pockets; four corners unchanged.');
}finally{await browser.close();}
