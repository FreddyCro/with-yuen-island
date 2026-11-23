import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, sway, soft, capsule, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 農民：斗笠、左臂抱一捆茭白筍（三芝名產：白色筍身、綠色葉梢）。
 * 三芝的農業、農損救助政績。
 */
export function buildFarmer({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));
  const R = FIG.headR;

  // 斗笠：寬錐，底邊蓋過整顆頭；不投影
  const straw = soft(0xd8b776, 0.8);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(R * 1.75, 0.2, 28), straw);
  hat.position.set(0, 0.2, -0.01);
  hat.userData.noCastShadow = true;
  const strapMat = soft(0x5a4632, 0.7);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, 0.008, 6, 24, Math.PI), strapMat);
  strap.rotation.set(0, 0, Math.PI); strap.position.set(0, -0.02, 0.02); // 下巴帶
  fig.head.add(hat, strap);

  // 左臂彎起抱一捆：五根橫放的膠囊，白身綠梢，外面一圈繩
  fig.armL.rotation.set(-1.3, 0, -0.1);
  const bundle = new THREE.Group();
  const white = soft(0xf2efe6, 0.7), green = soft(0x6f9a5a, 0.8);
  const offs: [number, number][] = [[0, 0], [0.04, 0.03], [-0.04, 0.03], [0.02, -0.035], [-0.03, -0.03]];
  for (const [dy, dz] of offs) {
    const body = capsule(0.022, 0.16, white); body.rotation.z = Math.PI / 2; body.position.set(-0.03, dy, dz);
    const leaf = capsule(0.018, 0.1, green); leaf.rotation.z = Math.PI / 2; leaf.position.set(0.1, dy, dz);
    bundle.add(body, leaf);
  }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 20), strapMat);
  rope.rotation.y = Math.PI / 2; rope.position.set(0.0, 0, 0);
  bundle.add(rope);
  bundle.position.set(-0.07, 0.43, 0.19);
  fig.group.add(bundle);

  const object = new THREE.Group();
  object.add(fig.group);
  return {
    object,
    update(t: number) {
      sway(fig, t, phase);
      fig.armL.rotation.x = -1.3 + 0.03 * Math.sin(t * 2.2 + phase);
    },
  };
}
