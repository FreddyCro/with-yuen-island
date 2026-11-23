// 島上動物沿路邊走：把 roadWalker 給的路中心線位置往行進方向右側偏。
import * as THREE from 'three';
import { ROAD_W } from '../roads';

/**
 * 動物離路中心線的距離：貼路邊、不跟競選車（走中心線）擠。
 * 島上動物 ×2 後身體半寬約 0.16，所以中心放在離路邊 0.05 處，內側離中心線還有 0.06 的空隙。
 */
export const ANIMAL_SIDE = ROAD_W / 2 - 0.05;

/**
 * 把路中心線上的點往行進方向右側偏 d。heading 慣例同 roadWalker（rotation.y = heading、面向 +x）：
 * rotation.y = h 把局部 +z 轉到世界 (sin h, 0, cos h)，面向 +x 時右手邊就是局部 +z。回傳新向量。
 */
export function roadsideOffset(pos: THREE.Vector3, heading: number, d: number): THREE.Vector3 {
  return pos.clone().add(new THREE.Vector3(d * Math.sin(heading), 0, d * Math.cos(heading)));
}
