# 渡輪與三個漁港（2026-11-24）

## 意圖

島上第一個會動的東西：一艘照使用者給的照片（白船身、棕色下緣、藍吃水線、兩層艙、桅杆彩旗）做的渡輪，
在三個漁港之間巡航、靠港停泊。漁港用 gallery 已有的 `port` 元素。取代 main.ts 現有的臨時小白船、
虛線航路與兩段手寫碼頭（使用者要求刪掉原本的碼頭）。

## 目標 / 非目標

- 目標：渡輪進 gallery（競選車旁）；三港在指定位置；船沿閉環航線行駛、進港減速、停泊數秒、掉頭出港；航線不穿島不穿橋。
- 非目標：隨機航線、乘客、競選車上船、和議會島物件的互動。

## 已查證的現況

- `port` 元素：原點底面中心，水面在 +z 前方、木棧碼頭在 −z 後緣。
- 路網 `buildRoads` 給每格六個門（世界座標，y = 頂面 + ROAD_Y）；`gateDir(i)` 角度 i·60°+30°。
- 版面（R = 邊長）：以議會島 A 為原點，八里 (-2,-1) 在 (2.10, −3.12)、淡水 (-2,0) 在 (4.50, 0)、淡江大橋連 (-2,-1)→(-2,0)。
- 海灘環頂面 y = TOP_H + 0.25 = 1.85；格頂面 topY = 2.3。
- 另一個 agent 正在改 `src/gallery.ts`（民眾）、`scripts/classify*`、`data/elements.json`、`src/scene/citizens/`；本工作只在 gallery.ts 加最少的幾行，其他不碰。

## 設計

### 三港 `src/scene/harbours.ts`

- `HARBOURS`：`council` 門 5（東南，朝八里）、`-2,-1` 門 2（西北，朝議會島）、`-2,0` 門 2（西北，河口）。
- `harbourGeometry(center, topY, R, gate)`（純函式）回傳 `{ gatePos, pierEnd, portPos, portRot, dock, offshore }`：
  - 門的方向上格邊是邊心距 0.866 R（不是 R）；頂面邊約 0.77 R。碼頭從門平走到 0.74 R（頂面上），再斜下到 0.83 R（海灘環上，y = 1.91），寬 0.5。
  - `portPos` = 格心 + dir·(0.866 R − 0.25)，y = 1.85：木棧在海灘環上、水面伸出格邊；`portRot` 讓元素的 +z 朝 dir。
  - `dock` = 格心 + dir·1.38 R，y = 0.1（船停泊點，船頭朝港）。
  - `offshore` = 格心 + dir·2.05 R，y = 0.1（離岸航點）。
- `buildHarbour(scene, tile, R, gate)`：建碼頭 mesh 與 `port` 元素（color 用 `PAL.council`、rng 固定），回傳幾何。

### 航線 `src/scene/ferry-route.ts`

- 閉環順序：議會島 → 八里 → 淡水 → 議會島。每港三個點：offshore → dock（停泊）→ offshore。
- `buildRoute(harbours)` → `Leg[]`，`Leg = { from, to, len, dockAtEnd }`。
- `routeState(legs, t, { speed: 2.4, dwell: 4 })` → `{ pos, heading, docked }`：進出港段二次緩動、時長加倍（離岸端速度 = 巡航速度）；船的 y 放 −0.04 讓船底略沉入海面（海面 y = −0.05）；停泊時 heading 在 dwell 內平滑轉 180°，出港船頭朝外。純時間函式，決定性。
- 航線畫成淡虛線。
- 測試：每段取樣，除了「到自己的港」那段以外，每點離所有格心（含議會島三格）≥ 1.25 R；航線不與兩座橋的端點連線相交。

### 渡輪 `src/scene/mascot/ferry.ts`

- `buildFerry(): Mascot`（同競選車的介面：`object` + `update(t)`）。
- 原點船底中心、y 朝上、船頭朝 +x；建模長 2.4、寬 0.7，整體放大 1.5 倍（使用者要求再大 50%）。`accent` 換下緣帶與船尾旗色。
- 造型（≤ 14 mesh，flatShading、無貼圖、無文字）：白色船身、船首楔形、棕色下緣帶、藍色吃水線、下層艙長窗帶、上層駕駛艙、頂棚、桅杆 + 一串彩色小旗斜拉到船首、船尾小旗。`update(t)` 做微微起伏與側搖。
- gallery：放在競選車右側 2.6 單位處，標籤「渡輪（吉祥物）」。

### 接線 `src/main.ts`

- 刪除：臨時小船、虛線航路、兩段手寫碼頭、「最近主島格」邏輯。
- 新增：三港、航線虛線、渡輪；動畫迴圈裡用 `routeState` 更新位置與朝向，再 `ferry.update(t)`。
- 加 `?cam=harbour` 看淡水河口的港與船。

### 第二艘船（2026-11-24 追加）

- 藍色帶的同款船，沿 `islandLoop` 繞主島一圈不靠港：每個主島格心外推 1.45 R 取 12 點做凸包，頂點連成閉環，速度 2.0。淨空測試同樣 ≥ 1.25 R（含議會島三格）。

## 驗證

- `pnpm test`（航線淨空、港口幾何、渡輪尺寸）、`pnpm typecheck`、`pnpm build`。
- 截圖：`?gallery=1&mascot=1` 看船；`?cam=top&still=1` 看三港與航線；`?cam=harbour&still=1` 看靠港。

## 留給建置者

- 渡輪各部件的精確尺寸與顏色值；彩旗顏色；航線虛線透明度；鏡頭參數。
