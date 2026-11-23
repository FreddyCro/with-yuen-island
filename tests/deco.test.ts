import { it, expect } from 'vitest';
import * as THREE from 'three';
import { lampSpots } from '../src/scene/lamps';
import { floraSpots } from '../src/scene/flora';
import { inHex, usableRadius } from '../src/scene/place';
import { ROAD_W } from '../src/scene/roads';

it('路燈：每條連接路一盞、在路中點旁邊（離路心 ROAD_W/2 + 0.35）', () => {
  const a = new THREE.Vector3(0, 2.3, 0), b = new THREE.Vector3(4, 2.3, 0);
  const s = lampSpots({ gates: new Map(), rings: new Map(), links: [[a, b]] });
  expect(s.length).toBe(1);
  expect(s[0].x).toBeCloseTo(2, 6); expect(Math.abs(s[0].z)).toBeCloseTo(ROAD_W / 2 + 0.35, 6); expect(s[0].y).toBeCloseTo(2.3, 6);
});
it('花草：決定性、在可用區內、避開物件與格心、彼此不重疊', () => {
  const R = 7, U = usableRadius(R);
  const avoid = [{ x: 0, z: 0, r: 1.2 }, { x: 2.5, z: 1, r: 1.0 }];
  const a = floraSpots(R, 3, avoid), b = floraSpots(R, 3, avoid);
  expect(a).toEqual(b);
  expect(a.length).toBeGreaterThanOrEqual(8);
  for (const s of a) {
    expect(inHex(s.x, s.z, U)).toBe(true);
    for (const o of avoid) expect(Math.hypot(o.x - s.x, o.z - s.z)).toBeGreaterThanOrEqual(o.r + 0.45 - 1e-9);
    for (const q of a) if (q !== s) expect(Math.hypot(q.x - s.x, q.z - s.z)).toBeGreaterThanOrEqual(0.55 - 1e-9);
  }
});
