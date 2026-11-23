import * as THREE from 'three';
import { rbox, soft } from '../citizens/figure';
import { makeLeg, addEyes } from './quad';
import type { Animal, AnimalOptions } from './index';
import type { Pose } from './stroll';

/**
 * 狗：圓角方塊身體、圓頭＋短吻、垂耳、四條短腿、翹尾。原點在腳底中心、面向 +x。
 * scale 1 時高約 0.42、長約 0.5。
 * 身體（含頭、前腿）掛在 torso 群組上，支點在髖關節；坐下時整個 torso 抬起來、後腿往前摺。
 */
export const DOG_COLORS = [
  { body: 0xe3a85c, belly: 0xf6ecd8, ear: 0xcf9048 }, // 柴犬
  { body: 0x2f2b2b, belly: 0x8a6a4a, ear: 0x2f2b2b }, // 黑狗（棕眉斑）
];

const HIP = { x: -0.1, y: 0.17 }; // 髖關節（torso 支點）

export function buildDog({ rng, variant, phase = 0 }: AnimalOptions): Animal {
  const v = variant ?? Math.floor(rng() * DOG_COLORS.length);
  const c = DOG_COLORS[v];
  const body = soft(c.body, 0.65), belly = soft(c.belly, 0.7), ear = soft(c.ear, 0.6), nose = soft(0x2a2224, 0.35);

  const object = new THREE.Group();
  const root = new THREE.Group(); // 走路上下跳動用，不動 object 本身的位置
  object.add(root);

  // torso：原點在髖關節，裡面的東西都相對髖關節擺
  const torso = new THREE.Group();
  torso.position.set(HIP.x, HIP.y, 0);
  root.add(torso);
  const bodyMesh = rbox(0.3, 0.17, 0.16, 0.05, body, 0.1, 0.07, 0); bodyMesh.name = 'body';
  torso.add(bodyMesh);
  torso.add(rbox(0.22, 0.04, 0.12, 0.015, belly, 0.1, -0.005, 0)); // 肚子

  // 頭
  const head = new THREE.Group();
  head.position.set(0.3, 0.16, 0);
  torso.add(head);
  const R = 0.11;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20), body); skull.castShadow = true;
  head.add(skull);
  head.add(rbox(0.1, 0.07, 0.1, 0.03, belly, R - 0.02, -0.03, 0)); // 短吻
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), nose); tip.position.set(R + 0.03, -0.01, 0); head.add(tip);
  addEyes(head, R, 0.018, 0.45, 0.15);
  for (const s of [-1, 1]) {
    const e = rbox(0.04, 0.1, 0.06, 0.015, ear, -0.02, -0.02, s * (R + 0.01));
    e.rotation.x = -s * 0.35; // 往外張
    head.add(e);
    if (v === 1) { // 黑狗的棕眉斑
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), belly);
      brow.scale.set(0.5, 0.7, 1); brow.position.set(R * 0.78, R * 0.42, s * R * 0.42);
      head.add(brow);
    }
  }

  // 四腿：前腿掛 torso（跟著身體抬），後腿掛 root（支點就是髖）
  const legFL = makeLeg('legFL', 0.2, -0.06, 0, 0.03, 0.08, body), legFR = makeLeg('legFR', 0.2, 0.06, 0, 0.03, 0.08, body);
  torso.add(legFL, legFR);
  const legBL = makeLeg('legBL', HIP.x, -0.06, HIP.y, 0.03, 0.08, body), legBR = makeLeg('legBR', HIP.x, 0.06, HIP.y, 0.03, 0.08, body);
  root.add(legBL, legBR);

  // 尾：根部在屁股上方，往上翹
  const tail = new THREE.Group(); tail.name = 'tail';
  tail.position.set(-0.06, 0.13, 0);
  const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.1, 4, 10), body); tailMesh.castShadow = true;
  tailMesh.position.set(-0.03, 0.05, 0); tailMesh.rotation.z = 0.6; // 往後上方
  tail.add(tailMesh);
  torso.add(tail);

  const update = (t: number, pose: Pose) => {
    // 每個姿勢把會動的旋轉全部設成絕對值，不做增量，切姿勢不留殘值
    if (pose === 'walk') {
      const w = t * 9 + phase, a = Math.sin(w);
      torso.rotation.z = 0;
      legFL.rotation.z = 0.5 * a; legBR.rotation.z = 0.5 * a;
      legFR.rotation.z = -0.5 * a; legBL.rotation.z = -0.5 * a;
      head.rotation.z = 0.05 * a;
      root.position.y = 0.01 * Math.abs(Math.cos(w));
    } else {
      torso.rotation.z = 0.35;          // 屁股坐下、前身抬起
      legFL.rotation.z = -0.35; legFR.rotation.z = -0.35; // 前腿補回垂直
      legBL.rotation.z = 1.3; legBR.rotation.z = 1.3;     // 後腿往前摺
      head.rotation.z = -0.2;
      root.position.y = 0;
    }
    tail.rotation.x = 0.5 * Math.sin(t * 12 + phase); // 坐著也搖
  };
  update(0, 'walk');
  return { object, update };
}
