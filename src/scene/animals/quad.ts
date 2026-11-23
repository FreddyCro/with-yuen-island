// 貓狗共用的四足零件：腿（支點在髖／肩）、豆眼。風格同民眾人偶（圓角、平滑著色、不用貼圖）。
import * as THREE from 'three';
import { capsule, soft } from '../citizens/figure';

export const EYE_MAT = soft(0x2a2224, 0.3);

/**
 * 一條腿：Group 原點在髖／肩（y = hipY），腿往下垂；要擺動就轉 rotation.z（動物面向 +x，前後擺是繞 z）。
 * paw 給的話腳底加一顆別色的小球（黑白貓的白腳）。
 */
export function makeLeg(name: string, x: number, z: number, hipY: number, r: number, len: number, m: THREE.Material, paw?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, hipY, z);
  const l = capsule(r, len, m);
  l.position.y = -(len / 2 + r) + 0.005; // 腳底貼地
  g.add(l);
  if (paw) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 12, 8), paw);
    p.position.y = -(len + r) + 0.005; p.castShadow = true;
    g.add(p);
  }
  return g;
}

/** 兩顆豆眼，貼在頭球前側（頭面向 +x）。 */
export function addEyes(head: THREE.Object3D, R: number, r = 0.02, spread = 0.4, up = 0.1): void {
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), EYE_MAT);
    const z = s * R * spread, y = R * up;
    e.position.set(Math.sqrt(Math.max(0, R * R - z * z - y * y)) - r * 0.4, y, z);
    e.scale.set(0.5, 1.15, 0.9);
    head.add(e);
  }
}
