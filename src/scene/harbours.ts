// 三個漁港：議會、八里、淡水河口。碼頭從環道的門斜下到海灘環，港（port 元素）在格邊、水面朝海，
// 外海兩個航點（dock 停泊、offshore 離岸）給渡輪用。幾何是純函式，可測。
import * as THREE from 'three';
import { gateDir, RING_R, ROAD_Y } from './roads';
import { mulberry32, TOP_H, type HexColumn } from './hex';
import { elementFor } from './elements';
import { PAL } from './palette';

export const HARBOURS: Array<{ key: string; gate: number; name: string }> = [
  { key: 'council', gate: 5, name: '議會碼頭' },   // 東南，朝八里
  { key: '-2,-1', gate: 2, name: '八里漁港' },       // 西北，朝議會
  { key: '-2,0', gate: 2, name: '淡水河口漁港' },    // 西北，河口
];

export const BEACH_Y = TOP_H + 0.25;   // 海灘環頂面
// 門在六角形邊中點方向，格邊在那個方向的距離是「邊心距」= cos30°·R（0.866 R），不是頂點半徑 R：
// 海灘環邊 0.866 R；頂面（hexShape(0.86R)+0.15 斜角）邊約 0.77 R。以下 × R。
export const APOTHEM = Math.cos(Math.PI / 6);
export const PIER_EDGE = 0.74, PIER_END = 0.83, DOCK_AT = 1.38, OFFSHORE_AT = 2.05;
export const PORT_INSET = 0.25; // 港的原點在海灘環邊往內 0.25 單位：木棧碼頭在環上、水面伸出格邊
export const SEA_Y = 0.1;

export interface HarbourGeometry {
  gatePos: THREE.Vector3; pierEdge: THREE.Vector3; pierEnd: THREE.Vector3; portPos: THREE.Vector3; portRot: number;
  dock: THREE.Vector3; offshore: THREE.Vector3; dir: THREE.Vector3;
}

export function harbourGeometry(center: THREE.Vector3, topY: number, R: number, gate: number): HarbourGeometry {
  const dir = gateDir(gate);
  const at = (k: number, y: number) => center.clone().add(dir.clone().multiplyScalar(k * R)).setY(y);
  const apothem = RING_R * R * Math.cos(Math.PI / 6);
  return {
    dir,
    gatePos: center.clone().add(dir.clone().multiplyScalar(apothem)).setY(topY + ROAD_Y),
    pierEdge: at(PIER_EDGE, topY + ROAD_Y), // 頂面邊緣：碼頭在頂面上平走到這裡，再斜下海灘環
    pierEnd: at(PIER_END, BEACH_Y + 0.06),
    portPos: center.clone().add(dir.clone().multiplyScalar(APOTHEM * R - PORT_INSET)).setY(BEACH_Y),
    portRot: Math.atan2(dir.x, dir.z), // 讓 +z 轉到 dir
    dock: at(DOCK_AT, SEA_Y),
    offshore: at(OFFSHORE_AT, SEA_Y),
  };
}

const pierMat = new THREE.MeshStandardMaterial({ color: 0xa98562, roughness: 1 });

/** 建碼頭與港，掛在場景（世界座標），回傳幾何給航線用。 */
export function buildHarbour(scene: THREE.Scene, tile: HexColumn, R: number, gate: number): HarbourGeometry {
  const g = harbourGeometry(tile.position, tile.userData.topY, R, gate);
  // 碼頭：門 → 頂面邊緣平走（在頂面上看得見），再一段短坡斜下到海灘環
  for (const [a, b] of [[g.gatePos, g.pierEdge], [g.pierEdge, g.pierEnd]] as const) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.08, 0.5), pierMat);
    m.position.lerpVectors(a, b, 0.5);
    m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    m.rotation.z = Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  // 港：port 元素，水面朝海
  const port = elementFor('port').build({ color: new THREE.Color(PAL.council), rng: mulberry32(5), count: 1 });
  port.position.copy(g.portPos); port.rotation.y = g.portRot;
  port.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(port);
  return g;
}
