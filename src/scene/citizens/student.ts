import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, walk, rbox, soft, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 學生：共用人偶＋小黃帽＋書包（含兩條肩帶），身形縮小代表小孩，動作是走路（上學途中）。
 *
 * 可換色：髮色、上衣、下身、膚色（來自 CITIZEN_PAL），書包＝accent 色。
 * 小黃帽固定黃色（台灣國小通學帽），是學生最主要的辨識點。
 */

const HAT_YELLOW = 0xf0cf5a;
const CHILD_SCALE = 0.85;

export function buildStudent({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));

  // 小黃帽：一體成形——圓頂殼一路往下包到帽簷高度，帽簷整圈，交接處加一條帽帶
  const R = FIG.headR, hat = soft(HAT_YELLOW, 0.5), hatDark = soft(0xd9b84a, 0.55);
  const crownR = R * 1.14, crownY = 0.035, phi = 1.42;          // 殼的下緣 y = crownY + crownR·cos(phi)
  const rimY = crownY + crownR * Math.cos(phi);                 // ≈ 0.069，帽簷就放在這裡，不留縫
  const crown = new THREE.Mesh(new THREE.SphereGeometry(crownR, 28, 14, 0, Math.PI * 2, 0, phi), hat);
  crown.scale.set(1.08, 1.0, 1.04); crown.position.set(0, crownY, -0.01);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.32, R * 1.32, 0.016, 32), hat);
  brim.scale.set(1.06, 1, 1.0); brim.position.set(0, rimY, 0.0); brim.rotation.x = 0.08;
  const band = new THREE.Mesh(new THREE.TorusGeometry(crownR * Math.sin(phi), 0.016, 8, 32), hatDark);
  band.scale.set(1.08, 1.04, 1); band.rotation.x = Math.PI / 2; band.position.set(0, rimY + 0.012, -0.01);
  // 帽子不投影，免得帽簷陰影把臉壓灰
  crown.userData.noCastShadow = brim.userData.noCastShadow = band.userData.noCastShadow = true;
  fig.head.add(crown, brim, band);

  // 書包：背上一個圓角塊＋蓋子；胸前兩條肩帶
  const bag = soft(c.accent, 0.55), bagDark = soft(new THREE.Color(c.accent).multiplyScalar(0.75), 0.6);
  const backZ = -(FIG.torsoD / 2 + 0.055);
  const bagY = FIG.torsoY0 + FIG.torsoH * 0.55;
  fig.group.add(rbox(0.22, 0.24, 0.11, 0.04, bag, 0, bagY, backZ));
  fig.group.add(rbox(0.225, 0.1, 0.115, 0.035, bagDark, 0, bagY + 0.08, backZ - 0.004));
  for (const s of [-1, 1]) {
    fig.group.add(rbox(0.035, 0.2, 0.014, 0.007, bagDark, s * 0.075, FIG.torsoTop - 0.11, FIG.torsoD / 2 + 0.004));
  }

  fig.group.scale.setScalar(CHILD_SCALE);
  const object = new THREE.Group();
  object.add(fig.group);
  return {
    object,
    update(t: number) {
      walk(fig, t, phase);
    },
  };
}
