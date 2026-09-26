// The phone game rotates as one surface when held upright. All picking and
// controls share this inverse mapping; CSS rotation alone would misplace taps.
export const rotatedGame=()=>typeof document!=='undefined'&&document.querySelector('#game')?.classList.contains('phone-portrait');
export function localPointer(element,event){
  const r=element.getBoundingClientRect();
  const u=rotatedGame()?(event.clientY-r.top)/r.height:(event.clientX-r.left)/r.width;
  const v=rotatedGame()?1-(event.clientX-r.left)/r.width:(event.clientY-r.top)/r.height;
  return {x:u*element.clientWidth,y:v*element.clientHeight,u,v};
}
export function screenProjection(element,u,v){
  const r=element.getBoundingClientRect();
  return rotatedGame()?{x:r.left+(1-v)*r.width,y:r.top+u*r.height}:{x:r.left+u*r.width,y:r.top+v*r.height};
}
