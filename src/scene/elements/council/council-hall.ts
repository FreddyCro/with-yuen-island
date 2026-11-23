import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 議會大樓：議會中央的主建築。方正白色主體、正面五根柱廊、頂上 topic 色圓頂與旗桿。2.2 × 2.2 × 2.2。 */
export const councilHall: ElementDef = {
  id: 'council-hall',
  label: '議會大樓',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const white = mat(ELEMENT_PAL.white);
    const concrete = mat(ELEMENT_PAL.concrete);

    // 台基
    const podium = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 2.2), concrete);
    podium.position.y = 0.08;

    // 主體（三層高的方塊）＋ 深色窗帶暗示樓層
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.45, 1.5), white);
    block.position.set(0, 0.16 + 0.725, -0.15);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.22, 1.53), mat(ELEMENT_PAL.grey));
    windows.position.set(0, 0.16 + 0.72, -0.15);

    // 正面柱廊：五根柱 + 楣樑
    const colGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.3, 6);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(colGeo, white);
      c.position.set(-0.7 + i * 0.35, 0.16 + 0.65, 0.78);
      c.castShadow = true;
      g.add(c);
    }
    const entablature = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.2, 0.55), concrete);
    entablature.position.set(0, 0.16 + 1.3 + 0.09, 0.7);

    // 圓頂（topic 色）座在鼓座上
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.18, 10), white);
    drum.position.set(0, 1.61 + 0.09, -0.15);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
    dome.position.set(0, 1.79, -0.15);

    // 旗桿（白色細桿，立在前角）
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.0, 5), white);
    pole.position.set(0.95, 0.16 + 0.5, 0.95);

    [podium, block, entablature, drum, dome].forEach((m) => { m.castShadow = true; });
    g.add(podium, block, windows, entablature, drum, dome, pole); // + 5 柱 = 12 個 mesh
    g.rotation.y = (rng() - 0.5) * 0.2;
    return g;
  },
};
