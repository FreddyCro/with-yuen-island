import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 市場：三個攤位排成一列，各有斜遮陽棚（第一個 topic 色，其餘紅／黃）、木桌、桌上幾個小方塊當貨品。≤ 11 mesh。 */
export const market: ElementDef = {
  id: 'market',
  label: '市場',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    const awningColors: THREE.ColorRepresentation[] = [color, ELEMENT_PAL.red, ELEMENT_PAL.yellow];
    const goodsColors = [ELEMENT_PAL.green, ELEMENT_PAL.red, ELEMENT_PAL.yellow, ELEMENT_PAL.white, ELEMENT_PAL.wood];
    const stallW = 0.42, stallD = 0.36;
    const tableH = 0.24, awningH = 0.66;
    const xs = [-0.46, 0, 0.46];

    const tableParts: THREE.BufferGeometry[] = [];
    const postParts: THREE.BufferGeometry[] = [];

    xs.forEach((x, i) => {
      // 桌子：木色厚板 + 一塊深色桌腳箱
      const top = new THREE.BoxGeometry(stallW, 0.05, stallD);
      top.translate(x, tableH, 0);
      tableParts.push(top);
      const skirt = new THREE.BoxGeometry(stallW - 0.06, tableH - 0.03, stallD - 0.06);
      skirt.translate(x, (tableH - 0.03) / 2, 0);
      tableParts.push(skirt);

      // 遮陽棚：前低後高的斜板
      const awning = new THREE.Mesh(new THREE.BoxGeometry(stallW + 0.04, 0.035, stallD + 0.14), mat(awningColors[i]));
      awning.position.set(x, awningH, 0.04);
      awning.rotation.x = 0.3;
      awning.castShadow = true;
      g.add(awning);

      // 後方兩根白柱撐棚
      for (const dx of [-stallW / 2 + 0.03, stallW / 2 - 0.03]) {
        const p = new THREE.CylinderGeometry(0.015, 0.015, awningH + 0.06, 4);
        p.translate(x + dx, (awningH + 0.06) / 2, -stallD / 2 + 0.03);
        postParts.push(p);
      }

      // 貨品：桌上 2–4 個小方塊，同一攤一個顏色（合成一個 mesh）
      const n = 2 + Math.floor(rng() * 3);
      const goodsParts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < n; k++) {
        const s = 0.07 + rng() * 0.05;
        const b = new THREE.BoxGeometry(s, s, s);
        b.rotateY(rng() * Math.PI);
        b.translate(x + (rng() - 0.5) * (stallW - 0.14), tableH + 0.025 + s / 2, (rng() - 0.5) * (stallD - 0.14));
        goodsParts.push(b);
      }
      const goods = new THREE.Mesh(mergeGeometries(goodsParts), mat(goodsColors[Math.floor(rng() * goodsColors.length)]));
      goods.castShadow = true;
      g.add(goods);
    });

    const tables = new THREE.Mesh(mergeGeometries(tableParts), mat(ELEMENT_PAL.wood));
    tables.castShadow = true;
    g.add(tables);
    g.add(new THREE.Mesh(mergeGeometries(postParts), mat(ELEMENT_PAL.white)));

    g.rotation.y = (rng() - 0.5) * 0.6;
    return g;
  },
};
