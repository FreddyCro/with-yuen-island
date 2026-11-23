// 手動調整版面：刪格、搬格（不重跑 hex-plan，其他格一律不動）。
//   DELETE='[[q,r],...]'  刪掉這些格
//   MOVES='[[q,r,q2,r2],...]'  把格搬到新位置（區與順序不變，x/y 依 odd-q 晶格重算）
//   DISTRICT='[[q,r,"三芝區"],...]'  改某格所屬的區（例如把淡水沒用到的格分給三芝）；geo 不動
//   ELE='[[q,r,ele],...]'  直接改某格的海拔（例如把一格設成山）；座標是搬完之後的
//   RESAMPLE=1 才從 DEM 重取海拔；預設沿用原值（格代表的地區沒變，只是版面位置變了）
//   用法：DELETE='[[0,1]]' MOVES='[[0,2,0,1],[1,1,1,0],[1,0,1,-1],[1,2,1,1],[2,2,2,1]]' node scripts/edit-layout.mjs
//   之後要重跑 node scripts/assign-cells.mjs 與 node scripts/build-groups.mjs。
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const FILE = path.join(ROOT, 'data', 'layout.json');
const layout = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const R = layout.edgeM, Hh = Math.sqrt(3) * R;
const center = (q, r) => [q * 1.5 * R, r * Hh + (q % 2 ? Hh / 2 : 0)]; // 同 hex-plan.mjs（flat-top, odd-q）
const key = (q, r) => `${q},${r}`;

// DEM（同 hex-plan.mjs；缺時海拔維持原值）
const DEM = process.env.RESAMPLE ? (process.env.DEM || path.join(ROOT, 'temp', 'tw.dem.bin')) : '';
let elevAt = null;
if (fs.existsSync(DEM)) {
  const fd = fs.openSync(DEM, 'r'); const hb = Buffer.alloc(4); fs.readSync(fd, hb, 0, 4, 0);
  const hlen = hb.readUInt32LE(0); const hj = Buffer.alloc(hlen); fs.readSync(fd, hj, 0, hlen, 4);
  const H = JSON.parse(hj.toString('utf8')); const dem = fs.readFileSync(DEM).subarray(4 + hlen);
  elevAt = (lon, lat) => { const [w, s, e, n] = H.bbox; const c = Math.floor(((lon - w) / (e - w)) * H.width), r = Math.floor(((n - lat) / (n - s)) * H.height); if (c < 0 || r < 0 || c >= H.width || r >= H.height) return 0; const v = dem.readInt16LE((r * H.width + c) * 2); return v === H.nodata ? 0 : v; };
} else if (process.env.RESAMPLE) console.warn('DEM 不存在（' + DEM + '），搬過的格海拔維持原值');
const { lon0, lat0, metersPerDeg: MPD, cosLat: K } = layout.projection;
const toLL = ([x, y]) => [lon0 + x / (MPD * K * layout.scale), lat0 + y / (MPD * layout.scale)];
const probesOf = ([cx, cy]) => [[cx, cy], ...[0, 1, 2, 3, 4, 5].map((i) => [cx + 0.6 * R * Math.cos((i * Math.PI) / 3), cy + 0.6 * R * Math.sin((i * Math.PI) / 3)])];
const medianEle = (c) => { const e = probesOf(c).map((p) => elevAt(...toLL(p))).sort((a, b) => a - b); return e[3]; };

const cells = new Map(layout.cells.map((c) => [key(c.q, c.r), c]));
for (const [q, r] of JSON.parse(process.env.DELETE || '[]')) {
  if (!cells.delete(key(q, r))) console.warn('DELETE 來源不存在', q, r); else console.log('刪掉', q, r);
}
// 搬格：先全部拿起來再放下，才能整塊滑動（目標可能是另一個要搬走的格）
const moves = JSON.parse(process.env.MOVES || '[]');
const lifted = [];
for (const [q, r, q2, r2] of moves) { const c = cells.get(key(q, r)); if (!c) { console.warn('MOVE 來源不存在', q, r); continue; } cells.delete(key(q, r)); lifted.push([c, q2, r2]); }
for (const [c, q2, r2] of lifted) {
  if (cells.has(key(q2, r2))) { console.warn('MOVE 目標已被占', q2, r2); continue; }
  const bali = c.district === '八里區';
  const [cx, cy] = center(q2, r2);
  const before = `${c.q},${c.r}`;
  // 貼文落格與地理偏移仍照「原本的地理位置」算（格代表的地區沒變），所以把搬之前的座標留在 geo
  c.geo ??= { x: c.x, y: c.y };
  c.q = q2; c.r = r2; c.x = Math.round(cx + (bali ? layout.baliShift[0] : 0)); c.y = Math.round(cy + (bali ? layout.baliShift[1] : 0));
  if (elevAt) c.ele = medianEle([cx, cy]);
  cells.set(key(q2, r2), c);
  console.log('搬', before, '→', key(q2, r2), c.district, '海拔', c.ele);
}
for (const [q, r, d] of JSON.parse(process.env.DISTRICT || '[]')) { const c = cells.get(key(q, r)); if (!c) { console.warn('DISTRICT 格不存在', q, r); continue; } c.district = d; console.log('改區', key(q, r), '→', d); }
for (const [q, r, ele] of JSON.parse(process.env.ELE || '[]')) { const c = cells.get(key(q, r)); if (!c) { console.warn('ELE 格不存在', q, r); continue; } c.ele = ele; console.log('海拔', key(q, r), '→', ele); }
layout.cells = [...cells.values()];
// 地標名（三芝市區、石門市區…）跟著它原本所在的格一起搬
for (const p of layout.places) {
  const near = [...cells.values()].sort((a, b) => Math.hypot((a.geo?.x ?? a.x) - p.x, (a.geo?.y ?? a.y) - p.y) - Math.hypot((b.geo?.x ?? b.x) - p.x, (b.geo?.y ?? b.y) - p.y))[0];
  if (near?.geo) { p.x += near.x - near.geo.x; p.y += near.y - near.geo.y; console.log('地標跟著搬', p.name); }
}
// 橋的端點格若被搬走要跟著改
for (const b of layout.bridges) for (const side of ['from', 'to']) { const m = moves.find(([q, r]) => q === b[side][0] && r === b[side][1]); if (m) b[side] = [m[2], m[3]]; }
fs.writeFileSync(FILE, JSON.stringify(layout, null, 1));
console.log('格數', layout.cells.length, Object.fromEntries(layout.districts.map((d) => [d.name, layout.cells.filter((c) => c.district === d.name).length])));
