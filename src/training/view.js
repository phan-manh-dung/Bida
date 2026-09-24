import {describeShot,contactDiagram,overlapDiagram,tipDiagram,tableDiagram} from './coach.js';
import {optionLevel} from './options.js';

export function coachView({lesson,index,last,options,variant,previews,phase,assisted,animate,saved,message}){
 const shot=options[variant],preview=previews[variant],info=describeShot(lesson,shot,preview),disabled=phase!=='ready'?'disabled':'';
 const infos=options.map((s,i)=>describeShot(lesson,s,previews[i]));
 const goal=shot.pocket!==undefined?`Vào bi 1 ở lỗ ${info.effective.pocket+1}${shot.bank?' qua một băng':''}, giữ bi trắng trên bàn.`:lesson.goal;
 const fraction=info.overlap>.9?'Gần trúng tâm':info.overlap>.7&&info.overlap<.8?'Khoảng 3/4 bi':info.overlap>.45&&info.overlap<.55?'Khoảng 1/2 bi':info.overlap>.2&&info.overlap<.3?'Khoảng 1/4 bi':`Chồng khoảng ${Math.round(info.overlap*100)}%`;
 const note=info.effective.bank?'Giữ cả hướng và lực mẫu để bi vàng bật một băng vào lỗ.':lesson.id==='near-rail'?'Sát băng không có nghĩa là luôn cắt mỏng. Theo phần chồng hai bi ở hình trên.':info.overlap<.38?'Chạm ít vào mép bi. Trượt hướng thì chỉnh ngắm nhẹ, đừng chỉ tăng lực.':info.overlap>.9?'Ngắm tâm vòng trắng. Không cần thêm ép phê ngang chỉ để đánh thẳng.':'Ngắm tâm vòng trắng; phần hai bi chồng nhau cho biết cần chạm dày hay mỏng.';
 return `<div class="training-heading"><button data-library>← Bài tập</button><button data-save aria-pressed="${saved}">${saved?'★ Đã lưu':'☆ Lưu bài'}</button></div>
 <h2 class="coach-title">${index+1}. ${lesson.title}</h2><p class="coach-goal">${goal}</p>
 <label class="coach-select">Từ tập sự đến nâng cao <select id="training-variant" ${disabled}>${infos.map((i,n)=>`<option value="${n}" ${n===variant?'selected':''}>${optionLevel(options[n],n)} · ${i.title.replace(' · thử trước','')} · lỗ ${i.effective.pocket+1}</option>`).join('')}</select></label>
 ${assisted?`<section class="coach-compact">
 <p class="coach-key"><strong>${info.thickness.toUpperCase()} · ${fraction}</strong></p>
 <div class="coach-contact">${contactDiagram(info)}${overlapDiagram(info)}</div>
 <div class="coach-placement"><p><b>Đầu cơ:</b> ${info.tipWords}.</p>${tipDiagram(shot)}</div>
 <p class="coach-tip"><b>MẸO NHỚ NHANH</b> · ${note}</p>
 <p class="coach-destination"><span aria-hidden="true">◎</span> <b>Bi cái dừng ở dấu xanh nhấp nháy trên bàn.</b>${info.rails?` Qua băng ${info.rails} lần.`:''}</p>
 <div class="training-actions"><button data-apply ${disabled}>Đặt hướng & đầu cơ mẫu</button></div>
 ${Math.abs(shot.tip.x)>.1&&!info.rails?'<p class="training-note">Ép phê ngang chưa có lợi ích rõ ở cú không chạm băng này. Tập sự nên chọn cách đầu tiên.</p>':''}
 <details class="coach-extra" ${animate?'open':''}><summary>Xem thêm đường bi & so sánh</summary>
 <p>${info.finish}</p>${tableDiagram(info.effective,preview,animate)}<button data-demo ${disabled}>▶ Xem bi chạy thử</button>
 <p class="training-note">Đường trên bàn là đường mẫu, không đổi theo hướng bạn đang ngắm.</p>
 ${infos.map((i,n)=>`<button class="coach-alternative" data-variant="${n}" ${disabled} aria-pressed="${n===variant}"><b>${optionLevel(options[n],n)} · ${i.title}</b><span>Lỗ ${i.effective.pocket+1} · lực ${Number((options[n].power*100).toFixed(1))}% · dừng ${i.zone}</span></button>`).join('')}</details>
 </section>`:'<div class="coach-tip"><b>Tự ngắm, không gợi ý</b><p>Đạt mục tiêu sẽ được ghi nhận là tự hoàn thành.</p><button data-hint>Bật hướng dẫn</button></div>'}
 <p id="training-feedback" role="status">${message||(phase==='shooting'?'Đang quan sát cú đánh…':phase==='review'?'Thử lại hoặc chuyển bài.':'Chỉnh chấm đỏ như hình, kéo đúng lực rồi thả.')}</p>
 <div class="training-actions coach-footer"><button data-retry ${phase==='shooting'?'disabled':''}>Thử lại</button><button data-independent ${phase==='shooting'?'disabled':''}>Tự đánh</button><button data-next ${phase==='shooting'?'disabled':''}>${last?'Danh sách':'Bài tiếp →'}</button></div>`;
}
