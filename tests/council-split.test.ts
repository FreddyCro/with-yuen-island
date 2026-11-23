import { it, expect } from 'vitest';
import { splitCouncil, TILE_KEYS } from '../scripts/lib/council-split.mjs';

const p = (id: number, element: string, topic: string | null = null) => ({ id, element, topic });
const ids = (r: Array<{ posts: Array<{ id: number }> }>) => r.map((t) => t.posts.map((x) => x.id));

it('兩格：A = 大樓 + 政務四類 + 告示牌，B = 民生四類', () => {
  expect(TILE_KEYS).toEqual(['council', 'council-1']);
  const r = splitCouncil([p(1, 'council-hall'), p(2, 'milk'), p(3, 'baby'), p(4, 'coin'), p(5, 'flag'), p(6, 'sign', '民生'), p(7, 'lunch-tray'), p(8, 'elder-card'), p(9, 'shield'), p(10, 'suitcase')]);
  expect(r.map((t) => t.key)).toEqual(TILE_KEYS);
  expect(ids(r)).toEqual([[1, 4, 5, 6, 9, 10], [2, 3, 7, 8]]);
});
it('132 篇全部都在，順序穩定', () => {
  const posts = [...Array(132)].map((_, i) => p(i, ['council-hall', 'sign', 'coin', 'milk'][i % 4]));
  const r = splitCouncil(posts);
  expect(r.flatMap((t) => t.posts).length).toBe(132);
  expect(r[1].posts.map((x) => x.id)).toEqual(posts.filter((x) => x.element === 'milk').map((x) => x.id));
});
