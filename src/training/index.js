import './training.css';
import {coachView} from './view.js';
import {LESSONS,SOURCES,getLesson} from './catalog.js';
import rawSolutions from './solutions.json';
import {orderOptions} from './options.js';
const solutions=Object.fromEntries(Object.entries(rawSolutions).map(([id,shots])=>[id,orderOptions(shots)]));
import {loadLayout,simulateLesson,evaluateLesson,resolveLesson} from './engine.js';
import {readProgress,recordAttempt,saveProgress} from './progress.js';
import {createTrainingOverlay} from './overlay.js';
import {mountCustom} from './custom.js';

// The host owns navigation, the live physics instance and cue controls.
// This module owns lessons, progress, feedback and its removable visual overlay.
export function mountTraining({physics,scene,enter,home,practice,resetControls,prepareShot,isBusy,changed}){
  let storage;try{storage=window.localStorage;}catch{}
  let hand=null,wide=false,pendingLesson=null;
  try{const saved=storage?.getItem('noir:training:hand');if(['left','right'].includes(saved))hand=saved;}catch{}
  function chooseHand(value){hand=value;try{storage?.setItem('noir:training:hand',hand);}catch{}}
  let progress=readProgress(storage),lesson=null,variant=0,events=[],phase='idle',assisted=false,preview=null;
  const overlay=createTrainingOverlay(scene.scene);
  const library=document.createElement('section');library.id='training-library';library.hidden=true;
  const panel=document.createElement('aside');panel.id='training-panel';panel.hidden=true;
  const resultBox=document.createElement('section');resultBox.id='training-result';resultBox.hidden=true;
  resultBox.setAttribute('aria-label','Kết quả bài tập');
  document.querySelector('#app').append(library);document.querySelector('#game').append(panel,resultBox);
  let filter='all';
  const cache=new Map();
  const custom=mountCustom({panel,resultBox,physics,scene,overlay,enter,back:open,resetControls,prepareShot,isBusy,changed,getHand:()=>hand,setHand:chooseHand});
  function renderHub(){
    library.innerHTML='<button data-home>← Trang chủ</button><p class="eyebrow">TẬP LUYỆN</p><h1>Chọn cách luyện tập</h1><div class="lesson-grid"><button class="lesson-card" id="training-start"><strong>Học từng thế bi</strong><span>Bài mẫu, hướng dẫn và theo dõi tiến bộ.</span></button><button class="lesson-card" id="custom-training-start"><strong>Tự đặt thế bi & HLV</strong><span>Đặt bi tùy ý, tự đánh hoặc nhờ HLV phân tích.</span></button><button class="lesson-card" id="free-practice-start"><strong>Bàn tập tự do</strong><span>Xếp đủ 15 bi và tập đánh.</span></button></div>';
    library.querySelector('[data-home]').onclick=home;
    library.querySelector('#training-start').onclick=renderLibrary;
    library.querySelector('#custom-training-start').onclick=()=>{lesson=null;library.hidden=true;custom.open();};
    library.querySelector('#free-practice-start').onclick=()=>{close();practice();};
  }
  function previews(){return solutions[lesson.id].map((shot,i)=>{const key=lesson.id+':'+i;if(!cache.has(key))cache.set(key,simulateLesson(lesson,shot,true));return cache.get(key);});}
  function renderLibrary(){
    const done=LESSONS.filter(l=>progress[l.id]?.completed).length;
    library.innerHTML=`<nav><button data-home>← Trang chủ</button><button data-practice>Bàn tập tự do →</button></nav><p class="eyebrow">HỌC CÙNG HLV</p><h1>Từng thế bi. Từng bước tiến.</h1><p>${done}/${LESSONS.length} bài đã đạt · Chọn bất kỳ bài nào để luyện lại.</p>${done===LESSONS.length?'<p class="training-success">Bạn đã hoàn thành thư viện hiện tại! Hãy thử tự đánh không gợi ý hoặc ra bàn tự do.</p>':''}<label>Lọc bài <select id="training-filter"><option value="all">Tất cả</option><option value="review">Cần luyện thêm</option><option value="saved">Đã đánh dấu</option>${[...new Set(LESSONS.map(l=>l.group))].map(g=>`<option>${g}</option>`).join('')}</select></label><div class="lesson-grid"></div><details><summary>Tài liệu tham khảo</summary><p>Các thế bi được thiết kế riêng cho bàn NOIR, dựa trên nhóm kỹ năng trong tài liệu. Thư viện sẽ tiếp tục mở rộng.</p>${SOURCES.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a></p>`).join('')}</details>`;
    library.querySelector('[data-home]').onclick=home;
    library.querySelector('[data-home]').textContent='← Tập luyện';library.querySelector('[data-home]').onclick=open;
    if(!hand){
      const setup=document.createElement('fieldset');setup.className='coach-stance training-hand-setup';
      setup.innerHTML='<legend>Bạn cầm cơ bằng tay nào?</legend><p>Chọn để HLV chỉ vị trí đứng. Tay còn lại dùng đặt cầu.</p><button data-hand="left">Tay trái cầm cơ</button><button data-hand="right">Tay phải cầm cơ</button>';
      library.querySelector('h1').after(setup);
      setup.querySelectorAll('[data-hand]').forEach(button=>button.onclick=()=>{chooseHand(button.dataset.hand);const id=pendingLesson;pendingLesson=null;if(id)start(id);else renderLibrary();});
    }
    library.querySelector('[data-practice]').onclick=()=>{close();practice();};
    const select=library.querySelector('select');select.value=filter;select.onchange=()=>{filter=select.value;renderLibrary();};
    const list=LESSONS.filter(l=>filter==='all'||filter==='review'&&!progress[l.id]?.independent||filter==='saved'&&progress[l.id]?.saved||filter===l.group);
    const grid=library.querySelector('.lesson-grid');
    if(!list.length)grid.textContent='Chưa có bài trong nhóm này.';
    for(const l of list){const p=progress[l.id]||{},button=document.createElement('button');button.className='lesson-card';button.dataset.lesson=l.id;
      button.innerHTML=`<small>${l.group}</small><strong>${l.title}</strong><span>${p.independent?'✓ Đã tự hoàn thành':p.completed?'✓ Đã đạt có trợ giúp':p.attempts?'Đang luyện':'Chưa học'}${p.saved?' · ★':''}</span><span>${solutions[l.id].length} phương án đầu cơ · ${Number(p.attempts)||0} lượt thử</span>`;
      button.onclick=()=>start(l.id);grid.append(button);
    }
  }
  function open(){custom.close();resetControls();lesson=null;phase='idle';panel.hidden=true;resultBox.hidden=true;resultBox.replaceChildren();overlay.clear();library.hidden=false;renderHub();}
  function close(){custom.close();lesson=null;phase='idle';library.hidden=true;panel.hidden=true;resultBox.hidden=true;resultBox.replaceChildren();overlay.clear();}
  function start(id){
    if(isBusy())return;
    const next=getLesson(id);if(!next)return;
    if(!hand){pendingLesson=id;library.querySelector('[data-hand]')?.focus();library.querySelector('.training-hand-setup')?.scrollIntoView({block:'center'});return;}
    enter();lesson=next;variant=0;library.hidden=true;panel.hidden=false;retry();
  }
  function retry(independent=false){
    if(!lesson||isBusy())return;
    resetControls();loadLayout(physics,lesson);scene.syncBalls(0);scene.guideKey=null;scene.bridgeKey=null;
    // Do not pre-align with the answer: independent completion must mean self-aimed.
    scene.angle=0;scene.inputLocked=false;phase='ready';events=[];assisted=!independent;preview=null;
    scene.aimVisible=false;scene.ghostEnabled=false;scene.pocketLabels.visible=true;if(assisted){preview=previews()[variant];overlay.show(resolveLesson(lesson,solutions[lesson.id][variant]),preview,solutions[lesson.id][variant],hand,wide);}else overlay.show(resolveLesson(lesson,solutions[lesson.id][variant]));renderPanel();changed();
  }
  function hint(){
    if(phase!=='ready'||isBusy())return;
    const shot=solutions[lesson.id][variant];preview=previews()[variant];
    assisted=true;overlay.show(resolveLesson(lesson,shot),preview,shot,hand,wide);renderPanel();panel.scrollTop=0;
  }
  function renderPanel(message=''){
    resultBox.hidden=true;resultBox.replaceChildren();
    const options=solutions[lesson.id],shot=options[variant];
    panel.innerHTML=coachView({lesson,index:LESSONS.indexOf(lesson),last:LESSONS.indexOf(lesson)===LESSONS.length-1,options,variant,previews:previews(),phase,assisted,saved:!!progress[lesson.id]?.saved,message,hand,wide});
    panel.querySelectorAll('[data-hand]').forEach(button=>button.onclick=()=>{if(phase!=='ready'||isBusy())return;chooseHand(button.dataset.hand);if(assisted)hint();else renderPanel();});
    panel.querySelector('[data-stance]')?.addEventListener('click',()=>{if(phase!=='ready'||isBusy())return;wide=!wide;hint();});
    panel.querySelector('[data-library]').onclick=()=>{if(isBusy()||physics.moving)return;open();renderLibrary();};
    panel.querySelector('[data-save]').onclick=()=>{progress={...progress,[lesson.id]:{...progress[lesson.id],saved:!progress[lesson.id]?.saved}};saveProgress(storage,progress);renderPanel(message);};
    panel.querySelector('select').value=variant;
    panel.querySelector('select').onchange=e=>{variant=Number(e.target.value);hint();};
    panel.querySelector('[data-hint]')?.addEventListener('click',hint);
    panel.querySelector('[data-independent]')?.addEventListener('click',()=>retry(true));
    panel.querySelector('[data-execute]')?.addEventListener('click',()=>{if(phase!=='ready'||isBusy())return;hint();prepareShot(shot);renderPanel('Đã chỉnh hướng và đầu cơ. Bạn tự kéo lực rồi thả để đánh.');});
    panel.querySelector('[data-retry]')?.addEventListener('click',()=>retry());
    panel.querySelector('[data-exit]')?.addEventListener('click',()=>{if(!isBusy()){open();renderLibrary();}});
    panel.querySelector('[data-next]')?.addEventListener('click',()=>{if(isBusy()||physics.moving)return;const next=LESSONS[LESSONS.indexOf(lesson)+1];if(next)start(next.id);else open();});
    if(phase==='review'){
      const card=document.createElement('div');card.className='training-result-card';
      const heading=document.createElement('h2');heading.textContent='Cú đánh đã kết thúc';
      card.append(heading,panel.querySelector('#training-feedback'),panel.querySelector('.coach-footer'));
      resultBox.append(card);resultBox.hidden=false;
    }
  }
  function event(e){
    if(custom.active){custom.event(e);return;}
    if(!lesson)return;
    events.push(e);
    if(e.type==='shot'){phase='shooting';overlay.clear();renderPanel();}
    if(e.type==='settled'){
      phase='review';const result=evaluateLesson(resolveLesson(lesson,solutions[lesson.id][variant]),physics,events);
      progress=recordAttempt(progress,lesson.id,result.passed,assisted);
      const saved=saveProgress(storage,progress);
      renderPanel(result.message+(!saved?' Không lưu được tiến độ trên trình duyệt này.':''));
    }
  }
  return {open,close,start,event,markAssisted(){if(lesson)assisted=true;},get canShoot(){return custom.active?custom.canShoot:!!lesson&&phase==='ready';},get lesson(){return lesson;},get phase(){return phase;}};
}
