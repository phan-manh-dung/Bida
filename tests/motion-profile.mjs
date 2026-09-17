import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__noir?.scene);
 const result=await page.evaluate(async()=>{
  const {scene:s,physics:p}=window.__noir;s.setCloth('wine');p.reset('rack');s.setView('orbit');
  const gl=s.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
  const timings=[],cpu=[],physicsCPU=[];const render=s.renderer.render.bind(s.renderer);
  const update=p.update.bind(p);p.update=(...args)=>{const t=performance.now();update(...args);physicsCPU.push(performance.now()-t);};
  s.renderer.render=(...args)=>{const t=performance.now();render(...args);cpu.push(performance.now()-t);};
  p.shoot(Math.atan2(-.1,4.15),.75);
  await new Promise(resolve=>{let last=0;const begin=performance.now();function tick(t){if(last)timings.push(t-last);last=t;if(t-begin<4000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
  const sorted=[...timings].sort((a,b)=>a-b);const q=f=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*f))];
  return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',frames:timings.length,median:q(.5),p95:q(.95),max:q(1),gapsOver25ms:timings.filter(x=>x>25).length,renderCPU:cpu.reduce((a,b)=>a+b,0)/cpu.length,physicsCPU:physicsCPU.reduce((a,b)=>a+b,0)/physicsCPU.length,physicsMax:Math.max(...physicsCPU),draws:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles};
 });
 console.log(JSON.stringify(result));
 await page.screenshot({path:`artifacts/motion-${process.env.LABEL||'before'}.png`});
}finally{await browser.close();}
