// 花草與盆栽：每格沿人行道內側與角落散一些小東西（花叢、盆栽、灌木），避開政績物件，掛在格的 group 下。
import * as THREE from 'three';
import { mulberry32 } from './hex';
import { inHex, usableRadius } from './place';

export interface FloraSpot { x: number; z: number; kind: 0 | 1 | 2; s: number; rot: number }
export interface Avoid { x: number; z: number; r: number }

const FLOWER_COLORS = [0xe76f8a, 0xf2c94c, 0xf08c5a, 0xffffff, 0xb07cc6];

/**
 * 決定性：n 個候選，沿可用區邊緣（半徑 U−0.25）與六個角落附近撒，離政績物件（avoid）與格心保留圓夠遠才留。
 * kind：0 花叢、1 盆栽、2 小灌木。
 */
export function floraSpots(R: number, seed: number, avoid: Avoid[], reserve = 0.8, n = 14): FloraSpot[] {
  const U = usableRadius(R), rng = mulberry32(seed);
  const out: FloraSpot[] = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const a = rng() * Math.PI * 2;
    const corner = rng() < 0.45;
    const r = corner ? U * (0.78 + rng() * 0.18) : U * (0.55 + rng() * 0.4);
    const x = r * Math.cos(a), z = -r * Math.sin(a);
    if (!inHex(x, z, U) || Math.hypot(x, z) < reserve + 0.4) continue;
    if (avoid.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 0.55)) continue;
    out.push({ x, z, kind: ([0, 0, 1, 2] as const)[Math.floor(rng() * 4)], s: 0.7 + rng() * 0.6, rot: rng() * Math.PI * 2 });
  }
  return out;
}

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
const leaf = mat(0x6f9f58), leaf2 = mat(0x8fb86a), pot = mat(0xc97a52), soil = mat(0x5a4332);

function flowerBush(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), leaf); base.position.y = 0.16; base.scale.y = 0.7;
  g.add(base);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)]));
    const a = rng() * Math.PI * 2, r = 0.08 + rng() * 0.12;
    f.position.set(r * Math.cos(a), 0.26 + rng() * 0.06, r * Math.sin(a));
    g.add(f);
  }
  return g;
}
function pottedPlant(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.18, 7), pot); p.position.y = 0.09; p.castShadow = true;
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 7), soil); s.position.y = 0.18;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), rng() < 0.5 ? leaf : leaf2); crown.position.y = 0.34; crown.castShadow = true;
  g.add(p, s, crown);
  return g;
}
function shrub(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const n = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + rng() * 0.08, 0), rng() < 0.5 ? leaf : leaf2);
    b.position.set((rng() - 0.5) * 0.3, 0.15 + rng() * 0.05, (rng() - 0.5) * 0.3); b.castShadow = true;
    g.add(b);
  }
  return g;
}

/** 把花草盆栽掛到格上（局部座標、y = 頂面）。回傳放了幾個。 */
export function decorateTile(tile: THREE.Group & { userData: { topY: number } }, R: number, seed: number, avoid: Avoid[], reserve = 0.8): number {
  const rng = mulberry32(seed * 31 + 5);
  const spots = floraSpots(R, seed, avoid, reserve);
  for (const s of spots) {
    const o = s.kind === 0 ? flowerBush(rng) : s.kind === 1 ? pottedPlant(rng) : shrub(rng);
    o.position.set(s.x, tile.userData.topY, s.z); o.rotation.y = s.rot; o.scale.setScalar(s.s);
    o.userData.flora = true;
    tile.add(o);
  }
  return spots.length;
}
