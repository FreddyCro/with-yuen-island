// 把每篇貼文落到六角格：temp/posts-geo.json + data/layout.json → data/cells.json
//   規則：island 是議會 → 議會；否則投影到版面公尺（八里側加 baliShift），在「該區的格」裡找最近的一格；
//   沒有座標（confidence=district 也有座標；none 的已經是議會）時退回該區離重心最近的格。
//   用法：node scripts/assign-cells.mjs [posts-geo.json 路徑]
import fs from 'node:fs';
import path from 'node:path';
import { splitCouncil } from './lib/council-split.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const GEO = process.argv[2] ?? path.join(ROOT, 'temp', 'posts-geo.json');
const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'layout.json'), 'utf8'));
const geo = JSON.parse(fs.readFileSync(GEO, 'utf8'));
// 每篇的元素（scripts/classify-elements.mjs 的產出）；議會分三格要用
const elements = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'elements.json'), 'utf8'));
const elementOf = new Map(elements.posts.map((p) => [p.id, p]));

const { lon0, lat0, metersPerDeg: MPD, cosLat: K } = layout.projection;
const toM = (lon, lat) => [(lon - lon0) * MPD * K * layout.scale, (lat - lat0) * MPD * layout.scale];
const key = (c) => `${c.q},${c.r}`;
const districtOf = (island) => `${island}區`;

// 每區的格、以及離該區重心最近的格（退路）
const cellsBy = {};
for (const c of layout.cells) (cellsBy[c.district] ??= []).push(c);
const fallback = {};
for (const [d, cells] of Object.entries(cellsBy)) {
  const gx = (c) => c.geo?.x ?? c.x, gy = (c) => c.geo?.y ?? c.y;
  const mx = cells.reduce((a, c) => a + gx(c), 0) / cells.length, my = cells.reduce((a, c) => a + gy(c), 0) / cells.length;
  fallback[d] = [...cells].sort((a, b) => Math.hypot(gx(a) - mx, gy(a) - my) - Math.hypot(gx(b) - mx, gy(b) - my))[0];
}

const assigned = new Map(); // cellKey → post ids
const perPost = [];
const how = { place: 0, fallback: 0, council: 0 };
for (const p of geo.posts) {
  let cellKey;
  if (p.island === '議會') { cellKey = 'council'; how.council++; }
  else {
    const d = districtOf(p.island), cells = cellsBy[d];
    if (!cells) throw new Error(`沒有這個區的格：${d}（post ${p.id}）`);
    if (p.lat != null && p.lng != null) {
      let [x, y] = toM(p.lng, p.lat);
      if (d === '八里區') { x += layout.baliShift[0]; y += layout.baliShift[1]; }
      // 搬過的格用搬之前的地理位置（c.geo）配對
      const gx = (c) => c.geo?.x ?? c.x, gy = (c) => c.geo?.y ?? c.y;
      const c = [...cells].sort((a, b) => Math.hypot(gx(a) - x, gy(a) - y) - Math.hypot(gx(b) - x, gy(b) - y))[0];
      cellKey = key(c); how.place++;
    } else { cellKey = key(fallback[d]); how.fallback++; }
  }
  (assigned.get(cellKey) ?? assigned.set(cellKey, []).get(cellKey)).push(p.id);
  perPost.push({ id: p.id, cell: cellKey, island: p.island, topic: p.topic, date: p.date, title: p.summary || p.title, link: p.link, image: p.image });
}

const cells = layout.cells.map((c) => ({ q: c.q, r: c.r, district: c.district, count: (assigned.get(key(c)) ?? []).length, posts: assigned.get(key(c)) ?? [] }));
const council = { count: (assigned.get('council') ?? []).length, posts: assigned.get('council') ?? [] };
// 議會分三格（A 大樓、B 民生、C 政務；sign 依 topic），見 scripts/lib/council-split.mjs
const councilTiles = splitCouncil(council.posts.map((id) => { const e = elementOf.get(id); if (!e) throw new Error(`elements.json 沒有 post ${id}`); return { id, element: e.element, topic: e.topic }; }));
const byDistrict = {};
for (const c of cells) byDistrict[c.district] = (byDistrict[c.district] ?? 0) + c.count;

const out = {
  generatedAt: new Date().toISOString(),
  source: path.relative(ROOT, GEO).replace(/\\/g, '/'),
  byDistrict, council: council.count,
  cells, councilPosts: council.posts, councilTiles,
  posts: perPost,
};
fs.writeFileSync(path.join(ROOT, 'data', 'cells.json'), JSON.stringify(out, null, 1));

console.log('落格方式', how);
console.log('各區', byDistrict, '議會', council.count);
console.table(councilTiles.map((t) => { const n = {}; for (const p of t.posts) n[p.element] = (n[p.element] ?? 0) + 1; return { tile: t.key, total: t.posts.length, ...n }; }));
console.table(cells.map((c) => ({ cell: `${c.q},${c.r}`, district: c.district, count: c.count })));
