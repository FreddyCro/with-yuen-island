// 格心廣場與主街（參考政策島：地面先分區，物件才有依據）。掛在格的 group 底下，局部座標。
import * as THREE from 'three';
import { gateDir, RING_R, ROAD_Y } from './roads';
import { STREET_W } from './place';
import type { HexColumn } from './hex';

const paving = new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 0.95 }); // 比格面深一階，鳥瞰才讀得出廣場
const street = new THREE.MeshStandardMaterial({ color: 0xbfb3a0, roughness: 0.95 });

/** 廣場（半徑 plazaR 的圓）+ 從廣場邊到門的主街。回傳主街方向（單位向量 x/z）。 */
export function buildStreet(tile: HexColumn, R: number, gate: number, plazaR: number): [number, number] {
  const y = tile.userData.topY + ROAD_Y - 0.005;
  const d = gateDir(gate);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(plazaR, plazaR, 0.03, 36), paving);
  plaza.position.y = y; plaza.receiveShadow = true;
  const apothem = RING_R * R * Math.cos(Math.PI / 6);
  const len = apothem - plazaR + 0.3;
  const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, STREET_W), street);
  s.position.set(d.x * (plazaR + len / 2 - 0.1), y, d.z * (plazaR + len / 2 - 0.1));
  s.rotation.y = -Math.atan2(d.z, d.x); s.receiveShadow = true;
  tile.add(plaza, s);
  return [d.x, d.z];
}
