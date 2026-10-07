import * as THREE from 'three';
import {parsePocketSvg} from './pocket-svg.js';
import sideSource from './pocket-designs/side.svg?raw';
import cornerSource from './pocket-designs/corner.svg?raw';

// This separate preview page must not force a full reload of the game client.
if(import.meta.hot){
  import.meta.hot.accept(['./pocket-svg.js','./pocket-designs/side.svg?raw','./pocket-designs/corner.svg?raw'],()=>location.reload());
}

for(const [type,title,source]of [['side','Lỗ giữa',sideSource],['corner','Lỗ góc',cornerSource]]){
  const section=document.createElement('section');
  section.innerHTML=`<h2>${title}</h2><p><a download="${type}.svg">Tải file mẫu ${type}.svg</a></p><label>Chọn SVG đã sửa <input type="file" accept=".svg,image/svg+xml"></label> <button type="button">Về mẫu trong source</button><p class="status" role="status"></p><div class="pair"><div><p>Bản vẽ SVG</p><img alt="Mẫu ${title}" /></div><div><p>Đường viền Three.js đọc từ SVG</p><div class="render"></div></div></div><small>Đây là kiểm tra đường viền. Ánh sáng, độ dày và màu vật liệu của bàn vẫn do Three.js dựng.</small>`;
  document.querySelector('#designs').append(section);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(600,600,false);renderer.setPixelRatio(1);renderer.setClearColor('#edf0f2',1);
  section.querySelector('.render').append(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-1,1,1.3,-.7,.1,10);camera.position.z=5;
  let scene,url;
  function show(text){
    try{
      const design=parsePocketSvg(text,`${type}.svg`),next=new THREE.Scene();
      for(const [id,color,z]of [['trim','#b7bdc2',0],['mouth','#15191c',.01]]){
        const shape=new THREE.Shape(design.contour(id).map(([x,y])=>new THREE.Vector2(x,y)));
        const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));mesh.position.z=z;next.add(mesh);
      }
      for(const id of ['jaw-left','jaw-right']){
        const geometry=new THREE.BufferGeometry().setFromPoints(design.contour(id).map(([x,y])=>new THREE.Vector3(x,y,.02)));
        next.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#00a5bc'})));
      }
      scene?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});scene=next;
      if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
      section.querySelector('img').src=url;section.querySelector('a').href=url;
      renderer.render(scene,camera);
      section.querySelector('.status').className='status';section.querySelector('.status').textContent='Đã đọc đủ 4 đường vector. Không tự đổi tỉ lệ hoặc làm tròn đường bạn vẽ.';
    }catch(error){section.querySelector('.status').className='status error';section.querySelector('.status').textContent=error.message;}
  }
  section.querySelector('input').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>1024*1024){section.querySelector('.status').textContent='SVG tối đa 1 MB.';return;}show(await file.text());};
  section.querySelector('button').onclick=()=>show(source);
  show(source);
}
