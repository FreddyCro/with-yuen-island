import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

/** 公車亭：topic 色頂棚＋兩根柱＋長椅＋背板，旁邊一支站牌；rng 決定要不要停一台 YouBike。 */
export const transit: ElementDef = {
  id: 'transit',
  label: '公車亭',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const h = 0.72;

    // 頂棚（topic 色）
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.42), mat(color));
    roof.position.set(-0.1, h + 0.03, 0);
    roof.castShadow = true;
    g.add(roof);
    // 兩根柱
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, h, 6), mat(ELEMENT_PAL.grey));
      post.position.set(-0.1 + s * 0.4, h / 2, -0.15);
      post.castShadow = true;
      g.add(post);
    }
    // 背板（淺色玻璃感）
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, h - 0.12, 0.03), mat(ELEMENT_PAL.water));
    back.position.set(-0.1, (h - 0.12) / 2 + 0.06, -0.17);
    // 長椅：座面 + 一塊底座
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.16), mat(ELEMENT_PAL.wood));
    seat.position.set(-0.1, 0.25, -0.05);
    seat.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.08), mat(ELEMENT_PAL.dark));
    base.position.set(-0.1, 0.11, -0.05);
    g.add(back, seat, base);

    // 站牌：細桿 + 圓牌（白底、topic 色邊）
    const sx = 0.48;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.9, 5), mat(ELEMENT_PAL.grey));
    pole.position.set(sx, 0.45, 0.05);
    pole.castShadow = true;
    const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), mat(color));
    sign.rotation.z = Math.PI / 2; sign.position.set(sx, 0.95, 0.05);
    sign.castShadow = true;
    const signFace = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.036, 12), mat(ELEMENT_PAL.white));
    signFace.rotation.z = Math.PI / 2; signFace.position.copy(sign.position);
    g.add(pole, sign, signFace);

    // YouBike（可有可無）：兩個小輪 + 黃色車架
    if (rng() < 0.6) {
      const bike = new THREE.Group();
      const wheelMat = mat(ELEMENT_PAL.dark);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10), wheelMat);
        w.position.set(s * 0.09, 0.06, 0);
        w.castShadow = true;
        bike.add(w);
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.03), mat(ELEMENT_PAL.yellow));
      frame.rotation.z = 0.35; frame.position.y = 0.12;
      frame.castShadow = true;
      bike.add(frame);
      bike.position.set(-0.1 + (rng() - 0.5) * 0.3, 0, 0.32);
      bike.rotation.y = (rng() - 0.5) * 0.4;
      g.add(bike);
    }

    g.scale.setScalar(1.15);
    g.rotation.y = (rng() - 0.5) * 0.8;
    return g;
  },
};
