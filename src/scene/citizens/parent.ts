import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, walk, rbox, soft, bar, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 家長：雙手往前推嬰兒車，邊走邊推。嬰兒車＝把手橫桿、兩根斜桿、座椅＋遮陽篷、四個輪子，
 * 篷裡探出一顆嬰兒的頭。可換色：髮色、上衣、下身、膚色；嬰兒車布面＝accent 色。
 */
export function buildParent({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));
  fig.armL.rotation.set(-1.25, 0, -0.08);
  fig.armR.rotation.set(-1.25, 0, 0.08);

  const frame = soft(0x4a4a50, 0.5), fabric = soft(c.accent, 0.6), wheelMat = soft(0x2e2e30, 0.6);
  const s = new THREE.Group();
  // 把手：手在 y≈0.43、z≈0.15
  s.add(rbox(0.38, 0.03, 0.03, 0.012, frame, 0, 0.43, 0.16));
  for (const k of [-1, 1]) {
    s.add(bar(new THREE.Vector3(k * 0.17, 0.43, 0.16), new THREE.Vector3(k * 0.15, 0.09, 0.42), 0.012, frame));
    s.add(bar(new THREE.Vector3(k * 0.15, 0.09, 0.42), new THREE.Vector3(k * 0.15, 0.09, 0.2), 0.012, frame));
  }
  s.add(rbox(0.3, 0.12, 0.26, 0.04, fabric, 0, 0.25, 0.4));      // 座椅
  s.add(rbox(0.32, 0.17, 0.17, 0.07, fabric, 0, 0.39, 0.3));     // 遮陽篷
  const baby = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), soft(c.skin, 0.55));
  baby.position.set(0, 0.37, 0.43); baby.castShadow = true;
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), soft(c.hair, 0.5));
  tuft.position.set(0, 0.41, 0.41);
  s.add(baby, tuft);
  const wheels: THREE.Mesh[] = [];
  for (const k of [-1, 1]) for (const z of [0.2, 0.56]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(k * 0.16, 0.045, z); w.castShadow = true;
    s.add(w); wheels.push(w);
  }

  const object = new THREE.Group();
  object.add(fig.group, s);
  return {
    object,
    update(t: number) {
      walk(fig, t, phase, 4.5, 0.35, false);
      for (const w of wheels) w.rotation.y = -t * 3;
    },
  };
}
