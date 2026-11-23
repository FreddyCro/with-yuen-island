import type * as THREE from 'three';

/**
 * 島上的「元素」：一篇（或一組）貼文在格上的具體物件。
 *
 * 契約（每個 element 檔案都要遵守）：
 * - 回傳一個 Object3D，**原點在底面中心、y 朝上**，落地面是 y = 0。
 * - 佔地約 1 × 1 場景單位（1 單位 = 500 m 的名目比例，但元素是象徵尺寸，不是真實比例），
 *   高度 0.6–1.6 單位；大型物件（議會大樓、學校）可到 2 × 2 × 2。
 * - 低多邊形、flatShading、不用貼圖、不用外部模型；每個元素 ≤ 12 個 mesh。
 * - `color` 是 topic 色（交通／民生／校園／教育／長照），用在元素最大的那個面或屋頂，
 *   其餘用 `ELEMENT_PAL` 的中性色，這樣同一格裡顏色才讀得出「這是什麼主題」。
 * - 用 `rng` 做小變化（朝向、高低、顆數），不要用 Math.random，同一格每次要長一樣。
 * - 不要加燈光、不要加標籤、不要動 scene；castShadow 開在主要 mesh 上。
 */
export interface ElementOptions {
  color: THREE.Color;        // topic 色
  rng: () => number;         // 決定性亂數 0–1
  count?: number;            // 這個元素代表幾篇貼文（聚合時 >1，可用來加大或加顆數）
}

export type ElementBuilder = (opts: ElementOptions) => THREE.Object3D;

export interface ElementDef {
  id: string;
  label: string;             // 中文名，圖庫與之後的標籤用
  island: 'local' | 'council';
  build: ElementBuilder;
}

/** 元素共用的中性色（低飽和，和 PALETTES 的 pastel 系搭）。 */
export const ELEMENT_PAL = {
  white: 0xf7f3ec,
  cream: 0xeadfc8,
  grey: 0x9a9a94,
  dark: 0x4a4a46,
  wood: 0xa98562,
  concrete: 0xcfc9bd,
  asphalt: 0x6b6b68,
  green: 0x8fb07a,
  water: 0x9ec8d2,
  red: 0xc96a5a,
  yellow: 0xe3c76a,
} as const;
