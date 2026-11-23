import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * 紅毛城（淡水地標）：左邊是主堡——方正的紅色堡體、深色牆基、頂上一圈城垛、正面兩層拱窗、
 * 屋頂旗桿；右邊是前英國領事官邸——紅磚兩層樓、正面白色拱廊、四坡屋頂；前方草坡上兩門古砲。
 * 低多邊形 flatShading、無貼圖、無文字；13 個 mesh（城垛、拱窗、古砲各合成一個 mesh）。
 *
 * 座標：原點底面中心、y 朝上、正面朝 +z。佔地約 2.3 × 1.4（兩棟間隔約 0.3）、主堡含旗桿高約 1.5。
 */
const mat = (c: THREE.ColorRepresentation, rough = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true });
const C = {
  fort: 0xb4483a,      // 主堡的紅
  fortBase: 0x7e3a30,  // 牆基深紅
  brick: 0xc0674c,     // 官邸紅磚（比主堡偏橘，讀得出是兩棟）
  trim: 0xf7f3ec,      // 白色拱廊
  opening: 0x3a2f2c,   // 拱窗內的暗面
  roof: 0x6e5a50,      // 官邸屋瓦
  grass: 0x8fb07a,
  stone: 0xcfc9bd,
  iron: 0x4a4a46,
  pole: 0xe8e2d6,
  flag: 0xd8534f,
};

const T = 0.1;            // 草坡台地厚度
const FORT = { x: -0.52, z: -0.1, w: 0.95, d: 0.95, h: 0.86 };
const RES = { x: 0.68, z: 0.05, w: 0.78, d: 0.6, h: 0.52 };

/** 一個拱形開口（方框 + 上緣半圓），面朝 +z，底邊中心在原點。 */
function archGeo(w: number, h: number, depth: number): THREE.BufferGeometry {
  const r = w / 2;
  const box = new THREE.BoxGeometry(w, h - r, depth).translate(0, (h - r) / 2, 0);
  const top = new THREE.CylinderGeometry(r, r, depth, 8, 1, false, -Math.PI / 2, Math.PI)
    .rotateX(-Math.PI / 2) // 軸轉到 z，半圓朝上
    .translate(0, h - r, 0);
  return mergeGeometries([box, top]);
}

export function buildFortSanDomingo(): THREE.Group {
  const g = new THREE.Group();

  // 草坡台地＋正面石砌擋土邊
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(2.3, T, 1.4), mat(C.grass, 1));
  terrace.position.y = T / 2;
  const curb = new THREE.Mesh(new THREE.BoxGeometry(2.34, T * 0.7, 0.08), mat(C.stone));
  curb.position.set(0, T * 0.35, 0.7);

  // ── 主堡 ──
  const baseH = 0.16;
  const fortBase = new THREE.Mesh(new THREE.BoxGeometry(FORT.w + 0.06, baseH, FORT.d + 0.06), mat(C.fortBase));
  fortBase.position.set(FORT.x, T + baseH / 2, FORT.z);
  const fort = new THREE.Mesh(new THREE.BoxGeometry(FORT.w, FORT.h - baseH, FORT.d), mat(C.fort));
  fort.position.set(FORT.x, T + baseH + (FORT.h - baseH) / 2, FORT.z);

  // 城垛：沿屋頂四邊一圈齒狀垛口（每邊 5 個）
  const top = T + FORT.h;
  const mw = 0.11, mh = 0.1, n = 5;
  const merlons: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const s = -FORT.w / 2 + mw / 2 + (i * (FORT.w - mw)) / (n - 1);
    for (const [dx, dz] of [[s, FORT.d / 2 - mw / 2], [s, -FORT.d / 2 + mw / 2], [FORT.d / 2 - mw / 2, s], [-FORT.d / 2 + mw / 2, s]]) {
      merlons.push(new THREE.BoxGeometry(mw, mh, mw).translate(FORT.x + dx, top + mh / 2, FORT.z + dz));
    }
  }
  const battlement = new THREE.Mesh(mergeGeometries(merlons), mat(C.fort));

  // 正面與側面的拱窗：下層中間一道拱門＋兩側小窗，上層三扇窗；東側面上下各兩扇
  const holes: THREE.BufferGeometry[] = [];
  const front = FORT.z + FORT.d / 2 + 0.005;
  holes.push(archGeo(0.2, 0.3, 0.02).translate(FORT.x, T + baseH, front));             // 拱門
  for (const dx of [-0.3, 0.3]) holes.push(archGeo(0.11, 0.18, 0.02).translate(FORT.x + dx, T + baseH + 0.1, front));
  for (const dx of [-0.3, 0, 0.3]) holes.push(archGeo(0.11, 0.18, 0.02).translate(FORT.x + dx, T + 0.54, front));
  const side = FORT.x + FORT.w / 2 + 0.005;
  for (const dz of [-0.2, 0.2]) for (const y of [T + baseH + 0.1, T + 0.54]) {
    holes.push(archGeo(0.11, 0.18, 0.02).rotateY(Math.PI / 2).translate(side, y, FORT.z + dz));
  }
  const fortHoles = new THREE.Mesh(mergeGeometries(holes), mat(C.opening));

  // 旗桿與旗（立在主堡屋頂後角）
  const poleH = 0.55;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, poleH, 5), mat(C.pole));
  pole.position.set(FORT.x - 0.28, top + poleH / 2, FORT.z - 0.28);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.008), mat(C.flag));
  flag.position.set(FORT.x - 0.28 + 0.1, top + poleH - 0.07, FORT.z - 0.28);

  // ── 前英國領事官邸 ──
  const res = new THREE.Mesh(new THREE.BoxGeometry(RES.w, RES.h, RES.d), mat(C.brick));
  res.position.set(RES.x, T + RES.h / 2, RES.z);
  // 正面拱廊：白色立面板 + 上下兩層各四個暗色拱洞（合成一個 mesh 前先各自放好）
  const arcade = new THREE.Mesh(new THREE.BoxGeometry(RES.w + 0.02, RES.h, 0.06), mat(C.trim));
  arcade.position.set(RES.x, T + RES.h / 2, RES.z + RES.d / 2 + 0.03);
  const arches: THREE.BufferGeometry[] = [];
  const af = RES.z + RES.d / 2 + 0.065;
  for (let i = 0; i < 4; i++) {
    const ax = RES.x - RES.w / 2 + RES.w / 8 + (i * RES.w) / 4;
    arches.push(archGeo(0.12, 0.19, 0.012).translate(ax, T + 0.03, af));
    arches.push(archGeo(0.12, 0.19, 0.012).translate(ax, T + 0.28, af));
  }
  const resHoles = new THREE.Mesh(mergeGeometries(arches), mat(C.opening));
  // 四坡屋頂：四角錐轉 45° 再壓成長方形
  const roofH = 0.26;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, roofH, 4, 1).rotateY(Math.PI / 4), mat(C.roof));
  roof.scale.set(RES.w + 0.14, 1, RES.d + 0.16);
  roof.position.set(RES.x, T + RES.h + roofH / 2, RES.z + 0.02);

  // 古砲：主堡前草坡上兩門，砲口朝前（朝淡水河）
  const guns: THREE.BufferGeometry[] = [];
  for (const dx of [-0.28, 0.28]) {
    guns.push(new THREE.CylinderGeometry(0.03, 0.04, 0.26, 6).rotateX(Math.PI / 2 - 0.12).translate(FORT.x + dx, T + 0.07, 0.56));
    guns.push(new THREE.BoxGeometry(0.1, 0.06, 0.14).translate(FORT.x + dx, T + 0.03, 0.53)); // 砲架
  }
  const cannons = new THREE.Mesh(mergeGeometries(guns), mat(C.iron, 0.6));

  const meshes = [terrace, curb, fortBase, fort, battlement, fortHoles, pole, flag, res, arcade, resHoles, roof, cannons];
  for (const m of meshes) { m.castShadow = true; m.receiveShadow = true; }
  g.add(...meshes);
  return g;
}
