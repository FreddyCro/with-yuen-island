import { it, expect } from 'vitest';
import * as THREE from 'three';
import { sunsetSunPosition, SUNSET } from '../src/scene/sunset';

it('太陽在「橋中點 → 議會」的方向上、距離 140、仰角約 9°', () => {
  const bridgeMid = new THREE.Vector3(10, 0, 4), council = new THREE.Vector3(-30, 0, 2);
  const p = sunsetSunPosition(bridgeMid, council);
  const flat = new THREE.Vector3(p.x, 0, p.z);
  const dir = council.clone().sub(bridgeMid).setY(0).normalize();
  expect(flat.clone().normalize().dot(dir)).toBeCloseTo(1, 4);
  expect(flat.length()).toBeCloseTo(140, 3);
  expect(Math.atan2(p.y, flat.length()) * 180 / Math.PI).toBeCloseTo(9, 1);
});
it('夕陽色盤：天頂偏紫藍、地平線橘、海面偏暗', () => {
  expect(SUNSET.skyTop).not.toBe(SUNSET.horizon);
  expect(new THREE.Color(SUNSET.horizon).r).toBeGreaterThan(new THREE.Color(SUNSET.horizon).b);
  expect(new THREE.Color(SUNSET.skyTop).b).toBeGreaterThan(new THREE.Color(SUNSET.skyTop).r);
});
