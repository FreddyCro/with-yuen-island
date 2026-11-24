// 上方篩選選單：照原網站（withyuen.com）的兩層結構——地區 → 該區的議題。
// 地區用島的分法（議會 = 原站的新北全區＋其他新北）；議題用側欄的四類，和側欄共用同一份狀態。
import { BUCKET_COLOR, TOPIC_BUCKETS } from '../scene/groups';
import { countFor, regionLabel, type FilterState } from './sidebar';

export const REGIONS = ['淡水', '八里', '三芝', '石門', '議會'];

export function createFilterNav(h: { onFilter(region: string | null, topic: string | null): void }): { render(s: FilterState): void } {
  // 右上的篩選面板：標題＋地區按鈕列（下拉往左展開，才不會超出畫面）
  const nav = document.createElement('nav');
  nav.id = 'filter';
  nav.className = 'card';
  nav.setAttribute('aria-label', '搜尋政績：依地區與議題');
  nav.innerHTML = '<span class="card-h">搜尋政績</span><div class="pills"></div>';
  document.body.appendChild(nav);
  const pills = nav.querySelector('.pills') as HTMLElement;

  // 手機版（style.css）篩選列接在左上卡片下方、下拉接在篩選列下方：量實際位置寫進 CSS 變數，
  // 換行或字型載入改變高度時跟著更新
  const hud = document.getElementById('hud-left');
  const syncTop = () => {
    const st = document.body.style;
    if (hud) st.setProperty('--hud-bottom', `${hud.getBoundingClientRect().bottom}px`);
    st.setProperty('--filter-bottom', `${nav.getBoundingClientRect().bottom}px`); // 上一行改了 top，這裡讀到的是新位置
  };
  const ro = new ResizeObserver(syncTop);
  if (hud) ro.observe(hud);
  ro.observe(nav);
  let openMenu: string | null = null; // 展開下拉的地區
  let last: FilterState = { region: null, topic: null, group: null, post: null };

  function render(s: FilterState): void {
    last = s;
    const item = (r: string | null) => {
      const on = s.region === r && (r !== null || !s.topic);
      const label = r ? regionLabel(r) : '全部';
      const n = countFor(r, null);
      const menu = r && openMenu === r ? `
        <div class="menu" role="menu">
          <button role="menuitem" data-r="${r}" data-t="" class="${on && !s.topic ? 'on' : ''}">${label}全部 <small>${n}</small></button>
          ${TOPIC_BUCKETS.map((t) => [t, countFor(r, t)] as const).filter(([, c]) => c).map(([t, c]) => `
          <button role="menuitem" data-r="${r}" data-t="${t}" class="${on && s.topic === t ? 'on' : ''}"><i style="background:${BUCKET_COLOR[t]}"></i>${r === '議會' ? '' : r}${t} <small>${c}</small></button>`).join('')}
        </div>` : '';
      return `
        <div class="item ${on ? 'on' : ''}">
          <button class="top" data-r="${r ?? ''}" aria-haspopup="${r ? 'true' : 'false'}" aria-expanded="${openMenu === r}">
            ${label}${r ? '<span class="caret">▾</span>' : ''}
          </button>${menu}
        </div>`;
    };
    pills.innerHTML = [null, ...REGIONS].map(item).join('');
  }

  nav.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!b) return;
    const r = b.dataset.r || null;
    if (b.classList.contains('top')) {
      // 點地區：選它（議題清掉）並展開議題下拉；再點一次收合下拉。點「全部」清掉所有篩選
      if (!r) { openMenu = null; h.onFilter(null, null); return; }
      const already = last.region === r && !last.group;
      openMenu = openMenu === r ? null : r;
      if (!already || last.topic) h.onFilter(r, null); else render(last);
      return;
    }
    openMenu = null;
    h.onFilter(r, b.dataset.t || null);
  });
  // 點選單以外的地方收合下拉
  addEventListener('pointerdown', (e) => {
    if (openMenu && !nav.contains(e.target as Node)) { openMenu = null; render(last); }
  });

  return { render };
}
