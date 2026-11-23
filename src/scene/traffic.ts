// 路上的車與人：把路網（環道、門、連接路、橋）做成一張圖，競選車在圖上「不迴轉的隨機走」，
// 每個節點至少接兩條邊（環道是閉迴路、門接連接路），所以永遠有路可走、沒有死路。
// 行人只在人行道環上繞，掛在格的 group 底下跟著格一起浮動。
import * as THREE from 'three';
import { RING_R, ROAD_W, WALK_W, ROAD_Y, type RoadNetwork } from './roads';
import { mulberry32 } from './hex';

export interface RoadGraph {
  nodes: THREE.Vector3[];
  /** nodes[i] 的鄰邊：[目標節點, 這條邊的折線（含起訖）, 長度] */
  adj: Array<Array<{ to: number; pts: THREE.Vector3[]; len: number }>>;
}

const key = (p: THREE.Vector3) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`;

/**
 * @param bridges 每座橋的橋面折線（世界座標、由 buildBridge 回傳），兩端是六角格頂點；
 *   會各自用一小段直路接到同方向的環道頂點。
 */
export function buildRoadGraph(net: RoadNetwork, bridges: THREE.Vector3[][] = []): RoadGraph {
  const nodes: THREE.Vector3[] = [], adj: RoadGraph['adj'] = [], index = new Map<string, number>();
  const node = (p: THREE.Vector3) => { const k = key(p); let i = index.get(k); if (i === undefined) { i = nodes.length; nodes.push(p.clone()); adj.push([]); index.set(k, i); } return i; };
  const edge = (pts: THREE.Vector3[]) => {
    const a = node(pts[0]), b = node(pts[pts.length - 1]);
    let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i - 1].distanceTo(pts[i]);
    adj[a].push({ to: b, pts: pts.map((p) => p.clone()), len });
    adj[b].push({ to: a, pts: [...pts].reverse().map((p) => p.clone()), len });
  };
  // 環道：頂點 i → 門 i → 頂點 i+1（門在邊中點）
  for (const [k, ring] of net.rings) {
    const gates = net.gates.get(k)!;
    for (let i = 0; i < 6; i++) { edge([ring[i], gates[i]]); edge([gates[i], ring[(i + 1) % 6]]); }
  }
  for (const [a, b] of net.links) edge([a, b]);
  // 橋：兩端六角頂點 → 最近的環道頂點
  for (const path of bridges) {
    if (path.length < 2) continue;
    for (const end of [path[0], path[path.length - 1]]) {
      let best: THREE.Vector3 | null = null;
      for (const ring of net.rings.values()) for (const v of ring) if (!best || v.distanceTo(end) < best.distanceTo(end)) best = v;
      if (best) edge([best, end]);
    }
    edge(path);
  }
  return { nodes, adj };
}

/** 每個節點的度數 ≥ 2 才沒有死路；回傳不合格的節點 index。 */
export function deadEnds(g: RoadGraph): number[] {
  return g.adj.map((a, i) => (a.length < 2 ? i : -1)).filter((i) => i >= 0);
}

/** 從 start 可達的節點數（連通性檢查）。 */
export function reachable(g: RoadGraph, start = 0): number {
  const seen = new Set<number>([start]), stack = [start];
  while (stack.length) { const i = stack.pop()!; for (const e of g.adj[i]) if (!seen.has(e.to)) { seen.add(e.to); stack.push(e.to); } }
  return seen.size;
}

/**
 * 不迴轉的隨機走：到節點時在「不是剛來的那條」裡挑最久沒走的邊（同分用決定性亂數），
 * 整張圖會慢慢被掃遍。`advance(dt)` 回傳目前位置與朝向。
 */
export function roadWalker(g: RoadGraph, seed: number, speed = 2.2, startNode = 0) {
  const rng = mulberry32(seed);
  const visited = new Map<string, number>();
  let from = startNode, edge = g.adj[from][0], s = 0, step = 0;
  const pick = (at: number, cameFrom: number) => {
    const cands = g.adj[at].filter((e) => e.to !== cameFrom);
    const list = cands.length ? cands : g.adj[at];
    const score = (e: { to: number }) => visited.get(`${at}>${e.to}`) ?? -1;
    const best = Math.min(...list.map(score));
    const ties = list.filter((e) => score(e) === best);
    return ties[Math.floor(rng() * ties.length)];
  };
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  return {
    advance(dt: number): { pos: THREE.Vector3; heading: number } {
      s += speed * dt;
      while (s >= edge.len) {
        s -= edge.len; visited.set(`${from}>${edge.to}`, step++);
        const prev = from; from = edge.to; edge = pick(from, prev);
      }
      // 沿折線取點
      let d = s;
      for (let i = 1; i < edge.pts.length; i++) {
        const a = edge.pts[i - 1], b = edge.pts[i], L = a.distanceTo(b);
        if (d <= L || i === edge.pts.length - 1) { const u = L > 0 ? Math.min(1, d / L) : 0; pos.lerpVectors(a, b, u); dir.subVectors(b, a); break; }
        d -= L;
      }
      return { pos: pos.clone(), heading: -Math.atan2(dir.z, dir.x) };
    },
  };
}

/** 人行道環上的一個行人：以格 group 的局部座標繞圈（半徑 = 環道內側人行道中心線）。 */
export function sidewalkWalk(R: number, topY: number, phase: number, omega: number, t: number): { x: number; y: number; z: number; heading: number } {
  const r = RING_R * R - ROAD_W / 2 - WALK_W / 2;
  const a = phase + omega * t;
  // 逆時針繞；朝向 = 切線方向（人偶面向 +z，所以 heading 再轉 90°）
  return { x: r * Math.cos(a), y: topY + ROAD_Y, z: -r * Math.sin(a), heading: a + Math.PI };
}
