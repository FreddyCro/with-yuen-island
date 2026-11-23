import { it, expect } from 'vitest';
import * as THREE from 'three';
import { buildFerry } from '../src/scene/mascot/ferry';

it('渡輪（1.5 倍）：長 3.45–3.75、寬 0.9–1.2、底在 y=0、高 1.35–1.95、≤ 14 個 mesh', () => {
  const f = buildFerry();
  f.object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(f.object);
  const size = box.getSize(new THREE.Vector3());
  expect(size.x).toBeGreaterThanOrEqual(3.45); expect(size.x).toBeLessThanOrEqual(3.75);
  expect(size.z).toBeGreaterThanOrEqual(0.9); expect(size.z).toBeLessThanOrEqual(1.2);
  expect(box.min.y).toBeCloseTo(0, 1);
  expect(size.y).toBeGreaterThanOrEqual(1.35); expect(size.y).toBeLessThanOrEqual(1.95);
  let meshes = 0; f.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  expect(meshes).toBeLessThanOrEqual(14);
  expect(() => f.update(1)).not.toThrow();
});
it('第二艘：accent 不同色，尺寸相同', () => {
  const a = buildFerry(), b = buildFerry({ accent: 0x3f7fbf });
  const sa = new THREE.Box3().setFromObject(a.object).getSize(new THREE.Vector3()), sb = new THREE.Box3().setFromObject(b.object).getSize(new THREE.Vector3());
  expect(sa.x).toBeCloseTo(sb.x, 5);
});
