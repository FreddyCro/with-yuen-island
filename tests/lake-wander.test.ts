import { it, expect } from 'vitest';
import * as THREE from 'three';
import layout from '../data/layout.json';
import { councilTileOffsetsM } from '../src/scene/place';
import { setLake, lakeLocal, LAKE_R } from '../src/scene/crater';
import { lakeWater, lakeWanderer } from '../src/scene/lake-wander';
import { vertexOf } from '../src/scene/roads';
import { segmentsCross } from '../src/scene/ferry-route';
import type { HexColumn } from '../src/scene/hex';

// 和 main.ts 一樣的投影與湖的擺放
const M = 1 / 500, R = layout.edgeM * M;
const mx0 = layout.cells.reduce((a, c) => a + c.x, 0) / layout.cells.length * M, my0 = layout.cells.reduce((a, c) => a + c.y, 0) / layout.cells.length * M;
const P = (x: number, y: number) => new THREE.Vector3(x * M - mx0, 0, -(y * M - my0));
const centers = new Map<string, THREE.Vector3>();
for (const c of layout.cells) centers.set(`${c.q},${c.r}`, P(c.x, c.y));
councilTileOffsetsM(layout.edgeM).forEach(([dx, dy], i) => centers.set(['council', 'council-1', 'council-2'][i], P(layout.council.x + dx, layout.council.y + dy)));
{
  const pts = [...centers.values()].map((g) => [g.x, g.z] as [number, number]);
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, mz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of pts) { sxx += (x - mx) ** 2; szz += (z - mz) ** 2; sxz += (x - mx) * (z - mz); }
  const angle = 0.5 * Math.atan2(2 * sxz, sxx - szz), ca = Math.cos(-angle), sa = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of pts) { const u = (x - mx) * ca - (z - mz) * sa, v = (x - mx) * sa + (z - mz) * ca; minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  const halfU = (maxU - minU) / 2 + R, halfV = (maxV - minV) / 2 + R, cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
  const cx = mx + cu * Math.cos(angle) - cv * Math.sin(angle), cz = mz + cu * Math.sin(angle) + cv * Math.cos(angle);
  const gap = 2 * Math.sqrt(3) * R + R * 0.5;
  setLake(cx, cz, angle, Math.max(0.55, Math.min(1, (halfV + gap) / (halfU + gap))), (halfU + gap) / LAKE_R);
}
const fake = (k: string) => ({ position: centers.get(k)! } as unknown as HexColumn);
const bridges = layout.bridges.map((b) => {
  const A = fake(b.from.join(',')), T = fake(b.to.join(','));
  let best: [THREE.Vector3, THREE.Vector3] | null = null;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const p = vertexOf(A, R, i), q = vertexOf(T, R, j); if (!best || p.distanceTo(q) < best[0].distanceTo(best[1])) best = [p, q]; }
  return best!;
});
const water = lakeWater([...centers.values()], R, bridges);

it('兩艘漫遊船 10 分鐘：都在湖內、離所有格心 ≥ 1.3 R、不穿橋、會動、heading 連續', () => {
  const boats = [lakeWanderer(water, 7), lakeWanderer(water, 31)];
  let prev = boats.map((b) => b.state());
  const start = prev.map((s) => s.pos.clone());
  let maxTravel = [0, 0];
  for (let t = 0; t < 600; t += 1 / 30) {
    const now = boats.map((b, i) => b.advance(1 / 30, prev.filter((_, j) => j !== i).map((s) => s.pos)));
    now.forEach((s, i) => {
      expect(lakeLocal(s.pos.x, s.pos.z).r).toBeLessThan(0.9 * LAKE_R);
      expect(water.clearance([s.pos.x, s.pos.z])).toBeGreaterThanOrEqual(1.3);
      for (const [p, q] of bridges) expect(segmentsCross(prev[i].pos, s.pos, p, q)).toBe(false);
      let dh = Math.abs(s.heading - prev[i].heading) % (Math.PI * 2); if (dh > Math.PI) dh = Math.PI * 2 - dh;
      expect(dh).toBeLessThan(0.05);
      maxTravel[i] = Math.max(maxTravel[i], s.pos.distanceTo(start[i]));
    });
    prev = now;
  }
  expect(Math.min(...maxTravel)).toBeGreaterThan(20);
});

it('決定性：同 seed 同軌跡', () => {
  const a = lakeWanderer(water, 5), b = lakeWanderer(water, 5);
  for (let i = 0; i < 300; i++) { a.advance(0.05); b.advance(0.05); }
  expect(a.state().pos.distanceTo(b.state().pos)).toBeLessThan(1e-9);
});
