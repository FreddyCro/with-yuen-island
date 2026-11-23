# 渡輪與三港 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一艘渡輪在議會島、八里、淡水三個漁港之間巡航停泊；三港用 `port` 元素；刪掉原本的碼頭與小船。

**Architecture:** 三個新模組：`harbours.ts`（港口幾何 + 建碼頭與 port）、`ferry-route.ts`（閉環航線 + 純時間狀態函式）、`mascot/ferry.ts`（船的造型）。main.ts 只做接線與動畫迴圈。純幾何全部可在 node 用 vitest 測。

**Tech Stack:** TypeScript、Three.js 0.160、vitest。

**Spec:** `docs/superpowers/specs/2026-11-24-ferry-harbours-design.md`

## Global Constraints

- 不碰另一個 agent 正在改的檔（`scripts/classify*`、`data/elements.json`、`tests/classify.test.ts`、`src/scene/citizens/`、`campaign-truck.ts`、`bridges.ts`、`hex.ts`）；`src/gallery.ts` 只加渡輪那幾行。commit 只 add 自己的檔。
- 數值：碼頭末端 0.95 R、港 1.0 R、停泊 1.38 R、離岸 2.05 R、海灘環 y 1.85、船速 2.4、停泊 4 s、淨空 1.25 R。
- 船：長 2.4、寬 0.7、原點船底中心、船頭 +x、≤ 14 mesh、無貼圖無文字。
- 決定性：無 `Math.random`。

## Review Focus

1. 停泊時船頭掉頭 180° 要平滑，不能瞬間跳 — Task 2 測 heading 連續。
2. 航線任何一段不得穿過格子或橋 — Task 2 測。
3. 港口的 `port` 元素水面要朝海（+z 朝 dir）— Task 1 測 portRot。
4. 刪掉舊碼頭後 `roads.gates` 仍要給三格 — Task 4 驗 typecheck/截圖。
5. `?elements=0` 時港與船仍在（不是政績物件）— Task 4 驗。

---

### Task 1: 港口幾何與建造 `src/scene/harbours.ts`

**Files:** Create `src/scene/harbours.ts`、`tests/harbours.test.ts`。

**Interfaces:**
- Produces: `HARBOURS: Array<{ key: string; gate: number; name: string }>`；
  `harbourGeometry(center: Vector3, topY: number, R: number, gate: number): { gatePos, pierEnd, portPos, portRot: number, dock, offshore }`（世界座標）；
  `buildHarbour(scene, tile: HexColumn, R, gate)` 回傳同上。

- [ ] Step 1 測試 `tests/harbours.test.ts`：`harbourGeometry(new Vector3(0,0,0), 2.3, 7, 5)`：dock 距 ≈ 1.38·7、offshore ≈ 2.05·7、portPos ≈ 7 且 y = 1.85、pierEnd y = 1.91、gatePos y = 2.32；各點方向與 `gateDir(5)` dot ≈ 1；`new Vector3(0,0,1).applyAxisAngle(Y, portRot)` ≈ gateDir(5)。
- [ ] Step 2 `pnpm test` → FAIL。
- [ ] Step 3 實作（碼頭 `BoxGeometry(len, 0.08, 0.5)` 從 gatePos 斜到 pierEnd；port 用 `elementFor('port').build({ color: new Color(PAL.council), rng: mulberry32(5) })`）。
- [ ] Step 4 PASS、typecheck；commit。

### Task 2: 航線與時間狀態 `src/scene/ferry-route.ts`

**Files:** Create `src/scene/ferry-route.ts`、`tests/ferry-route.test.ts`。

**Interfaces:**
- Produces: `buildRoute(h: Array<{ dock: Vector3; offshore: Vector3 }>): Leg[]`，`Leg = { from; to; len; dockAtEnd }`（off0→dock0, dock0→off0, off0→off1, off1→dock1, …, off2→off0）；
  `routeState(legs, t, opts?: { speed?; dwell? }): { pos: Vector3; heading: number; docked: boolean }`；
  `routeClearance(legs, centers: Vector3[], R): number`（排除靠港段的最小淨空）；
  `routePeriod(legs, opts?)`。

- [ ] Step 1 測試：用 layout.json 真實格心（含議會島三格）與 Task 1 幾何算三港 → `routeClearance ≥ 1.25 R`；offshore 間的段不與兩座橋端點連線相交；`routeState` 每 0.05 s 取樣一週期：heading 變化 ≤ 0.25 rad/步（wrap 後）；docked 時 pos 不動；週期後狀態相同。
- [ ] Step 2 FAIL → Step 3 實作 → Step 4 PASS、commit。

### Task 3: 渡輪造型 `src/scene/mascot/ferry.ts` + gallery

- [ ] Step 1 測試 `tests/ferry.test.ts`：`buildFerry().object` 的 Box3：x 長 2.3–2.5、z 寬 0.6–0.8、min.y ≈ 0、max.y 0.9–1.3；mesh ≤ 14；`update(1)` 不丟錯。
- [ ] Step 2 FAIL → Step 3 實作 → Step 4 PASS。
- [ ] Step 5 gallery：競選車那段後加渡輪於 `(mx + 2.6, 0, mz)`，標籤「渡輪（吉祥物）」，加進每幀更新；typecheck；commit（只 add ferry.ts、ferry.test.ts、gallery.ts）。

### Task 4: 接線 `src/main.ts`

- [ ] Step 1 刪掉「議會島航路」整段；加三港、航線虛線、渡輪；動畫迴圈套 `routeState` + `ferry.update(t)`。
- [ ] Step 2 `?cam=harbour`：看淡水河口港（`-2,0` 門 2）。
- [ ] Step 3 `pnpm typecheck && pnpm test && pnpm build`；dev server 5190 截圖 `?cam=top&still=1`、`?cam=harbour&still=1`、`?gallery=1&mascot=1`。
- [ ] Step 4 README 加 `?cam=harbour`；commit。
