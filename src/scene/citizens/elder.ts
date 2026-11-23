import * as THREE from 'three';
import { buildFigure, pickColors, walk, soft, bar, CITIZEN_PAL, type Citizen, type CitizenOptions } from './figure';

/**
 * 長輩：灰白頭髮（固定）、略駝背、右手拄拐杖慢慢走。
 * 三芝、石門的長照、敬老、醫療政績。
 */
export function buildElder({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, { ...colors, hair: CITIZEN_PAL.elderHair }); // 灰白髮是長輩的識別，不給外面覆寫
  const fig = buildFigure(c, hairStyle ?? 'short');
  fig.group.rotation.x = 0.12; // 駝背：整個人往前傾一點
  fig.armR.rotation.set(-0.35, 0, 0.1);

  // 拐杖：從手的位置到地面，頂端一個彎把
  const wood = soft(0x8a6a4a, 0.6);
  const handPos = new THREE.Vector3(0.17, 0.33, 0.1);
  const cane = new THREE.Group();
  cane.add(bar(handPos, new THREE.Vector3(0.2, 0.0, 0.15), 0.012, wood));
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16, Math.PI), wood);
  grip.position.copy(handPos).add(new THREE.Vector3(0.0, 0.02, 0)); grip.rotation.set(0, Math.PI / 2, 0);
  cane.add(grip);

  const object = new THREE.Group();
  object.add(fig.group, cane);
  return {
    object,
    update(t: number) {
      walk(fig, t, phase, 2.6, 0.22, false);
      fig.group.rotation.x = 0.12;
      const a = Math.sin(t * 2.6 + phase);
      fig.armL.rotation.x = -0.2 * a;
      fig.armR.rotation.x = -0.35 + 0.12 * a;
      cane.rotation.x = 0.1 * a; // 拐杖跟著手前後點
    },
  };
}
