# 格內擺放：分級 + 固定槽位（2026-11-24）

取代 `layoutTile`（隨機簇心 + 螺旋）與 `layoutScene`（主街雛形）兩條路徑，所有格共用一套槽位版面。

## 分級（`data/tiers.json`，前後端共用）

| 級 | 元素 | 縮放上限 | 縮放式 |
|---|---|---|---|
| L 建築 | school、market、library、hall、transit、council-hall | 1.25 | 1 + 0.12·log2(篇數) |
| M | playground、parking、event、port、bridge | 1.12 | 1 + 0.08·log2(篇數) |
| S | sign、crosswalk、repair、coin、milk、flag、shield、suitcase、elder-card、baby、lunch-tray | 1.0 | 固定 1 |

不在表裡的元素當 M。縮放用在 holder 上，佔地半徑 = `footprint(element) × scale`；建築級的佔地照實際尺寸（school 0.85、council-hall 1.15、hall/market 0.7、library/playground/parking/port/bridge 0.6、transit/event 0.55）。

## 槽位（局部座標，格心為原點；U = 可用區外接半徑 = 0.70R − 0.275 − 0.32 − 0.4 ≈ 3.9）

- **中心** (0, 0)。
- **六個扇區**：對六條六角邊，方向角 θk = 30° + 60°k + rot，位置 = 0.72·U·(cos θk, −sin θk)（≈ 2.8）。
  rot = (seed mod 6)·60°，每格模板轉一下，避免長得一樣。
  若 `reserve` > 0.72U − 佔地（山丘格），扇區半徑改成 min(reserve + 佔地, U·cos30° − 0.6·佔地)（建築可以略壓到人行道，路面預設不畫）。
- **扇區內兩個 S**：沿扇區切線方向 ±0.55。
- **外圈**：半徑 U − 0.45 的六角環，告示牌與溢出的 S 放這裡，角度用該組的 `offset` 方向（沒有就依序等分）。
- **格邊**：海側 port / bridge 直接用現有的 edge 座標（海灘環），不佔槽位；離它 < 佔地和的扇區停用。
- **停用**：扇區或中心落在 `blocked`（地標）圓 + 佔地內就停用。

## 擺放順序

1. edge（海側）先放。
2. L：
   - 只有一個 L：放中心；中心不可用（reserve 太大、被 blocked）→ 放 `offset` 方向最接近的空扇區。
   - 議會主格：council-hall 固定中心。
   - 兩個以上 L：第一個（篇數最多）放 `offset` 最接近的扇區，第二個放它對面的扇區，其餘依序挑最接近的空扇區；中心留成廣場。
3. 沒有 L：篇數最多的 M 放中心。
4. 其餘 M、S 依篇數由多到少：挑 `offset` 方向最接近的空扇區；沒有空扇區時 S 可以進已有一個 S 的扇區（成對）；再沒有就上外圈（外圈再往內 0.85 也試）；外圈也滿就退到海灘環（環道外側，面向格心）；連海灘環都滿才記到 `unplaced`（console.warn）。
   物件整體放大 1.5（橋除外，`OBJECT_SCALE`），間距容許佔地和的 0.9 倍。
5. 告示牌（sign）一律上外圈。

## 朝向

- 主角（中心或第一個 L）：有 `streetDir` 面向主街；沒有就面向 `offset` 方向；都沒有面向扇區 0。
- 配角：面向主角的位置。
- 全部再加 ±5° 抖動（決定性）。

## 分配階段（`assignCells`）

- 同一格已有 L 時，L 組再挑那一格要扣分：候選格分數 = 落格篇數 × 0.6（原本是篇數）。只是排序懲罰，不是禁止；只有一個候選格時照放。
- 分級表由 `scripts/lib/groups.mjs` 讀同一份 `data/tiers.json`。

## 驗收

- 單元測試：L 在中心；中心不可用時 L 落 offset 最近扇區；兩個 L 相對；全部在可用區內、不進 blocked、不重疊（佔地 × 縮放）；10 組擠格全放得下；同 seed 相同；assignCells 懲罰與「單一候選格照放」。
- 截圖：`0,2`、`-2,-1`、`-1,-1`、議會格、紅毛城那格、一個山丘格。
