import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 考察：一個直立的 topic 色行李箱，兩條白色束帶、拉桿、兩個小輪、一張歪貼的黃色貼紙。 */
export const suitcase: ElementDef = {
  id: 'suitcase',
  label: '考察',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const dark = mat(ELEMENT_PAL.dark);
    const w = 0.5, h = 0.68, d = 0.26, wheelR = 0.05;
    const baseY = wheelR * 1.2;

    const shell = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    shell.position.y = baseY + h / 2;

    // 兩條束帶（白）
    const strapGeo = new THREE.BoxGeometry(0.06, h + 0.01, d + 0.02);
    const strapA = new THREE.Mesh(strapGeo, mat(ELEMENT_PAL.white)); strapA.position.set(-0.13, baseY + h / 2, 0);
    const strapB = new THREE.Mesh(strapGeo, mat(ELEMENT_PAL.white)); strapB.position.set(0.13, baseY + h / 2, 0);

    // 拉桿：兩根細桿 + 橫把
    const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.34, 5);
    const rodL = new THREE.Mesh(rodGeo, dark); rodL.position.set(-0.14, baseY + h + 0.17, -0.06);
    const rodR = new THREE.Mesh(rodGeo, dark); rodR.position.set(0.14, baseY + h + 0.17, -0.06);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), dark);
    grip.position.set(0, baseY + h + 0.34, -0.06);

    // 兩個小輪
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.04, 8);
    for (const x of [-0.19, 0.19]) {
      const wh = new THREE.Mesh(wheelGeo, dark);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(x, wheelR, -0.07);
      g.add(wh);
    }

    // 貼紙（黃色，貼歪）
    const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.012), mat(ELEMENT_PAL.yellow));
    sticker.position.set(0.0, baseY + h * 0.62, d / 2 + 0.004);
    sticker.rotation.z = (rng() - 0.5) * 0.7;

    shell.castShadow = grip.castShadow = true;
    g.add(shell, strapA, strapB, rodL, rodR, grip, sticker);
    g.rotation.y = (rng() - 0.5) * 1.0;
    return g;
  },
};
