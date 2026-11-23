import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, sway, rbox, soft, HAND_Y, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 通勤族：站著等車，低頭看手機；斜背一個肩背包（accent 色）。
 * 淡水、八里的公車、輕軌、捷運政績。
 */
export function buildCommuter({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));

  // 肩帶：右肩到左髖，胸前、背後各一條；包包掛左髖
  const strap = soft(new THREE.Color(c.accent).multiplyScalar(0.7), 0.6), bagMat = soft(c.accent, 0.6);
  for (const z of [FIG.torsoD / 2 + 0.006, -(FIG.torsoD / 2 + 0.006)]) {
    const st = rbox(0.035, 0.44, 0.016, 0.007, strap, 0.0, 0.41, z);
    st.rotation.z = -0.85;
    fig.group.add(st);
  }
  fig.group.add(rbox(0.17, 0.14, 0.09, 0.03, bagMat, -0.21, 0.25, 0.0));

  // 右手舉到胸前拿手機，頭往下看
  fig.armR.rotation.set(-1.55, 0, 0.2);
  const phone = rbox(0.05, 0.09, 0.008, 0.004, soft(0x2b2b30, 0.3), 0, HAND_Y + 0.045, 0.02);
  phone.rotation.x = -0.4;
  fig.armR.add(phone);
  fig.head.rotation.x = 0.3;

  const object = new THREE.Group();
  object.add(fig.group);
  return {
    object,
    update(t: number) {
      sway(fig, t, phase);
      fig.head.rotation.x = 0.3 + 0.03 * Math.sin(t * 1.7 + phase);
      fig.head.rotation.y = 0.05 * Math.sin(t * 0.6 + phase); // 看手機，頭不太轉
    },
  };
}
