// 圖庫的「環境」與「實際密度」兩區：把樹、山丘、六角格和元素放在一起，檢查彼此的比例與擁擠程度。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ELEMENTS } from './scene/elements';
import { hexColumn, tree, hill, mulberry32, TOP_H } from './scene/hex';
import { inHex } from './scene/place';

const M = 1 / 500;                 // 1 場景單位 = 500 m（同 main.ts）
export const TILE_R = 3500 * M;    // 六角格邊長 = 7
const TOPICS = [0xc9826a, 0x7e9bb5, 0x8fa882, 0xa894b0, 0xcdb37a];

function label(scene: THREE.Scene, text: string, x: number, y: number, z: number, cls = 'label small'): void {
  const el = document.createElement('div'); el.className = cls; el.textContent = text;
  const o = new CSS2DObject(el); o.position.set(x, y, z); scene.add(o);
}

function shadows(o: THREE.Object3D): void {
  o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
}

/**
 * 環境區：針葉／闊葉各取最小與最大尺寸、兩座山丘（觀音山、大屯山的海拔），
 * 旁邊放學校與公車亭當比例尺。原點為這一區的左前角。
 */
export function addEnvironment(scene: THREE.Scene, origin: THREE.Vector3): void {
  const y = 0;
  // 樹：main.ts 用 s = 0.7–1.6；v < 0.5 針葉、否則闊葉
  const trees: [number, number, string][] = [[0.7, 0.2, '針葉 s0.7'], [1.6, 0.2, '針葉 s1.6'], [0.7, 0.8, '闊葉 s0.7'], [1.6, 0.8, '闊葉 s1.6']];
  trees.forEach(([s, v, name], i) => {
    const x = origin.x + i * 1.9, z = origin.z;
    const t = tree(x, y, z, s, v); shadows(t); scene.add(t);
    label(scene, name, x, -0.3, z + 0.9);
  });
  // 比例尺：兩個元素
  const ref = ['school', 'transit'];
  ref.forEach((id, i) => {
    const def = ELEMENTS.find((e) => e.id === id);
    if (!def) return;
    const o = def.build({ color: new THREE.Color(TOPICS[i]), rng: mulberry32(7 + i), count: 1 });
    const x = origin.x + (4 + i) * 1.9, z = origin.z;
    o.position.set(x, y, z); shadows(o); scene.add(o);
    label(scene, `${def.label}（比例尺）`, x, -0.3, z + 0.9);
  });
  // 山丘：hill() 的高度隨海拔，底面半徑 = R × 0.42
  const hills: [number, string][] = [[616, '觀音山 616 m'], [1092, '大屯山 1092 m']];
  hills.forEach(([ele, name], i) => {
    const x = origin.x + 1.5 + i * 7, z = origin.z + 6.5;
    const h = hill(TILE_R, 0.1, ele, x, z); scene.add(h);
    label(scene, `山丘：${name}`, x, -0.3, z + 3.4);
  });
  label(scene, '環境：樹 × 山丘 × 元素比例', origin.x + 5.7, -0.3, origin.z + 11.5, 'label');
}


/**
 * 實際密度測試格：一塊真實大小（R = 7）的六角格，隨機擺 `count` 個地方島元素和 `trees` 棵樹，
 * 元素間保持最小間距；擺不下的數量會寫在標籤上。
 */
export function addDensityTile(scene: THREE.Scene, center: THREE.Vector3, color: string, count: number, trees: number): void {
  const tile = hexColumn(TILE_R, center, new THREE.Color(color), TOP_H, 101);
  scene.add(tile);
  const topY = tile.userData.topY;
  const usable = TILE_R * 0.86 - 0.5;   // 頂面內縮一點，不要掛在斜邊上
  const rng = mulberry32(2026);
  const placed: { x: number; z: number; r: number }[] = [];
  const tryPlace = (r: number): { x: number; z: number } | null => {
    for (let a = 0; a < 400; a++) {
      const x = (rng() * 2 - 1) * usable, z = (rng() * 2 - 1) * usable;
      if (!inHex(x, z, usable)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r)) continue;
      placed.push({ x, z, r });
      return { x, z };
    }
    return null;
  };

  const local = ELEMENTS.filter((e) => e.island === 'local');
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const spot = tryPlace(0.5);       // 元素佔地約 1 × 1 → 半徑 0.5
    if (!spot) continue;
    const def = local[Math.floor(rng() * local.length)];
    const o = def.build({ color: new THREE.Color(TOPICS[Math.floor(rng() * TOPICS.length)]), rng: mulberry32(i + 11), count: 1 });
    o.position.set(spot.x, topY, spot.z);
    shadows(o); tile.add(o);
    ok++;
  }
  let treeOk = 0;
  for (let i = 0; i < trees; i++) {
    const spot = tryPlace(0.35);
    if (!spot) continue;
    tile.add(tree(spot.x, topY, spot.z, 0.7 + rng() * 0.9, rng()));
    treeOk++;
  }
  const miss = count - ok;
  label(scene,
    `實際密度：一格 R=${TILE_R}（邊長 3.5 km），元素 ${ok}/${count}${miss ? `（${miss} 個擺不下）` : ''}、樹 ${treeOk}/${trees}`,
    center.x, -0.3, center.z + TILE_R * 1.25, 'label');
}
