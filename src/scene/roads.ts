import * as THREE from 'three';
import { hexShape, type HexColumn } from './hex';

/**
 * 路網：每格一圈環道（車）＋ 內側人行道（人），相鄰格的「門」（環道邊中點）用短路接起來。
 * 回傳的 RoadNetwork 給之後的車、人、元素放置用：元素不能壓到路。
 */
export const RING_R = 0.70;      // 環道中心線半徑（× R）
export const ROAD_W = 0.55;      // 車道寬（場景單位）
export const WALK_W = 0.32;      // 人行道寬
export const ROAD_Y = 0.02;      // 路面高於頂面

const asphalt = new THREE.MeshStandardMaterial({ color: 0x6f6d68, roughness: 0.95 });
const walk = new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.95 });
const dash = new THREE.MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.9 });

export interface RoadNetwork {
  /** 格 key → 六個門（世界座標，y 已含頂面高度），index = 邊 0..5（與 hexShape 的頂點順序一致，門在頂點 i 與 i+1 之間） */
  gates: Map<string, THREE.Vector3[]>;
  /** 格 key → 環道中心線（世界座標、閉合、六個頂點） */
  rings: Map<string, THREE.Vector3[]>;
  /** 相鄰格之間的連接路：[gateA, gateB] */
  links: Array<[THREE.Vector3, THREE.Vector3]>;
}

/** 門在六角形邊中點方向：邊 i 的中點方向角 = i·60° + 30°。 */
export function gateDir(i: number): THREE.Vector3 {
  const a = (i * Math.PI) / 3 + Math.PI / 6;
  return new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); // shape 的 y 朝 −z
}

/** 六角格頂點（世界座標）：i = 0..5，角度 i·60°。 */
export function vertexOf(g: HexColumn, R: number, i: number): THREE.Vector3 {
  const a = (i * Math.PI) / 3;
  return g.position.clone().add(new THREE.Vector3(R * Math.cos(a), 0, -R * Math.sin(a)));
}

/** 在某方向上的那個頂點。 */
export function nearestVertex(g: HexColumn, R: number, dir: THREE.Vector3): THREE.Vector3 {
  return [0, 1, 2, 3, 4, 5].map((i) => vertexOf(g, R, i)).sort((p, q) => q.clone().sub(g.position).normalize().dot(dir) - p.clone().sub(g.position).normalize().dot(dir))[0];
}

/**
 * @param visible 路網幾何永遠算（給車、人、元素放置用），但預設不畫——畫出來視覺太強勢。`?roads=1` 可開。
 */
export function buildRoads(scene: THREE.Scene, R: number, cells: Map<string, HexColumn>, visible = false): RoadNetwork {
  const net: RoadNetwork = { gates: new Map(), rings: new Map(), links: [] };
  const ringR = RING_R * R;
  const apothem = ringR * Math.cos(Math.PI / 6); // 門到格心的距離

  // 環道 + 人行道：平面環，掛在每格的 group 下（跟著格漂浮）
  const roadGeo = ringGeometry(ringR + ROAD_W / 2, ringR - ROAD_W / 2);
  const walkGeo = ringGeometry(ringR - ROAD_W / 2, ringR - ROAD_W / 2 - WALK_W);
  for (const [key, g] of cells) {
    const y = g.userData.topY + ROAD_Y;
    const registerCell = () => {
      const base = g.position.clone(); base.y = y;
      net.rings.set(key, [0, 1, 2, 3, 4, 5].map((i) => { const a = (i * Math.PI) / 3; return base.clone().add(new THREE.Vector3(ringR * Math.cos(a), 0, -ringR * Math.sin(a))); }));
      net.gates.set(key, [0, 1, 2, 3, 4, 5].map((i) => base.clone().add(gateDir(i).multiplyScalar(apothem))));
    };
    if (!visible) { registerCell(); continue; }
    const road = new THREE.Mesh(roadGeo, asphalt); road.rotation.x = -Math.PI / 2; road.position.y = y; road.receiveShadow = true;
    const side = new THREE.Mesh(walkGeo, walk); side.rotation.x = -Math.PI / 2; side.position.y = y + 0.005; side.receiveShadow = true;
    g.add(road, side);
    // 中線虛線：六段，每段幾個短塊
    for (let i = 0; i < 6; i++) {
      const a0 = (i * Math.PI) / 3, a1 = ((i + 1) * Math.PI) / 3;
      const p0 = new THREE.Vector3(ringR * Math.cos(a0), 0, -ringR * Math.sin(a0)), p1 = new THREE.Vector3(ringR * Math.cos(a1), 0, -ringR * Math.sin(a1));
      const len = p0.distanceTo(p1), n = Math.max(3, Math.round(len / 0.9));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.05), dash);
        d.position.lerpVectors(p0, p1, t); d.position.y = y + 0.012;
        d.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
        g.add(d);
      }
    }
    registerCell();
  }

  // 連接路：相鄰格（格心距 ≈ √3 R）的對應門之間
  const keys = [...cells.keys()];
  const adj = Math.sqrt(3) * R;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const A = cells.get(keys[i])!, B = cells.get(keys[j])!;
    const d = A.position.distanceTo(B.position);
    if (Math.abs(d - adj) > adj * 0.08) continue;
    const dir = B.position.clone().sub(A.position).normalize();
    const ga = nearestGate(net.gates.get(keys[i])!, A.position, dir), gb = nearestGate(net.gates.get(keys[j])!, B.position, dir.clone().negate());
    net.links.push([ga, gb]);
    if (visible) scene.add(segment(ga, gb, ROAD_W, asphalt, 0), segment(ga, gb, ROAD_W + 2 * WALK_W, walk, -0.006));
  }
  return net;
}

/** 在某方向上的那個門。 */
export function nearestGate(gates: THREE.Vector3[], center: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 {
  return [...gates].sort((p, q) => q.clone().sub(center).normalize().dot(dir) - p.clone().sub(center).normalize().dot(dir))[0];
}

function ringGeometry(outer: number, inner: number): THREE.ShapeGeometry {
  const s = hexShape(outer);
  const hole = hexShape(inner);
  s.holes.push(new THREE.Path(hole.getPoints()));
  return new THREE.ShapeGeometry(s, 1);
}

/** 兩點之間的一段平路。 */
export function segment(a: THREE.Vector3, b: THREE.Vector3, w: number, mat: THREE.Material, dy = 0): THREE.Mesh {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len + w * 0.6, 0.02, w), mat);
  m.position.lerpVectors(a, b, 0.5); m.position.y = Math.max(a.y, b.y) + dy;
  m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  m.receiveShadow = true;
  return m;
}
