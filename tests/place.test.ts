import { it, expect } from 'vitest';
import { layoutTile, councilTileOffsetsM, inHex, footprint } from '../src/scene/place';
import { RING_R, ROAD_W, WALK_W } from '../src/scene/roads';
import { topicColor } from '../src/scene/palette';

const R = 7, usable = RING_R * R - ROAD_W / 2 - WALK_W - 0.4;
const mk = (n: number, element: string, topic: string | null = null) => [...Array(n)].map((_, i) => ({ id: i + element.length * 1000, element, topic }));

it('三格位移：B 西北、C 西南，格心距 √3·edge', () => {
  const [a, b, c] = councilTileOffsetsM(3500);
  expect(a).toEqual([0, 0]);
  expect(Math.hypot(b[0], b[1])).toBeCloseTo(Math.sqrt(3) * 3500, 0);
  expect(b[0]).toBeLessThan(0); expect(b[1]).toBeGreaterThan(0);
  expect(c[0]).toBeLessThan(0); expect(c[1]).toBeLessThan(0);
});
it('36 個物件都在可用區內、不進保留圓、彼此間距 ≥ 兩者佔地半徑之和（預設 0.9）', () => {
  expect(footprint('suitcase') + footprint('lunch-tray')).toBeCloseTo(0.9);
  const out = layoutTile([...mk(13, 'coin'), ...mk(7, 'shield'), ...mk(9, 'suitcase'), ...mk(6, 'flag'), ...mk(1, 'sign', '交通')], { R, seed: 1, reserve: 0.8 });
  expect(out.length).toBe(36);
  for (const p of out) { expect(inHex(p.x, p.z, usable)).toBe(true); expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(0.8); }
  for (const p of out) for (const q of out) if (p !== q) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(footprint(p.element) + footprint(q.element) - 1e-9);
});
it('格 A：1 棟以外的 33 支 sign 都放得下，且避開大樓保留圓 1.7', () => {
  const out = layoutTile([...mk(27, 'council-hall'), ...mk(33, 'sign')], { R, seed: 11, reserve: 1.7 });
  expect(out.length).toBe(33);
  for (const p of out) expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(1.7);
});
it('同 element 成簇：同類物件離自己簇心 < 2.2；單篇也有位置', () => {
  const out = layoutTile([...mk(6, 'milk'), ...mk(1, 'baby')], { R, seed: 2, reserve: 0.8 });
  expect(out.filter((p) => p.element === 'baby').length).toBe(1);
  const milk = out.filter((p) => p.element === 'milk');
  const cx = milk.reduce((a, p) => a + p.x, 0) / 6, cz = milk.reduce((a, p) => a + p.z, 0) / 6;
  for (const p of milk) expect(Math.hypot(p.x - cx, p.z - cz)).toBeLessThan(2.2);
});
it('決定性：同 seed 同結果', () => {
  expect(layoutTile(mk(10, 'coin'), { R, seed: 3, reserve: 0.8 })).toEqual(layoutTile(mk(10, 'coin'), { R, seed: 3, reserve: 0.8 }));
});
it('council-hall 不進輸出', () => {
  expect(layoutTile(mk(3, 'council-hall'), { R, seed: 1, reserve: 1.7 })).toEqual([]);
});
it('topic 色：五個 topic 各不同，null 是混凝土灰', () => {
  const cs = ['交通', '民生', '校園', '教育', '長照'].map((t) => topicColor(t).getHex());
  expect(new Set(cs).size).toBe(5);
  expect(topicColor(null).getHex()).toBe(0xcfc9bd);
});

it('hint：簇心照提示方向、夾進可用區；edge：直接放在指定位置（海灘環，可超出可用區）', () => {
  const posts = [
    { id: 1, element: 'school', topic: null, hint: [0, 30] as [number, number] },
    { id: 2, element: 'port', topic: null, edge: [0, -6] as [number, number] },
    { id: 3, element: 'market', topic: null, hint: [-2, 0] as [number, number] },
  ];
  const out = layoutTile(posts, { R, seed: 5, reserve: 0.8 });
  const school = out.find((o) => o.id === 1)!, port = out.find((o) => o.id === 2)!, market = out.find((o) => o.id === 3)!;
  expect(port.x).toBeCloseTo(0, 5); expect(port.z).toBeCloseTo(-6, 5);
  expect(school.z).toBeGreaterThan(1.5); expect(Math.abs(school.x)).toBeLessThan(0.5); expect(inHex(school.x, school.z, usable)).toBe(true);
  expect(market.x).toBeLessThan(-1.5); expect(Math.hypot(market.x, market.z)).toBeGreaterThanOrEqual(1.8 - 1e-9);
});

it('blocked：地標佔的圓裡不放物件（含有提示指向那裡的簇）', () => {
  const blocked = [{ x: -2, z: -0.4, r: 2.2 }];
  const items = [...mk(3, 'school'), ...mk(4, 'crosswalk'), ...mk(2, 'library')].map((p, i) => ({ ...p, hint: i < 3 ? [-3.7, -2.0] as [number, number] : null }));
  const out = layoutTile(items, { R, seed: 5, reserve: 0.8, blocked });
  expect(out.length).toBe(items.length);
  for (const p of out) expect(Math.hypot(p.x - blocked[0].x, p.z - blocked[0].z)).toBeGreaterThanOrEqual(blocked[0].r + footprint(p.element) - 1e-9);
});

import { layoutScene } from '../src/scene/place';
const sceneItems = (n: number) => [{ id: 0, element: 'council-hall', topic: null, count: 27 }, ...[...Array(n)].map((_, i) => ({ id: i + 1, element: ['coin', 'shield', 'flag', 'milk', 'suitcase', 'sign', 'baby'][i % 7], topic: null, count: 5 - (i % 3) }))];
it('場景佈局：主物件在格心、面向主街門；配角沿主街兩側交錯、離街心 1.4、面向主街', () => {
  const sd: [number, number] = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]; // 門在 30° 方向
  const out = layoutScene(sceneItems(4), { R, streetDir: sd, reserve: 1.3, seed: 1 });
  const main = out.find((o) => o.main)!;
  expect(main.id).toBe(0); expect(main.x).toBeCloseTo(0, 5); expect(main.z).toBeCloseTo(0, 5);
  expect(main.rot).toBeCloseTo(Math.atan2(sd[0], sd[1]), 5); // +z 轉向主街
  const side = out.filter((o) => !o.main);
  expect(side.length).toBe(4);
  const alongOf = (o: { x: number; z: number }) => o.x * sd[0] + o.z * sd[1], acrossOf = (o: { x: number; z: number }) => -o.x * sd[1] + o.z * sd[0];
  for (const o of side) { expect(Math.abs(Math.abs(acrossOf(o)) - 1.4)).toBeLessThan(1e-6); expect(alongOf(o)).toBeGreaterThan(1.3); expect(inHex(o.x, o.z, usable)).toBe(true); }
  // 交錯：相鄰兩個在不同側
  const signs = side.map((o) => Math.sign(acrossOf(o)));
  expect(signs.slice(0, 2).sort()).toEqual([-1, 1]);
  // 面向主街：左側（z>0）的 +z 要朝 −z
  for (const o of side) { const face = { x: Math.sin(o.rot), z: Math.cos(o.rot) }; expect(Math.sign(acrossOf(face))).toBe(-Math.sign(acrossOf(o))); }
  for (const a of out) for (const b of out) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(footprint(a.element) + footprint(b.element) - 1e-9);
});
it('場景佈局：主街排不下的繞廣場後側（背對主街）、面向格心；沒有 council-hall 時篇數最多的當主物件', () => {
  const items = sceneItems(7).slice(1); // 沒有大樓：第一個 count 5 的當主
  const out = layoutScene(items, { R, streetDir: [0, -1], reserve: 1.6, seed: 2 });
  expect(out.length).toBe(7);
  const main = out.find((o) => o.main)!; expect(main.count).toBe(5);
  const back = out.filter((o) => !o.main && o.x * 0 + o.z * -1 < 0); // 街向 −z，後側是 z > 0
  expect(back.length).toBeGreaterThan(0);
  for (const o of back) { expect(Math.hypot(o.x, o.z)).toBeGreaterThanOrEqual(1.6); const face = [Math.sin(o.rot), Math.cos(o.rot)]; expect(face[0] * o.x + face[1] * o.z).toBeLessThan(0); }
});
