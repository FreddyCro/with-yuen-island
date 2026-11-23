import { it, expect } from 'vitest';
import * as THREE from 'three';
import { roadsideOffset, ANIMAL_SIDE } from '../src/scene/animals/roadside';
import { ROAD_W } from '../src/scene/roads';

it('面向 +x（heading 0）時右側是 +z；面向 −z（heading π/2）時右側是 +x', () => {
  const a = roadsideOffset(new THREE.Vector3(1, 0, 1), 0, 0.5);
  expect(a.x).toBeCloseTo(1); expect(a.z).toBeCloseTo(1.5);
  const b = roadsideOffset(new THREE.Vector3(0, 0, 0), Math.PI / 2, 0.5);
  expect(b.x).toBeCloseTo(0.5); expect(b.z).toBeCloseTo(0);
});

it('不改原本的點、保留 y', () => {
  const p = new THREE.Vector3(2, 0.7, 3);
  const q = roadsideOffset(p, 1, 0.3);
  expect(p.toArray()).toEqual([2, 0.7, 3]);
  expect(q.y).toBe(0.7);
});

it('ANIMAL_SIDE 在車道外半邊（離中心線超過 1/4 路寬，才不會跟競選車走同一條線），但不超出路面', () => {
  expect(ANIMAL_SIDE).toBeGreaterThan(ROAD_W / 4);
  expect(ANIMAL_SIDE).toBeLessThan(ROAD_W / 2);
});
