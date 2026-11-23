import * as THREE from 'three';
import { rbox, soft } from '../citizens/figure';
import { makeLeg, addEyes } from './quad';
import type { Animal, AnimalOptions } from './index';
import type { Pose } from './stroll';

/**
 * 貓：比狗細長、尖耳、長尾巴往上彎。原點在腳底中心、面向 +x。scale 1 時高約 0.3、長約 0.42。
 * 結構同狗：torso 支點在髖關節；坐下時前身抬起、後腿摺；趴下時四腿收進身下、身體降到地面。
 */
export const CAT_COLORS = [
  { body: 0xe8975a, belly: 0xfaf3e6, ear: 0xd9834a }, // 橘貓
  { body: 0x2b2a2e, belly: 0xf4f1ea, ear: 0x2b2a2e }, // 黑白貓（白吻白腳）
];

const HIP = { x: -0.09, y: 0.12 };

export function buildCat({ rng, variant, phase = 0 }: AnimalOptions): Animal {
  const v = variant ?? Math.floor(rng() * CAT_COLORS.length);
  const c = CAT_COLORS[v];
  const body = soft(c.body, 0.65), belly = soft(c.belly, 0.7), ear = soft(c.ear, 0.6), nose = soft(0xd98a8a, 0.5);
  const paw = v === 1 ? belly : undefined; // 黑白貓白腳

  const object = new THREE.Group();
  const root = new THREE.Group();
  object.add(root);

  const torso = new THREE.Group();
  torso.position.set(HIP.x, HIP.y, 0);
  root.add(torso);
  const bodyMesh = rbox(0.26, 0.12, 0.11, 0.04, body, 0.09, 0.05, 0); bodyMesh.name = 'body';
  torso.add(bodyMesh);
  torso.add(rbox(0.18, 0.03, 0.08, 0.012, belly, 0.09, 0, 0)); // 白肚

  // 頭：球＋兩個四角錐尖耳＋小吻
  const head = new THREE.Group();
  head.position.set(0.24, 0.12, 0);
  torso.add(head);
  const R = 0.085;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20), body); skull.castShadow = true;
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), belly);
  muzzle.scale.set(0.8, 0.7, 1.2); muzzle.position.set(R - 0.01, -0.025, 0); muzzle.castShadow = true;
  head.add(muzzle);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), nose); tip.position.set(R + 0.015, -0.012, 0); head.add(tip);
  addEyes(head, R, 0.015, 0.42, 0.12);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), ear);
    e.position.set(-0.01, R * 0.85, s * R * 0.6); e.rotation.set(0, Math.PI / 4, s * 0.25); e.castShadow = true;
    head.add(e);
  }

  // 四腿
  const legFL = makeLeg('legFL', 0.17, -0.045, 0, 0.022, 0.06, body, paw), legFR = makeLeg('legFR', 0.17, 0.045, 0, 0.022, 0.06, body, paw);
  torso.add(legFL, legFR);
  const legBL = makeLeg('legBL', HIP.x, -0.045, HIP.y, 0.022, 0.06, body, paw), legBR = makeLeg('legBR', HIP.x, 0.045, HIP.y, 0.022, 0.06, body, paw);
  root.add(legBL, legBR);

  // 尾：兩節，根部往後、尾尖往上彎
  const tail = new THREE.Group(); tail.name = 'tail';
  tail.position.set(-0.04, 0.08, 0);
  const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.07, 4, 10), body); seg1.castShadow = true;
  seg1.position.set(-0.04, 0.015, 0); seg1.rotation.z = 1.25; // 幾乎水平往後
  const tipG = new THREE.Group(); tipG.position.set(-0.08, 0.03, 0);
  const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.08, 4, 10), body); seg2.castShadow = true;
  seg2.position.set(-0.01, 0.05, 0); seg2.rotation.z = 0.25; // 往上彎
  tipG.add(seg2);
  tail.add(seg1, tipG);
  torso.add(tail);

  const update = (t: number, pose: Pose) => {
    if (pose === 'walk') {
      const w = t * 7 + phase, a = Math.sin(w);
      torso.rotation.z = 0; torso.position.y = HIP.y;
      legFL.rotation.z = 0.4 * a; legBR.rotation.z = 0.4 * a;
      legFR.rotation.z = -0.4 * a; legBL.rotation.z = -0.4 * a;
      head.rotation.z = 0.04 * a;
      tail.rotation.y = 0; tail.rotation.x = 0;
      tipG.rotation.z = 0.3 * Math.sin(t * 3 + phase);
      root.position.y = 0.006 * Math.abs(Math.cos(w));
    } else if (pose === 'sit') {
      torso.rotation.z = 0.4; torso.position.y = HIP.y;
      legFL.rotation.z = -0.4; legFR.rotation.z = -0.4;
      legBL.rotation.z = 1.3; legBR.rotation.z = 1.3;
      head.rotation.z = -0.25;
      tail.rotation.y = 0.9; tail.rotation.x = 0; // 尾巴繞到身側
      tipG.rotation.z = 0.2 * Math.sin(t * 2 + phase);
      root.position.y = 0;
    } else {
      // 趴下：四腿收進身下、身體貼地、頭略抬
      torso.rotation.z = 0; torso.position.y = 0.07;
      legFL.rotation.z = 1.4; legFR.rotation.z = 1.4;
      legBL.rotation.z = -1.4; legBR.rotation.z = -1.4;
      legBL.position.y = 0.07; legBR.position.y = 0.07;
      head.rotation.z = 0.15;
      tail.rotation.y = 0.9; tail.rotation.x = 0;
      tipG.rotation.z = 0.2 * Math.sin(t * 2 + phase);
      root.position.y = 0;
    }
    if (pose !== 'lie') { legBL.position.y = HIP.y; legBR.position.y = HIP.y; }
  };
  update(0, 'walk');
  return { object, update };
}
