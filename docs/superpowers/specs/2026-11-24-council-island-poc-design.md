# 議會島 POC：三格、一篇一個物件（2026-11-24）

## 意圖

先在議會島上把政績放上去，驗證「貼文 → 元素 → 格 → 場景」這條管線，以及 22 個元素在真實密度下的樣子。
議會島是最適合先做的：132 篇、沒有地理位置、物件都是象徵性的生活物品，不用處理位置語意。

## 目標 / 非目標 / 反目標

- 目標：132 篇議會島貼文全部上島，一篇一個物件（議會大樓例外），顏色表 topic。打開 `?cam=council` 一眼看得出「這裡有很多事」。
- 目標：管線是腳本產生的衍生資料，可重跑；分類規則是資料不是程式碼。
- 非目標：地方島四島的元素（下一步，同一條管線補規則）。位置語意、人車、標籤、互動。
- 反目標：把物件均勻撒成一片，看起來像隨機貼圖；或是聚合成九個圖示，看不出 132 篇的量。

## 現況（已查證）

- 22 個元素已完成（[src/scene/elements/](../../../src/scene/elements/)），議會島 9 種：council-hall、lunch-tray、milk、elder-card、baby、suitcase、shield、coin、flag，加兜底 sign。契約見 `elements/types.ts`。
- `temp/posts-geo.json` 有 879 篇，`island === '議會島'` 的 132 篇即 `confidence === 'none'`。topic 分布：null 78、民生 22、校園 14、交通 10、教育 7、長照 1。
- `data/cells.json` 的 `councilPosts` 已列出 132 個 id，但沒有「每篇是哪個元素」。`temp/elements.json` 還沒產出。
- 議會島在 `layout.council`（x −26250, y 0），離主島最近的格超過 3.6 R，周圍沒有東西；面向主島的方向是 +x（東）。
- 路網 `buildRoads` 會自動把格心距 ≈ √3 R 的格用門接起來；航路與小船接到離 `council` 最近的主島格。
- 用標題關鍵字粗分：council-hall 26、baby 12、coin 12、suitcase 9、flag 7、shield 7、lunch-tray 6、elder-card 5、milk 3、sign 45。
- 一格環道內側（半徑 ≈ 0.70 R − 0.55/2 − 0.32 ≈ 4.3 單位）約可放 30–35 個一單位的物件。

## 考慮過的做法

| | 一格、聚合九組 | **三格、一篇一個物件（選定）** | 照 cell-layout 規格全做 |
|---|---|---|---|
| 量感 | 九個圖示，看不出 132 篇 | 約 100 個物件分三格，有量 | 同左 |
| 工作量 | 小 | 中（約一天） | 大 |
| 跟地方島的差別 | 無 | 地方島聚合、議會島一篇一個，符合規格定案 | 同左 |

選三格。使用者說一格太小的話最多三格。

## 設計

### 版面：三格緊湊三角形

- 格 A（`council`，現有位置）：議會大樓固定在格心；碼頭、航路、島名標籤（132）都留在這格。
- 格 B、C：A 的兩個相鄰格，放在 A 的西側（遠離主島），成三角形：flat-top 六角格的相鄰格在格心距 √3 R、方向角 30° + 60°k；取 k 對應 150° 與 210°（西北、西南）。
- POC 階段三格座標由 `main.ts` 從 `layout.council` 推出，不重產 `layout.json`；三格 key 為 `council`、`council-1`、`council-2`。方向確定後再搬進 `scripts/hex-plan.mjs` 輸出 `council.cells`。
- 三格顏色都用 `PAL.council`，高度同主島。相鄰格的門由 `buildRoads` 自動接起來（key 以 `council` 開頭的格之間也要接；目前的相鄰判斷只看距離，不用改）。

### 分類：`scripts/classify-elements.mjs` → `data/elements.json`

- 輸入 `temp/posts-geo.json`（必要時加 `temp/withyuen-api-20261124/posts-page-*.json` 的內文前段）。
- 規則是一張表（陣列），每條 `{ island: 'council', element, keywords: [...] }`，依序比對標題，先命中先贏；都不中 → `sign`。順序大致：council-hall（質詢、總預算、定期會…）→ lunch-tray → milk → elder-card → baby → suitcase → shield → coin → flag。實際順序與關鍵字由建置者依樣本調整並記錄在檔案裡。
- 輸出每篇 `{ id, island, topic, element, matched }` 和 `stats`，879 篇全部輸出；這一步只有 `island === '議會島'` 的有 council 規則，地方島的先一律 `sign`（下一步補）。
- 關鍵字要誠實：對不到九種物件的就是 sign（估計約 40 篇：香菜日、跆拳道、鼠患、殯葬、居住正義、亞運衝浪、YouBike、疫苗…），不用 topic 當第二層兜底，也不硬塞。使用者已決定。
- 驗收：每個 element 印 5 筆標題人工看，不能有明顯錯分；印出所有 sign 標題，確認裡面沒有明顯該命中的。
- `data/elements.json` 進 git（衍生資料，同 `cells.json`）。

### 分格：`scripts/assign-cells.mjs` 擴充

- 讀 `data/elements.json`，把議會島 132 篇分到三格，輸出到 `cells.json` 的 `councilTiles: [{ key, posts: [{ id, element, topic }] }]`。
- 分法：
  - 格 A：所有 council-hall（一棟大樓代表全部，大樓的 `count` = 篇數）。
  - 格 B（民生）：lunch-tray、milk、baby、elder-card。
  - 格 C（政務）：coin、shield、suitcase、flag。
  - sign 依 topic 分散到三格：民生／校園／教育／長照 → B，交通 → C，null → A；放完後若某格超過 32 個物件，把該格的 sign 移到物件最少的格，直到都 ≤ 32；仍超過就把最多的那類物件部分移到 A。閾值 32 寫成常數。
  - 用粗分數字試算：C = coin 12 + shield 7 + suitcase 9 + flag 7 = 35，會有物件移到 A；這是預期的。
- `council` 總數標籤仍是 132。

### 擺放：`src/scene/place.ts`

- `placeCouncilTile(tile, R, posts, seed)`：
  - 可用區 = 人行道內側六角形（半徑 `RING_R·R − ROAD_W/2 − WALK_W − 0.4`，約 3.9），格心半徑 1.7 的圓留給大樓（台基 2.2 × 2.2，對角 1.56；只有格 A 有大樓；B、C 格心也留空當小廣場，半徑 0.8）。
  - 同 element 成簇：依 element 分組，每組先選一個簇心（簇心之間最小距離 2.2，以格心為原點用決定性亂數在可用區取樣），組內物件圍著簇心以半徑遞增的螺旋放，物件最小間距 0.9。
  - sign 不成簇：沿人行道內側一圈等距排（一圈約 23 單位，間距 0.9 最多約 25 支）；超過的併進可用區當一簇。
  - 決定性亂數 `mulberry32(seed)`，seed 由格 key 推出；同一份資料每次長一樣。
  - 元素的 `color` 查 topic 色表；`count` 一律 1（大樓除外）。大樓的 `color`（圓頂）固定用 `PAL.council`，不看 topic——它代表 26 篇混合主題，是島上最醒目的物件。
  - 所有 mesh 開 castShadow（元素自己已開）。
- 不碰路、不碰山（議會島沒有山）。

### topic 色：`src/scene/palette.ts`

- 加 `TOPIC: Record<string, number>`：交通、民生、校園、教育、長照、null 各一色。先用圖庫 `gallery-env.ts` 的 `TOPICS` 五色依這個順序對應，null 用 `ELEMENT_PAL.concrete`（78/132 篇是 null，島會偏灰；這是資料的實情，先照實呈現，不好看再議）。隨 `?palette=` 換色盤這次不做。

### 接線：`src/main.ts`

- 議會島那段改為：建三格 → 路網 → `placeCouncilTile` × 3；移除現有的臨時圓頂。
- 航路與碼頭找「最近的主島格」時要排除所有 `council*` key，否則會指到 B、C。碼頭在 A 的東南門（主島最近格 (-2,-1) 在 −56°），和 B、C 用的西側門不衝突。
- 新增 `?cam=council`：鏡頭從東南方斜看三格；`?elements=0` 不擺元素。
- 元素總數和 draw call 印在 console 一次（看效能）。

## 限制

- 不改 22 個元素的造型；擺不下就調分格閾值，不縮元素。
- 不重產 `layout.json`、`cells.json` 的地方島部分。
- Node 22、無 Python；分類腳本不上網。
- 工作區裡 `bridges.ts`、`hex.ts`、`mascot/campaign-truck.ts` 有使用者未提交的改動，不動、不 revert。

## 驗證

- `pnpm typecheck`、`pnpm build` 通過；`node scripts/classify-elements.mjs` 與 `node scripts/assign-cells.mjs` 可重跑且結果相同（`generatedAt` 除外）。
- `?cam=council&still=1` 和 `?cam=top&still=1` 截圖到 `temp/shot-council-*.png`，和 `temp/shot-build-top.png` 比對主島沒變。
- 肉眼檢查：三格物件數量看起來有量、簇看得出種類、沒有物件壓到環道、大樓在格 A 中央。

## 留給建置者

- 關鍵字表的實際內容與順序。
- 簇心取樣與螺旋的具體參數，只要符合最小間距。
- `?cam=council` 的鏡頭位置。
- B、C 哪個在西北、哪個在西南。
