import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });

/** 停車場：一塊柏油地、白色車格線、一兩台小車（第一台 topic 色車身、深色輪子）。≤ 8 mesh。 */
export const parking: ElementDef = {
  id: 'parking',
  label: '停車場',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 柏油地
    const lot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.95), mat(ELEMENT_PAL.asphalt));
    lot.position.y = 0.03;
    lot.castShadow = true;
    g.add(lot);

    // 車格線：四條分隔線 + 一條後緣線，合成一個 mesh
    const lineParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.BoxGeometry(0.03, 0.014, 0.52);
      l.translate(-0.405 + i * 0.27, 0.066, -0.1);
      lineParts.push(l);
    }
    const back = new THREE.BoxGeometry(0.84, 0.014, 0.03);
    back.translate(0, 0.066, -0.35);
    lineParts.push(back);
    g.add(new THREE.Mesh(mergeGeometries(lineParts), mat(ELEMENT_PAL.white)));

    // 一或兩台小車，停在車格裡（車格中心 x = -0.24, 0, 0.24）
    const nCars = rng() < 0.4 ? 1 : 2;
    const slots = [-0.27, 0, 0.27];
    const first = Math.floor(rng() * 3);
    const chosen = nCars === 1 ? [first] : [first, (first + 1 + Math.floor(rng() * 2)) % 3];
    chosen.forEach((s, k) => {
      const car = new THREE.Group();
      const bodyColor: THREE.ColorRepresentation = k === 0 ? color : ELEMENT_PAL.white;
      const cabinColor: THREE.ColorRepresentation = k === 0 ? ELEMENT_PAL.white : color;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.42), mat(bodyColor));
      body.position.y = 0.125;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.2), mat(cabinColor));
      cabin.position.set(0, 0.23, -0.02);
      body.castShadow = cabin.castShadow = true;
      // 前後兩條輪軸合成一個 mesh
      const axleA = new THREE.BoxGeometry(0.23, 0.08, 0.09);
      axleA.translate(0, 0.06, 0.13);
      const axleB = new THREE.BoxGeometry(0.23, 0.08, 0.09);
      axleB.translate(0, 0.06, -0.13);
      const wheels = new THREE.Mesh(mergeGeometries([axleA, axleB]), mat(ELEMENT_PAL.dark));
      car.add(body, cabin, wheels);
      car.position.set(slots[s], 0.06, -0.1);
      car.rotation.y = (rng() - 0.5) * 0.12;
      g.add(car);
    });

    g.rotation.y = (rng() - 0.5) * 0.8;
    return g;
  },
};
