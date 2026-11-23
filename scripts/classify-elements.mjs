// 替每篇貼文決定島上的元素：temp/posts-geo.json (+ temp/places.json 的地名 kind) → data/elements.json
//   規則在 scripts/lib/classify.mjs；用法：node scripts/classify-elements.mjs [posts-geo.json 路徑] [places.json 路徑]
import fs from 'node:fs';
import path from 'node:path';
import { classify, COUNCIL_RULES, LOCAL_RULES } from './lib/classify.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '..');
const GEO = process.argv[2] ?? path.join(ROOT, 'temp', 'posts-geo.json');
const PLACES = process.argv[3] ?? path.join(ROOT, 'temp', 'places.json');
const geo = JSON.parse(fs.readFileSync(GEO, 'utf8'));
const kindOf = new Map(JSON.parse(fs.readFileSync(PLACES, 'utf8')).map((p) => [p.name, p.kind]));

const posts = geo.posts.map((p) => {
  const placeKind = p.place ? kindOf.get(p.place) ?? null : null;
  const { element, matched } = classify({ island: p.island, title: p.title, placeKind });
  return { id: p.id, island: p.island, topic: p.topic, element, matched };
});
const stats = { council: {}, local: {}, byIsland: {} };
for (const p of posts) {
  const side = p.island === '議會' ? 'council' : 'local';
  stats[side][p.element] = (stats[side][p.element] ?? 0) + 1;
  const isl = (stats.byIsland[p.island] ??= {});
  isl[p.element] = (isl[p.element] ?? 0) + 1;
}
const out = {
  generatedAt: new Date().toISOString(),
  source: [GEO, PLACES].map((f) => path.relative(ROOT, f).split(path.sep).join('/')),
  rules: [
    ...COUNCIL_RULES.map((r) => ({ island: 'council', ...r })),
    ...LOCAL_RULES.map((r) => ({ island: 'local', ...r })),
  ],
  posts,
  stats,
};
fs.writeFileSync(path.join(ROOT, 'data', 'elements.json'), JSON.stringify(out, null, 1));

// 檢查用輸出：各類篇數、每類 5 筆樣本、所有 sign
const titleOf = new Map(geo.posts.map((p) => [p.id, p.summary || p.title]));
const pct = (s, n) => `${(((s.sign ?? 0) / n) * 100).toFixed(1)}%`;
function report(name, list, rules, sample) {
  const n = list.length;
  const s = name === '議會' ? stats.council : stats.local;
  console.log(`\n===== ${name} ${n} 篇，sign ${pct(s, n)} =====`);
  console.log(s);
  const seen = new Set();
  for (const r of [...rules.map((r) => r.element), 'sign']) {
    if (seen.has(r)) continue;
    seen.add(r);
    const sub = list.filter((p) => p.element === r);
    console.log(`\n[${r}] ${sub.length} 篇`);
    for (const p of sub.slice(0, r === 'sign' ? 200 : sample)) console.log(`  ${p.matched ? `(${p.matched}) ` : ''}${titleOf.get(p.id)}`);
  }
}
report('議會', posts.filter((p) => p.island === '議會'), COUNCIL_RULES, 5);
report('地方島', posts.filter((p) => p.island !== '議會'), LOCAL_RULES, 5);
console.log('\nbyIsland', JSON.stringify(stats.byIsland));
