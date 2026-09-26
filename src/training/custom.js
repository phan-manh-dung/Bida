import * as THREE from 'three';
import {CLOTH_Y,RADIUS} from '../table-model.js';
import {loadLayout,simulateLesson} from './engine.js';
import {validPosition} from './custom-solver.js';
import {coachView} from './view.js';
import {localPointer} from '../screen-coordinates.js';

export function mountCustom({panel,resultBox,physics,scene,overlay,enter,back,resetControls,prepareShot,isBusy,changed,getHand,setHand}){
  let active=false,phase='edit',selected=0,target=1,balls=[],snapshot=[],shots=[],previews=[],variant=0,worker=null,message='';
  const canvas=scene.renderer.domElement;
  const copy=list=>list.map(({id,x,z})=>({id,x,z}));
  const layout=()=>({id:'custom',title:'Thế bi của bạn',balls:copy(balls),target,pocket:0,goal:`Đưa bi ${target} vào lỗ, giữ bi cái trên bàn.`});
  function cancel(){worker?.terminate();worker=null;}
  function sync(){loadLayout(physics,layout());scene.syncBalls(0);scene.guideKey=null;scene.bridgeKey=null;scene.pocketLabels.visible=true;scene.showCue=phase==='ready';scene.inputLocked=phase!=='ready';scene.aimVisible=scene.ghostEnabled=phase==='ready'&&!shots.length;changed();}
  function show(){overlay.clear();scene.aimVisible=scene.ghostEnabled=phase==='ready'&&!shots.length;if(shots.length&&phase==='ready')overlay.show({...layout(),pocket:shots[variant].pocket},previews[variant],shots[variant],getHand());}
  function open(){cancel();active=true;phase='edit';balls=[{id:0,x:0,z:.4},{id:1,x:2.7,z:1.1}];snapshot=copy(balls);selected=0;target=1;shots=[];previews=[];message='';enter();panel.hidden=false;resetControls();sync();render();}
  function close(){cancel();active=false;overlay.clear();resultBox.hidden=true;resultBox.replaceChildren();}
  function edit(){if(isBusy())return;cancel();phase='edit';balls=copy(snapshot);shots=[];previews=[];message='';resetControls();show();sync();render();}
  function ready(){snapshot=copy(balls);phase='ready';message='Chạm bàn để ngắm, tự chỉnh đầu cơ và kéo lực để đánh.';sync();render();}
  function restore(){if(isBusy())return;balls=copy(snapshot);phase='ready';resetControls();sync();show();message='Đã xếp lại đúng thế bi ban đầu.';render();}
  function place(x,z){
    if(!validPosition(balls,selected,x,z)){message='Chọn chỗ trong mặt bàn, không đè lên bi khác hoặc miệng lỗ.';render();return;}
    Object.assign(balls.find(b=>b.id===selected),{x,z});snapshot=copy(balls);message='Đã đặt '+(selected===0?'bi cái':`bi ${selected}`)+'.';sync();render();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!active||phase!=='edit'||e.button!==0||!e.isPrimary)return;
    e.preventDefault();e.stopImmediatePropagation();
    const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
    const p=localPointer(canvas,e);ray.setFromCamera(new THREE.Vector2(p.u*2-1,1-p.v*2),scene.camera);
    const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-CLOTH_Y-RADIUS),new THREE.Vector3());
    if(hit)place(hit.x,hit.z);
  },true);
  function analyse(){
    if(isBusy()||phase!=='ready')return;
    cancel();phase='analysing';shots=[];previews=[];show();scene.inputLocked=true;scene.showCue=false;message='HLV đang thử các hướng, lực và đầu cơ…';render();changed();
    try{worker=new Worker(new URL('./custom-worker.js',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{
        if(!active||phase!=='analysing')return;
        if(data.type==='progress'){panel.querySelector('[data-custom-status]').textContent=`Đã thử ${data.tested} cú đánh…`;return;}
        cancel();phase='ready';scene.inputLocked=false;scene.showCue=true;
        if(data.type==='done'){
          shots=data.shots;variant=0;previews=shots.map(shot=>simulateLesson(layout(),shot,true));
          message=shots.length?`Tìm thấy ${shots.length} phương án đã vào bi ${target} an toàn trong mô phỏng. Bạn vẫn tự đánh.`:'Chưa tìm được cú vào bi an toàn trong phạm vi tìm kiếm. Bạn vẫn có thể tự đánh hoặc sửa thế bi; điều này không có nghĩa thế bi vô nghiệm.';
        }else message='Chưa phân tích được. Bạn có thể thử lại hoặc tự đánh.';
        show();render();changed();
      };
      worker.onerror=()=>{cancel();phase='ready';scene.inputLocked=false;scene.showCue=true;message='HLV gặp lỗi. Thế bi vẫn được giữ để bạn tự đánh hoặc thử lại.';show();render();changed();};
      worker.postMessage(layout());
    }catch{cancel();phase='ready';scene.inputLocked=false;scene.showCue=true;message='Trình duyệt chưa mở được HLV. Bạn vẫn có thể tự đánh.';show();render();changed();}
  }
  function render(){
    resultBox.hidden=true;resultBox.replaceChildren();
    const editing=phase==='edit',locked=phase==='shooting',analysing=phase==='analysing';
    panel.innerHTML=`<button data-back ${locked?'disabled':''}>← Tập luyện</button><h2>Tự đặt thế bi</h2>
      <fieldset class="coach-stance"><legend>Bạn cầm cơ bằng tay nào?</legend>${['left','right'].map(h=>`<button data-hand="${h}" aria-pressed="${getHand()===h}" ${locked||analysing?'disabled':''}>Tay ${h==='left'?'trái':'phải'}</button>`).join('')}</fieldset>
      ${editing?`<p>Chọn bi rồi chạm lên bàn để đặt. Có thể đặt bi cái và tối đa 15 bi màu.</p>
      <label>Bi đang đặt <select id="custom-ball">${balls.map(b=>`<option value="${b.id}" ${b.id===selected?'selected':''}>${b.id===0?'Bi cái':`Bi ${b.id}`}</option>`).join('')}</select></label>
      <div class="training-actions"><button data-add ${balls.length===16?'disabled':''}>+ Thêm bi</button><button data-remove ${!selected||balls.length<=2?'disabled':''}>Xóa bi chọn</button></div>
      <label>Bi mục tiêu <select id="custom-target">${balls.filter(b=>b.id).map(b=>`<option value="${b.id}" ${target===b.id?'selected':''}>Bi ${b.id}</option>`).join('')}</select></label><p class="training-note">HLV tìm cách vào bi được chọn; các bi còn lại vẫn cản đường và va chạm bình thường.</p>
      <button data-ready ${!getHand()?'disabled':''}>Bắt đầu đánh →</button>${!getHand()?'<p>Chọn tay cầm cơ ở trên để bắt đầu.</p>':''}`:
      `<div class="training-actions"><button data-edit ${locked?'disabled':''}>Sửa thế bi</button><button data-analyse ${locked||analysing||phase==='review'?'disabled':''}>Nhờ HLV phân tích</button>${analysing?'<button data-cancel>Dừng phân tích</button>':''}</div>`}
      <p data-custom-status role="status">${message}</p><div data-custom-coach></div>`;
    panel.querySelector('[data-back]').onclick=()=>{if(!isBusy()){close();back();}};
    panel.querySelectorAll('[data-hand]').forEach(b=>b.onclick=()=>{setHand(b.dataset.hand);show();render();});
    panel.querySelector('#custom-ball')?.addEventListener('change',e=>{selected=Number(e.target.value);render();});
    panel.querySelector('#custom-target')?.addEventListener('change',e=>{target=Number(e.target.value);});
    panel.querySelector('[data-add]')?.addEventListener('click',()=>{
      const id=Array.from({length:15},(_,i)=>i+1).find(id=>!balls.some(b=>b.id===id));if(!id)return;
      let point;for(let x=-3.5;x<=3.5&&!point;x+=.4)for(let z=-1.6;z<=1.6;z+=.4)if(validPosition(balls,id,x,z)){point={id,x,z};break;}
      if(point){balls.push(point);selected=id;snapshot=copy(balls);sync();render();}
    });
    panel.querySelector('[data-remove]')?.addEventListener('click',()=>{if(!selected||balls.length<=2)return;balls=balls.filter(b=>b.id!==selected);if(target===selected)target=balls.find(b=>b.id).id;selected=0;snapshot=copy(balls);sync();render();});
    panel.querySelector('[data-ready]')?.addEventListener('click',ready);
    panel.querySelector('[data-edit]')?.addEventListener('click',edit);
    panel.querySelector('[data-analyse]')?.addEventListener('click',analyse);
    panel.querySelector('[data-cancel]')?.addEventListener('click',()=>{cancel();phase='ready';scene.inputLocked=false;scene.showCue=true;message='Đã dừng phân tích.';show();render();changed();});
    if(shots.length&&phase==='ready'){
      const box=panel.querySelector('[data-custom-coach]');
      box.innerHTML=coachView({lesson:layout(),index:-1,last:true,options:shots,variant,previews,phase:'ready',assisted:true,saved:false,message:'',hand:getHand()});
      box.querySelectorAll('.training-heading,.coach-title,.coach-goal,fieldset,[data-independent],[data-next],#training-feedback').forEach(el=>el.remove());
      box.querySelector('#training-variant').onchange=e=>{variant=Number(e.target.value);show();render();};
      box.querySelector('[data-stance]')?.remove();
      box.querySelector('[data-execute]').onclick=()=>{prepareShot(shots[variant]);message='Đã chỉnh hướng và đầu cơ. Bạn tự kéo lực mẫu để đánh.';render();};
    }
    if(phase==='review'){
      const canContinue=!physics.cueBall.pocketed&&physics.balls.some(b=>b.id&&!b.pocketed);
      resultBox.innerHTML=`<div class="training-result-card"><h2>Cú đánh đã kết thúc</h2><p></p><div class="training-actions"><button data-retry>Thử lại</button>${canContinue?'<button data-continue>Đánh tiếp</button>':''}<button data-edit-result>Sửa thế bi</button><button data-exit>Thoát</button></div></div>`;
      resultBox.querySelector('p').textContent=message;resultBox.hidden=false;
      resultBox.querySelector('[data-retry]').onclick=restore;resultBox.querySelector('[data-edit-result]').onclick=edit;
      resultBox.querySelector('[data-continue]')?.addEventListener('click',()=>{
        balls=copy(physics.balls.filter(b=>!b.pocketed));snapshot=copy(balls);if(!balls.some(b=>b.id===target))target=balls.find(b=>b.id).id;
        shots=[];previews=[];phase='ready';message=`Tiếp tục với bi mục tiêu ${target}. Có thể nhờ HLV phân tích thế bi mới.`;resetControls();sync();render();
      });
      resultBox.querySelector('[data-exit]').onclick=()=>{close();back();};
    }
  }
  return {open,close,get active(){return active;},get canShoot(){return active&&phase==='ready';},event(e){
    if(e.type==='shot'){phase='shooting';overlay.clear();message='Đang quan sát cú đánh…';render();}
    if(e.type==='settled'){phase='review';message=physics.cueBall.pocketed?'Bi cái rơi lỗ. Thử lại để chỉnh hướng hoặc lực.':physics.balls.find(b=>b.id===target).pocketed?`Bi ${target} đã vào lỗ. Bạn có thể thử lại cùng thế bi.`:`Bi ${target} chưa vào lỗ. Thử lại hoặc sửa thế bi.`;render();}
  }};
}
