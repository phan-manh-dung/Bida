import {searchCustom} from './custom-solver.js';
self.onmessage=({data})=>{
  try{
    const search=searchCustom(data);let step;
    do{step=search.next();if(!step.done)self.postMessage({type:'progress',...step.value});}while(!step.done);
    self.postMessage({type:'done',...step.value});
  }catch{self.postMessage({type:'error'});}
};
