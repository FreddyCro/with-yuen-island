import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 托育：一台三輪嬰兒推車。topic 色籃身與遮陽篷、深色車架與推把、三個輪子（前一後二）。 */
export const baby: ElementDef = {
  id: 'baby',
  label: '托育',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const topic = mat(color);
    const dark = mat(ELEMENT_PAL.dark);
    const wheelR = 0.1;
    const basketY = 0.42;

    // 籃身（topic）+ 內襯（米色）
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.26, 0.4), topic);
    basket.position.set(0.03, basketY + 0.13, 0);
    const lining = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.3), mat(ELEMENT_PAL.cream));
    lining.position.set(0.14, basketY + 0.27, 0);

    // 遮陽篷：四分之一圓柱（弧從正上方到正後方），軸向沿 z，罩在籃子後半段
    // 圓柱軸 Y 轉到 Z 後，θ=π 對應正上方、θ=3π/2 對應正後方（-x）
    const hoodR = 0.27;
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(hoodR, hoodR, 0.42, 8, 1, false, Math.PI, Math.PI / 2), topic);
    hood.rotation.x = Math.PI / 2;
    hood.position.set(-0.03, basketY + 0.03, 0); // 實心扇形：從籃子後緣往上包到籃子中段上方

    // 車架：兩根斜撐接後輪、一根接前輪
    const strutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5);
    const sL = new THREE.Mesh(strutGeo, dark); sL.position.set(-0.19, wheelR + 0.17, -0.18); sL.rotation.z = 0.12;
    const sR = new THREE.Mesh(strutGeo, dark); sR.position.set(-0.19, wheelR + 0.17, 0.18); sR.rotation.z = 0.12;
    const sF = new THREE.Mesh(strutGeo, dark); sF.position.set(0.25, wheelR + 0.17, 0); sF.rotation.z = -0.15;

    // 推把：一根向後上斜的桿 + 橫把手
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 5), dark);
    stem.position.set(-0.36, basketY + 0.2, 0);
    stem.rotation.z = 0.5;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 6), dark);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(-0.47, basketY + 0.4, 0);

    // 輪子：後二前一
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.05, 10);
    for (const [x, z] of [[-0.22, -0.2], [-0.22, 0.2], [0.28, 0]]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, wheelR, z);
      w.castShadow = true;
      g.add(w);
    }

    basket.castShadow = hood.castShadow = true;
    g.add(basket, lining, hood, sL, sR, sF, stem, bar);
    g.rotation.y = (rng() - 0.5) * 1.2;
    return g;
  },
};
