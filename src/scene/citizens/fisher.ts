import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, sway, soft, capsule, bar, type Citizen, type CitizenOptions } from './figure';

/**
 * 漁民：深綠雨鞋、右手持釣竿（竿尖垂一條線）、腳邊一個水桶（accent 色）。
 * 石門、八里的漁港政績。
 */
export function buildFisher({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));

  // 雨鞋：套在小腿外面的粗膠囊，跟著腿動
  const boot = soft(0x2f4f3a, 0.7);
  for (const leg of [fig.legL, fig.legR]) {
    const b = capsule(0.052, 0.11, boot); b.position.y = -0.12;
    leg.add(b);
  }

  // 釣竿：從手往前上方斜出去，竿尖垂線
  fig.armR.rotation.set(-0.9, 0, 0.3);
  const rod = new THREE.Group();
  // 手在 (0.21, 0.39, 0.12)；竿尾在手後方一小段，竿身穿過手心往前上方
  const hand = new THREE.Vector3(0.21, 0.39, 0.12), tip = new THREE.Vector3(0.3, 1.05, 0.8);
  const butt = hand.clone().sub(tip.clone().sub(hand).multiplyScalar(0.3));
  rod.add(bar(butt, tip, 0.008, soft(0xb08a5a, 0.6)));
  rod.add(bar(tip, new THREE.Vector3(0.3, 0.2, 0.95), 0.003, soft(0xd8d8d8, 0.4)));
  const hook = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), soft(0xc96a5a, 0.5));
  hook.position.set(0.3, 0.2, 0.95);
  rod.add(hook);

  // 水桶
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.11, 16), soft(c.accent, 0.6));
  bucket.position.set(-0.26, 0.055, 0.1); bucket.castShadow = true;

  const object = new THREE.Group();
  object.add(fig.group, rod, bucket);
  return {
    object,
    update(t: number) {
      sway(fig, t, phase);
      const a = Math.sin(t * 1.1 + phase);
      rod.rotation.x = 0.05 * a; // 竿尖慢慢上下
      fig.armR.rotation.x = -0.9 + 0.05 * a;
    },
  };
}
