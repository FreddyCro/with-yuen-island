import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, flatShading: true });

/** 補助：一疊 3–5 枚金幣（略錯開）+ 旁邊一枚立起來的大金幣，邊緣是 topic 色。 */
export const coin: ElementDef = {
  id: 'coin',
  label: '補助',
  island: 'council',
  build({ color, rng, count = 1 }) {
    const g = new THREE.Group();
    const gold = mat(ELEMENT_PAL.yellow);
    const r = 0.24, t = 0.08;

    // 疊幣：顆數隨 rng／count 變化，每枚略錯開一點
    const n = Math.min(5, 3 + Math.floor(rng() * 2) + (count > 3 ? 1 : 0));
    const stack = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 10), gold);
      c.position.set((rng() - 0.5) * 0.06, t / 2 + i * t, (rng() - 0.5) * 0.06);
      c.rotation.y = rng() * Math.PI;
      c.castShadow = true;
      stack.add(c);
    }
    stack.position.set(-0.2, 0, 0.1);

    // 立幣：金色幣面 + topic 色邊環（稍大一點的圓盤夾在中間）
    const R = 0.3;
    const standing = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.05, 12), mat(color));
    const faceA = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.08, 12), gold);
    rim.castShadow = faceA.castShadow = true;
    standing.add(rim, faceA);
    standing.rotation.x = Math.PI / 2;
    standing.rotation.z = 0.12;
    standing.position.set(0.25, R, -0.12);

    // 幣面上的「$」：一個細長小方塊示意
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.04), mat(color));
    mark.position.set(0.25, R, -0.12 + 0.05);
    mark.rotation.z = 0.12;

    g.add(stack, standing, mark);
    g.rotation.y = (rng() - 0.5) * 1.0;
    return g;
  },
};
