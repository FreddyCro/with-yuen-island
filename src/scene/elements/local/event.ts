import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 活動：一頂活動帳篷（topic 色四角篷頂、白柱、白色垂簾）+ 前方小舞台 + 兩桿之間一串三角旗。≤ 8 mesh。 */
export const event: ElementDef = {
  id: 'event',
  label: '活動',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 帳篷：四根白柱（合成一個 mesh）
    const postH = 0.58;
    const postParts: THREE.BufferGeometry[] = [];
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const p = new THREE.CylinderGeometry(0.025, 0.025, postH, 5);
      p.translate(x, postH / 2, z);
      postParts.push(p);
    }
    g.add(new THREE.Mesh(mergeGeometries(postParts), mat(ELEMENT_PAL.white)));

    // 篷頂：四角錐，topic 色
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.5, 4), mat(color));
    roof.position.y = postH + 0.24;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);

    // 篷頂邊緣白色垂簾
    const valance = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), mat(ELEMENT_PAL.white));
    valance.position.y = postH - 0.02;
    valance.castShadow = true;
    g.add(valance);

    // 小舞台：帳篷前方一塊木色台子
    const stage = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.3), mat(ELEMENT_PAL.wood));
    stage.position.set(0, 0.06, 0.64);
    stage.castShadow = true;
    g.add(stage);

    // 三角旗串：舞台兩端旗桿（合成一個 mesh），中間一排三角旗（三種顏色、各合成一個 mesh）
    const poleH = 0.95, poleX = 0.52, poleZ = 0.64;
    const poleParts: THREE.BufferGeometry[] = [];
    for (const x of [-poleX, poleX]) {
      const p = new THREE.CylinderGeometry(0.015, 0.018, poleH, 5);
      p.translate(x, poleH / 2, poleZ);
      poleParts.push(p);
    }
    g.add(new THREE.Mesh(mergeGeometries(poleParts), mat(ELEMENT_PAL.wood)));

    const flagColors = [ELEMENT_PAL.red, ELEMENT_PAL.yellow, ELEMENT_PAL.white];
    const flagParts: THREE.BufferGeometry[][] = [[], [], []];
    const n = 5 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const f = new THREE.ConeGeometry(0.065, 0.13, 3);
      f.rotateX(Math.PI); // 尖朝下
      f.translate(-poleX + t * poleX * 2, poleH - 0.09 - Math.sin(t * Math.PI) * 0.09, poleZ);
      flagParts[i % 3].push(f);
    }
    flagParts.forEach((parts, i) => {
      if (parts.length) g.add(new THREE.Mesh(mergeGeometries(parts), mat(flagColors[i])));
    });

    g.rotation.y = (rng() - 0.5) * 0.6;
    return g;
  },
};
