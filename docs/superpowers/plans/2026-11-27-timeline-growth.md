# 時間軸與馬蹄形背景 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓政績島可以拉時間軸、按播放，從 2022-12 的空島長到今天：物件依「藍圖 → 施工中 → 實體」變化，篇數跳動，還能匯出直式縮時影片。背景改成馬蹄形出海口。

**Architecture:**
- **純函式層** `src/timeline/model.ts`：算出某個月份每組物件的狀態和篇數，全部可以單元測試。
- **three.js 套用層**：`src/scene/appearance.ts` 負責三種外觀，`src/timeline/controller.ts` 把月份套到物件上。
- **DOM 層**：`src/ui/timeline-bar.ts`（滑桿）、`src/ui/fallback-list.ts`（3D 跑不動時的清單）。
- **資料**：落地、動工由人工確認，寫進 `data/milestones.json`，由 `scripts/` 產生候選並轉檔。
- **背景**：只改 `src/scene/crater.ts` 的地形開口。

**Tech Stack:** Vite 5、TypeScript 5、three 0.160（含 CSS2DRenderer）、vitest 2、Node ≥ 22、pnpm。不新增任何相依套件。

**Spec:**
- `docs/superpowers/specs/2026-11-27-timeline-growth-design.md`
- `docs/superpowers/specs/2026-11-27-estuary-horseshoe-design.md`

## Global Constraints

- 純靜態網站，不需要後端；產物仍是 `dist/`，`base: './'` 不變。
- 時間軸**預設關閉**，用 `?timeline=1` 開啟；Freddy 確認完落地文章之後，把 `TIMELINE_DEFAULT` 改成 `true`。
- 網址參數：`?at=YYYY-MM` 停在某個月，`?play=1` 一打開就播放，`?timeline=1` 開啟時間軸。`?t=` 已經被議題篩選用掉了，不能拿來用。
- 時間解析度是「月」；播放總長 `PLAY_SECONDS = 20` 秒，到底停住；播放中拖動滑桿就暫停。
- 月份標籤格式是 `2024 年 6 月`。
- 固定文案：
  - 滑桿旁：`網站紀錄始於 2022 年 12 月`
  - 側欄：`顯示到 2024 年 6 月`
  - webm 提示：`這個瀏覽器錄的是 webm，IG 可能要先轉檔`
- 建設類元素（套用藍圖、施工）：`school, crosswalk, playground, transit, bridge, repair, library, parking, market, hall, port`。其他元素在第一篇文章出現時直接以實體出現。
- 升級光柱**只在建設類物件變成實體的那一刻打**，而且只在播放和錄影時打。藍圖變施工、非建設類物件出現、手動拖滑桿，都不打光。
- 物件擺放位置用最終篇數算好之後就不動，只有縮放隨當時的篇數改變：`tierScale(element, countAt(t))`。
- 施工外觀：塔吊加鷹架，圍籬用綠色鐵皮，不用紅白條紋。
- 影片 1080×1920；網址 `https://freddycro.github.io/with-yuen-island/`、品牌 `北海岸政績島｜鄭宇恩`，集中寫在一個常數裡。文案不能暗示建設是議員蓋的。
- 照片直接連 withyuen.com 的原圖網址，延遲載入，不複製進 repo。
- 不做：分享卡、使用次數追蹤、年份對應光線、照片彈出、夜間亮窗、地名鋪地、水面寫河名、改區名標籤樣式。

## Review Focus

1. **時間軸開啟時切換議題篩選**：藍圖物件被 `dim()` 淡化後再恢復，還要是藍圖；實體物件恢復成原樣。藍圖材質必須每個物件各自一份，不能共用；共用的話，淡化一個會讓全部一起變淡。→ Task 4 測試「兩個物件的藍圖材質不是同一個實例」。
2. **還沒出現的物件**：點不到、hover 沒有提示。網址帶 `?g=` 指到一個在 `?at=` 月份還不存在的組時，側欄照樣打開，顯示「到這個時間點還沒有政績」，不能整頁壞掉。→ Task 3 測試 `postsUpTo` 回傳空陣列；Task 6 的 `firstVisibleHit` 測試。
3. **同一個月有多組物件落地**：每一組都要打光，不能只打一組。→ Task 4 的 `updateGlows` 測試同時強制兩個物件。
4. **`?at=` 帶了奇怪的值**：例如 `abc`、`2026-13`、`2019-01`、`2099-01`，不能讓頁面壞掉。在資料範圍之前的夾到第一個月，之後的和格式錯的都退回最新月份。→ Task 3 測試。
5. **匯出時連按兩次**：不能同時錄兩支影片。錄影期間按鈕要停用，`recordTimelapse` 也要擋住重複呼叫。→ Task 8 測試 `createExportGuard`。

---

### Task 1: 馬蹄形背景

**Files:**
- Modify: `src/scene/crater.ts`（拿掉 `setGap`、`gapFactor`，改成 `setOpenings`，修改 `terrainHeight`）
- Modify: `src/main.ts:170-180`（改成呼叫 `setOpenings`，加「→ 台北」標籤）
- Test: `tests/crater.test.ts`（把 39–45 行的低窪測試換掉）

**Interfaces:**
- Produces:
  - `export interface Openings { seaA: number; seaHalf: number; riverA: number; riverHalf: number }`，角度都是湖局部座標（用 `lakeLocal(...).a` 算），單位是弧度。
  - `export function setOpenings(o: Openings | null): void`，傳 `null` 等於不開口。
  - `export function seaWeight(a: number): number`：在 `|a − seaA| ≤ seaHalf` 內是 1，往外 0.25 弧度內平滑降到 0。
  - `export function riverWeight(a: number): number`：在 `riverA` 是 1，寬度大約 `riverHalf` 的窄峰。
- Consumes：無。

- [ ] **Step 1: 寫會失敗的測試**（取代原本的「山稜在指定方向開低窪」）

```ts
it('海側開口：開口內的火口緣在海面以下，開口外不受影響', () => {
  setLake(0, 0, 0, 1, 1);
  setOpenings(null);
  const side = (a: number) => { const [x, z] = lakeWorld(RIM_R, a); return terrainHeight(x, z); };
  const base = side(Math.PI / 2);
  setOpenings({ seaA: 0, seaHalf: 1.0, riverA: Math.PI, riverHalf: 0.12 });
  expect(side(0)).toBeLessThan(0);
  expect(side(0.9)).toBeLessThan(0);
  expect(side(Math.PI / 2)).toBeCloseTo(base, 5);
  setOpenings(null); setLake(0, 0, 0, 0.72, 1);
});
it('河谷缺口：比兩側低', () => {
  setLake(0, 0, 0, 1, 1);
  setOpenings({ seaA: 0, seaHalf: 1.0, riverA: Math.PI, riverHalf: 0.12 });
  const side = (a: number) => { const [x, z] = lakeWorld(RIM_R, a); return terrainHeight(x, z); };
  expect(side(Math.PI)).toBeLessThan(Math.min(side(Math.PI - 0.5), side(Math.PI + 0.5)) * 0.5);
  setOpenings(null); setLake(0, 0, 0, 0.72, 1);
});
it('沒有開口時，湖岸高度仍是 0', () => {
  setOpenings(null);
  for (let i = 0; i < 8; i++) { const [x, z] = lakeWorld(LAKE_R, (i / 8) * Math.PI * 2); expect(Math.abs(terrainHeight(x, z))).toBeLessThan(1e-6); }
});
```
import 這一行把 `setGap` 換成 `setOpenings`。

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/crater.test.ts`
Expected: FAIL，`setOpenings` 不存在。

- [ ] **Step 3: 在 `src/scene/crater.ts` 實作 `setOpenings`、`seaWeight`、`riverWeight`，並修改 `terrainHeight`**

只在 `r ≥ LAKE_R` 套用：
1. 先算 `h1 = h × (1 − 0.92 × riverWeight(a))`。
2. 再把 `h1` 往海底高度 `SEA_FLOOR = -6` 混過去，混合比例是 `seaWeight(a)`。

`LAKE` 物件裡的 `gapA` 換成 `openings: Openings | null`。原本的 `setGap` 和 `gapFactor` 刪掉。`treeSpots` 已經會跳過 `y ≤ 1` 的位置，開口裡自然不會長樹，不用另外處理。

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/crater.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `src/main.ts` 接上**

- `seaA`：沿用現在算 gap 的方向（淡江大橋中點 → 議會，往外推 100），取 `lakeLocal(...).a`。`seaHalf` 先用 `1.0`。
- `riverA`：從湖中心指向關渡大橋中點（格 `-1,-2` 和 `-1,-1` 的位置平均），往外推 100，取 `lakeLocal(...).a`。`riverHalf` 先用 `0.12`。
- 「→ 台北」標籤：放在 `lakeWorld(LAKE_R + 8, riverA)`、`y = 1.2` 的位置，樣式用現有的 `label small place`。

用 `pnpm dev` 開 `?cam=sunset`、`?cam=top` 和預設環繞鏡頭各看一次：海側要看得到海平線，不能露出海面圓盤的邊緣；不夠的話調整 `scene.fog` 的 near、far，以及 `applySunset` 裡的霧。

- [ ] **Step 6: 型別檢查與全部測試**

Run: `pnpm typecheck && pnpm test`
Expected: 無錯誤，全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add src/scene/crater.ts src/main.ts tests/crater.test.ts
git commit -m "feat: 背景改成馬蹄形出海口（海側開口、關渡河谷）"
```

---

### Task 2: 落地與動工的資料管線

**Files:**
- Create: `scripts/lib/milestones.mjs`（`suggestCandidates`、`parseChecklist`）
- Create: `scripts/suggest-milestones.mjs`（讀 `data/groups.json`，寫 `temp/milestone-candidates.md`）
- Create: `scripts/apply-milestones.mjs`（讀勾選清單，寫 `data/milestones.json`；保留已有的 `image`）
- Create: `scripts/fetch-milestone-images.mjs`（替 milestones 裡還沒有 `image` 的文章抓主圖網址）
- Create: `data/milestones.json`（內容是 `{}`）
- Create: `src/timeline/milestones.ts`
- Test: `tests/milestones.test.ts`

**Interfaces:**
- Produces（`src/timeline/milestones.ts`）：
  - `export type Stage = 'start' | 'done'`
  - `export type Milestones = Record<string, { stage: Stage; image?: string }>`（key 是 postId 字串）
  - `export const MILESTONES: Milestones`（匯入 `data/milestones.json`）
  - `export function validateMilestones(ms: Milestones, groups: Group[]): string[]`：回傳錯誤訊息，空陣列代表通過。
- Produces（`scripts/lib/milestones.mjs`）：
  - `suggestCandidates(posts) → Array<{ id, date, title, stage }>`：依日期排序。
    - 落地關鍵字：`完工|啟用|通車|落成|完成|竣工|開幕|上路|正式開放`
    - 動工關鍵字：`動工|開工|施工|發包|動土`
    - 兩種都符合時算落地。
  - `parseChecklist(md) → Record<string, { stage }>`：只收打勾的行（`[x]` 或 `[X]`）。打勾的行如果 stage 不是 `start` 或 `done`，丟出含「第 N 行」的錯誤。

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { describe, it, expect } from 'vitest';
import { suggestCandidates, parseChecklist } from '../scripts/lib/milestones.mjs';
import { MILESTONES, validateMilestones } from '../src/timeline/milestones';
import { GROUPS } from '../src/scene/groups';

describe('suggestCandidates', () => {
  it('依關鍵字分落地／動工，兩者都有算落地，沒有就不列', () => {
    const r = suggestCandidates([
      { id: 1, date: '2024-02-01', title: '八里國中新校舍動工' },
      { id: 2, date: '2023-01-01', title: '淡水某路口改善完工' },
      { id: 3, date: '2024-05-01', title: '開工典禮後半年完工' },
      { id: 4, date: '2024-06-01', title: '持續關注' },
    ]);
    expect(r.map((x) => [x.id, x.stage])).toEqual([[2, 'done'], [1, 'start'], [3, 'done']]);
  });
});
describe('parseChecklist', () => {
  it('只收打勾的行', () => {
    const md = '- [x] done | 15079 | 2026-07-13 | 甲\n- [ ] start | 15080 | 2026-07-14 | 乙\n- [X] start | 15081 | 2026-07-15 | 丙\n雜訊';
    expect(parseChecklist(md)).toEqual({ '15079': { stage: 'done' }, '15081': { stage: 'start' } });
  });
  it('打勾的行 stage 錯了要報行號', () => {
    expect(() => parseChecklist('- [x] end | 1 | 2024-01-01 | 甲')).toThrow(/第 1 行/);
  });
});
describe('validateMilestones', () => {
  it('data/milestones.json 本身要通過', () => { expect(validateMilestones(MILESTONES, GROUPS)).toEqual([]); });
  it('不存在的 postId、錯的 stage 都要報', () => {
    const errs = validateMilestones({ '999999': { stage: 'done' }, [String(GROUPS[0].posts[0].id)]: { stage: 'end' as never } }, GROUPS);
    expect(errs.some((e) => e.includes('999999'))).toBe(true);
    expect(errs.length).toBe(2);
  });
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/milestones.test.ts`
Expected: FAIL，模組不存在。

- [ ] **Step 3: 實作 `scripts/lib/milestones.mjs`、`src/timeline/milestones.ts`，並建立 `data/milestones.json`（內容 `{}`）**

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/milestones.test.ts`
Expected: PASS

- [ ] **Step 5: 寫三支 CLI 腳本**

- `suggest-milestones.mjs`：輸出到 `temp/milestone-candidates.md`。每一行的格式是 `- [ ] <stage> | <postId> | <日期> | <標題> | <島>·<元素>`；`data/milestones.json` 裡已經有的文章預先打勾。檔頭說明：打勾代表採用，stage 可以改，不要的就不勾。
- `apply-milestones.mjs`：用 `parseChecklist` 解析，保留舊資料裡的 `image`，寫回 `data/milestones.json`（key 排序、兩格縮排）。寫入前呼叫 `validateMilestones` 的同一套規則檢查，有錯就印出錯誤、不寫入。
- `fetch-milestone-images.mjs`：對每個還沒有 `image` 的 id，抓 `https://withyuen.com/wp-json/wp/v2/posts/<id>?_embed`，取 `_embedded['wp:featuredmedia'][0].source_url`。抓不到就略過並印出警告。每次請求之間間隔 300 ms。

跑一次 `node scripts/suggest-milestones.mjs`，確認 `temp/milestone-candidates.md` 大約有 90 行。

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/milestones.mjs scripts/suggest-milestones.mjs scripts/apply-milestones.mjs scripts/fetch-milestone-images.mjs data/milestones.json src/timeline/milestones.ts tests/milestones.test.ts
git commit -m "feat: 落地／動工候選與確認清單管線"
```

> 這一步之後，Freddy 要勾選 `temp/milestone-candidates.md`，再跑 `node scripts/apply-milestones.mjs` 和 `node scripts/fetch-milestone-images.mjs`。後面的任務不用等這一步，`{}` 也能跑。

---

### Task 3: 時間軸模型（純函式）

**Files:**
- Create: `src/timeline/config.ts`
- Create: `src/timeline/model.ts`
- Test: `tests/timeline-model.test.ts`

**Interfaces:**
- Consumes: `Milestones`（Task 2）、`Group`、`GroupPost`（`src/scene/groups.ts`）。
- Produces（`config.ts`）：
  - `TIMELINE_DEFAULT = false`
  - `PLAY_SECONDS = 20`
  - `SHARE_URL = 'https://freddycro.github.io/with-yuen-island/'`
  - `BRAND = '北海岸政績島｜鄭宇恩'`
  - `SOURCE_START_NOTE = '網站紀錄始於 2022 年 12 月'`
- Produces（`model.ts`）：
  - `export type GroupState = 'absent' | 'blueprint' | 'construction' | 'solid'`
  - `export type TimelineGroup = Pick<Group, 'key' | 'island' | 'element' | 'posts'>`
  - `export const CONSTRUCTION: ReadonlySet<string>`（11 種建設類元素）
  - `export const monthOf = (date: string) => date.slice(0, 7)`
  - `export function monthRange(first: string, last: string): string[]`：包含頭尾
  - `export function groupStateAt(g: TimelineGroup, ms: Milestones, month: string): GroupState`
  - `export function countAt(g: TimelineGroup, month: string): number`
  - `export function islandCountsAt(groups: TimelineGroup[], month: string): Record<string, number>`
  - `export function postsUpTo<T extends { date: string }>(posts: T[], month: string | null): T[]`：傳 `null` 代表全部
  - `export function stepEvents(groups: TimelineGroup[], ms: Milestones, prev: string, next: string): { bumps: Array<{ key: string; n: number }>; landings: string[] }`：只算 `prev < 月份 ≤ next` 的區間；`landings` 只收建設類物件、從非實體變成實體的組
  - `export function parseAtParam(v: string | null, months: string[]): number`：回傳 index
  - `export function monthLabel(month: string): string`
  - `export function stateLabel(s: GroupState): string`：`blueprint → 爭取中`、`construction → 已動工`、`solid → 已落地`、`absent → ''`
  - `export function playIndex(elapsedSec: number, n: number, totalSec?: number): number`

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { describe, it, expect } from 'vitest';
import { groupStateAt, countAt, islandCountsAt, postsUpTo, stepEvents, parseAtParam, monthLabel, monthRange, playIndex, stateLabel } from '../src/timeline/model';

const g = (key: string, element: string, island: string, posts: Array<[number, string]>) =>
  ({ key, element, island, posts: posts.map(([id, date]) => ({ id, date, title: '', excerpt: '', link: '', topic: '交通' })) });
const school = g('八里-school', 'school', '八里', [[1, '2023-01-05'], [2, '2023-06-01'], [3, '2024-02-10']]);
const sign = g('議會-sign', 'sign', '議會', [[4, '2023-03-01']]);
const library = g('三芝-library', 'library', '三芝', [[5, '2023-01-01'], [6, '2023-04-01']]);
const ms = { '2': { stage: 'start' as const }, '3': { stage: 'done' as const }, '6': { stage: 'done' as const } };

describe('groupStateAt', () => {
  it('建設類：不存在 → 藍圖 → 施工 → 實體', () => {
    expect(['2022-12', '2023-01', '2023-05', '2023-06', '2024-01', '2024-02'].map((m) => groupStateAt(school, ms, m)))
      .toEqual(['absent', 'blueprint', 'blueprint', 'construction', 'construction', 'solid']);
  });
  it('非建設類：第一篇出現就是實體', () => {
    expect(groupStateAt(sign, ms, '2023-02')).toBe('absent');
    expect(groupStateAt(sign, ms, '2023-03')).toBe('solid');
  });
  it('有落地沒有動工：藍圖直接跳實體', () => {
    expect(groupStateAt(library, ms, '2023-03')).toBe('blueprint');
    expect(groupStateAt(library, ms, '2023-04')).toBe('solid');
  });
});
it('篇數與文章篩選', () => {
  expect(countAt(school, '2023-06')).toBe(2);
  expect(islandCountsAt([school, sign, library], '2023-06')).toEqual({ 八里: 2, 議會: 1, 三芝: 2 });
  expect(islandCountsAt([school, sign], '2022-12')).toEqual({ 八里: 0, 議會: 0 }); // 篇數是 0 的島也要回傳，標籤才會歸零
  expect(postsUpTo(school.posts, '2023-05').map((p) => p.id)).toEqual([1]);
  expect(postsUpTo(school.posts, '2022-12')).toEqual([]);
  expect(postsUpTo(school.posts, null)).toHaveLength(3);
});
it('stepEvents：+N 依組合併，光柱只給建設類落地', () => {
  expect(stepEvents([school, sign], ms, '2023-12', '2024-02')).toEqual({ bumps: [{ key: '八里-school', n: 1 }], landings: ['八里-school'] });
  expect(stepEvents([sign], ms, '2023-02', '2023-03').landings).toEqual([]);
});
it('parseAtParam：格式錯或太晚退回最新，太早夾到第一個月', () => {
  const months = monthRange('2022-12', '2026-11');
  expect(months[0]).toBe('2022-12'); expect(months.at(-1)).toBe('2026-11'); expect(months).toHaveLength(48);
  expect(months[parseAtParam('2024-06', months)]).toBe('2024-06');
  for (const v of [null, 'abc', '2026-13', '2099-01']) expect(parseAtParam(v, months)).toBe(47);
  expect(parseAtParam('2019-01', months)).toBe(0);
});
it('文字與播放', () => {
  expect(monthLabel('2024-06')).toBe('2024 年 6 月');
  expect(stateLabel('construction')).toBe('已動工');
  expect(playIndex(0, 48)).toBe(0);
  expect(playIndex(20, 48)).toBe(47);
  expect(playIndex(99, 48)).toBe(47);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/timeline-model.test.ts`
Expected: FAIL，模組不存在。

- [ ] **Step 3: 實作 `src/timeline/config.ts` 和 `src/timeline/model.ts`**

月份都用 `'YYYY-MM'` 字串比大小。`groupStateAt` 的判斷順序：
1. 早於第一篇的月份 → `absent`
2. 非建設類 → `solid`
3. 到了最早的落地月份 → `solid`
4. 到了最早的動工月份 → `construction`
5. 其他 → `blueprint`

`playIndex` 的算法是 `min(n − 1, floor(elapsed / totalSec × (n − 1)))`，`elapsed ≥ totalSec` 時回傳 `n − 1`。

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/timeline-model.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/timeline/config.ts src/timeline/model.ts tests/timeline-model.test.ts
git commit -m "feat: 時間軸模型（狀態、篇數、網址參數、播放進度）"
```

---

### Task 4: 三種外觀與強制光柱

**Files:**
- Create: `src/scene/appearance.ts`
- Modify: `src/scene/groups.ts`（`buildBeam` 改成 export；`updateGlows` 加參數）
- Test: `tests/appearance.test.ts`、`tests/glows.test.ts`

**Interfaces:**
- Produces（`appearance.ts`）：
  - `export type Look = 'blueprint' | 'construction' | 'solid'`
  - `export function setLook(holder: THREE.Group, look: Look): void`：重複呼叫同一個 look 不會出錯。
    - 第一次呼叫時，把每個 mesh 的原材質存進 `mesh.userData.solidMat`。
    - 略過 `holder.userData.proxy` 和 `holder.userData.beam` 底下的所有東西。
    - **blueprint**：每個 holder 各自 clone 一份藍圖材質，偏藍半透明（顏色約 `#6F8FB8`、opacity 約 0.35）；另外加上白色邊線，是名為 `blueprint-edges` 的子群組（`EdgesGeometry`）。
    - **construction**：還原成原材質，顯示名為 `construction-kit` 的子群組。施工組件依物件的包圍盒大小建立，內容是塔吊、木色鷹架、綠色鐵皮圍籬（約 `#6F9A86`），建一次後快取起來。
    - **solid**：還原成原材質，兩個子群組都隱藏。
  - 不改任何物件的 `castShadow`，因為 `interact.ts` 的 `dim()` 會自己記錄和恢復陰影設定。
- Produces（`groups.ts`）：
  - `export function buildBeam(): THREE.Group`
  - `export function updateGlows(holders: THREE.Group[], t: number, forced: ReadonlyMap<THREE.Group, number> | null = null, idle = true): void`
    - `forced` 裡的值是開始打光的時間 `t0`。在 `t − t0 < BEAM_PERIOD` 期間，用 `u = (t − t0) / BEAM_PERIOD` 播放原本的打光動畫。
    - `forced` 裡有任何一個還在播的，就不跑隨機輪流。
    - 沒有 forced、而且 `idle = false` 時，所有光柱都熄滅。
    - 沒有 forced、`idle = true` 時，維持現在的隨機輪流。

- [ ] **Step 1: 寫會失敗的測試**

```ts
// tests/appearance.test.ts
import { it, expect } from 'vitest';
import * as THREE from 'three';
import { setLook } from '../src/scene/appearance';

const holder = () => {
  const h = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
  const beam = new THREE.Group();
  h.add(body, proxy, beam);
  h.userData = { proxy, beam };
  return { h, body, proxy };
};
it('藍圖 → 施工 → 實體，原材質能還原；proxy 不動', () => {
  const { h, body, proxy } = holder(); const orig = body.material; const proxyMat = proxy.material;
  setLook(h, 'blueprint');
  const bp = body.material as THREE.Material;
  expect(bp).not.toBe(orig); expect(bp.transparent).toBe(true); expect(bp.opacity).toBeLessThan(1);
  expect(h.getObjectByName('blueprint-edges')!.visible).toBe(true);
  setLook(h, 'construction');
  expect(body.material).toBe(orig);
  expect(h.getObjectByName('construction-kit')!.visible).toBe(true);
  expect(h.getObjectByName('blueprint-edges')!.visible).toBe(false);
  setLook(h, 'solid'); setLook(h, 'solid');
  expect(body.material).toBe(orig);
  expect(h.getObjectByName('construction-kit')!.visible).toBe(false);
  expect(proxy.material).toBe(proxyMat);
});
it('兩個物件的藍圖材質不是同一個實例（篩選淡化一個不能連帶淡化其他）', () => {
  const a = holder(), b = holder();
  setLook(a.h, 'blueprint'); setLook(b.h, 'blueprint');
  expect(a.body.material).not.toBe(b.body.material);
});
```
```ts
// tests/glows.test.ts
import { it, expect } from 'vitest';
import * as THREE from 'three';
import { buildBeam, updateGlows } from '../src/scene/groups';

const mk = () => { const h = new THREE.Group(); h.userData.beam = buildBeam(); h.add(h.userData.beam); return h; };
const lit = (h: THREE.Group) => ((h.userData.beam as THREE.Group).getObjectByName('beam') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity > 0;
it('強制打光：同一個月兩組落地，兩組都亮，其他不亮', () => {
  const [a, b, c] = [mk(), mk(), mk()];
  updateGlows([a, b, c], 0.5, new Map([[a, 0], [b, 0]]), false);
  expect([lit(a), lit(b), lit(c)]).toEqual([true, true, false]);
});
it('不是閒置狀態、沒有強制打光：全部熄滅', () => {
  const hs = [mk(), mk()];
  updateGlows(hs, 0.5, null, false);
  expect(hs.some(lit)).toBe(false);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/appearance.test.ts tests/glows.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 `setLook`，修改 `buildBeam` 為 export、`updateGlows` 加參數**

`main.ts` 現在呼叫 `updateGlows(holders, t)`，加了預設參數之後行為不變。

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/appearance.test.ts tests/glows.test.ts && pnpm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/appearance.ts src/scene/groups.ts tests/appearance.test.ts tests/glows.test.ts
git commit -m "feat: 藍圖／施工外觀與強制光柱"
```

---

### Task 5: 時間軸控制器

**Files:**
- Create: `src/timeline/controller.ts`
- Test: `tests/timeline-controller.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `groupStateAt`、`countAt`、`islandCountsAt`、`stepEvents`；Task 4 的 `setLook`；`tierScale`（`src/scene/place.ts`）。
- Produces:
```ts
export interface TimelineDeps {
  holders: THREE.Group[];              // userData.groupKey 對應到 groups 的 key
  groups: TimelineGroup[];
  milestones: Milestones;
  months: string[];
  setIslandCount(island: string, n: number): void;
  spawnPop(holder: THREE.Group, n: number): void;   // 顯示「+N」，由 main.ts 用 CSS2D 實作
}
export function createTimeline(d: TimelineDeps): {
  setMonth(i: number, animate: boolean): void;  // animate=true 而且往後走時，才會產生 +N 和光柱
  update(t: number): void;                      // 每幀傳入時間（秒），用來記錄光柱開始的時間，並清掉已經播完的光柱
  index(): number;
  forcedBeams(): ReadonlyMap<THREE.Group, number>;
};
```
- `setMonth` 套用內容：
  - `holder.visible = state !== 'absent'`
  - `holder.scale.setScalar(tierScale(element, max(1, countAt)))`
  - `setLook(holder, state === 'absent' ? 'solid' : state)`
  - 對每個島呼叫一次 `setIslandCount`

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createTimeline } from '../src/timeline/controller';
import { monthRange } from '../src/timeline/model';
import { tierScale } from '../src/scene/place';

it('隱藏、縮放、篇數、+N、光柱', () => {
  const school = { key: '八里-school', element: 'school', island: '八里', posts: [
    { id: 1, date: '2023-01-05', title: '', excerpt: '', link: '', topic: '交通' },
    { id: 2, date: '2023-06-01', title: '', excerpt: '', link: '', topic: '交通' },
    { id: 3, date: '2024-02-10', title: '', excerpt: '', link: '', topic: '交通' }] };
  const h = new THREE.Group(); h.userData = { groupKey: '八里-school', proxy: new THREE.Mesh(), beam: new THREE.Group() };
  h.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  const months = monthRange('2022-12', '2024-02');
  const setIslandCount = vi.fn(), spawnPop = vi.fn();
  const tl = createTimeline({ holders: [h], groups: [school], milestones: { '3': { stage: 'done' } }, months, setIslandCount, spawnPop });
  tl.update(10);
  tl.setMonth(0, false);
  expect(h.visible).toBe(false);
  tl.setMonth(months.indexOf('2023-06'), false);
  expect(h.visible).toBe(true);
  expect(h.scale.x).toBeCloseTo(tierScale('school', 2));
  expect(setIslandCount).toHaveBeenLastCalledWith('八里', 2);
  expect(spawnPop).not.toHaveBeenCalled();
  tl.setMonth(months.indexOf('2024-02'), true);
  expect(spawnPop).toHaveBeenCalledWith(h, 1);
  expect(tl.forcedBeams().get(h)).toBe(10);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/timeline-controller.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 `createTimeline`**

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/timeline-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/timeline/controller.ts tests/timeline-controller.test.ts
git commit -m "feat: 時間軸控制器（把月份套到島上物件）"
```

---

### Task 6: 時間軸介面接到島上（滑桿、標籤、側欄、互動）

**Files:**
- Create: `src/ui/timeline-bar.ts`
- Modify: `src/style.css`（加 `#timeline`、`.pop` 的樣式）
- Modify: `src/main.ts`（`addLabel` 改成回傳更新篇數的函式；建立時間軸；渲染迴圈裡接上播放和 `updateGlows`）
- Modify: `src/interact.ts`（點選略過隱藏的物件；加 `setUpto`）
- Modify: `src/ui/sidebar.ts`（依 upto 篩文章、顯示註記和狀態）
- Test: `tests/timeline-wiring.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `monthRange`、`parseAtParam`、`monthLabel`、`playIndex`、`postsUpTo`、`groupStateAt`、`stateLabel`、`TIMELINE_DEFAULT`、`PLAY_SECONDS`、`SOURCE_START_NOTE`；Task 5 的 `createTimeline`。
- Produces:
  - `src/ui/timeline-bar.ts`：
```ts
export function createTimelineBar(o: {
  months: string[]; initial: number;
  onInput(i: number): void;            // 使用者拖動滑桿
  onPlayToggle(playing: boolean): void;
  onExport(): void;
}): { set(i: number): void; setPlaying(p: boolean): void; setExportBusy(b: boolean): void; setExportVisible(v: boolean): void };
```
  - `src/interact.ts`：
    - `export function firstVisibleHit<T>(hits: Array<{ object: T }>, holderOf: Map<T, THREE.Group>): THREE.Group | null`
    - `setupInteraction` 的回傳值加上 `setUpto(month: string | null): void`
  - `src/ui/sidebar.ts`：`createSidebar` 的回傳值加上 `setUpto(month: string | null): void`，設定後會用目前的狀態重新 render。

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { it, expect } from 'vitest';
import * as THREE from 'three';
import { firstVisibleHit } from '../src/interact';

it('點選略過還沒出現（隱藏）的物件', () => {
  const pa = new THREE.Mesh(), pb = new THREE.Mesh();
  const ha = new THREE.Group(), hb = new THREE.Group(); ha.visible = false;
  const map = new Map([[pa, ha], [pb, hb]]);
  expect(firstVisibleHit([{ object: pa }, { object: pb }], map)).toBe(hb);
  expect(firstVisibleHit([{ object: pa }], map)).toBe(null);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/timeline-wiring.test.ts`
Expected: FAIL，`firstVisibleHit` 沒有 export。

- [ ] **Step 3: 實作 `firstVisibleHit`，並讓 `pick()` 改用它**

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/timeline-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: 實作 `createTimelineBar` 和 CSS**

- 版面：畫面底部置中，`▶`／`Ⅱ` 按鈕、`<input type="range" min=0 max=n-1 step=1>`、月份標籤（`monthLabel`）、`SOURCE_START_NOTE`、匯出按鈕（`🎬 匯出影片`，在 Task 8 之前先隱藏）。
- 寬度不能蓋到右下角的 `#help-btn`。
- 手機寬度（≤ 640px）時，如果 `#panel` 有 `.open`，時間軸要讓開，不能擋住側欄的抽屜。

- [ ] **Step 6: 接到 `main.ts`、`interact.ts`、`sidebar.ts`**

- `main.ts`：
  - `const TIMELINE = TIMELINE_DEFAULT || query.has('timeline')`，關閉時島完全維持現狀。
  - 開啟時：
    - `months = monthRange(所有文章最早的月份, 所有文章最晚的月份)`
    - 起始位置 `parseAtParam(query.get('at'), months)`
    - `?play=1` 時從 index 0 開始播放
  - 每幀處理：
    - 播放中：`idx = playIndex(經過秒數, months.length)`，有變化才呼叫 `setMonth(idx, true)`，到最後一個月就停。
    - 拖動滑桿時：暫停，呼叫 `setMonth(i, false)`。
    - 光柱：`updateGlows(holders, t, tl.forcedBeams(), idle)`，其中 `idle = !TIMELINE || (不在播放 && idx 是最後一個月)`。
  - `addLabel` 改成回傳 `(n: number) => void`，用來更新 `<b>` 裡的數字。標籤的 key 是島名：區名去掉「區」字，議會用 `議會`。
  - `spawnPop`：用 CSS2D 在物件上方顯示 `+N`（class `pop`），1 秒後移除。
  - 每次換月份就呼叫 `interaction.setUpto(idx 是最後一個月 ? null : months[idx])`。
- `sidebar.ts`（`upto` 不是 null 時）：
  - 單組和篩選兩種模式都只列 `postsUpTo(posts, upto)`，篇數也跟著改。
  - 標題下方加上 `顯示到 ${monthLabel(upto)}`。
  - 沒有文章時顯示 `到這個時間點還沒有政績`。
  - 單組模式下，建設類的組在 meta 後面加上狀態，用 `stateLabel(groupStateAt(...))`。
  - 展開的文章如果在 `MILESTONES` 裡有 `image`，把 `.ph` 佔位區塊換成 `<img loading="lazy" src=...>`，網址直接連 withyuen.com；沒有 `image` 就保留原本的佔位區塊。這一條不受 `upto` 影響，時間軸關閉時也生效。
- `interact.ts`：
  - hover 提示的篇數改用 upto 之後的篇數。
  - 寫網址時保留 `at`、`timeline`、`play`。現在的 `writeUrl` 本來就只改自己的 key，加一段註解說明就好。

用 `pnpm dev` 開 `?timeline=1` 手動確認：
- 拖滑桿時，物件出現、縮放，數字跟著變。
- `?timeline=1&play=1` 大約 20 秒播完。
- `?timeline=1&at=2024-06` 一打開就停在 2024 年 6 月。
- 選一個議題篩選，再取消，藍圖物件仍然是藍圖。
- `?timeline=1&at=2022-12&g=淡水-school` 側欄能正常打開，顯示「到這個時間點還沒有政績」。
- 不加 `?timeline=1` 時，島跟現在一模一樣。

- [ ] **Step 7: 型別檢查與全部測試**

Run: `pnpm typecheck && pnpm test`
Expected: 無錯誤，全部 PASS。

- [ ] **Step 8: Commit**

```bash
git add src/ui/timeline-bar.ts src/style.css src/main.ts src/interact.ts src/ui/sidebar.ts tests/timeline-wiring.test.ts
git commit -m "feat: 時間軸滑桿接到島上（?timeline=1）"
```

---

### Task 7: 說明文案與 3D 跑不動時的文字清單

**Files:**
- Modify: `src/ui/help.ts`（加「時間軸」段落）
- Create: `src/ui/fallback-list.ts`
- Modify: `src/entry.ts`（沒有 WebGL，或載入 main 失敗時，改顯示清單）
- Test: `tests/fallback-list.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `monthOf`、`monthLabel`；Task 2 的 `Milestones`。
- Produces:
  - `export function fallbackHtml(groups: TimelineGroup[], ms: Milestones): string`：依月份分段，新的在前；每篇顯示日期、標題、`<島>·<類型>`，落地、動工的文章加上 `已落地`、`已動工` 標記；連結開新分頁。標題要做 HTML 跳脫。
  - `export function showFallback(root: HTMLElement): void`
- `help.ts` 加的固定文案：
  - `藍圖`：`爭取中`
  - `施工中`：`已動工`
  - `實體`：`已落地`
  - 一句說明：`議員的角色是爭取與監督；實體建築代表建設已落地，不代表由議員興建。`
  - 只在時間軸開啟時顯示這一段。

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { it, expect } from 'vitest';
import { fallbackHtml } from '../src/ui/fallback-list';

it('依月份分段、新的在前、標記落地、跳脫標題', () => {
  const groups = [{ key: '八里-school', element: 'school', island: '八里', posts: [
    { id: 1, date: '2023-01-05', title: 'A<b>', excerpt: '', link: 'https://x/1', topic: '交通' },
    { id: 3, date: '2024-02-10', title: '完工', excerpt: '', link: 'https://x/3', topic: '交通' }] }];
  const html = fallbackHtml(groups, { '3': { stage: 'done' } });
  expect(html.indexOf('2024 年 2 月')).toBeLessThan(html.indexOf('2023 年 1 月'));
  expect(html).toContain('已落地');
  expect(html).toContain('A&lt;b&gt;');
  expect(html).not.toContain('A<b>');
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/fallback-list.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 `fallbackHtml`、`showFallback`，修改 `entry.ts` 和 `help.ts`**

`entry.ts` 的判斷：
1. `document.createElement('canvas').getContext('webgl2') ?? getContext('webgl')` 拿不到 → 顯示清單。
2. 拿得到就 `import('./main')`，載入失敗（`.catch`）也顯示清單。

清單沿用現有側欄的字體和配色。

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/fallback-list.test.ts && pnpm typecheck`
Expected: PASS

手動確認：Chrome 用 `--disable-webgl` 開 `pnpm dev`，畫面要出現文字清單。

- [ ] **Step 5: Commit**

```bash
git add src/ui/help.ts src/ui/fallback-list.ts src/entry.ts tests/fallback-list.test.ts
git commit -m "feat: 時間軸狀態說明與無 WebGL 時的文字清單"
```

---

### Task 8: 匯出直式縮時影片（要在 Task 1 之後）

**Files:**
- Create: `src/timeline/export-video.ts`
- Modify: `src/main.ts`（匯出流程：鏡頭構圖、暫時把 renderer 改成 1080×1920、錄完恢復）
- Modify: `src/ui/timeline-bar.ts`（顯示匯出按鈕，錄影時停用）
- Test: `tests/export-video.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `monthLabel`、`islandCountsAt`、`BRAND`、`SHARE_URL`；Task 5 的 `createTimeline`；Task 6 的 `setExportBusy`。
- Produces:
  - `export function pickMimeType(isSupported: (t: string) => boolean): { mime: string; ext: 'mp4' | 'webm' } | null`：依序嘗試 `video/mp4;codecs=avc1`、`video/mp4`、`video/webm;codecs=vp9`、`video/webm`。
  - `export function overlayLines(month: string, counts: Record<string, number>): string[]`：回傳 `[monthLabel(month), '淡水 N · 八里 N · 三芝 N · 石門 N · 議會 N', BRAND, SHARE_URL]`，島的順序固定。
  - `export function createExportGuard(): { run<T>(job: () => Promise<T>): Promise<T> }`：上一個工作還沒結束時，新的呼叫會丟出 `Error('busy')`。
  - `export async function recordTimelapse(o: { canvas: HTMLCanvasElement; drawFrame(ctx: CanvasRenderingContext2D, progress: number): void; seconds: number }): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }>`：用合成 canvas 的 `captureStream(30)` 加上 `MediaRecorder` 錄影。

- [ ] **Step 1: 寫會失敗的測試**

```ts
import { it, expect } from 'vitest';
import { pickMimeType, overlayLines, createExportGuard } from '../src/timeline/export-video';

it('優先 mp4，沒有就 webm，都沒有回 null', () => {
  expect(pickMimeType((t) => t.startsWith('video/mp4'))).toEqual({ mime: 'video/mp4;codecs=avc1', ext: 'mp4' });
  expect(pickMimeType((t) => t === 'video/webm')).toEqual({ mime: 'video/webm', ext: 'webm' });
  expect(pickMimeType(() => false)).toBeNull();
});
it('疊字：月份、各島篇數（固定順序）、品牌、網址', () => {
  expect(overlayLines('2024-06', { 議會: 5, 淡水: 1, 八里: 2, 三芝: 3, 石門: 4 })).toEqual([
    '2024 年 6 月', '淡水 1 · 八里 2 · 三芝 3 · 石門 4 · 議會 5', '北海岸政績島｜鄭宇恩', 'https://freddycro.github.io/with-yuen-island/']);
});
it('匯出中再按一次會被擋下', async () => {
  const g = createExportGuard();
  let release!: () => void;
  const first = g.run(() => new Promise<void>((r) => { release = r; }));
  await expect(g.run(async () => 1)).rejects.toThrow('busy');
  release(); await first;
  await expect(g.run(async () => 2)).resolves.toBe(2);
});
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `pnpm vitest run tests/export-video.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 `export-video.ts`**

- [ ] **Step 4: 執行測試，確認通過**

Run: `pnpm vitest run tests/export-video.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `main.ts` 接上匯出流程**

1. 按下按鈕：`setExportBusy(true)`。
2. 錄影前：暫停播放，記下鏡頭位置和 renderer 尺寸。renderer 和 camera 改成 1080×1920（aspect 9:16），鏡頭改成直式構圖、緩慢環繞全島，月份從 index 0 開始。
3. 錄影中：每一幀先畫 WebGL 畫面，再用 `overlayLines` 畫疊字。CSS2D 標籤不會被錄進去，所以數字一定要畫在合成 canvas 上。總長 `PLAY_SECONDS`。
4. 錄完：
   - 下載檔名 `北海岸政績島-YYYYMMDD.<ext>`。
   - 如果 `navigator.canShare?.({ files: [file] })` 為真，再提供「分享」按鈕。
   - 如果格式是 webm，顯示 `這個瀏覽器錄的是 webm，IG 可能要先轉檔`。
   - `pickMimeType` 回傳 `null` 時，顯示「這個瀏覽器不支援錄影」。
5. 不論成功或失敗，都要還原鏡頭、尺寸和月份，最後 `setExportBusy(false)`。

- [ ] **Step 6: 型別檢查、全部測試、手動驗證**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 無錯誤。

手動驗證（CI 沒辦法自動測）：
- 桌機 Chrome 各錄一支，確認是 1080×1920，日期、篇數、網址都在畫面上，長度大約 20 秒。
- iOS Safari 錄一支，確認是 mp4，而且能透過分享面板存到相簿。

- [ ] **Step 7: Commit**

```bash
git add src/timeline/export-video.ts src/main.ts src/ui/timeline-bar.ts tests/export-video.test.ts
git commit -m "feat: 匯出直式縮時影片"
```

---

## 完成後

- Freddy 勾選 `temp/milestone-candidates.md`，然後執行 `node scripts/apply-milestones.mjs` 和 `node scripts/fetch-milestone-images.mjs`。
- 確認畫面沒問題後，把 `src/timeline/config.ts` 的 `TIMELINE_DEFAULT` 改成 `true`，另外 commit 一次。
- 跑完 `fetch-milestone-images.mjs` 之後，側欄就會自動顯示施工、落地照片（Task 6 已經做好顯示的部分），不用另外改程式。
