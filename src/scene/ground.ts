import * as THREE from 'three';

/**
 * 地面材質（參考政策島）：區色底 + 細碎斑點 + 淡淡的街廓格線，
 * 用 CanvasTexture 程序產生，每個顏色一張，重複貼在六角頂面上。
 */
const cache = new Map<string, THREE.CanvasTexture>();

export function groundTexture(color: string, seed = 1): THREE.CanvasTexture {
  const key = `${color}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const rng = mulberry(seed);
  ctx.fillStyle = color; ctx.fillRect(0, 0, S, S);
  // 斑點：亮暗各半，像草地／鋪面的顆粒
  for (let i = 0; i < 900; i++) {
    const r = 1 + rng() * 2.2;
    ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(rng() * S, rng() * S, r, 0, Math.PI * 2); ctx.fill();
  }
  // 街廓格線：淺色、間距不等，兩個方向
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
  for (let x = 0; x < S; x += 40 + Math.floor(rng() * 24)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke(); }
  for (let y = 0; y < S; y += 40 + Math.floor(rng() * 24)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
  // 幾塊深色「街廓」
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(rng() * S, rng() * S, 20 + rng() * 40, 20 + rng() * 40);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** 海灘環的棋盤磚：兩色小方格（政策島的橘白邊）。 */
export function tileTexture(a: string, b: string): THREE.CanvasTexture {
  const key = `tile:${a}:${b}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 64, n = 4, s = S / n;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(i * s, j * s, s, s); }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  cache.set(key, tex);
  return tex;
}

function mulberry(seed: number): () => number {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
