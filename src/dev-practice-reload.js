// Development-only: resume the practice preview after Vite reloads the page.
export function keepPracticePreview({hot,scene,physics,isPractice,startPractice,changed}) {
  const key=`noir:dev-practice-preview:${location.pathname}`;
  function remember(){
    try {
      if(!isPractice()){sessionStorage.removeItem(key);return;}
      sessionStorage.setItem(key,JSON.stringify({
        view:scene.view,angle:scene.angle,tip:scene.tip,
        camera:scene.camera.position.toArray(),up:scene.camera.up.toArray(),
        target:scene.controls.target.toArray(),zoom:scene.camera.zoom,
        // Keep an idle layout as-is. Never resume a half-completed shot.
        layout:!physics.moving?{
          balls:physics.balls,shots:physics.shots,layout:physics.layout,
          hand:physics.hand,scratch:physics.scratch,breakPending:physics.breakPending,
        }:null,
      }));
    } catch { /* Preview still works if session storage is unavailable. */ }
  }
  let saved;
  try {
    saved=JSON.parse(sessionStorage.getItem(key)||'null');
    sessionStorage.removeItem(key);
  } catch {saved=null;}
  if(saved&&['top','orbit','cue'].includes(saved.view)){
    startPractice();
    if(saved.layout&&Array.isArray(saved.layout.balls))Object.assign(physics,saved.layout);
    scene.angle=saved.angle;scene.tip=saved.tip;
    scene.syncBalls(0);scene.setView(saved.view);
    scene.camera.position.fromArray(saved.camera);scene.camera.up.fromArray(saved.up);
    scene.controls.target.fromArray(saved.target);scene.camera.zoom=saved.zoom;
    scene.camera.updateProjectionMatrix();scene.controls.update();
    document.querySelectorAll('[data-view]').forEach(button=>{
      button.classList.toggle('active',button.dataset.view===saved.view);
      button.setAttribute('aria-pressed',String(button.dataset.view===saved.view));
    });
    changed();
  }
  hot.on('vite:beforeFullReload',remember);
  window.addEventListener('beforeunload',remember);
  hot.dispose(()=>{
    hot.off('vite:beforeFullReload',remember);
    window.removeEventListener('beforeunload',remember);
  });
}
