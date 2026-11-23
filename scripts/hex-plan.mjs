// 北海岸政績島：六角版面產生器（平面圖 SVG + data/layout.json）
//   - 每區格數 = 總格數 × (α·面積占比 + (1−α)·政績占比)，以真實格為種子長／縮成目標格數
//   - 八里整塊沿淡水河垂直方向平移一格，中間留河道
//   - 議會 1 格
// 用法：node scripts/hex-plan.mjs [邊長m=3500] [總格數=14] [α=0.5]
//   環境變數：MOVES='[[q,r,q2,r2],...]' 手動搬格；COUNCIL='q,r' 議會位置；RIVER=河寬倍率（預設 1.6）；DEM=高程檔路徑
//   輸入：data/boundaries/nom-<區>.json（Nominatim 邊界）；輸出：data/layout.json、temp/hex-plan/plan-v2-<邊長>m.svg
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const BOUNDARIES = path.join(ROOT, 'data', 'boundaries');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'temp', 'hex-plan');
fs.mkdirSync(OUT, { recursive: true });
const DEM = process.env.DEM || path.join(ROOT, 'temp', 'tw.dem.bin');
const R = Number(process.argv[2] ?? 3500);
const TOTAL = Number(process.argv[3] ?? 14);
const ALPHA = Number(process.argv[4] ?? 0.5); // 面積的權重；1 = 純面積，0 = 純政績

const DISTRICTS = [
  { name: '淡水區', color: '#DB6A41', posts: 302 + 59 },
  { name: '八里區', color: '#3F7FBF', posts: 170 + 17 },
  { name: '三芝區', color: '#5FA55A', posts: 104 + 27 },
  { name: '石門區', color: '#B08BC4', posts: 44 + 10 },
];

for (const d of DISTRICTS) {
  const g = JSON.parse(fs.readFileSync(path.join(BOUNDARIES, `nom-${d.name}.json`), 'utf8'))[0].geojson;
  d.rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
}
const all = DISTRICTS.flatMap((d) => d.rings.flat());
const lon0 = (Math.min(...all.map((p) => p[0])) + Math.max(...all.map((p) => p[0]))) / 2;
const lat0 = (Math.min(...all.map((p) => p[1])) + Math.max(...all.map((p) => p[1]))) / 2;
const MPD = 111320, K = Math.cos((lat0 * Math.PI) / 180);
let SCALE = 1; // 稍後依面積決定
const toM = ([lon, lat]) => [(lon - lon0) * MPD * K * SCALE, (lat - lat0) * MPD * SCALE];
const toLL = ([x, y]) => [lon0 + x / (MPD * K * SCALE), lat0 + y / (MPD * SCALE)];
for (const d of DISTRICTS) d.ringsM = d.rings.map((r) => r.map(toM));

// 面積（shoelace）
const area = (ring) => Math.abs(ring.reduce((a, p, i) => a + p[0] * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * p[1], 0) / 2);
for (const d of DISTRICTS) d.area = d.ringsM.reduce((a, r) => a + area(r), 0) / 1e6;
{ const realTotal = DISTRICTS.reduce((a, d) => a + d.area, 0); const hexArea = (3 * Math.sqrt(3) / 2) * R * R / 1e6;
  SCALE = Math.sqrt((TOTAL * hexArea) / realTotal);
  for (const d of DISTRICTS) d.ringsM = d.rings.map((r) => r.map(toM)); }
const sumA = DISTRICTS.reduce((a, d) => a + d.area, 0), sumP = DISTRICTS.reduce((a, d) => a + d.posts, 0);
for (const d of DISTRICTS) {
  d.share = ALPHA * (d.area / sumA) + (1 - ALPHA) * (d.posts / sumP);
  d.target = Math.max(1, Math.round(TOTAL * d.share));
}

const pip = (pt, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const distSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); };
const distToDistrict = (p, d) => d.ringsM.some((r) => pip(p, r)) ? 0 : Math.min(...d.ringsM.flatMap((r) => r.map((a, i) => distSeg(p, a, r[(i + 1) % r.length]))));
const RIVER = [[121.400, 25.190], [121.418, 25.176], [121.432, 25.165], [121.443, 25.154], [121.452, 25.142], [121.460, 25.130], [121.466, 25.118], [121.472, 25.106]].map(toM);
const riverSide = (p) => { const i = RIVER.slice(0, -1).map((a, j) => [distSeg(p, a, RIVER[j + 1]), j]).sort((x, y) => x[0] - y[0])[0][1]; const a = RIVER[i], b = RIVER[i + 1]; return Math.sign((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])); };
const inAnyDistrict = (p) => DISTRICTS.some((d) => d.ringsM.some((rg) => pip(p, rg)));
const distToRiver = (p) => Math.min(...RIVER.slice(0, -1).map((a, i) => distSeg(p, a, RIVER[i + 1])));

// DEM（可缺；缺時海拔全 0）
let elevAt = () => 0;
if (fs.existsSync(DEM)) {
  const fd = fs.openSync(DEM, 'r'); const hb = Buffer.alloc(4); fs.readSync(fd, hb, 0, 4, 0);
  const hlen = hb.readUInt32LE(0); const hj = Buffer.alloc(hlen); fs.readSync(fd, hj, 0, hlen, 4);
  const H = JSON.parse(hj.toString('utf8')); const dem = fs.readFileSync(DEM).subarray(4 + hlen);
  elevAt = (lon, lat) => { const [w, s, e, n] = H.bbox; const c = Math.floor(((lon - w) / (e - w)) * H.width), r = Math.floor(((n - lat) / (n - s)) * H.height); if (c < 0 || r < 0 || c >= H.width || r >= H.height) return 0; const v = dem.readInt16LE((r * H.width + c) * 2); return v === H.nodata ? 0 : v; };
} else console.warn('DEM 不存在（' + DEM + '），海拔全為 0');

// 六角格（flat-top, odd-q）
const W = 2 * R, Hh = Math.sqrt(3) * R;
const center = (q, r) => [q * 0.75 * W, r * Hh + (q % 2 ? Hh / 2 : 0)];
const key = (q, r) => `${q},${r}`;
const neighbors = (q, r) => (q % 2 ? [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]] : [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]]).map(([dq, dr]) => [q + dq, r + dr]);
const probesOf = ([cx, cy]) => [[cx, cy], ...[0, 1, 2, 3, 4, 5].map((i) => [cx + 0.6 * R * Math.cos((i * Math.PI) / 3), cy + 0.6 * R * Math.sin((i * Math.PI) / 3)])];
const medianEle = (c) => { const e = probesOf(c).map((p) => elevAt(...toLL(p))).sort((a, b) => a - b); return e[3]; };

// 1) 種子：真實比例下的格（同 v1 規則，七探針投票；河的兩側用「探針在河的哪一邊」分）
const owner = new Map(); // key → district
const xs = all.map(toM).map((p) => p[0]), ys = all.map(toM).map((p) => p[1]);
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
for (let q = Math.floor(minX / (0.75 * W)) - 2; q <= Math.ceil(maxX / (0.75 * W)) + 2; q++)
  for (let r = Math.floor(minY / Hh) - 2; r <= Math.ceil(maxY / Hh) + 2; r++) {
    const votes = probesOf(center(q, r)).map((p) => DISTRICTS.find((d) => d.ringsM.some((rg) => pip(p, rg)))).filter(Boolean);
    if (votes.length < 3) continue;
    const t = new Map(); votes.forEach((d) => t.set(d, (t.get(d) ?? 0) + 1));
    owner.set(key(q, r), [...t.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
const cellsOf = (d) => [...owner.entries()].filter(([, o]) => o === d).map(([k]) => k.split(',').map(Number));
for (const d of DISTRICTS) d.seed = cellsOf(d).length;

// 2) 長／縮到目標格數
for (const d of DISTRICTS) {
  for (let guard = 0; guard < 200; guard++) {
    const mine = cellsOf(d);
    if (mine.length === d.target) break;
    if (mine.length < d.target) {
      // 候選：鄰接且空的格；偏好離真實區界近、海拔低（沿海）、離河遠（不侵入河道）
      const cand = new Map();
      for (const [q, r] of mine) for (const [nq, nr] of neighbors(q, r)) if (!owner.has(key(nq, nr))) cand.set(key(nq, nr), [nq, nr]);
      const best = [...cand.values()].map(([q, r]) => {
        const c = center(q, r);
        // 不可越河：淡水只能在河的東北側長，八里只能在西南側
        if (distToRiver(c) < 6000 && ((d === DISTRICTS[0] && riverSide(c) < 0) || (d === DISTRICTS[1] && riverSide(c) > 0))) return null;
        const ll = toLL(c); if (ll[1] < 25.125 && ll[0] > 121.47) return null; // 關渡以南是台北市北投／士林，不長過去
        const landProbes = probesOf(c).filter(inAnyDistrict).length; // 0–7，越少越像海
        return { q, r, s: distToDistrict(c, d) + medianEle(c) * 1.5 + (7 - landProbes) * 700 + Math.max(0, 2500 - distToRiver(c)) };
      }).filter(Boolean).sort((a, b) => a.s - b.s)[0];
      if (!best) break;
      owner.set(key(best.q, best.r), d);
    } else {
      // 移除：離真實區界最遠／最高的邊緣格（鄰居中同區最少者優先）
      const worst = mine.map(([q, r]) => { const c = center(q, r); const same = neighbors(q, r).filter(([a, b]) => owner.get(key(a, b)) === d).length; return { q, r, s: -same * 1e4 + distToDistrict(c, d) + medianEle(c) * 3 }; }).sort((a, b) => b.s - a.s)[0];
      owner.delete(key(worst.q, worst.r));
    }
  }
}

// 2b) 連通性：縮格可能把某區切離主體（例如石門離開三芝），整區往主體滑一格直到相鄰
const adjacentToOthers = (d) => cellsOf(d).some(([q, r]) => neighbors(q, r).some(([a, b]) => owner.has(key(a, b)) && owner.get(key(a, b)) !== d));
for (const d of DISTRICTS) {
  for (let guard = 0; guard < 6 && !adjacentToOthers(d); guard++) {
    const mine = cellsOf(d), others = [...owner.entries()].filter(([, o]) => o !== d).map(([k]) => k.split(',').map(Number));
    // 找「我方格 → 他方格」最近的一對，往那個方向走一步（六個晶格方向中最接近者）
    let best = null;
    for (const [q, r] of mine) for (const [oq, or] of others) { const a = center(q, r), b = center(oq, or); const dd = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || dd < best.dd) best = { dd, from: [q, r], to: [oq, or] }; }
    const a = center(...best.from), b = center(...best.to);
    const step = neighbors(...best.from).map(([nq, nr]) => ({ nq, nr, dq: nq - best.from[0], dr: nr - best.from[1], dd: Math.hypot(center(nq, nr)[0] - b[0], center(nq, nr)[1] - b[1]) })).sort((x, y) => x.dd - y.dd)[0];
    // 平移整區：同一 (dq, dr) 在 odd-q 格網不保證等價，改用「每格各自取離目標方向最近的鄰格」會變形，所以用座標平移後 re-snap
    const vec = [center(step.nq, step.nr)[0] - a[0], center(step.nq, step.nr)[1] - a[1]];
    const moved = mine.map(([q, r]) => { const c = [center(q, r)[0] + vec[0], center(q, r)[1] + vec[1]]; const qq = Math.round(c[0] / (0.75 * W)); const rr = Math.round((c[1] - (qq % 2 ? Hh / 2 : 0)) / Hh); return [qq, rr]; });
    if (moved.some(([q, r]) => owner.has(key(q, r)) && owner.get(key(q, r)) !== d)) break;
    for (const [q, r] of mine) owner.delete(key(q, r));
    for (const [q, r] of moved) owner.set(key(q, r), d);
    console.log(d.name, '整區滑動一格以保持相鄰');
  }
}

// 2c) 手動微調（MOVES='[[q,r,q2,r2],...]'）
for (const [q, r, q2, r2] of JSON.parse(process.env.MOVES || '[]')) { const d = owner.get(key(q, r)); if (!d) { console.log('MOVE 來源不存在', q, r); continue; } if (owner.has(key(q2, r2))) { console.log('MOVE 目標已被占', q2, r2); continue; } owner.delete(key(q, r)); owner.set(key(q2, r2), d); }
// 議會位置可用 COUNCIL='q,r' 指定
// 3) 八里整塊平移一格（垂直於河的方向 ≈ 西南），留出河道
const BALI = DISTRICTS[1];
const RIVER_W = Number(process.env.RIVER ?? 1.6); // 河道寬度（以晶格向量為 1；>1 讓橋有足夠跨距）
const SHIFT = [-1.5 * R * RIVER_W, (-Hh / 2) * RIVER_W]; // 往西南，沿晶格向量方向
const cells = [...owner.entries()].map(([k, d]) => { const [q, r] = k.split(',').map(Number); let c = center(q, r); if (d === BALI) c = [c[0] + SHIFT[0], c[1] + SHIFT[1]]; return { q, r, cx: c[0], cy: c[1], d, ele: medianEle(center(q, r)) }; });

// 地標與橋（八里側一併平移）
const PLACES = [
  ['淡海新市鎮', 121.447, 25.195], ['淡水老街・捷運站', 121.446, 25.169], ['竹圍', 121.459, 25.138],
  ['八里左岸', 121.438, 25.155, 1], ['台北港', 121.385, 25.155, 1], ['觀音山', 121.425, 25.128, 1],
  ['三芝市區', 121.502, 25.258], ['石門市區', 121.566, 25.291], ['大屯山', 121.522, 25.176],
];
const BRIDGES = [
  { name: '關渡大橋', bali: [121.452, 25.124], tamsui: [121.459, 25.138], inset: 0.8, dx: 900, dy: -700 },
  { name: '淡江大橋（2026）', bali: [121.404, 25.170], tamsui: [121.408, 25.186], inset: 0.55, dx: -4600, dy: 200 },
];
const shiftP = (p) => [p[0] + SHIFT[0], p[1] + SHIFT[1]];

// 議會：從西北角往外找，直到與任何格至少隔兩格（先算，viewBox 才包得進去）
const baliCells = cells.filter((c) => c.d === BALI);
const topBali = baliCells.sort((x, y) => y.cy - x.cy)[0];
let cc = process.env.COUNCIL ? center(...process.env.COUNCIL.split(',').map(Number)) : [topBali.cx - 2 * 1.5 * R, topBali.cy];
while (cells.some((c) => Math.hypot(c.cx - cc[0], c.cy - cc[1]) < 1.9 * Hh)) cc = [cc[0] - 1.5 * R, cc[1]];
// SVG
const PAD = 2500;
const axs = [...cells.map((c) => c.cx), cc[0]], ays = [...cells.map((c) => c.cy), cc[1] + 2600];
const vb = [Math.min(...axs) - R - PAD, -(Math.max(...ays) + R + PAD), Math.max(...axs) - Math.min(...axs) + 2 * R + 2 * PAD, Math.max(...ays) - Math.min(...ays) + 2 * R + 2 * PAD];
const sx = (x) => x.toFixed(0), sy = (y) => (-y).toFixed(0);
const hexPath = (cx, cy, rr) => [0, 1, 2, 3, 4, 5].map((i) => `${sx(cx + rr * Math.cos((i * Math.PI) / 3))},${sy(cy + rr * Math.sin((i * Math.PI) / 3))}`).join(' ');
const shade = (hex, ele) => { const t = Math.min(1, ele / 600); const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16)); const tg = [70, 95, 60]; const m = c.map((v, i) => Math.round(v * (1 - t * 0.7) + tg[i] * t * 0.7)); return ele < 40 ? `rgb(${m.map((v) => Math.min(255, v + 45)).join(',')})` : `rgb(${m.join(',')})`; };

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map((v) => v.toFixed(0)).join(' ')}" width="1400" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif">
<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#BFE3EC"/>
<g id="admin" fill="none" stroke="#222" stroke-opacity="0.22" stroke-width="40" stroke-dasharray="120 80">`;
for (const d of DISTRICTS) for (const r of d.ringsM) svg += `<polygon points="${(d === BALI ? r.map(shiftP) : r).map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ')}"/>`;
svg += `</g>\n<g id="hex" stroke="#fff" stroke-width="40" stroke-opacity="0.7">`;
for (const c of cells) svg += `<polygon points="${hexPath(c.cx, c.cy, R)}" fill="${shade(c.d.color, c.ele)}"><title>${c.d.name} q${c.q} r${c.r} ${c.ele} m</title></polygon>`;
svg += `</g>\n<g id="river"><text x="${sx(shiftP(toM([121.44, 25.152]))[0] + 1200)}" y="${sy(shiftP(toM([121.44, 25.152]))[1] + 300)}" font-size="520" fill="#2a6f8a" font-style="italic" transform="rotate(-40 ${sx(shiftP(toM([121.44, 25.152]))[0] + 1200)} ${sy(shiftP(toM([121.44, 25.152]))[1] + 300)})">淡水河</text></g>
<g id="bridges" stroke="#222" stroke-width="180" stroke-linecap="round">`;
const nearest = (p, d) => cells.filter((c) => c.d === d).map((c) => ({ c, dist: Math.hypot(c.cx - p[0], c.cy - p[1]) })).sort((x, y) => x.dist - y.dist)[0].c;
for (const b of BRIDGES) {
  const A = nearest(shiftP(toM(b.bali)), BALI), T = nearest(toM(b.tamsui), DISTRICTS[0]);
  const vx = T.cx - A.cx, vy = T.cy - A.cy, L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L;
  const a = [A.cx + ux * b.inset * R, A.cy + uy * b.inset * R], t = [T.cx - ux * b.inset * R, T.cy - uy * b.inset * R];
  console.log(b.name, 'length', Math.hypot(t[0]-a[0], t[1]-a[1]).toFixed(0), 'm');
  svg += `<line x1="${sx(a[0])}" y1="${sy(a[1])}" x2="${sx(t[0])}" y2="${sy(t[1])}"/><text x="${sx((a[0] + t[0]) / 2 + b.dx)}" y="${sy((a[1] + t[1]) / 2 + b.dy)}" font-size="480" fill="#222" stroke="none" font-weight="700">${b.name}</text>`;
}
svg += `</g>\n<g id="places" font-size="440" fill="#111">`;
for (const [n, lon, lat, bali] of PLACES) { let [x, y] = toM([lon, lat]); if (bali) [x, y] = shiftP([x, y]); svg += `<circle cx="${sx(x)}" cy="${sy(y)}" r="130" fill="#111"/><text x="${sx(x + 220)}" y="${sy(y - 150)}" paint-order="stroke" stroke="#fff" stroke-width="90">${n}</text>`; }
svg += `</g>`;
// 議會：1 格，西北外海

svg += `<g id="council"><polygon points="${hexPath(cc[0], cc[1], R)}" fill="#E0B23C" stroke="#fff" stroke-width="40"/><text x="${sx(cc[0] - 1700)}" y="${sy(cc[1] + 2600)}" font-size="480" fill="#111" font-weight="700">議會（新北全區・其他新北 203 篇）</text></g>`;
// 圖例
const lx = vb[0] + vb[2] - 15500, ly = -(vb[1] + vb[3]) + 1400;
svg += `<g font-size="440" fill="#111"><rect x="${sx(lx - 300)}" y="${sy(ly + 4400)}" width="15200" height="4700" fill="#fff" fill-opacity="0.88" rx="200"/>`;
svg += `<text x="${sx(lx)}" y="${sy(ly + 3800)}" font-weight="700" font-size="520">北海岸政績島 v2（邊長 ${R} m・${cells.length} 格・α=${ALPHA}・地理 ×${SCALE.toFixed(2)}）</text>`;
DISTRICTS.forEach((d, i) => { const n = cells.filter((c) => c.d === d).length; svg += `<rect x="${sx(lx)}" y="${sy(ly + 3100 - i * 600)}" width="420" height="420" fill="${d.color}"/><text x="${sx(lx + 600)}" y="${sy(ly + 3100 - i * 600 - 360)}">${d.name}　${n} 格（真實 ${d.seed} 格）・${d.posts} 篇・${d.area.toFixed(0)} km²・${(n ? d.posts / n : 0).toFixed(0)} 篇/格</text>`; });
svg += `<text x="${sx(lx)}" y="${sy(ly + 3100 - 4 * 600 - 360)}">格數 = ${TOTAL} × (${ALPHA}·面積占比 + ${(1 - ALPHA).toFixed(1)}·政績占比)；八里向西南平移一格留出淡水河</text>`;
svg += `<line x1="${sx(lx)}" y1="${sy(ly + 150)}" x2="${sx(lx + 5000 * SCALE)}" y2="${sy(ly + 150)}" stroke="#111" stroke-width="90"/><text x="${sx(lx + 5000 * SCALE + 200)}" y="${sy(ly)}">5 km（地理放大 ${SCALE.toFixed(2)}×）</text></g></svg>`;

// 3D 用的版面 JSON（座標單位：公尺，y 朝北；八里已平移；橋為兩端點）
const bridgesOut = [];
{ const nearest2 = (pt, d) => cells.filter((c) => c.d === d).map((c) => ({ c, dist: Math.hypot(c.cx - pt[0], c.cy - pt[1]) })).sort((x, y) => x.dist - y.dist)[0].c;
  for (const b of BRIDGES) { const A = nearest2(shiftP(toM(b.bali)), BALI), T = nearest2(toM(b.tamsui), DISTRICTS[0]); bridgesOut.push({ name: b.name, from: [A.q, A.r], to: [T.q, T.r], inset: b.inset }); } }
fs.writeFileSync(path.join(DATA, 'layout.json'), JSON.stringify({
  edgeM: R, scale: SCALE, hexOrientation: 'flat-top', offset: 'odd-q',
  // 經緯度 → 版面公尺的投影參數（assign-cells 用）：x = (lon−lon0)·MPD·K·scale，y = (lat−lat0)·MPD·scale；八里側再加 baliShift
  projection: { lon0, lat0, metersPerDeg: MPD, cosLat: K },
  baliShift: [Math.round(SHIFT[0]), Math.round(SHIFT[1])],
  districts: DISTRICTS.map((d) => ({ name: d.name, color: d.color, posts: d.posts })),
  cells: cells.map((c) => ({ q: c.q, r: c.r, x: Math.round(c.cx), y: Math.round(c.cy), district: c.d.name, ele: c.ele })),
  council: { x: Math.round(cc[0]), y: Math.round(cc[1]), posts: 203, name: '議會' },
  bridges: bridgesOut,
  places: PLACES.map(([n, lon, lat, bali]) => { let p = toM([lon, lat]); if (bali) p = shiftP(p); return { name: n, x: Math.round(p[0]), y: Math.round(p[1]) }; }),
}, null, 1));
const out = path.join(OUT, `plan-v2-${R}m.svg`);
fs.writeFileSync(out, svg);
console.log(out);
console.log('cells:', cells.map((c) => `${c.d.name.slice(0,2)}(${c.q},${c.r})`).join(' '));
for (const d of DISTRICTS) console.log(d.name, `area ${d.area.toFixed(1)} km²`, `posts ${d.posts}`, `share ${d.share.toFixed(3)}`, `seed ${d.seed} → target ${d.target} → got ${cells.filter((c) => c.d === d).length}`);
