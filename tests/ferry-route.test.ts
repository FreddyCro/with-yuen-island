import { it, expect } from 'vitest';
import * as THREE from 'three';
import layout from '../data/layout.json';
import { harbourGeometry, HARBOURS } from '../src/scene/harbours';
import { councilTileOffsetsM } from '../src/scene/place';
import { buildRoute, routeState, routeClearance, routePeriod, segmentsCross, islandLoop } from '../src/scene/ferry-route';
import { vertexOf } from '../src/scene/roads';
import type { HexColumn } from '../src/scene/hex';

// 和 main.ts 一樣的投影：1 單位 = 500 m、y 朝北 → −z、場景中心是格的平均
const M = 1 / 500, R = layout.edgeM * M;
const cx = layout.cells.reduce((a, c) => a + c.x, 0) / layout.cells.length * M, cy = layout.cells.reduce((a, c) => a + c.y, 0) / layout.cells.length * M;
const P = (x: number, y: number) => new THREE.Vector3(x * M - cx, 0, -(y * M - cy));
const centers = new Map<string, THREE.Vector3>();
for (const c of layout.cells) centers.set(`${c.q},${c.r}`, P(c.x, c.y));
councilTileOffsetsM(layout.edgeM).forEach(([dx, dy], i) => centers.set(['council', 'council-1', 'council-2'][i], P(layout.council.x + dx, layout.council.y + dy)));
const harbours = HARBOURS.map((h) => harbourGeometry(centers.get(h.key)!, 2.3, R, h.gate));
const legs = buildRoute(harbours);

it('閉環：3 港 × 3 段 = 9 段，首尾相接', () => {
  expect(legs.length).toBe(9);
  for (let i = 0; i < 9; i++) expect(legs[i].to.distanceTo(legs[(i + 1) % 9].from)).toBeLessThan(1e-9);
  expect(legs.filter((l) => l.dockAtEnd).length).toBe(3);
});
it('航線離所有格心 ≥ 1.25 R（靠港段除外）', () => {
  expect(routeClearance(legs, [...centers.values()], R)).toBeGreaterThanOrEqual(1.25);
});
it('離岸段不穿過兩座橋', () => {
  const fake = (k: string) => ({ position: centers.get(k)! } as unknown as HexColumn);
  for (const b of layout.bridges) {
    const A = fake(b.from.join(',')), T = fake(b.to.join(','));
    let best: [THREE.Vector3, THREE.Vector3] | null = null;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const p = vertexOf(A, R, i), q = vertexOf(T, R, j); if (!best || p.distanceTo(q) < best[0].distanceTo(best[1])) best = [p, q]; }
    for (const l of legs.filter((x) => !x.dockAtEnd && !x.fromDock)) expect(segmentsCross(l.from, l.to, best![0], best![1])).toBe(false);
  }
});
it('routeState：heading 連續、停泊時不動、一週期後回到原狀', () => {
  const T = routePeriod(legs);
  let prev = routeState(legs, 0);
  let dockedSteps = 0;
  for (let t = 0.05; t <= T + 1e-9; t += 0.05) {
    const s = routeState(legs, t);
    let dh = Math.abs(s.heading - prev.heading) % (Math.PI * 2); if (dh > Math.PI) dh = Math.PI * 2 - dh;
    expect(dh).toBeLessThanOrEqual(0.25);
    if (s.docked && prev.docked) { expect(s.pos.distanceTo(prev.pos)).toBeLessThan(1e-9); dockedSteps++; }
    prev = s;
  }
  expect(dockedSteps).toBeGreaterThan(3 * 4 / 0.05 - 10);
  const a = routeState(legs, 1.7), b = routeState(legs, 1.7 + T);
  expect(a.pos.distanceTo(b.pos)).toBeLessThan(1e-6);
});
it('繞島航線：閉環、離主島所有格心 ≥ 1.25 R、也離議會三格 ≥ 1.25 R', () => {
  const main = layout.cells.map((c) => centers.get(`${c.q},${c.r}`)!);
  const loop = islandLoop(main, R);
  expect(loop.length).toBe(loop.filter((l) => !l.dockAtEnd && !l.fromDock).length);
  for (let i = 0; i < loop.length; i++) expect(loop[i].to.distanceTo(loop[(i + 1) % loop.length].from)).toBeLessThan(1e-9);
  expect(routeClearance(loop, [...centers.values()], R)).toBeGreaterThanOrEqual(1.25);
  expect(routePeriod(loop)).toBeGreaterThan(30);
});
