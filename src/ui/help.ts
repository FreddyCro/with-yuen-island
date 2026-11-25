// 右下角「?」：點了彈出操作說明（電腦、手機、共用），最底下附資料來源與最後更新日。點 ✕、點外面或按 Esc 關閉。純 DOM。
import { generatedAt } from '../../data/groups.json';

/** ISO 時間 → 台北日期 YYYY/MM/DD（不依賴瀏覽器時區） */
export function taipeiDate(iso: string): string {
  const d = new Date(Date.parse(iso) + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}`;
}

// 最後更新 = data/groups.json 產生的時間（scripts/build-groups.mjs 重跑就會更新）
const SOURCE: Array<[string, string]> = [
  ['來源', '鄭宇恩市議員官網 <a href="https://withyuen.com/" target="_blank" rel="noopener">withyuen.com ↗</a>'],
  ['最後更新', taipeiDate(generatedAt)],
];

const DESKTOP: Array<[string, string]> = [
  ['拖曳', '轉動視角'],
  ['滾輪', '拉近、拉遠'],
  ['右鍵拖曳', '平移畫面'],
  ['點物件', '看這一組的政績'],
  ['Esc', '返回上一層／關閉側欄'],
];
const MOBILE: Array<[string, string]> = [
  ['單指拖曳', '轉動視角'],
  ['雙指開合', '拉近、拉遠'],
  ['雙指拖曳', '平移畫面'],
  ['點物件', '看這一組的政績'],
];
const COMMON: Array<[string, string]> = [
  ['視角', '「環繞」自動繞島一圈、「鳥瞰」從正上方看'],
  ['搜尋政績', '選地區，再從側欄選議題'],
];

export function createHelp(): { close(): void } {
  const btn = document.createElement('button');
  btn.id = 'help-btn';
  btn.className = 'card';
  btn.setAttribute('aria-label', '操作說明');
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = '?';

  const box = document.createElement('section');
  box.id = 'help';
  box.className = 'card';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '操作說明');
  box.hidden = true;
  const rows = (items: Array<[string, string]>) => items.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('');
  box.innerHTML = `
    <header><h3>操作說明</h3><button class="x" aria-label="關閉">✕</button></header>
    <div class="scroll">
      <h4>電腦</h4><ul>${rows(DESKTOP)}</ul>
      <h4>手機</h4><ul>${rows(MOBILE)}</ul>
      <h4>共用</h4><ul>${rows(COMMON)}</ul>
      <h4>資料來源</h4><ul>${rows(SOURCE)}</ul>
    </div>`;
  document.body.append(btn, box);

  const show = (on: boolean) => { box.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => show(box.hidden));
  box.querySelector('.x')!.addEventListener('click', () => show(false));
  addEventListener('pointerdown', (e) => { if (!box.hidden && !box.contains(e.target as Node) && e.target !== btn) show(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });
  return { close: () => show(false) };
}
