// 渡輪航線：三港閉環（offshore → dock 停泊 → offshore → 下一港 …），純時間函式、決定性。
import * as THREE from 'three';

export interface Leg { from: THREE.Vector3; to: THREE.Vector3; len: number; dockAtEnd: boolean; fromDock: boolean }
export interface RouteOpts { speed?: number; dwell?: number }
const DEF = { speed: 2.4, dwell: 4 };
const LOOK = 0.35; // 朝向用前後 0.35 s 的位置差算，轉彎才會平滑

export function buildRoute(h: Array<{ dock: THREE.Vector3; offshore: THREE.Vector3 }>): Leg[] {
  const legs: Leg[] = [];
  const leg = (from: THREE.Vector3, to: THREE.Vector3, dockAtEnd = false, fromDock = false) => legs.push({ from: from.clone(), to: to.clone(), len: from.distanceTo(to), dockAtEnd, fromDock });
  h.forEach((p, i) => {
    leg(p.offshore, p.dock, true);
    leg(p.dock, p.offshore, false, true);
    leg(p.offshore, h[(i + 1) % h.length].offshore);
  });
  return legs;
}

/** 每段的時長（含該段結束後的停泊）。 */
function durations(legs: Leg[], o: Required<RouteOpts>): number[] {
  // 進出港段用二次緩動，端點速度是平均速度的 2 倍；時長加倍讓離岸端的速度 = 巡航速度，不會在轉角跳速
  return legs.map((l) => (l.len / o.speed) * (l.dockAtEnd || l.fromDock ? 2 : 1) + (l.dockAtEnd ? o.dwell : 0));
}

export function routePeriod(legs: Leg[], opts: RouteOpts = {}): number {
  const o = { ...DEF, ...opts };
  return durations(legs, o).reduce((a, b) => a + b, 0);
}

/** 時間 → 位置與「在哪一段、停泊中嗎、停泊進度」。 */
function sample(legs: Leg[], t: number, o: Required<RouteOpts>): { pos: THREE.Vector3; leg: Leg; docked: boolean; dwellF: number } {
  const durs = durations(legs, o), T = durs.reduce((a, b) => a + b, 0);
  let tau = ((t % T) + T) % T;
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i], move = (l.len / o.speed) * (l.dockAtEnd || l.fromDock ? 2 : 1);
    if (tau < move) {
      const u = tau / move;
      const p = l.dockAtEnd ? 1 - (1 - u) * (1 - u) : l.fromDock ? u * u : u; // 進港減速、出港加速、其餘等速
      return { pos: l.from.clone().lerp(l.to, p), leg: l, docked: false, dwellF: 0 };
    }
    if (tau < durs[i]) return { pos: l.to.clone(), leg: l, docked: true, dwellF: (tau - move) / o.dwell };
    tau -= durs[i];
  }
  return { pos: legs[0].from.clone(), leg: legs[0], docked: false, dwellF: 0 };
}

const headingOf = (from: THREE.Vector3, to: THREE.Vector3) => -Math.atan2(to.z - from.z, to.x - from.x); // 船頭 +x，rotation.y

export function routeState(legs: Leg[], t: number, opts: RouteOpts = {}): { pos: THREE.Vector3; heading: number; docked: boolean } {
  const o = { ...DEF, ...opts };
  const s = sample(legs, t, o);
  if (s.docked) {
    // 停泊：船頭從進港方向平滑轉 180°，出港時朝外
    const hin = headingOf(s.leg.from, s.leg.to);
    return { pos: s.pos, heading: hin + Math.PI * s.dwellF, docked: true };
  }
  const a = sample(legs, t - LOOK, o).pos, b = sample(legs, t + LOOK, o).pos;
  const heading = a.distanceTo(b) > 1e-6 ? headingOf(a, b) : headingOf(s.leg.from, s.leg.to);
  return { pos: s.pos, heading, docked: false };
}

/** 離岸段（不含進出港）取樣後離所有格心的最小距離（× R）。 */
export function routeClearance(legs: Leg[], centers: THREE.Vector3[], R: number, samples = 20): number {
  let min = Infinity;
  for (const l of legs) {
    if (l.dockAtEnd || l.fromDock) continue;
    for (let k = 0; k <= samples; k++) {
      const p = l.from.clone().lerp(l.to, k / samples);
      for (const c of centers) min = Math.min(min, Math.hypot(p.x - c.x, p.z - c.z) / R);
    }
  }
  return min;
}

/** 兩線段（xz 平面）是否相交。 */
export function segmentsCross(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): boolean {
  const o = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/**
 * 繞島航線：每個格心外推 margin·R 取 n 個點，取凸包，相鄰頂點連成閉環（全部是等速離岸段）。
 * 凸包邊是弦，n = 12 時最多切進圓 3%，淨空仍 > 1.4 R。
 */
export function islandLoop(centers: THREE.Vector3[], R: number, margin = 1.45, n = 12): Leg[] {
  const pts: Array<[number, number]> = [];
  for (const c of centers) for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; pts.push([c.x + margin * R * Math.cos(a), c.z + margin * R * Math.sin(a)]); }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [], upper: number[][] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)].map(([x, z]) => new THREE.Vector3(x, 0.1, z));
  const legs: Leg[] = [];
  for (let i = 0; i < hull.length; i++) { const from = hull[i], to = hull[(i + 1) % hull.length]; legs.push({ from, to, len: from.distanceTo(to), dockAtEnd: false, fromDock: false }); }
  return legs;
}
