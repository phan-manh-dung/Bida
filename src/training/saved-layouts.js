import {HALF_X,HALF_Z,RADIUS} from '../table-model.js';
const KEY='noir:saved-layouts:v1';
export function validateLayout(value){
  if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||typeof value.notes!=='string'||value.notes.length>500)throw new Error('Tên hoặc ghi chú không hợp lệ.');
  if(!Array.isArray(value.balls)||value.balls.length<2||value.balls.length>16)throw new Error('Cần bi cái và ít nhất một bi mục tiêu.');
  const balls=value.balls.map(b=>({id:b?.id,x:b?.x,z:b?.z}));
  if(balls.some(b=>!Number.isInteger(b.id)||b.id<0||b.id>15||!Number.isFinite(b.x)||!Number.isFinite(b.z)||Math.abs(b.x)>HALF_X-RADIUS+.001||Math.abs(b.z)>HALF_Z-RADIUS+.001)||new Set(balls.map(b=>b.id)).size!==balls.length||!balls.some(b=>b.id===0)||!Number.isInteger(value.target)||value.target===0||!balls.some(b=>b.id===value.target))throw new Error('Vị trí hoặc số bi không hợp lệ.');
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)if(Math.hypot(balls[i].x-balls[j].x,balls[i].z-balls[j].z)<2*RADIUS-.001)throw new Error('Các bi đang chồng lên nhau.');
  return {name:value.name.trim(),notes:value.notes,balls,target:value.target};
}
export function createLayoutStore(storage){
  function list(){
    let raw;try{raw=storage?.getItem(KEY);}catch{throw new Error('Trình duyệt không cho đọc danh sách thế bi.');}
    if(!storage)throw new Error('Trình duyệt không hỗ trợ lưu thế bi.');
    if(!raw)return [];
    try{const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.items)||data.items.length>200)throw 0;
      const ids=new Set();return data.items.map(item=>{if(typeof item.id!=='string'||!item.id||ids.has(item.id))throw 0;ids.add(item.id);return {...validateLayout(item),id:item.id,updatedAt:typeof item.updatedAt==='string'?item.updatedAt:''};});
    }catch{throw new Error('Danh sách đã lưu bị lỗi. Dữ liệu cũ được giữ nguyên, chưa ghi đè.');}
  }
  function write(items){if(items.length>200)throw new Error('Danh sách tối đa 200 thế bi. Hãy xuất file rồi xóa bớt.');try{storage.setItem(KEY,JSON.stringify({version:1,items}));}catch{throw new Error('Không lưu được: bộ nhớ trình duyệt bị chặn hoặc đã đầy. Hãy xuất file để giữ thế bi.');}}
  function save(value,id=null){const item={...validateLayout(value),id:id||globalThis.crypto.randomUUID(),updatedAt:new Date().toISOString()},items=list(),index=items.findIndex(x=>x.id===item.id);if(index<0)items.unshift(item);else items[index]=item;write(items);return item;}
  function remove(id){const items=list(),item=items.find(x=>x.id===id);write(items.filter(x=>x.id!==id));return item;}
  function restore(item){const items=list();if(!items.some(x=>x.id===item.id)){items.unshift(item);write(items);}}
  function importFile(text){
    let data;try{data=JSON.parse(text);}catch{throw new Error('File không phải JSON hợp lệ.');}
    if(data?.format!=='noir-layouts'||data.version!==1||!Array.isArray(data.items)||data.items.length>200)throw new Error('File không đúng định dạng thế bi NOIR.');
    const incoming=data.items.map(x=>({...validateLayout(x),id:globalThis.crypto.randomUUID(),updatedAt:new Date().toISOString()}));
    const items=list();write([...incoming,...items]);return incoming.length;
  }
  return {list,save,remove,restore,importFile,exportFile:()=>JSON.stringify({format:'noir-layouts',version:1,items:list()},null,2)};
}

export function downloadLayouts(text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='the-bi-noir.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function renderSavedLayouts(root,store,{back,create,open}){
  root.innerHTML='<button data-back-saved>← Tập luyện</button><h1>Thế bi của tôi</h1><p>Lưu trên trình duyệt này. Xuất file để sao lưu hoặc chuyển sang điện thoại/máy tính khác; chưa tự đồng bộ tài khoản.</p><nav><button data-new-layout>+ Đặt thế bi mới</button><button data-export-layouts>Xuất file</button><label>Nhập file <input data-import-layouts type="file" accept=".json,application/json"></label></nav><p data-saved-status role="status"></p><div class="lesson-grid" data-saved-list></div>';
  const status=root.querySelector('[data-saved-status]'),grid=root.querySelector('[data-saved-list]');
  root.querySelector('[data-back-saved]').onclick=back;root.querySelector('[data-new-layout]').onclick=create;
  function cards(){grid.replaceChildren();try{const items=store.list();if(!items.length)grid.textContent='Chưa có thế bi. Đặt một thế bi rồi bấm Lưu thế bi.';
    for(const item of items){const card=document.createElement('article');card.className='saved-layout-card';
      const title=document.createElement('h2');title.textContent=item.name;
      const note=document.createElement('p');note.textContent=item.notes;
      const info=document.createElement('p');info.textContent=`${item.balls.length-1} bi màu · mục tiêu bi ${item.target}`;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 240 120');svg.setAttribute('aria-label','Sơ đồ thế bi');svg.style.cssText='width:100%;background:#164451;border-radius:10px';
      for(const [x,y] of [[5,5],[120,5],[235,5],[5,115],[120,115],[235,115]]){const hole=document.createElementNS(svg.namespaceURI,'circle');hole.setAttribute('cx',x);hole.setAttribute('cy',y);hole.setAttribute('r','4');hole.setAttribute('fill','#09171d');svg.append(hole);}
      for(const b of item.balls){const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('cx',String(10+(b.x+HALF_X)/(HALF_X*2)*220));dot.setAttribute('cy',String(8+(b.z+HALF_Z)/(HALF_Z*2)*104));dot.setAttribute('r','4');dot.setAttribute('fill',b.id===0?'white':b.id===item.target?'#ffcc55':'#719bbb');svg.append(dot);if(b.id){const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('x',dot.getAttribute('cx'));label.setAttribute('y',dot.getAttribute('cy'));label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');label.setAttribute('font-size','4.5');label.setAttribute('fill','#10252d');label.textContent=String(b.id);svg.append(label);}}
      const play=document.createElement('button');play.dataset.openLayout=item.id;play.textContent='Mở để tập / chỉnh sửa';play.onclick=()=>open(item);
      const del=document.createElement('button');del.textContent='Xóa';del.dataset.deleteLayout=item.id;del.onclick=()=>{try{const removed=store.remove(item.id);cards();status.textContent='Đã xóa. ';const undo=document.createElement('button');undo.textContent='Hoàn tác';undo.onclick=()=>{try{store.restore(removed);cards();status.textContent='Đã khôi phục.';}catch(e){status.textContent=e.message;}};status.append(undo);}catch(e){status.textContent=e.message;}};
      card.append(svg,title,note,info,play,del);grid.append(card);
    }
  }catch(e){status.textContent=e.message;}}
  cards();
  root.querySelector('[data-export-layouts]').onclick=()=>{try{downloadLayouts(store.exportFile());status.textContent='Đã tạo file xuất. Giữ file này để nhập trên thiết bị khác.';}catch(e){status.textContent=e.message;}};
  root.querySelector('[data-import-layouts]').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('File quá lớn (tối đa 1 MB).');const n=store.importFile(await file.text());cards();status.textContent=`Đã nhập ${n} thế bi thành các bản mới; danh sách cũ được giữ nguyên.`;}catch(error){status.textContent=error.message;}finally{e.target.value='';}};
}
