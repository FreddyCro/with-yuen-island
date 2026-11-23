import * as THREE from 'three';
import { PAL } from './palette';
import { groundTexture } from './ground';

/** 平頂六角形 Shape（半徑 = 邊長）。 */
export function hexShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    if (i) s.lineTo(r * Math.cos(a), r * Math.sin(a));
    else s.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  return s;
}

export const TOP_H = 1.6; // 島面高於水面（場景單位）

export interface HexColumn extends THREE.Group {
  userData: { topY: number };
}

/** 六角柱：沙色厚邊 + 一圈橋面色邊環 + 區色頂面 + 淺水環。 */
export function hexColumn(R: number, pos: THREE.Vector3, color: THREE.Color, height = TOP_H, seed = 1): HexColumn {
  const g = new THREE.Group() as HexColumn;
  const side = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hexShape(R), { depth: height, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: PAL.sandSide, roughness: 0.9 }),
  );
  side.rotation.x = -Math.PI / 2; side.castShadow = side.receiveShadow = true;

  const beach = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hexShape(R), { depth: 0.25, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: PAL.cream, roughness: 0.95 }), // 邊環 = 橋面色（俯視看到的橋面是 PAL.cream 那層），格與橋連成一體
  );
  beach.rotation.x = -Math.PI / 2; beach.position.y = height; beach.castShadow = beach.receiveShadow = true;

  const top = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hexShape(R * 0.86), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ map: topGround(R, color, seed), roughness: 0.85 }),
  );
  top.rotation.x = -Math.PI / 2; top.position.y = height + 0.25; top.castShadow = top.receiveShadow = true;

  const shallow = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hexShape(R * 1.22), { depth: 0.04, bevelEnabled: false }),
    // polygonOffset：和海面深度很近時讓淺水環優先，避免 z-fighting 閃爍
    new THREE.MeshStandardMaterial({ color: PAL.shallow, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
  );
  // 頂面 = 0.04 + 0.04 = 0.08（相對格子）。格子會上下浮動 ±0.08（main.ts），海面在 y = −0.05：
  // 浮到最低時頂面在 0.00，仍比海面高 5 cm。原本 −0.03 時頂面會沉進海面，交界處閃爍。
  shallow.rotation.x = -Math.PI / 2; shallow.position.y = 0.04; shallow.receiveShadow = true;

  g.add(shallow, side, beach, top);
  g.position.copy(pos);
  g.userData = { topY: height + 0.25 + 0.3 + 0.15 }; // 海灘環 + 頂面厚度 + 斜角，= 頂面真正的落地高度
  return g;
}

/** 頂面材質：一張貼圖約 3 個場景單位寬，ExtrudeGeometry 的 UV 是 shape 座標所以直接用 repeat 換算。 */
function topGround(R: number, color: THREE.Color, seed: number): THREE.CanvasTexture {
  const t = groundTexture('#' + color.getHexString(), seed).clone();
  t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3);
  return t;
}

/** 低多邊形樹：v < 0.5 針葉（錐）、否則闊葉（二十面體）。 */
export function tree(x: number, y: number, z: number, s: number, v: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.5 * s, 5), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
  trunk.position.y = 0.25 * s;
  const conifer = v < 0.5;
  const crown = new THREE.Mesh(
    conifer ? new THREE.ConeGeometry(0.45 * s, 1.1 * s, 6) : new THREE.IcosahedronGeometry(0.5 * s, 0),
    new THREE.MeshStandardMaterial({ color: conifer ? 0x4f8a45 : 0x7fb060, roughness: 1, flatShading: true }),
  );
  crown.position.y = 0.5 * s + (conifer ? 0.55 * s : 0.45 * s);
  trunk.castShadow = crown.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, y, z);
  return g;
}

/** 山丘錐體：永遠在格中心、底不超出頂面；高度隨海拔。 */
/** 山丘高度（場景單位）：觀音山 616 m → 4.1、大屯山 1092 m → 5.6。 */
export const hillHeight = (ele: number) => 2 + Math.min(ele, 1100) / 300;

export function hill(R: number, topY: number, ele: number, x = 0, z = 0): THREE.Mesh {
  const h = hillHeight(ele); // 觀音山 616 m → 4.1、大屯山 1092 m → 5.6
  const m = new THREE.Mesh(new THREE.ConeGeometry(R * 0.42, h, 7), new THREE.MeshStandardMaterial({ color: 0x5f8a4e, roughness: 1, flatShading: true }));
  m.position.set(x, topY + h / 2 - 0.1, z);
  m.castShadow = true;
  return m;
}

/** 區色依海拔往墨綠偏，山區看得出是山。 */
export function shade(hex: string, ele: number): THREE.Color {
  const t = Math.min(1, Math.max(0, ele) / 600);
  return new THREE.Color(hex).lerp(new THREE.Color(0x4a6a3f), t * 0.6);
}

/** 決定性的偽亂數（同一格每次長一樣的樹）。 */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
