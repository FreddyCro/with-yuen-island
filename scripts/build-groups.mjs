// 政績分組：data/elements.json + data/cells.json + temp/posts-geo.json + temp/withyuen-api-*/posts.json → data/groups.json
//   組 = 島 × 元素；每組一個物件，點了在側欄列出該組政績。規則見 docs/superpowers/specs/2026-11-24-groups-sidebar-design.md
//   用法：node scripts/build-groups.mjs
import fs from 'node:fs';
import path from 'node:path';
import { TOPIC_BUCKETS, topicBucket, groupPosts, assignCells, dominantTopic, excerpt, isMountainGroup, geoOffset } from './lib/groups.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const elements = read('data/elements.json');
const cells = read('data/cells.json');
const geo = read('temp/posts-geo.json');
const apiDir = fs.readdirSync(path.join(ROOT, 'temp')).filter((d) => d.startsWith('withyuen-api-')).sort().pop();
const raw = read(`temp/${apiDir}/posts.json`);

const geoById = new Map(geo.posts.map((p) => [p.id, p]));
const textById = new Map(raw.posts.map((p) => [p.id, p.content_text]));
const cellById = new Map(cells.posts.map((p) => [p.id, p.cell]));
// 議會的貼文：格由 councilTiles 決定（cells.json 的 posts 全標 'council'）
for (const t of cells.councilTiles) for (const p of t.posts) cellById.set(p.id, t.key);

const posts = elements.posts.map((e) => {
  const g = geoById.get(e.id);
  if (!g) throw new Error(`posts-geo.json 沒有 post ${e.id}`);
  return { id: e.id, island: e.island, element: e.element, topic: e.topic, cell: cellById.get(e.id) ?? 'council', date: g.date, title: g.title, link: g.link };
});

const groups = [...groupPosts(posts).values()];
// 每島各自分格；候選格都滿時退到同島最空的格
const islandCells = {};
for (const c of cells.cells) (islandCells[c.district.replace(/區$/, '')] ??= []).push(`${c.q},${c.r}`);
islandCells['議會'] = cells.councilTiles.map((t) => t.key);
// 山的格（有錐體山丘：海拔 > 200 或具名的山）不放物件，除非那一組的內容與山有關（isMountainGroup）
const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'layout.json'), 'utf8'));
const hillCells = new Set(layout.cells.filter((c) => c.ele > 200).map((c) => `${c.q},${c.r}`));
for (const pl of layout.places.filter((p) => p.name.endsWith('山'))) {
  if (pl.name === '觀音山') { hillCells.add(layout.bridges.find((b) => b.name.startsWith('關渡')).from.join(',')); continue; }
  const c = [...layout.cells].sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
  hillCells.add(`${c.q},${c.r}`);
}
for (const g of groups) g.allowAvoid = isMountainGroup(g.posts);
const cellOf = new Map();
for (const [island, all] of Object.entries(islandCells)) {
  const list = groups.filter((g) => g.island === island);
  const pinned = island === '議會' ? { '議會-council-hall': 'council' } : {};
  // 石門：物件全放靠太陽（西）那格 1,1，另一格 2,1 當山（海拔由 edit-layout 設）
  const FORCE_CELL = { 石門: '1,1' };
  if (FORCE_CELL[island]) for (const g of list) pinned[g.key] = FORCE_CELL[island];
  // 議會只有兩格、十組（A = 大樓 + 政務 + 告示牌，B = 民生），每格上限放寬到 6
  for (const [k, c] of assignCells(list, { max: island === '三芝' ? 6 : 8, pinned, allCells: all, avoid: hillCells })) cellOf.set(k, c); // 三芝兩格可用（0,1 與分來的 -1,1），上限壓到 6 讓物件分過去
}

// 每組的地理偏移：貼文經緯度重心相對於所在格的格心（場景單位），給擺放當方向提示
const cellXY = new Map(layout.cells.map((c) => [`${c.q},${c.r}`, c]));
for (const g of groups) {
  const cell = cellXY.get(cellOf.get(g.key));
  g.offset = cell ? geoOffset(g.posts.map((p) => geoById.get(p.id) ?? {}), cell.geo ?? cell, layout.projection, layout.scale, layout.baliShift, cell.district === '八里區') : null; // 搬過的格用原地理位置
}
const out = {
  generatedAt: new Date().toISOString(),
  source: ['data/elements.json', 'data/cells.json', 'temp/posts-geo.json', `temp/${apiDir}/posts.json`],
  topics: TOPIC_BUCKETS,
  groups: groups
    .sort((a, b) => a.island.localeCompare(b.island) || b.posts.length - a.posts.length)
    .map((g) => {
      const topics = Object.fromEntries(TOPIC_BUCKETS.map((t) => [t, 0]));
      for (const p of g.posts) topics[topicBucket(p.topic)]++;
      const sorted = [...g.posts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      return {
        key: g.key, island: g.island, element: g.element, cell: cellOf.get(g.key), count: g.posts.length,
        colorTopic: dominantTopic(g.posts), topics, offset: g.offset ?? null,
        from: sorted.at(-1).date, to: sorted[0].date,
        posts: sorted.map((p) => ({ id: p.id, date: p.date, title: p.title, excerpt: excerpt(textById.get(p.id)), link: p.link, topic: topicBucket(p.topic) })),
      };
    }),
};
fs.writeFileSync(path.join(ROOT, 'data', 'groups.json'), JSON.stringify(out, null, 1));

console.log('組數', out.groups.length, '篇數', out.groups.reduce((a, g) => a + g.count, 0));
const perCell = {};
for (const g of out.groups) (perCell[g.cell] ??= []).push(`${g.element}(${g.count})`);
console.table(Object.entries(perCell).map(([cell, list]) => ({ cell, n: list.length, groups: list.join(' ') })));
