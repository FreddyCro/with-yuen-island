import { it, expect } from 'vitest';
import { craterProfile, LAKE_R, RIM_R, OUTER_R, RIM_H, treeSpots, radial, shoreFactor, setLake, lakeWorld, terrainHeight, setGap } from '../src/scene/crater';

it('火山口剖面：湖岸是 0，往外升到火口緣最高，再往外降低', () => {
  expect(craterProfile(LAKE_R)).toBeCloseTo(0, 5);
  expect(craterProfile(RIM_R)).toBeCloseTo(RIM_H, 5);
  expect(craterProfile((LAKE_R + RIM_R) / 2)).toBeGreaterThan(0);
  expect(craterProfile((LAKE_R + RIM_R) / 2)).toBeLessThan(RIM_H);
  expect(craterProfile(OUTER_R)).toBeLessThan(RIM_H);
  expect(craterProfile(OUTER_R)).toBeGreaterThan(0);
  expect(craterProfile(LAKE_R - 10)).toBeLessThan(0); // 湖裡是水下
});
it('樹：決定性、都在湖岸與外緣之間的坡上', () => {
  const a = treeSpots(300, 9), b = treeSpots(300, 9);
  expect(a).toEqual(b);
  expect(a.length).toBe(300);
  for (const t of a) { const r = radial(t.x, t.z); expect(r).toBeGreaterThan(LAKE_R + 2); expect(r).toBeLessThan(OUTER_R); expect(t.y).toBeGreaterThan(0); }
});
import * as THREE from 'three';
import { buildCrater } from '../src/scene/crater';
it('地形法線朝上（正面朝上，從上方看得到）', () => {
  const g = buildCrater(1, 10);
  const terrain = g.children[0] as THREE.Mesh;
  const n = terrain.geometry.getAttribute('normal');
  let up = 0; for (let i = 0; i < n.count; i++) if (n.getY(i) > 0) up++;
  expect(up / n.count).toBeGreaterThan(0.95);
});
it('湖岸不是正圓：半徑因子在 0.8–1.2 之間且不是常數', () => {
  const f = [...Array(36)].map((_, i) => shoreFactor((i / 36) * Math.PI * 2));
  expect(Math.min(...f)).toBeGreaterThan(0.78); expect(Math.max(...f)).toBeLessThan(1.22);
  expect(Math.max(...f) - Math.min(...f)).toBeGreaterThan(0.2);
});
it('湖可以搬到島的中心、轉向：湖岸上的點高度 0', () => {
  setLake(-6, 3, 0.4, 0.7, 1.1);
  for (let i = 0; i < 12; i++) { const [x, z] = lakeWorld(LAKE_R, (i / 12) * Math.PI * 2); expect(Math.abs(terrainHeight(x, z))).toBeLessThan(1e-6); }
  expect(terrainHeight(-6, 3)).toBeLessThan(0); // 湖心是水下
  setLake(0, 0, 0, 0.72, 1);
});
it('山稜在指定方向開低窪：那個方向的火口緣不到 0.35 RIM_H，反方向接近 RIM_H', () => {
  setGap(0);
  const [gx, gz] = lakeWorld(RIM_R, 0), [ox, oz] = lakeWorld(RIM_R, Math.PI);
  expect(terrainHeight(gx, gz)).toBeLessThan(0.35 * RIM_H);
  expect(terrainHeight(ox, oz)).toBeGreaterThan(0.75 * RIM_H);
  setGap(NaN);
});
it('樹：兩種樹冠都有、大小 0.6–1.9、有轉向', () => {
  const a = treeSpots(200, 3);
  expect(a.some((t) => t.kind === 0) && a.some((t) => t.kind === 1)).toBe(true);
  for (const t of a) { expect(t.s).toBeGreaterThanOrEqual(0.6); expect(t.s).toBeLessThanOrEqual(1.9); }
  expect(new Set(a.map((t) => t.rot.toFixed(3))).size).toBeGreaterThan(100);
});
