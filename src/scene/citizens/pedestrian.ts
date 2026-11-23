import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, walk, rbox, soft, HAND_Y, type Citizen, type CitizenOptions } from './figure';

/**
 * 行人：走路，一隻手撐傘（六成）或提購物袋（四成），兩種都用 accent 色。
 * 淡水的人行道、斑馬線、號誌政績都是給他們的。
 */
export function buildPedestrian({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));
  const umbrella = rng() < 0.6;

  if (umbrella) {
    // 右手舉在身側、傘柄垂直；傘面要高過頭頂
    fig.armR.rotation.set(-0.5, 0, 0.45);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 8), soft(0x4a4a50, 0.5));
    shaft.position.set(0, HAND_Y + 0.3, 0); shaft.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.14, 8, 1, true), soft(c.accent, 0.55));
    canopy.position.set(0, HAND_Y + 0.66, 0); canopy.castShadow = true;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), soft(0x4a4a50, 0.5));
    tip.position.set(0, HAND_Y + 0.74, 0);
    // 傘面在手臂群組裡會跟手臂一起斜；把傘整組反轉回垂直
    const u = new THREE.Group();
    u.add(shaft, canopy, tip);
    u.rotation.set(0.5, 0, -0.45);
    fig.armR.add(u);
  } else {
    fig.armL.rotation.set(0, 0, -0.3);
    const bagMat = soft(c.accent, 0.6);
    const bag = rbox(0.16, 0.2, 0.07, 0.02, bagMat, 0, HAND_Y - 0.14, 0);
    const h1 = rbox(0.012, 0.1, 0.012, 0.005, bagMat, -0.05, HAND_Y - 0.03, 0);
    const h2 = rbox(0.012, 0.1, 0.012, 0.005, bagMat, 0.05, HAND_Y - 0.03, 0);
    fig.armL.add(bag, h1, h2);
  }

  const object = new THREE.Group();
  object.add(fig.group);
  return {
    object,
    update(t: number) {
      walk(fig, t, phase, 4.5, 0.4, false);
      // 沒拿東西的那隻手照常擺
      const a = Math.sin(t * 4.5 + phase);
      if (umbrella) fig.armL.rotation.x = -0.35 * a; else fig.armR.rotation.x = 0.35 * a;
    },
  };
}
