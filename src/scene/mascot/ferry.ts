import * as THREE from 'three';
import type { Mascot } from './campaign-truck';

/**
 * 渡輪（吉祥物）：照「星之金北」那類北海岸遊艇——白色船身、棕色下緣帶、藍色吃水線、船首收尖，
 * 兩層艙（下層長窗帶、上層駕駛艙）、頂棚、桅杆拉一串彩旗到船首、船尾一面小旗。
 * 低多邊形 flatShading、無貼圖、無文字；12 個 mesh。
 *
 * 座標：原點船底中心、y 朝上、船頭朝 +x。建模長 2.4、寬 0.7，整體再放大 1.5 倍（SCALE）。
 * `accent` 換下緣帶與船尾旗的顏色，第二艘船用。
 * `update(t)` 做微微起伏與側搖。
 */
const mat = (c: THREE.ColorRepresentation, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true });
export const SCALE = 1.5;
const C = { white: 0xf7f3ec, brown: 0x6b4a36, blue: 0x3f6fb0, glass: 0x2f3b44, cream: 0xefe6d4, pole: 0x9a9a94 };

/** 船身俯視輪廓：船尾方、船首尖（原點在船身中心）。 */
function hullShape(len: number, w: number): THREE.Shape {
  const s = new THREE.Shape();
  const x0 = -len / 2, x1 = len / 2, h = w / 2;
  s.moveTo(x0, -h); s.lineTo(x1 - 0.45, -h); s.lineTo(x1, 0); s.lineTo(x1 - 0.45, h); s.lineTo(x0, h); s.closePath();
  return s;
}
function hullSlab(len: number, w: number, y0: number, y1: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape(len, w), { depth: y1 - y0, bevelEnabled: false }), mat(color));
  m.rotation.x = -Math.PI / 2; m.position.y = y0; // 擠出方向 +z → 轉成 +y；shape 的 y 對到 −z
  return m;
}

/** 一串彩旗：六面小三角旗做成一個 mesh（vertexColors）。 */
function bunting(from: THREE.Vector3, to: THREE.Vector3, n = 6): THREE.Mesh {
  const cols = [0xd8534f, 0xe3c76a, 0x5fa55a, 0x3f7fbf, 0xe08a3c, 0xb07cc6];
  const pos: number[] = [], col: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n;
    const a = from.clone().lerp(to, t0), b = from.clone().lerp(to, t1), tip = a.clone().lerp(b, 0.5); tip.y -= 0.09;
    const c = new THREE.Color(cols[i % cols.length]);
    for (const v of [a, b, tip, b, a, tip]) { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); } // 兩面都畫
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
}

export function buildFerry(opts: { accent?: number } = {}): Mascot {
  const accent = opts.accent ?? C.brown;
  const g = new THREE.Group();
  const body = new THREE.Group(); // 起伏與搖晃加在 body 上，外層 g 的位置與朝向留給航線控制
  body.scale.setScalar(SCALE);
  g.add(body);
  const LEN = 2.4, W = 0.7;

  // 船身三層：藍吃水線、棕色下緣帶、白色主體
  const water = hullSlab(LEN - 0.08, W - 0.04, 0, 0.07, C.blue);
  const band = hullSlab(LEN - 0.02, W, 0.07, 0.19, accent);
  const hull = hullSlab(LEN, W, 0.19, 0.42, C.white);

  // 下層艙：長條白艙 + 深色長窗帶
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.28, 0.58), mat(C.white));
  lower.position.set(-0.15, 0.56, 0);
  const lowerWin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.11, 0.6), mat(C.glass, 0.4));
  lowerWin.position.set(-0.15, 0.6, 0);

  // 上層駕駛艙：較短、靠前，前方大窗
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.5), mat(C.white));
  upper.position.set(0.2, 0.825, 0);
  const upperWin = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.1, 0.52), mat(C.glass, 0.4));
  upperWin.position.set(0.2, 0.86, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.56), mat(C.cream));
  roof.position.set(0.15, 0.97, 0);

  // 桅杆 + 彩旗（斜拉到船首）
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.3, 6), mat(C.pole));
  mast.position.set(-0.15, 1.12, 0);
  const flags = bunting(new THREE.Vector3(-0.15, 1.25, 0), new THREE.Vector3(1.15, 0.5, 0));

  // 船尾小旗
  const sternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.28, 5), mat(C.pole));
  sternPole.position.set(-1.1, 0.56, 0);
  const sternFlag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.01), mat(opts.accent ?? 0xd8534f));
  sternFlag.position.set(-1.04, 0.66, 0);

  for (const m of [water, band, hull, lower, lowerWin, upper, upperWin, roof, mast, flags, sternPole, sternFlag]) { m.castShadow = true; body.add(m); }

  return {
    object: g,
    update(t: number) {
      body.position.y = Math.sin(t * 1.3) * 0.03 * SCALE;
      body.rotation.x = Math.sin(t * 0.9) * 0.03;  // 側搖
      body.rotation.z = Math.sin(t * 0.7 + 1) * 0.015; // 俯仰
    },
  };
}
