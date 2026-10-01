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

export function renderSavedLayouts(root,store,{back,create,open,home}){
  root.classList.add('saved-library');root.scrollTop=0;
  root.innerHTML=`<header class="saved-header"><button class="saved-brand" aria-label="NOIR — về trang chủ">NOIR<small>BILLIARDS CLUB</small></button><span>THƯ VIỆN CÁ NHÂN</span></header><div class="saved-content"><button data-back-saved>← Tập luyện</button><h1>Thế bi <span>của tôi</span></h1><p class="saved-intro">Lưu các thế bi yêu thích trên trình duyệt này. Xuất file để sao lưu hoặc chuyển sang thiết bị khác,<br>hoặc nhập file thế bi để tiếp tục luyện tập.</p><nav class="saved-toolbar"><button data-new-layout>＋ Đặt thế bi mới</button><button data-export-layouts>↥ Xuất file</button><label>Nhập file <input data-import-layouts type="file" accept=".json,application/json"></label></nav><p data-saved-status role="status"></p><div class="saved-overview"><section class="saved-empty"><span class="saved-empty-icon" aria-hidden="true">◇</span><h2>Chưa có thế bi nào.</h2><p>Hãy tạo một thế bi mới rồi lưu lại để bắt đầu<br>thư viện luyện tập của bạn.</p><button data-first-layout>＋ Đặt thế bi đầu tiên →</button></section><aside class="saved-benefits"><h2>✦ Lưu lại để luyện tốt hơn</h2><div><strong>Lưu trên trình duyệt</strong><p>Thế bi được giữ trên trình duyệt này. Chưa tự đồng bộ tài khoản.</p></div><div><strong>Xuất file sao lưu</strong><p>Giữ một bản dự phòng để tránh mất dữ liệu khi xóa bộ nhớ trình duyệt.</p></div><div><strong>Nhập trên thiết bị khác</strong><p>Chọn file đã xuất để tiếp tục tập trên điện thoại hoặc máy tính.</p></div></aside></div><div class="saved-list-heading"><h2>▤ Thư viện thế bi <small data-saved-count></small></h2><div><input type="search" data-saved-search aria-label="Tìm tên thế bi" placeholder="Tìm tên thế bi…"><select data-saved-sort aria-label="Sắp xếp thế bi"><option value="new">Mới nhất</option><option value="old">Cũ nhất</option><option value="name">Tên A–Z</option></select></div></div><div class="lesson-grid" data-saved-list></div></div>`;
  const status=root.querySelector('[data-saved-status]'),grid=root.querySelector('[data-saved-list]');
  root.querySelector('[data-back-saved]').onclick=back;root.querySelector('[data-new-layout]').onclick=create;
  root.querySelector('.saved-brand').onclick=home||back;root.querySelector('[data-first-layout]').onclick=create;
  root.querySelector('[data-saved-search]').oninput=cards;root.querySelector('[data-saved-sort]').onchange=cards;
  function cards(){grid.replaceChildren();try{const all=store.list(),query=root.querySelector('[data-saved-search]').value.trim().toLocaleLowerCase('vi'),sort=root.querySelector('[data-saved-sort]').value;const items=all.filter(item=>item.name.toLocaleLowerCase('vi').includes(query)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'vi'):sort==='old'?a.updatedAt.localeCompare(b.updatedAt):b.updatedAt.localeCompare(a.updatedAt));root.querySelector('.saved-empty').hidden=all.length>0;root.querySelector('.saved-overview').classList.toggle('has-layouts',all.length>0);root.querySelector('[data-saved-count]').textContent=`${all.length} thế bi`;if(!items.length)grid.textContent=all.length?'Không tìm thấy thế bi phù hợp.':'Các thế bi bạn lưu sẽ xuất hiện tại đây.';
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
