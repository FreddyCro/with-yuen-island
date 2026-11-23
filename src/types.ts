/**
 * data/layout.json 的形狀——由 scripts/hex-plan.mjs 產生，前端只讀不改。
 * 座標單位：公尺（已依 `scale` 放大、八里已平移），y 朝北。
 */
export interface Layout {
  edgeM: number;               // 六角格邊長（公尺，名目）
  scale: number;               // 地理放大倍率
  hexOrientation: 'flat-top';
  offset: 'odd-q';
  /** 經緯度 → 版面公尺：x = (lon−lon0)·metersPerDeg·cosLat·scale，y = (lat−lat0)·metersPerDeg·scale */
  projection: { lon0: number; lat0: number; metersPerDeg: number; cosLat: number };
  /** 八里側格另加的平移（公尺），留出淡水河 */
  baliShift: [number, number];
  districts: District[];
  cells: Cell[];
  council: { x: number; y: number; posts: number; name: string };
  bridges: Bridge[];
  places: Place[];
}

export interface District { name: string; color: string; posts: number }

export interface Cell {
  q: number; r: number;        // 軸座標（flat-top、odd-q 偏移）
  x: number; y: number;        // 格心（公尺）
  district: string;
  ele: number;                 // 海拔中位數（公尺）
}

export interface Bridge {
  name: string;
  from: [number, number];      // 八里側格 (q, r)
  to: [number, number];        // 淡水側格 (q, r)
  inset: number;               // 兩端縮進格內的比例（× 邊長）
}

export interface Place { name: string; x: number; y: number }

/** data/cells.json 的 `councilTiles`：議會三格各自的貼文（scripts/lib/council-split.mjs 產生）。 */
export interface CouncilTile {
  key: string;                 // 'council' | 'council-1' | 'council-2'
  posts: Array<{ id: number; element: string; topic: string | null }>;
}
