// 上方篩選 tab：地區（全部／淡水／八里／三芝／石門／議會），點了直接篩選。
// 地區用島的分法（議會 = 原站的新北全區＋其他新北）；議題在側欄的議題鈕選，和側欄共用同一份狀態。
import type { FilterState } from './sidebar';

export const REGIONS = ['淡水', '八里', '三芝', '石門', '議會'];

export function createFilterNav(h: { onFilter(region: string | null, topic: string | null): void }): { render(s: FilterState): void } {
  const nav = document.createElement('nav');
  nav.id = 'filter';
  nav.className = 'card';
  nav.setAttribute('aria-label', '搜尋政績：依地區');
  nav.innerHTML = '<span class="card-h">搜尋政績</span><div class="tabs" role="tablist"></div>';
  document.body.appendChild(nav);
  const tabs = nav.querySelector('.tabs') as HTMLElement;

  // 手機版（style.css）篩選列接在左上卡片下方：量實際位置寫進 CSS 變數，換行或字型載入改變高度時跟著更新
  const hud = document.getElementById('hud-left');
  if (hud) {
    const syncTop = () => document.body.style.setProperty('--hud-bottom', `${hud.getBoundingClientRect().bottom}px`);
    new ResizeObserver(syncTop).observe(hud);
  }

  function render(s: FilterState): void {
    tabs.innerHTML = [null, ...REGIONS].map((r) => {
      const on = s.region === r && (r !== null || !s.topic);
      return `<button role="tab" data-r="${r ?? ''}" aria-selected="${on}" class="${on ? 'on' : ''}">${r ?? '全部'}</button>`;
    }).join('');
  }

  // 點地區 tab：選它（議題、組清掉）；點「全部」清掉所有篩選
  nav.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (b) h.onFilter(b.dataset.r || null, null);
  });

  return { render };
}
