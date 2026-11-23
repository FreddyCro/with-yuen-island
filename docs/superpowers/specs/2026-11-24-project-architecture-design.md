# 北海岸政績島 — 專案架構設計（2026-11-24）

## 意圖

把鄭宇恩議員網站（withyuen.com）2022–2026 的 879 篇問政紀錄，做成一座可以看的 3D「政績島」：
淡水、八里、三芝、石門四區拼成六角格的北海岸輪廓，淡水河隔開八里與淡水、兩座橋相連，
沒有地理位置的新北全區貼文放在外海的「議會島」。靈感來自沈伯洋的「HEART 政策島」，
但形式刻意拉開：真實輪廓、真實的橋、資料是已發生的事而不是承諾。

## 目標 / 非目標

- 目標：打開就能看、能轉、好看；**同區同類型的政績收成一個物件，點物件在側欄看該組政績**
  （2026-11-24 改，見 [分組物件與政績側欄](2026-11-24-groups-sidebar-design.md)；原本是「每篇一棟、純展示」）。
- 非目標：搜尋、持續更新、CMS。資料是 2026-11-24 的一次性快照。
- 反目標：做成政策島的複製品（六角浮島、小人走協作線）。

## 已定案的設計（見 `temp/hex-plan/FINAL.md`，已搬到 `data/layout.json`）

- 六角格邊長 3500 m（名目），地理放大 1.39×；14 格 + 議會島 1 格。
- 格數 = 14 × (0.5·面積占比 + 0.5·政績占比)：淡水 6、八里 3、三芝 3、石門 2。
- 八里整塊沿晶格向西南平移一格，留出一格寬的淡水河。
- 淡江大橋：單塔不對稱斜張，塔偏淡水端、長跨朝八里。關渡大橋：三連拱。
- 視覺語言：厚沙色六角柱 + 海灘環 + 淺水環，區色頂面，山區用錐體山丘與低多邊形樹表達海拔。

## 技術選擇

考慮過：

| | 零建置原生 ES module（政策島做法） | **Vite + TypeScript + 原生 Three.js** | Vite + React + R3F |
|---|---|---|---|
| 工具鏈 | 無 | 輕 | 中 |
| 型別 | 無 | 資料 schema 前後共用 | 同左 |
| three 體積 | 整包 670 KB | tree-shaking | tree-shaking |
| 適合 | 一次性展示 | 展示 + 資料管線 + 可測 | 有狀態的互動 |

選 **Vite + TS + 原生 Three.js**：沒有互動所以不需要 React；資料管線（落格邏輯）值得有型別和測試；
產出仍是純靜態 `dist/`。`base: './'` 用相對路徑，同一份產物可放 GitHub Pages 或 withyuen.com 子目錄。

不用 happy-path/soft-island 的渲染器（它是圓形真實地圖，和六角格路線不同），只借它的 `tw.dem.bin` 當高程來源。

## 目錄

```
data/          衍生資料，進 git：layout.json（版面）、boundaries/（四區 OSM 邊界）、之後的 posts-geo.json、cells.json
scripts/       Node 管線：hex-plan.mjs（版面產生）、之後的 fetch-wp / geocode / assign-cells
src/           前端：main.ts、scene/（hex、bridges、palette）、types.ts
docs/          本文件與後續 spec
temp/          gitignore：WP 抓取結果、原型、截圖、DEM
```

## 資料流

```
WP REST API ─▶ temp/withyuen-api-*/posts.json ─▶ posts-geo.json（地名→經緯度，另一個 agent）
OSM 邊界 + DEM ─▶ scripts/hex-plan.mjs ─▶ data/layout.json
posts-geo.json + layout.json ─▶ scripts/assign-cells ─▶ data/cells.json（每格的貼文清單）─▶ src/
```

## 留給後續的

- 建築：每篇貼文一棟，依格內數量排布；造型依 topic（交通 / 民生 / 校園 / 教育 / 長照）區分。
- 海面波紋、遠山背景。
- 鳥瞰時標籤的取捨。
- 部署目標（GitHub Pages 或 withyuen.com 子目錄）——`base: './'` 兩者皆可，尚未決定。
