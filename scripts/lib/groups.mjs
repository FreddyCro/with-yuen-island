import tiers from '../../data/tiers.json' with { type: 'json' };
// 分組與落格：島 × 元素 = 一組（一個物件）。純函式，tests/groups.test.ts 測。

/** 側欄的議題篩選：交通、民生、教育與校園（校園＋教育）、其他（無議題、長照）。 */
export const TOPIC_BUCKETS = ['交通', '民生', '教育與校園', '其他'];

export function topicBucket(topic) {
  if (topic === '交通') return '交通';
  if (topic === '民生') return '民生';
  if (topic === '校園' || topic === '教育') return '教育與校園';
  return '其他';
}

export const groupKey = (island, element) => `${island}-${element}`;

/**
 * @param {Array<{ id: number; island: string; element: string; topic: string | null; cell: string }>} posts
 * @returns {Map<string, { key: string; island: string; element: string; posts: typeof posts }>}
 */
export function groupPosts(posts) {
  const out = new Map();
  for (const p of posts) {
    const k = groupKey(p.island, p.element);
    if (!out.has(k)) out.set(k, { key: k, island: p.island, element: p.element, posts: [] });
    out.get(k).posts.push(p);
  }
  return out;
}

/**
 * 每組選一格：依「組內貼文落在該格的篇數」由多到少挑，同格最多 `max` 組；大組先挑。
 * 自己的候選格都滿了 → 改放 `allCells`（同島所有格）裡目前最空的那格；都沒有才硬塞最多的那格。
 * `pinned` 可以把某組釘在某格（議會大樓 → 主格）。
 * `avoid` 是不放物件的格（有山的格）；只有 `g.allowAvoid` 為真的組（內容與山有關）才可以放進去。
 * @param {Array<{ key: string; posts: Array<{ cell: string }> }>} groups
 * @returns {Map<string, string>} groupKey → cell
 */
export function assignCells(groups, { max = 7, pinned = {}, allCells = [], avoid = new Set(), lPenalty = 0.6 } = {}) {
  const load = new Map(), loadL = new Map();
  const out = new Map();
  const elementOf = (key) => groups.find((g) => g.key === key)?.element ?? key.split('-').slice(1).join('-');
  const isL = (key) => tierOf(elementOf(key)) === 'L';
  const take = (key, cell) => { out.set(key, cell); load.set(cell, (load.get(cell) ?? 0) + 1); if (isL(key)) loadL.set(cell, (loadL.get(cell) ?? 0) + 1); };
  for (const [key, cell] of Object.entries(pinned)) if (groups.some((g) => g.key === key)) take(key, cell);
  const order = [...groups].filter((g) => !out.has(g.key)).sort((a, b) => b.posts.length - a.posts.length || a.key.localeCompare(b.key));
  for (const g of order) {
    const counts = new Map();
    for (const p of g.posts) counts.set(p.cell, (counts.get(p.cell) ?? 0) + 1);
    // 軟性規則：L 組挑格時，已經有 L 的格分數打折（lPenalty），只影響排序；候選格只有一個時照放
    const score = ([c, n]) => (isL(g.key) && (loadL.get(c) ?? 0) > 0 ? n * lPenalty : n);
    const ranked = [...counts.entries()].sort((a, b) => score(b) - score(a) || a[0].localeCompare(b[0])).map(([c]) => c);
    const free = (c) => (load.get(c) ?? 0) < max && (g.allowAvoid || !avoid.has(c));
    // 沒有貼文落在的格不會被拿來填（沒分到建築的格先留空，之後放別的東西）；候選都滿就硬塞最多的那格
    // 候選格都滿：溢到同區其他還有名額的非山格（先挑已經有物件的，再挑空的），讓分給該區的格派上用場
    const spare = [...allCells].filter((c) => !avoid.has(c) && free(c)).sort((x, y) => (load.get(y) ?? 0) - (load.get(x) ?? 0) || x.localeCompare(y))[0];
    // 候選格全是山（avoid）時，改放同區「已經有物件」的非山格裡最滿的那格；完全沒有才硬塞
    const busyNonAvoid = [...allCells].filter((c) => !avoid.has(c) && (load.get(c) ?? 0) > 0).sort((x, y) => (load.get(y) ?? 0) - (load.get(x) ?? 0) || x.localeCompare(y))[0];
    take(g.key, ranked.find(free) ?? spare ?? ranked.find((c) => g.allowAvoid || !avoid.has(c)) ?? busyNonAvoid ?? ranked[0]);
  }
  return out;
}

/** 出現最多的原始 topic（給物件上色）；平手取先出現的。 */
export function dominantTopic(posts) {
  const n = new Map();
  for (const p of posts) n.set(p.topic, (n.get(p.topic) ?? 0) + 1);
  let best = null, bestN = -1;
  for (const [t, c] of n) if (c > bestN) { best = t; bestN = c; }
  return best;
}

/** 內文摘錄：去掉開頭的日期行與多餘空白，取前 `n` 字。 */
export function excerpt(text, n = 70) {
  const s = (text ?? '').replace(/^\s*\d{4}[/.-]\d{1,2}[/.-]\d{1,2}\s*/, '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** 與山有關的內容：標題有這些字的篇數佔一半以上，這一組才可以放在山的格。 */
export const MOUNTAIN_WORDS = ['山', '步道', '登山', '坡', '坍方', '林道'];
export function isMountainGroup(posts) {
  const n = posts.filter((p) => MOUNTAIN_WORDS.some((w) => (p.title ?? '').includes(w))).length;
  return posts.length > 0 && n * 2 >= posts.length;
}

/**
 * 一組貼文的地理重心相對於格心的偏移（場景單位：1 單位 = 500 m；版面 y 朝北 → 場景 −z）。
 * 只用有經緯度的貼文；沒有就回傳 null。八里側要加 baliShift（和 assign-cells 一樣）。
 * 經緯度只到地名等級（誤差數百公尺），一格邊長 3.5 km，所以當「在格內偏哪一邊」用，不當精確位置。
 */
export function geoOffset(posts, cell, projection, scale, baliShift = [0, 0], bali = false, M = 1 / 500) {
  const { lon0, lat0, metersPerDeg, cosLat } = projection;
  let sx = 0, sy = 0, n = 0;
  for (const p of posts) {
    if (p.lat == null || p.lng == null) continue;
    let x = (p.lng - lon0) * metersPerDeg * cosLat * scale, y = (p.lat - lat0) * metersPerDeg * scale;
    if (bali) { x += baliShift[0]; y += baliShift[1]; }
    sx += x - cell.x; sy += y - cell.y; n++;
  }
  if (!n) return null;
  return [(sx / n) * M, -(sy / n) * M];
}

/** 元素等級（data/tiers.json）：不在表裡的當 M。 */
export function tierOf(element) {
  for (const t of ['L', 'M', 'S']) if (tiers[t].elements.includes(element)) return t;
  return 'M';
}
