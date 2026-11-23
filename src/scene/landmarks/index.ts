// 地標：不是政績物件（不能點、?elements=0 也在），固定擺在某一格的某個位置，佔掉的圓政績物件不會進去。
import * as THREE from 'three';
import type { HexColumn } from '../hex';
import type { Blocked } from '../place';
import { buildFortSanDomingo } from './fort-san-domingo';

export interface Landmark {
  name: string;
  key: string;        // 格 `${q},${r}`
  at: number;         // 位置方向（度，地理角：0 = 東、90 = 北），相對格心
  dist: number;       // 離格心距離（× R）
  face: number;       // 正面朝向（度，地理角）
  scale: number;
  radius: number;     // 佔地圓半徑（模型單位，會乘 scale）
  build: () => THREE.Object3D;
}

export const LANDMARKS: Landmark[] = [
  // 紅毛城：關渡大橋淡水端那格，貼在朝淡水河的那條頂面邊上（210° = 對岸八里那格的方向，是格邊法線），正面朝河、
  // 壓到環道沒關係。dist：頂面邊心距（0.86R·cos30° + 0.15 斜角 ≈ 5.36）− 模型正面到原點 0.74 × scale，再 ÷ R。
  { name: '紅毛城', key: '-1,-1', at: 210, dist: (0.86 * 7 * Math.cos(Math.PI / 6) + 0.15 - 0.74 * 1.6) / 7, face: 210, scale: 1.6, radius: 1.33, build: buildFortSanDomingo },
];

const rad = (deg: number) => (deg * Math.PI) / 180;
/** 地理角 → 格內局部座標（x 東、z 南）。 */
const local = (deg: number, d: number) => new THREE.Vector3(d * Math.cos(rad(deg)), 0, -d * Math.sin(rad(deg)));

/** 地標在格內佔的圓（給 layoutTile 的 blocked）。 */
export function landmarkBlocked(l: Landmark, R: number): Blocked {
  const p = local(l.at, l.dist * R);
  return { x: p.x, z: p.z, r: l.radius * l.scale };
}

/** 建好掛到格上。 */
export function placeLandmark(tile: HexColumn, R: number, l: Landmark): THREE.Object3D {
  const o = l.build();
  const p = local(l.at, l.dist * R);
  const f = local(l.face, 1);
  o.position.set(p.x, tile.userData.topY, p.z);
  o.rotation.y = Math.atan2(f.x, f.z); // 模型 +z（正面）轉到 face 方向
  o.scale.setScalar(l.scale);
  o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  o.userData.landmark = l.name;
  tile.add(o);
  return o;
}
