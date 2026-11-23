import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 餐盤：一張矮木桌上放一個白色長方餐盤，盤上四格食物方塊，其中主菜那格是 topic 色。 */
export const lunchTray: ElementDef = {
  id: 'lunch-tray',
  label: '餐盤',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const wood = mat(ELEMENT_PAL.wood);

    // 矮桌：桌板 + 四腳
    const tableH = 0.42;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.64), wood);
    top.position.y = tableH - 0.025;
    top.castShadow = true;
    g.add(top);
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, tableH - 0.05, 5);
    for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(x, (tableH - 0.05) / 2, z);
      g.add(leg);
    }

    // 餐盤（白）
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.5), mat(ELEMENT_PAL.white));
    tray.position.y = tableH + 0.03;
    tray.castShadow = true;
    g.add(tray);

    // 四格食物：主菜（topic）、飯（米白）、青菜（綠）、水果（紅）
    const foodY = tableH + 0.06;
    const foods: [number, number, number, number, number, THREE.ColorRepresentation][] = [
      [-0.2, 0.0, 0.3, 0.14, 0.4, color],                 // 主菜，大格
      [0.17, -0.12, 0.3, 0.1, 0.2, ELEMENT_PAL.cream],     // 飯
      [0.17, 0.13, 0.3, 0.09, 0.18, ELEMENT_PAL.green],    // 青菜
      [-0.2, -0.17, 0.12, 0.12, 0.1, ELEMENT_PAL.red],     // 水果小方塊，塞在主菜角落
    ];
    foods.forEach(([x, z, w, h, d, c]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      f.position.set(x, foodY + h / 2, z);
      f.castShadow = true;
      g.add(f);
    });

    g.rotation.y = (rng() - 0.5) * 0.8;
    return g;
  },
};
