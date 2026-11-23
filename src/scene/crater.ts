// 火山口湖（參考政策島）：整座島坐在火山口湖裡，四周一圈低多邊形的綠色山稜、長滿樹。
// 地形是極座標網格：湖岸 LAKE_R 高度 0，往外升到火口緣 RIM_R（最高 RIM_H），再往外緩降到 OUTER_R。
import * as THREE from 'three';
import { mulberry32 } from './hex';

// 島東西長、南北短，湖是同方向的橢圓（z 軸壓 EZ）；以下半徑都是橢圓的長軸半徑。
// 格最遠離中心約 55（x 向）、繞島航線到 65：湖岸 72 只比島大一圈（政策島的比例）；火口緣 110 高 55，內壁陡、外坡緩
export const LAKE_R = 72, RIM_R = 110, OUTER_R = 420, RIM_H = 28, EZ = 0.72;
const SADDLE_R = 160; // 火口緣外先降到鞍部，再往外是一層層的山

/** 湖的擺放：中心、長軸方向（弧度）、長短軸比例。由 main.ts 依島的外框設定；預設在原點、朝 x。 */
export const LAKE = { cx: 0, cz: 0, angle: 0, ez: EZ, scale: 1, gapA: NaN as number };
/** 山稜在某個方向開一個低窪（夕陽照進來）：gapA 是湖局部的方向角（用 lakeLocal 算），NaN = 不開。 */
export function setGap(gapA: number): void { LAKE.gapA = gapA; }
export function gapFactor(a: number): number {
  if (Number.isNaN(LAKE.gapA)) return 1;
  let d = a - LAKE.gapA; d = Math.atan2(Math.sin(d), Math.cos(d));
  return 1 - 0.78 * Math.exp(-((d / 0.42) ** 2));
}
export function setLake(cx: number, cz: number, angle: number, ez: number, scale = 1): void { Object.assign(LAKE, { cx, cz, angle, ez, scale }); }

/** 湖岸不是正圓：半徑隨方向起伏 ±12%（幾個低頻波），整圈形狀像政策島那種不規則的火口湖。 */
export const shoreFactor = (a: number) => 1 + 0.10 * Math.sin(2 * a + 0.9) + 0.07 * Math.sin(3 * a - 1.4) + 0.05 * Math.sin(5 * a + 0.3);

/** 把世界 xz 轉成湖的局部座標（旋轉、壓扁），回傳「等效半徑」與方向角。 */
export function lakeLocal(x: number, z: number): { r: number; a: number } {
  const dx = x - LAKE.cx, dz = z - LAKE.cz, ca = Math.cos(-LAKE.angle), sa = Math.sin(-LAKE.angle);
  const lx = (dx * ca - dz * sa) / LAKE.scale, lz = (dx * sa + dz * ca) / LAKE.scale / LAKE.ez;
  const a = Math.atan2(lz, lx);
  return { r: Math.hypot(lx, lz) / shoreFactor(a), a };
}
/** 湖局部（等效半徑 r、方向 a）→ 世界 xz。 */
export function lakeWorld(r: number, a: number): [number, number] {
  const k = r * shoreFactor(a), lx = k * Math.cos(a) * LAKE.scale, lz = k * Math.sin(a) * LAKE.ez * LAKE.scale;
  const ca = Math.cos(LAKE.angle), sa = Math.sin(LAKE.angle);
  return [LAKE.cx + lx * ca - lz * sa, LAKE.cz + lx * sa + lz * ca];
}
/** 等效半徑（相容舊名）。 */
export const radial = (x: number, z: number) => lakeLocal(x, z).r;

/** 剖面高度（未加雜訊）。湖裡（r < LAKE_R）是負的，當湖底。 */
export function craterProfile(r: number): number {
  if (r < LAKE_R) return -((LAKE_R - r) / LAKE_R) * 8;
  if (r <= RIM_R) { const u = (r - LAKE_R) / (RIM_R - LAKE_R); return RIM_H * Math.pow(u, 1.7); } // 內壁：越靠火口緣越陡
  // 外坡：先降到鞍部（0.35 RIM_H），再往外是連綿的山（政策島的山外圍還是山），波峰不超過火口緣
  const v = Math.min(1, (r - RIM_R) / (SADDLE_R - RIM_R));
  const saddle = RIM_H * (1 - 0.65 * v * v * (3 - 2 * v));
  if (r <= SADDLE_R) return saddle;
  const w = (r - SADDLE_R) / 55;
  const hills = RIM_H * 0.55 * Math.pow(Math.abs(Math.sin(w * Math.PI)), 1.3) * (0.7 + 0.3 * Math.sin(w * 2.3 + 1));
  return Math.min(RIM_H * 0.95, saddle + hills);
}

/** 決定性的雜訊：讓山稜有起伏（角度方向幾個波 + 細碎）。 */
function bump(r: number, a: number): number {
  const w = Math.sin(a * 3 + 0.7) * 0.14 + Math.sin(a * 7 + 2.1) * 0.08 + Math.sin(a * 13 + r * 0.08) * 0.05 + (r > SADDLE_R ? Math.sin(a * 5 + r * 0.03) * 0.25 : 0);
  return r >= LAKE_R ? w * craterProfile(r) : 0;
}
export const terrainHeight = (x: number, z: number) => { const { r, a } = lakeLocal(x, z); const h = craterProfile(r) + bump(r, a); return r >= LAKE_R ? h * gapFactor(a) : h; };

export interface TreeSpot { x: number; y: number; z: number; s: number; kind: 0 | 1; rot: number }

/** 樹的位置：湖岸到外緣之間，坡上隨機，面向湖的內坡密一點。 */
export function treeSpots(n: number, seed: number): TreeSpot[] {
  const rng = mulberry32(seed);
  const out: TreeSpot[] = [];
  while (out.length < n) {
    const a = rng() * Math.PI * 2;
    const r = LAKE_R + 8 + Math.pow(rng(), 1.6) * (OUTER_R - LAKE_R - 10); // 靠湖密、遠處疏（遠處有霧，看不清）
    const [x, z] = lakeWorld(r, a), y = terrainHeight(x, z);
    if (y <= 1) continue; // 湖岸那一圈不種樹，免得看起來長在湖上
    // 密度不均：用方向的低頻波當「這一帶多不多樹」，不夠密就跳過
    if (rng() > 0.55 + 0.45 * Math.sin(a * 4 + r * 0.07)) continue;
    out.push({ x, y, z, s: 0.6 + rng() * rng() * 1.3, kind: rng() < 0.6 ? 0 : 1, rot: rng() * Math.PI * 2 });
  }
  return out;
}

// 顏色全放在頂點色；底色白、加一點自發綠，夕陽的紫色補光下才不會和湖面同色
const ground = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, vertexColors: true, emissive: 0x18300f, emissiveIntensity: 0.55 });

/** 建火山口地形 + 樹（InstancedMesh），世界座標、原點在場景中心。 */
export function buildCrater(seed = 11, trees = 3200): THREE.Group {
  const g = new THREE.Group();
  const RINGS = 56, SEGS = 96, r0 = LAKE_R - 12;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const cLow = new THREE.Color(0x9cc06a), cHigh = new THREE.Color(0x5f8f49), cRock = new THREE.Color(0xb9b29a);
  for (let i = 0; i <= RINGS; i++) {
    const r = r0 + ((OUTER_R - r0) * i) / RINGS;
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2 + (i % 2) * (Math.PI / SEGS);
      const [x, z] = lakeWorld(r, a), y = terrainHeight(x, z);
      pos.push(x, y, z);
      const t = Math.max(0, Math.min(1, y / RIM_H));
      const c = t > 0.85 ? cRock : cLow.clone().lerp(cHigh, t);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEGS; j++) {
    const a = i * SEGS + j, b = i * SEGS + ((j + 1) % SEGS), c = (i + 1) * SEGS + j, d = (i + 1) * SEGS + ((j + 1) % SEGS);
    idx.push(a, b, c, b, d, c); // 逆時針（從上方看）才是正面朝上
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, ground);
  terrain.receiveShadow = true;
  g.add(terrain);

  // 樹：針葉錐與闊葉球兩種樹冠 + 樹幹，各一個 InstancedMesh；大小、轉向、疏密都隨機（參考政策島的小樹）
  const spots = treeSpots(trees, seed);
  const cones = spots.filter((t) => t.kind === 0), balls = spots.filter((t) => t.kind === 1);
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 2.2, 5), new THREE.MeshStandardMaterial({ color: 0x5f8a52, roughness: 1, flatShading: true }), Math.max(1, cones.length));
  const ball = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.0, 0), new THREE.MeshStandardMaterial({ color: 0x7fa85e, roughness: 1, flatShading: true }), Math.max(1, balls.length));
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }), Math.max(1, spots.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  cones.forEach((t, i) => { q.setFromAxisAngle(Y, t.rot); s.setScalar(t.s); p.set(t.x, t.y + (0.6 + 1.1) * t.s, t.z); cone.setMatrixAt(i, m.compose(p, q, s)); });
  balls.forEach((t, i) => { q.setFromAxisAngle(Y, t.rot); s.set(t.s, t.s * 0.85, t.s); p.set(t.x, t.y + (0.6 + 0.9) * t.s, t.z); ball.setMatrixAt(i, m.compose(p, q, s)); });
  spots.forEach((t, i) => { q.identity(); s.setScalar(t.s); p.set(t.x, t.y + 0.4 * t.s, t.z); trunk.setMatrixAt(i, m.compose(p, q, s)); });
  cone.castShadow = ball.castShadow = true;
  g.add(cone, ball, trunk);
  return g;
}
