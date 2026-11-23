import { it, expect } from 'vitest';
import * as THREE from 'three';
import { harbourGeometry, HARBOURS } from '../src/scene/harbours';
import { gateDir } from '../src/scene/roads';

const R = 7, Y = new THREE.Vector3(0, 1, 0);
const dirOf = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();

it('三港清單：議會門 5、八里門 2、淡水門 2', () => {
  expect(HARBOURS.map((h) => [h.key, h.gate])).toEqual([['council', 5], ['-2,-1', 2], ['-2,0', 2]]);
});
it('港口幾何：各點在門的方向上、距離與高度照 spec', () => {
  const g = harbourGeometry(new THREE.Vector3(0, 0, 0), 2.3, R, 5);
  const d = gateDir(5);
  for (const v of [g.gatePos, g.pierEnd, g.portPos, g.dock, g.offshore]) expect(dirOf(v).dot(d)).toBeCloseTo(1, 3);
  expect(Math.hypot(g.dock.x, g.dock.z)).toBeCloseTo(1.38 * R, 3);
  expect(Math.hypot(g.offshore.x, g.offshore.z)).toBeCloseTo(2.05 * R, 3);
  expect(Math.hypot(g.portPos.x, g.portPos.z)).toBeCloseTo(Math.cos(Math.PI / 6) * R - 0.25, 3); // 港在海灘環邊往內 0.25
  expect(Math.hypot(g.pierEnd.x, g.pierEnd.z)).toBeLessThan(Math.cos(Math.PI / 6) * R); // 坡底在海灘環上，不在海上
  expect(Math.hypot(g.pierEdge.x, g.pierEdge.z)).toBeLessThan(0.77 * R); // 平段末端還在頂面上
  expect(g.portPos.y).toBeCloseTo(1.85, 3);
  expect(g.pierEnd.y).toBeCloseTo(1.91, 3);
  expect(g.gatePos.y).toBeCloseTo(2.32, 3);
  expect(g.dock.y).toBeCloseTo(0.1, 3);
});
it('portRot：元素的 +z（水面）朝海', () => {
  const g = harbourGeometry(new THREE.Vector3(3, 0, -4), 2.3, R, 2);
  const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(Y, g.portRot);
  expect(front.dot(gateDir(2))).toBeCloseTo(1, 3);
});
