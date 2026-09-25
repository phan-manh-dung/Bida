import {describeShot,contactDiagram,overlapDiagram,tipDiagram} from './coach.js';
import {optionLevel} from './options.js';
import {suggestStance,spinExplanation} from './stance.js';

export function coachView({lesson,index,last,options,variant,previews,phase,assisted,saved,message,hand='right',wide=false}){
 const shot=options[variant],preview=previews[variant],info=describeShot(lesson,shot,preview),disabled=phase!=='ready'?'disabled':'';
 const stance=suggestStance(lesson,shot,hand,wide);
 const infos=options.map((s,i)=>describeShot(lesson,s,previews[i]));
 const goal=shot.pocket!==undefined?`Vào bi ${lesson.target} ở lỗ ${info.effective.pocket+1}${shot.bank?' qua một băng':''}, giữ bi trắng trên bàn.`:lesson.goal;
 const fraction=info.overlap>.9?'Gần trúng tâm':info.overlap>.7&&info.overlap<.8?'Khoảng 3/4 bi':info.overlap>.45&&info.overlap<.55?'Khoảng 1/2 bi':info.overlap>.2&&info.overlap<.3?'Khoảng 1/4 bi':`Chồng khoảng ${Math.round(info.overlap*100)}%`;
 const note=info.effective.bank?'Giữ cả hướng và lực mẫu để bi vàng bật một băng vào lỗ.':lesson.id==='near-rail'?'Sát băng không có nghĩa là luôn cắt mỏng. Theo phần chồng hai bi ở hình trên.':info.overlap<.38?'Chạm ít vào mép bi. Trượt hướng thì chỉnh ngắm nhẹ, đừng chỉ tăng lực.':info.overlap>.9?'Ngắm tâm vòng trắng. Không cần thêm ép phê ngang chỉ để đánh thẳng.':'Ngắm tâm vòng trắng; phần hai bi chồng nhau cho biết cần chạm dày hay mỏng.';
 return `<div class="training-heading"><button data-library>← Bài tập</button><button data-save aria-pressed="${saved}">${saved?'★ Đã lưu':'☆ Lưu bài'}</button></div>
 <h2 class="coach-title">${index+1}. ${lesson.title}</h2><p class="coach-goal">${goal}</p>
 <fieldset class="coach-stance"><legend>Bạn cầm cơ bằng tay nào?</legend>${['left','right'].map(h=>`<button data-hand="${h}" aria-pressed="${hand===h}" ${disabled}>Tay ${h==='left'?'trái':'phải'}</button>`).join('')}<small>Tay ${hand==='left'?'phải':'trái'} đặt cầu.</small></fieldset>
 <label class="coach-select">Từ tập sự đến nâng cao <select id="training-variant" ${disabled}>${infos.map((i,n)=>`<option value="${n}" ${n===variant?'selected':''}>${optionLevel(options[n],n)} · ${i.title.replace(' · thử trước','')} · lỗ ${i.effective.pocket+1}</option>`).join('')}</select></label>
 ${assisted?`<section class="coach-compact">
 <div class="coach-stance"><b>Đứng ở ${stance.edge}</b><p>Hai dấu chân vàng nhấp nháy là chỗ đứng gợi ý. Vòng vàng nhỏ là chỗ đặt cầu tay.</p><button data-stance aria-pressed="${wide}" ${disabled}>${wide?'Đang đứng rộng · đổi về thường':'Đứng rộng hơn'}</button><small>${stance.needsRest?'Khó với theo ước tính: cân nhắc cầu cơ hoặc chọn phương án đánh khác.':'Thử điều chỉnh chân cho thoải mái, giữ cơ trên đường ngắm.'} Đây là gợi ý hình học, chưa đo tầm với của bạn.</small></div>
 <p class="coach-key"><strong>${info.thickness.toUpperCase()} · ${fraction}</strong><br>Góc cắt khoảng ${Math.round(info.angle)}°.</p>
 <div class="coach-contact">${contactDiagram(info)}${overlapDiagram(info)}</div>
 <div class="coach-placement"><p><b>Đầu cơ:</b> ${info.tipWords}.</p>${tipDiagram(shot)}<p class="coach-spin"><b>Tác dụng:</b> ${spinExplanation(shot.tip)}</p></div>
 <details class="coach-spin"><summary>Cu-lê trái / trô phải là gì?</summary><p><b>Cu-lê trái ↖:</b> chạm trên–trái tâm bi, kết hợp xoáy tiến và xoáy trái. Bi có xu hướng tiến sau va chạm; xoáy trái ảnh hưởng góc ra băng.</p><p><b>Trô phải ↘:</b> chạm dưới–phải tâm bi, kết hợp xoáy lùi và xoáy phải. Còn đủ xoáy thì bi kéo lùi sau va chạm; xoáy phải ảnh hưởng góc ra băng.</p><p>Cu-lê phải ↗ / trô trái ↙ đổi phía xoáy ngang tương ứng. Không phải cứ đặt chéo là bi chạy chéo cùng phía. Dấu xanh trên bàn là kết quả mô phỏng của phương án đang chọn.</p></details>
 <p class="coach-tip"><b>MẸO NHỚ NHANH</b> · ${note}</p>
 <p class="coach-destination"><span aria-hidden="true">◎</span> <b>Bi cái dừng ở dấu xanh nhấp nháy trên bàn.</b>${info.rails?` Qua băng ${info.rails} lần.`:''} Cách điểm chạm khoảng ${Math.round(info.distance)} cm, với đúng hướng, lực và đầu cơ mẫu.</p>
 ${Math.abs(shot.tip.x)>.1&&!info.rails?'<p class="training-note">Ép phê ngang chưa có lợi ích rõ ở cú không chạm băng này. Tập sự nên chọn cách đầu tiên.</p>':''}
 </section>`:'<div class="coach-tip"><b>Tự ngắm, không gợi ý</b><p>Đạt mục tiêu sẽ được ghi nhận là tự hoàn thành.</p><button data-hint>Bật hướng dẫn</button></div>'}
 <p id="training-feedback" role="status">${message||(phase==='shooting'?'Đang quan sát cú đánh…':phase==='review'?'Thử lại hoặc chuyển bài.':'Chỉnh chấm đỏ như hình, kéo đúng lực rồi thả.')}</p>
 <div class="training-actions coach-footer">${phase==='review'?'<button data-retry>Thử lại</button><button data-exit>Thoát</button>':`<button data-execute ${disabled}>Thực hiện</button><button data-independent ${disabled}>Tự đánh</button><button data-next ${disabled}>${last?'Danh sách':'Bài tiếp →'}</button>`}</div>`;
}
