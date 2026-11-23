// 天上的雲（參考政策島）：幾顆壓扁的球湊成一朵，flatShading、會投影；整層慢慢往一個方向飄，超出範圍從另一邊回來。
import * as THREE from 'three';
import { mulberry32 } from './hex';

export const CLOUD_Y = 34;
export interface CloudSpec { x: number; y: number; z: number; scale: number; puffs: Array<{ dx: number; dz: number; r: number; dy: number }> }

/** 決定性的雲層配置：n 朵在半徑 radius 內，每朵 3–5 顆球。 */
export function cloudLayout(n: number, radius: number, seed: number): CloudSpec[] {
  const rng = mulberry32(seed);
  const out: CloudSpec[] = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
    const k = 3 + Math.floor(rng() * 3);
    const puffs = [...Array(k)].map((_, j) => ({ dx: (j - (k - 1) / 2) * 1.6 + (rng() - 0.5) * 0.6, dz: (rng() - 0.5) * 1.2, r: 1.1 + rng() * 0.9 - Math.abs(j - (k - 1) / 2) * 0.25, dy: (rng() - 0.5) * 0.3 }));
    out.push({ x: r * Math.cos(a), y: CLOUD_Y + (rng() - 0.5) * 10, z: r * Math.sin(a), scale: 1.6 + rng() * 1.6, puffs });
  }
  return out;
}

export interface Clouds { object: THREE.Group; update(t: number): void }

const mat = new THREE.MeshStandardMaterial({ color: 0xfff6ec, roughness: 1, flatShading: true });

export function buildClouds(n = 14, radius = 110, seed = 2026, drift = 0.6): Clouds {
  const group = new THREE.Group();
  const specs = cloudLayout(n, radius, seed);
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const clouds = specs.map((s) => {
    const g = new THREE.Group();
    for (const p of s.puffs) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.dx, p.dy, p.dz); m.scale.set(p.r, p.r * 0.6, p.r * 0.85); m.castShadow = true;
      g.add(m);
    }
    g.position.set(s.x, s.y, s.z); g.scale.setScalar(s.scale);
    group.add(g);
    return { g, x0: s.x };
  });
  return {
    object: group,
    update(t: number) {
      // 整層往 +x 飄，超過半徑就從另一邊回來
      for (const c of clouds) { let x = c.x0 + t * drift; x = ((x + radius) % (2 * radius) + 2 * radius) % (2 * radius) - radius; c.g.position.x = x; }
    },
  };
}
