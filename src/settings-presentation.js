import './settings-presentation.css';
import {clubIcon} from './club-icons.js';

export function mountSettingsPresentation() {
  const dialog=document.querySelector('#settings-dialog');
  dialog.classList.add('club-settings');
  dialog.querySelector('.overline').textContent='⚙  CÀI ĐẶT TRẬN ĐẤU';
  const hero=document.createElement('div');hero.className='settings-hero';
  hero.append(dialog.querySelector('.overline'),dialog.querySelector('h2'));
  hero.insertAdjacentHTML('beforeend','<p>Tùy chỉnh trải nghiệm chơi của bạn</p>');
  dialog.prepend(hero);
  const descriptions=[['bolt','Hiển thị đường ngắm để hỗ trợ căn góc.'],['palette','Chọn màu sắc của mặt bàn theo sở thích.'],['sound','Bật/tắt âm thanh trong trận đấu.']];
  dialog.querySelectorAll('.setting-row').forEach((row,i)=>{
    const title=row.firstElementChild,copy=document.createElement('div');copy.className='settings-copy';
    title.replaceWith(copy);copy.append(title);
    const note=document.createElement('small');note.textContent=descriptions[i][1];copy.append(note);
    const icon=document.createElement('span');icon.className='settings-feature-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=clubIcon(descriptions[i][0]);row.prepend(icon);
  });
  const audio=dialog.querySelector('.audio-import');
  audio.querySelector('summary').innerHTML='<span class="settings-feature-icon" aria-hidden="true">▷</span><span class="settings-copy"><strong>Thêm bản thu âm thanh</strong><small>Dùng bản thu của bạn cho từng va chạm.</small></span><span aria-hidden="true">›</span>';
  dialog.insertAdjacentHTML('beforeend','<footer class="settings-footer"><small>ⓘ Màu bàn và tùy chọn được lưu tự động.</small><button type="button" id="reset-settings">↶ Đặt lại mặc định</button></footer>');
  audio.querySelector('.settings-feature-icon').innerHTML=clubIcon('play');
  dialog.querySelector('#reset-settings').innerHTML=`${clubIcon('reset')} Đặt lại mặc định`;
}
