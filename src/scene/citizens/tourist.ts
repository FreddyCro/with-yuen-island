import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, sway, rbox, soft, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 遊客：寬邊遮陽帽（米色，帽帶 accent 色），雙手舉相機在臉前拍照。
 * 三芝、石門的觀光政績：遊客中心、步道、海岸景點。
 */
export function buildTourist({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));
  const R = FIG.headR;

  // 遮陽帽：矮圓頂＋大帽簷＋帽帶；不投影免得臉全黑
  const cream = soft(0xeadfc8, 0.7);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.0, R * 1.12, 0.12, 28), cream);
  crown.position.set(0, 0.16, -0.01);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.75, R * 1.75, 0.014, 36), cream);
  brim.position.set(0, 0.1, 0.0); brim.rotation.x = 0.1;
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, 0.016, 8, 32), soft(c.accent, 0.6));
  ribbon.rotation.x = Math.PI / 2; ribbon.position.set(0, 0.11, -0.01);
  crown.userData.noCastShadow = brim.userData.noCastShadow = ribbon.userData.noCastShadow = true;
  fig.head.add(crown, brim, ribbon);

  // 相機舉到臉前：兩手往上往前，頭略低
  fig.armL.rotation.set(-2.3, 0, -0.25);
  fig.armR.rotation.set(-2.3, 0, 0.25);
  fig.head.rotation.x = 0.22;
  const cam = new THREE.Group();
  cam.add(rbox(0.16, 0.1, 0.06, 0.015, soft(0x2b2b30, 0.35), 0, 0, 0));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 18), soft(0x4a4a50, 0.3));
  lens.rotation.x = Math.PI / 2; lens.position.set(0.02, 0, 0.05);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 18), soft(0x7fa6c8, 0.2));
  glass.rotation.x = Math.PI / 2; glass.position.set(0.02, 0, 0.073);
  cam.add(lens, glass);
  cam.position.set(0, 0.66, 0.21);
  fig.group.add(cam);

  const object = new THREE.Group();
  object.add(fig.group);
  return {
    object,
    update(t: number) {
      sway(fig, t, phase);
      fig.head.rotation.x = 0.22;
      // 取景時整個人慢慢左右掃，不轉頭
      fig.group.rotation.y = 0.25 * Math.sin(t * 0.5 + phase);
      fig.head.rotation.y = 0;
    },
  };
}
