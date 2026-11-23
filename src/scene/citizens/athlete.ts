import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, sway, soft, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 運動者：戴髮帶（accent 色），右手在身前拍球，球會彈。
 * 球場、運動中心、跑道政績。
 */
export function buildAthlete({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));

  const band = new THREE.Mesh(new THREE.TorusGeometry(FIG.headR * 1.03, 0.022, 8, 32), soft(c.accent, 0.6));
  band.scale.set(1.05, 1, 1); band.rotation.x = Math.PI / 2; band.position.y = 0.06;
  fig.head.add(band);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), soft(0xe0893c, 0.7));
  ball.castShadow = true;
  const bx = FIG.shoulderX + 0.04, bz = 0.2;
  ball.position.set(bx, 0.3, bz);
  fig.armL.rotation.set(0, 0, -0.2);

  const object = new THREE.Group();
  object.add(fig.group, ball);
  return {
    object,
    update(t: number) {
      sway(fig, t, phase);
      const k = Math.abs(Math.sin(t * 5 + phase));      // 0 = 球在地上、1 = 球在手上
      ball.position.y = 0.075 + 0.25 * k;
      fig.armR.rotation.set(-0.55 - 0.55 * k, 0, 0.15);  // 手跟著球上下
      fig.head.rotation.x = 0.25 - 0.15 * k;             // 眼睛看球
    },
  };
}
