import { it, expect } from 'vitest';
import * as THREE from 'three';
import { ANIMAL_TYPES } from '../src/scene/animals';
import { mulberry32 } from '../src/scene/hex';

const size = (o: THREE.Object3D) => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); return b.getSize(new THREE.Vector3()); };

it('狗高約 0.42 長約 0.5、貓高約 0.3 長約 0.42（面向 +x，所以長是 x）', () => {
  const dog = ANIMAL_TYPES.find((a) => a.id === 'dog')!.build({ rng: mulberry32(1) });
  const cat = ANIMAL_TYPES.find((a) => a.id === 'cat')!.build({ rng: mulberry32(1) });
  const d = size(dog.object), c = size(cat.object);
  expect(d.y).toBeGreaterThan(0.36); expect(d.y).toBeLessThan(0.5); expect(d.x).toBeGreaterThan(0.42); expect(d.x).toBeLessThan(0.62);
  expect(c.y).toBeGreaterThan(0.24); expect(c.y).toBeLessThan(0.38); expect(c.x).toBeGreaterThan(0.34); expect(c.x).toBeLessThan(0.55);
  expect(c.y).toBeLessThan(d.y);
});

it('每種兩個 variant 的身體色不同', () => {
  for (const def of ANIMAL_TYPES) {
    const cols = def.variants.map((_, v) => { const a = def.build({ rng: mulberry32(1), variant: v }); const m = a.object.getObjectByName('body') as THREE.Mesh; return (m.material as THREE.MeshStandardMaterial).color.getHex(); });
    expect(new Set(cols).size).toBe(def.variants.length);
  }
});

it('走→坐→走：坐下時腿不擺，切回走路後腿又會擺', () => {
  for (const def of ANIMAL_TYPES) {
    const a = def.build({ rng: mulberry32(2) });
    const legs = () => ['legFL', 'legFR', 'legBL', 'legBR'].map((n) => a.object.getObjectByName(n)!.rotation.z); // 面向 +x，腿前後擺是繞 z
    a.update(0.3, 'walk'); const w1 = legs();
    a.update(0.3, 'sit'); a.update(0.9, 'sit'); const s1 = legs(); a.update(1.5, 'sit'); expect(legs()).toEqual(s1);
    expect(s1).not.toEqual(w1);
    a.update(0.3, 'walk'); expect(legs()).toEqual(w1);
  }
});
