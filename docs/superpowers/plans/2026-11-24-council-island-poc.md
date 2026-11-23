# 議會島 POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 132 篇議會島貼文放上三格議會島，一篇一個物件（議會大樓除外），顏色表 topic。

**Architecture:** 兩支 Node 腳本產衍生資料（`data/elements.json` 每篇的元素；`data/cells.json` 多一個 `councilTiles` 三格清單），純函式拆到 `scripts/lib/` 用 vitest 測。前端新增 `src/scene/place.ts`（純幾何的佈局函式 + 建 Object3D 的擺放函式），`main.ts` 把議會島從一格改成三格並接上擺放。

**Tech Stack:** Node 22 ESM（.mjs）、Vite 5、TypeScript 5、Three.js 0.160、vitest 2（已在 devDependencies，尚無測試檔）。

**Spec:** `docs/superpowers/specs/2026-11-24-council-island-poc-design.md`

## Global Constraints

- 不改 22 個元素的造型；不重產 `layout.json`、不動 `cells.json` 的地方島部分。
- 不動工作區裡未提交的 `src/scene/bridges.ts`、`src/scene/hex.ts`、`src/scene/mascot/campaign-truck.ts`；commit 時只 `git add` 自己的檔案。
- Node 22、無 Python、腳本不上網；不要把整份 `posts-geo.json` 印進 context。
- 決定性：同一份資料每次長一樣（`mulberry32`，不用 `Math.random`）。
- 每格物件上限常數 `TILE_CAP = 32`；大樓保留圓半徑 1.7；B、C 格心廣場半徑 0.8；物件最小間距 0.9；簇心最小距離 2.2；可用區半徑 `RING_R·R − ROAD_W/2 − WALK_W − 0.4`（R = 7 時 ≈ 3.9）。
- 三格 key：`council`（A）、`council-1`（B，西北）、`council-2`（C，西南）。
- topic 色順序：交通、民生、校園、教育、長照 對應 `gallery-env.ts` 的 `TOPICS` 五色；null → `ELEMENT_PAL.concrete`。大樓圓頂固定 `PAL.council`。
- 測試檔放 `tests/`，`pnpm test` 執行；測試可 import `scripts/lib/*.mjs` 和 `src/scene/place.ts`。

## Review Focus

1. 標題含多個關鍵字時先命中先贏（例如「營養午餐預算」→ council-hall 在前還是 lunch-tray 在前，依規則表順序）— Task 1 測。
2. 某格物件超過 32 時溢出處理必須收斂、且 132 篇一篇不少 — Task 2 測。
3. 物件不能壓到環道：所有位置落在可用區六角形內、不落在大樓保留圓內 — Task 3 測。
4. 同一 element 只有 1 篇時仍要成「簇」（單點），不能被跳過 — Task 3 測。
5. 航路／碼頭的「最近主島格」必須排除三個議會格，否則碼頭指向 B、C — Task 4 驗。

---

### Task 1: 分類規則與腳本 → `data/elements.json`

**Files:**
- Create: `scripts/lib/classify.mjs`（純函式 + 規則表）
- Create: `scripts/classify-elements.mjs`（讀 `temp/posts-geo.json`、寫 `data/elements.json`、印統計）
- Create: `tests/classify.test.ts`

**Interfaces:**
- Produces: `COUNCIL_RULES: Array<{ element: string; keywords: string[] }>`（依序比對）、`classify(post: { island: string; title: string; summary?: string }) => { element: string; matched: string | null }`。非議會島一律 `{ element: 'sign', matched: null }`。
- Produces: `data/elements.json` 形狀 `{ generatedAt, rules, posts: [{ id, island, topic, element, matched }], stats: { council: Record<string, number>, local: Record<string, number> } }`，879 篇、順序同 `posts-geo.json`。

- [ ] **Step 1: Write the failing tests** `tests/classify.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { classify, COUNCIL_RULES } from '../scripts/lib/classify.mjs';
describe('classify', () => {
  it('先命中先贏：規則表第一條是 council-hall', () => {
    expect(COUNCIL_RULES[0].element).toBe('council-hall');
    expect(classify({ island: '議會島', title: '115年總預算審查：營養午餐' }).element).toBe('council-hall');
  });
  it('命中關鍵字回傳 matched', () => {
    expect(classify({ island: '議會島', title: '新北營養午餐用油全面檢驗' })).toEqual({ element: 'lunch-tray', matched: '營養午餐' });
  });
  it('都不中 → sign', () => {
    expect(classify({ island: '議會島', title: '香菜日快樂' })).toEqual({ element: 'sign', matched: null });
  });
  it('非議會島一律 sign', () => {
    expect(classify({ island: '淡水', title: '營養午餐' }).element).toBe('sign');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test` → FAIL（找不到模組）。

- [ ] **Step 3: Implement `scripts/lib/classify.mjs`**

規則表初稿（順序即優先序，建置者依 Step 5 的樣本調整，調整理由寫在檔案註解）：council-hall（質詢、總質詢、總預算、預算審查、定期會、臨時會、施政報告、專案報告、議會）→ lunch-tray（營養午餐、午餐、餐點、毒油、廚工）→ milk（鮮奶、鮮乳、牛奶）→ elder-card（敬老、長輩、高齡、銀髮）→ baby（好孕、生育、托嬰、公托、幼兒、兒少、托育、育兒）→ suitcase（考察、拜會、世博、東京、日本、參訪）→ shield（治安、槍、毒駕、毒品、噪音車、性侵、詐騙、警）→ coin（稅、補助、普發、獎勵金、貸款、統籌分配、津貼）→ flag（黨團、黨務、民進黨、台灣是、國家、青年局）。比對 `title`，用 `includes`。

- [ ] **Step 4: Implement `scripts/classify-elements.mjs`** — 讀 `temp/posts-geo.json`，對每篇呼叫 `classify`，寫 `data/elements.json`（`JSON.stringify(out, null, 1)`，同 assign-cells 風格）。印：council 各 element 篇數、每個 element 隨機 5 筆標題、所有議會島 sign 的標題。

- [ ] **Step 5: Run `node scripts/classify-elements.mjs`，人工看樣本** — 有明顯錯分（例如「跑道」進 crosswalk 這種）就調規則表重跑。sign 大約 40 篇是預期的，不用硬壓。

- [ ] **Step 6: `pnpm test` PASS；commit**

```bash
git add scripts/lib/classify.mjs scripts/classify-elements.mjs tests/classify.test.ts data/elements.json
git commit -m "議會島分類：關鍵字規則表 → data/elements.json"
```

---

### Task 2: 議會島分三格 → `cells.json.councilTiles`

**Files:**
- Create: `scripts/lib/council-split.mjs`
- Modify: `scripts/assign-cells.mjs`（讀 `data/elements.json`，輸出 `councilTiles`）
- Create: `tests/council-split.test.ts`

**Interfaces:**
- Consumes: `data/elements.json` 的 `posts[]`（Task 1）。
- Produces: `TILE_CAP = 32`、`splitCouncil(posts: Array<{ id: number; element: string; topic: string | null }>) => Array<{ key: 'council' | 'council-1' | 'council-2'; posts: Array<{ id, element, topic }> }>`（固定三個，順序 A、B、C）。
- Produces: `cells.json` 新欄位 `councilTiles`（同上形狀）；既有欄位不變。

- [ ] **Step 1: Write the failing tests** `tests/council-split.test.ts`

```ts
import { splitCouncil, TILE_CAP } from '../scripts/lib/council-split.mjs';
const p = (id, element, topic = null) => ({ id, element, topic });
it('依 element 分格：hall→A，民生四種→B，政務四種→C', () => {
  const r = splitCouncil([p(1,'council-hall'), p(2,'milk'), p(3,'baby'), p(4,'coin'), p(5,'flag')]);
  expect(r.map(t => t.posts.map(x => x.id))).toEqual([[1], [2,3], [4,5]]);
});
it('sign 依 topic：民生/校園/教育/長照→B、交通→C、null→A', () => {
  const r = splitCouncil([p(1,'sign','民生'), p(2,'sign','校園'), p(3,'sign','交通'), p(4,'sign',null)]);
  expect(r.map(t => t.posts.map(x => x.id))).toEqual([[4], [1,2], [3]]);
});
it('超過 TILE_CAP 時先把該格的 sign 移到最少的格，總數不變', () => {
  const posts = [...Array(30)].map((_, i) => p(i, 'coin')).concat([...Array(6)].map((_, i) => p(100 + i, 'sign', '交通')));
  const r = splitCouncil(posts);
  expect(r.every(t => t.posts.length <= TILE_CAP)).toBe(true);
  expect(r.flatMap(t => t.posts).length).toBe(36);
});
it('sign 移完仍超過，把最多的那類物件移到 A', () => {
  const r = splitCouncil([...Array(40)].map((_, i) => p(i, 'coin')));
  expect(r[2].posts.length).toBe(TILE_CAP); expect(r[0].posts.length).toBe(8);
});
```

- [ ] **Step 2: `pnpm test` → FAIL**
- [ ] **Step 3: Implement `splitCouncil`** — 先依 element 表分（`council-hall`→A；`lunch-tray|milk|baby|elder-card`→B；`coin|shield|suitcase|flag`→C；`sign` 依 topic），再迴圈：任一格 > `TILE_CAP` 時，從該格移一支 sign 到當下物件最少的格；該格沒 sign 了仍超過，就把該格篇數最多的非 hall element 逐篇移到 A；直到都 ≤ cap 或 A 也滿（此時 throw，資料上不會發生）。保留原順序（穩定）。
- [ ] **Step 4: Modify `scripts/assign-cells.mjs`** — 讀 `data/elements.json`，建 `id → {element, topic}`，把 `council.posts` 轉成 `{id, element, topic}` 後丟進 `splitCouncil`，輸出 `councilTiles`；`console.table` 三格各 element 數。
- [ ] **Step 5: `node scripts/assign-cells.mjs`，確認** `councilTiles` 三格總和 132、`council` 仍 132、`cells[]` 和之前 diff 只差 `generatedAt`（`git diff data/cells.json` 看）。
- [ ] **Step 6: `pnpm test` PASS；commit**

```bash
git add scripts/lib/council-split.mjs scripts/assign-cells.mjs tests/council-split.test.ts data/cells.json
git commit -m "議會島分三格：councilTiles（hall→A、民生→B、政務→C、sign 依 topic、上限 32）"
```

---

### Task 3: 佈局與擺放 `src/scene/place.ts` + topic 色

**Files:**
- Create: `src/scene/place.ts`
- Modify: `src/scene/palette.ts`（加 `TOPIC`）
- Modify: `src/types.ts`（加 `CouncilTile` 型別給 `cells.json`）
- Create: `tests/place.test.ts`

**Interfaces:**
- Consumes: `RING_R, ROAD_W, WALK_W` from `./roads`、`mulberry32` from `./hex`、`elementFor` from `./elements`、`ELEMENT_PAL`。
- Produces（palette.ts）：`TOPIC: Record<string, number>`，key 為 `交通|民生|校園|教育|長照|null`（null 用字串 `'null'`）；`topicColor(topic: string | null): THREE.Color`。
- Produces（place.ts，純幾何）：
  - `councilTileOffsetsM(edgeM: number): Array<[number, number]>` → `[[0,0], [-1.5e, +0.866e], [-1.5e, -0.866e]]`（版面公尺，y 朝北；B 西北、C 西南）。
  - `layoutTile(posts: Array<{ id: number; element: string; topic: string | null }>, opts: { R: number; seed: number; reserve: number }) => Array<{ id: number; element: string; topic: string | null; x: number; z: number; rot: number }>`。`reserve` 是格心保留半徑（A 1.7、B/C 0.8）。`council-hall` 不在輸出裡（由擺放函式固定放格心）。
  - `inHex(x: number, z: number, r: number): boolean`（從 `gallery-env.ts` 搬過來並 export，gallery-env 改 import）。
- Produces（place.ts，Three）：`placeCouncilTile(tile: HexColumn, R: number, posts: CouncilTile['posts'], seed: number, isMain: boolean): number`（回傳擺上的物件數；`isMain` 時在格心建 `council-hall`，`count` = hall 篇數、color `PAL.council`）。

- [ ] **Step 1: Write the failing tests** `tests/place.test.ts`

```ts
import { layoutTile, councilTileOffsetsM, inHex } from '../src/scene/place';
import { RING_R, ROAD_W, WALK_W } from '../src/scene/roads';
const R = 7, usable = RING_R * R - ROAD_W / 2 - WALK_W - 0.4;
const mk = (n, element, topic = null) => [...Array(n)].map((_, i) => ({ id: i, element, topic }));
it('三格位移：B 西北、C 西南，格心距 √3·edge', () => {
  const [a, b, c] = councilTileOffsetsM(3500);
  expect(a).toEqual([0, 0]); expect(Math.hypot(...b)).toBeCloseTo(Math.sqrt(3) * 3500, 0); expect(b[1]).toBeGreaterThan(0); expect(c[1]).toBeLessThan(0);
});
it('32 個物件都在可用區內、不進保留圓、彼此間距 ≥ 0.9', () => {
  const out = layoutTile([...mk(12, 'coin'), ...mk(7, 'shield'), ...mk(9, 'suitcase'), ...mk(4, 'sign', '交通')], { R, seed: 1, reserve: 0.8 });
  expect(out.length).toBe(32);
  for (const p of out) { expect(inHex(p.x, p.z, usable)).toBe(true); expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(0.8); }
  for (const p of out) for (const q of out) if (p !== q) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(0.9 - 1e-9);
});
it('同 element 成簇：同類物件離自己簇心比離別簇近；單篇也有位置', () => {
  const out = layoutTile([...mk(6, 'milk'), ...mk(1, 'baby')], { R, seed: 2, reserve: 0.8 });
  expect(out.filter(p => p.element === 'baby').length).toBe(1);
  const milk = out.filter(p => p.element === 'milk'); const cx = milk.reduce((a, p) => a + p.x, 0) / 6, cz = milk.reduce((a, p) => a + p.z, 0) / 6;
  for (const p of milk) expect(Math.hypot(p.x - cx, p.z - cz)).toBeLessThan(2.2);
});
it('決定性：同 seed 同結果', () => {
  const a = layoutTile(mk(10, 'coin'), { R, seed: 3, reserve: 0.8 }), b = layoutTile(mk(10, 'coin'), { R, seed: 3, reserve: 0.8 });
  expect(a).toEqual(b);
});
it('council-hall 不進輸出', () => { expect(layoutTile(mk(3, 'council-hall'), { R, seed: 1, reserve: 1.7 })).toEqual([]); });
```

- [ ] **Step 2: `pnpm test` → FAIL**
- [ ] **Step 3: `palette.ts` 加 `TOPIC` 與 `topicColor`**；`types.ts` 加 `export interface CouncilTile { key: string; posts: Array<{ id: number; element: string; topic: string | null }> }`。
- [ ] **Step 4: Implement `layoutTile`** — 演算法：
  1. 依 element 分組（排除 `council-hall`），sign 另外處理。
  2. 非 sign 的組：簇心取樣——用 `mulberry32(seed)` 在半徑 `usable − 1.0` 的圓內取點（`sqrt(rng)` 分布），拒絕 `< reserve + 1.0`、拒絕離已有簇心 `< 2.2`，最多試 400 次。組內物件以簇心為中心、黃金角螺旋（`r = 0.55·sqrt(k)`, `a = k·2.39996`）擺，每個點拒絕：不在 `inHex(usable)`、進保留圓、離任何已放物件 `< 0.9`，拒絕就 k++ 繼續。
  3. sign：沿半徑 `usable − 0.45` 的六角環等距排（最多 25），多的併成一簇走第 2 步。
  4. `rot` = 朝向格心的角度加 `(rng − 0.5)·0.6`。
- [ ] **Step 5: Implement `placeCouncilTile`** — 呼叫 `layoutTile`，對每筆 `elementFor(element).build({ color: topicColor(topic), rng: mulberry32(seed * 7919 + id), count: 1 })`，`position.set(x, tile.userData.topY, z)`、`rotation.y = rot`、`tile.add`。`isMain` 時先建大樓放格心。
- [ ] **Step 6: `gallery-env.ts` 改成 import `inHex`**，`pnpm typecheck` 通過。
- [ ] **Step 7: `pnpm test` PASS；commit**

```bash
git add src/scene/place.ts src/scene/palette.ts src/types.ts src/gallery-env.ts tests/place.test.ts
git commit -m "議會島擺放：layoutTile（成簇、間距、保留圓）、placeCouncilTile、topic 色"
```

---

### Task 4: 接進 `main.ts`：三格、航路、鏡頭

**Files:**
- Modify: `src/main.ts`（「議會島」區塊、「議會島航路」區塊、鏡頭區塊）
- Modify: `README.md`（網址參數加 `?cam=council`、`?elements=0`；資料段加 `elements.json` 與 `councilTiles`）

**Interfaces:**
- Consumes: `councilTileOffsetsM`、`placeCouncilTile`（Task 3）、`cellsJson.councilTiles`（Task 2）。

- [ ] **Step 1: 三格** — 用 `councilTileOffsetsM(layout.edgeM)` 對 `layout.council` 建三個 `hexColumn`（色 `PAL.council`、seed 7、8、9），key `council`、`council-1`、`council-2` 放進 `byKey`；移除臨時圓頂；島名標籤仍掛在 `council`。
- [ ] **Step 2: 擺放** — 在 `buildRoads` 之後、橋之前：若 `!query.has('elements') || query.get('elements') !== '0'`，對 `cellsJson.councilTiles` 逐格 `placeCouncilTile(byKey.get(t.key), R, t.posts, idx + 11, t.key === 'council')`；`console.info('議會島物件', n)` 一次。
- [ ] **Step 3: 航路** — 「最近主島格」的 filter 改成 `!k.startsWith('council')`。
- [ ] **Step 4: 鏡頭** — `?cam=council`：`mode = 'free'`，相機在 A 格位置 + (26, 14, 18)，`controls.target` = 三格中心、y 2。
- [ ] **Step 5: 驗證** — `pnpm typecheck && pnpm test && pnpm build` 全過。`pnpm dev` 後用瀏覽器開 `http://localhost:5173/?cam=council&still=1` 與 `?cam=top&still=1`，截圖到 `temp/shot-council-side.png`、`temp/shot-council-top.png`（用 Chrome 工具；沒有就請使用者截）。肉眼檢查：三格相連、碼頭在 A 東南側指向主島、大樓在 A 中央、物件沒壓環道、簇看得出種類、`?elements=0` 時三格是空的。console 沒有錯誤。
- [ ] **Step 6: README 更新；commit**

```bash
git add src/main.ts README.md
git commit -m "議會島三格上線：132 篇一篇一個物件、?cam=council、?elements=0"
```

---

## Self-review 備註

- 規格每一節都有對應：分類 → Task 1；分格 → Task 2；版面、擺放、topic 色 → Task 3 + Task 4 Step 1；接線、航路排除、鏡頭 → Task 4；驗證 → Task 4 Step 5。「可重跑且結果相同」由 Task 1/2 的決定性規則與 Task 3 的決定性測試覆蓋。
- 型別：`CouncilTile['posts']` 的形狀（`{id, element, topic}`）在 Task 2 輸出、Task 3 輸入一致；`layoutTile` 的 `opts.R` 是場景單位的格邊長（main.ts 的 `R`）。
