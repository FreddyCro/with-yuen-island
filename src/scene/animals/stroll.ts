// 動物的走／停排程：走一段隨機時間、停一段隨機時間（坐下或趴下），來回切換。純邏輯、不碰 three。

export type Pose = 'walk' | 'sit' | 'lie';

export interface StrollOpts {
  walkMin?: number; walkMax?: number; // 每段走多久（秒）
  restMin?: number; restMax?: number; // 每段停多久（秒）
  restPoses?: Pose[];                 // 停下來時的姿勢，用 rng 挑
}

export interface Stroll {
  /** 推進 dt 秒；回傳現在要不要前進、現在的姿勢。dt ≤ 0 或 NaN 當 0。 */
  advance(dt: number): { moving: boolean; pose: Pose };
}

const DEF = { walkMin: 6, walkMax: 14, restMin: 2, restMax: 4, restPoses: ['sit'] as Pose[] };

export function stroll(rng: () => number, opts: StrollOpts = {}): Stroll {
  const o = { ...DEF, ...opts };
  const span = (lo: number, hi: number) => lo + rng() * (hi - lo);
  let moving = true, pose: Pose = 'walk', left = span(o.walkMin, o.walkMax);
  return {
    advance(dt) {
      left -= Number.isFinite(dt) ? Math.max(0, dt) : 0;
      // 一次最多切一段：超過的時間不帶進下一段，分頁切回來才不會一口氣跳好幾段
      if (left <= 0) {
        if (moving) { moving = false; pose = o.restPoses[Math.floor(rng() * o.restPoses.length)]; left = span(o.restMin, o.restMax); }
        else { moving = true; pose = 'walk'; left = span(o.walkMin, o.walkMax); }
      }
      return { moving, pose };
    },
  };
}
