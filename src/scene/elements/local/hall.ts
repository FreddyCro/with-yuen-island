import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 活動中心：一棟單層寬屋（奶油色牆、topic 色斜屋頂、一排窗）+ 門口一支旗桿。 */
export const hall: ElementDef = {
  id: 'hall',
  label: '活動中心',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const W = 1.4, D = 0.9, H = 0.6;

    // 牆
    const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat(ELEMENT_PAL.cream));
    walls.position.y = H / 2;
    walls.castShadow = true;
    g.add(walls);

    // 山牆斜屋頂：三角柱（ExtrudeGeometry 一個三角形沿 x 拉長）
    const ridgeH = 0.42;
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2 - 0.1, 0);
    tri.lineTo(D / 2 + 0.1, 0);
    tri.lineTo(0, ridgeH);
    tri.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: W + 0.16, bevelEnabled: false });
    roofGeo.rotateY(Math.PI / 2);
    roofGeo.translate(-(W + 0.16) / 2, 0, 0);
    const roof = new THREE.Mesh(roofGeo, mat(color));
    roof.position.y = H;
    roof.castShadow = true;
    g.add(roof);

    // 正面一排窗（水色），合成一個 group
    const wins = new THREE.Group();
    const winMat = mat(ELEMENT_PAL.water);
    for (const x of [-0.5, -0.25, 0.25, 0.5]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.03), winMat);
      w.position.set(x, H * 0.55, D / 2 + 0.01);
      wins.add(w);
    }
    g.add(wins);

    // 正中雙開門（深色）
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.38, 0.03), mat(ELEMENT_PAL.dark));
    door.position.set(0, 0.19, D / 2 + 0.01);
    g.add(door);

    // 門口階梯
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.16), mat(ELEMENT_PAL.concrete));
    step.position.set(0, 0.03, D / 2 + 0.08);
    g.add(step);

    // 旗桿：門口偏一側，白桿、topic 色小旗
    const poleH = 1.25;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, poleH, 5), mat(ELEMENT_PAL.white));
    const side = rng() < 0.5 ? -1 : 1;
    pole.position.set(side * 0.55, poleH / 2, D / 2 + 0.28);
    pole.castShadow = true;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.015), mat(ELEMENT_PAL.red));
    flag.position.set(side * 0.55 + 0.12, poleH - 0.1, D / 2 + 0.28);
    g.add(pole, flag);

    g.rotation.y = (rng() - 0.5) * 0.5;
    return g;
  },
};
