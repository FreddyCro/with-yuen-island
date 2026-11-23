// 湖面漫遊船：在湖上隨機挑目標點、以有限轉向率平滑航行；航段避開陸地（格心淨空）、橋，並閃避其他船。
import * as THREE from 'three';
import { mulberry32 } from './hex';
import { lakeLocal, lakeWorld, LAKE_R } from './crater';
import { segmentsCross } from './ferry-route';

type XZ = [number, number];

export interface WaterFns {
  /** 隨機取一個湖面上的候選點（不保證合法）。 */
  pick: (rng: () => number) => XZ;
  /** 直線航段 a→b 整段都在湖內、離所有格心夠遠、不穿過橋。 */
  segOk: (a: XZ, b: XZ) => boolean;
  /** 單點離最近格心的距離（× R）。 */
  clearance: (p: XZ) => number;
}

/**
 * 湖面的幾何判斷。centers：所有格心；bridges：橋的線段（xz）；margin：離格心至少幾個 R；
 * rMin/rMax：候選點的等效半徑範圍（× LAKE_R，湖岸 = 1）。
 */
export function lakeWater(centers: THREE.Vector3[], R: number, bridges: Array<[THREE.Vector3, THREE.Vector3]> = [], margin = 1.5, rMin = 0.2, rMax = 0.85): WaterFns {
  const clearance = ([x, z]: XZ) => centers.reduce((m, c) => Math.min(m, Math.hypot(x - c.x, z - c.z)), Infinity) / R;
  const inLake = ([x, z]: XZ) => lakeLocal(x, z).r <= rMax * LAKE_R + 1e-6;
  const pick = (rng: () => number): XZ => lakeWorld(LAKE_R * (rMin + (rMax - rMin) * Math.sqrt(rng())), rng() * Math.PI * 2);
  const segOk = (a: XZ, b: XZ) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k <= n; k++) {
      const p: XZ = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      if (!inLake(p) || clearance(p) < margin) return false;
    }
    const A = new THREE.Vector3(a[0], 0, a[1]), B = new THREE.Vector3(b[0], 0, b[1]);
    return bridges.every(([p, q]) => !segmentsCross(A, B, p, q));
  };
  return { pick, segOk, clearance };
}

export interface WanderState { pos: THREE.Vector3; heading: number }
export interface Wanderer { advance(dt: number, others?: THREE.Vector3[]): WanderState; state(): WanderState }

/**
 * 漫遊者：speed 巡航速度、turn 最大轉向率（rad/s，轉彎半徑 = speed / turn）。
 * 目標優先挑船頭前方（夾角 < 1.1 rad，轉彎時偏離直線少），挑不到才放寬。heading 和 routeState 同慣例（船頭 +x，rotation.y）。
 */
export function lakeWanderer(water: WaterFns, seed: number, opts: { speed?: number; turn?: number } = {}): Wanderer {
  const speed = opts.speed ?? 2.0, turn = opts.turn ?? 0.6;
  const rng = mulberry32(seed);
  // 起點：第一個淨空夠的點
  let p: XZ = water.pick(rng);
  for (let i = 0; i < 500 && !water.segOk(p, p); i++) p = water.pick(rng);
  let theta = rng() * Math.PI * 2; // 數學角（xz 平面，atan2(dz, dx)）
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const nextTarget = (): XZ => {
    let loose: XZ | null = null;
    for (let i = 0; i < 80; i++) {
      const q = water.pick(rng), d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < 8 || !water.segOk(p, q)) continue;
      if (Math.abs(wrap(Math.atan2(q[1] - p[1], q[0] - p[0]) - theta)) < 1.1) return q;
      loose ??= q;
    }
    return loose ?? p;
  };
  let target = nextTarget();
  const state = (): WanderState => ({ pos: new THREE.Vector3(p[0], 0, p[1]), heading: -theta });

  return {
    state,
    advance(dt: number, others: THREE.Vector3[] = []) {
      if (dt <= 0) return state();
      if (Math.hypot(target[0] - p[0], target[1] - p[1]) < 2.5) target = nextTarget();
      let want = wrap(Math.atan2(target[1] - p[1], target[0] - p[0]) - theta);
      // 閃避：前方 6 單位內有別的船，往遠離它的一側偏
      for (const o of others) {
        const dx = o.x - p[0], dz = o.z - p[1], d = Math.hypot(dx, dz);
        if (d > 6 || d < 1e-6) continue;
        const rel = wrap(Math.atan2(dz, dx) - theta);
        if (Math.abs(rel) < Math.PI / 2) want = wrap(want - Math.sign(rel || 1) * (1.2 * (1 - d / 6)));
      }
      theta = wrap(theta + Math.max(-turn * dt, Math.min(turn * dt, want)));
      const v = speed * Math.max(0.45, Math.cos(Math.min(Math.abs(want), Math.PI / 2))); // 大轉彎時放慢
      const np: XZ = [p[0] + Math.cos(theta) * v * dt, p[1] + Math.sin(theta) * v * dt];
      // 保險：這一步會出湖或太靠岸（例如閃避把船推偏）→ 原地轉向、重挑目標
      if (water.segOk(np, np) || !water.segOk(p, p)) p = np;
      else target = nextTarget();
      return state();
    },
  };
}
