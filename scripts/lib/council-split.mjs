// 議會分兩格：A（council）= 大樓 + 政務四類 + 告示牌、B（council-1，西北）= 民生四類。
// 每類在格上是一簇（顆數隨篇數），所以沒有容量上限的問題。
export const TILE_KEYS = ['council', 'council-1'];

const TILE_OF = {
  'council-hall': 0, coin: 0, shield: 0, suitcase: 0, flag: 0, sign: 0,
  'lunch-tray': 1, milk: 1, baby: 1, 'elder-card': 1,
};

/** @param {Array<{ id: number; element: string; topic: string | null }>} posts */
export function splitCouncil(posts) {
  const tiles = TILE_KEYS.map((key) => ({ key, posts: [] }));
  for (const p of posts) tiles[TILE_OF[p.element] ?? 0].posts.push({ id: p.id, element: p.element, topic: p.topic });
  return tiles;
}
