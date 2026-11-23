// 島上的動物（貓、狗）：不是貼文元素，純粹讓街景活起來。介面同民眾，多一個 pose 參數由 stroll 決定。
import type * as THREE from 'three';
import { buildCat, CAT_COLORS } from './cat';
import { buildDog, DOG_COLORS } from './dog';
import type { Pose } from './stroll';

export interface AnimalOptions {
  rng: () => number;
  variant?: number; // 毛色組（index）；沒給就用 rng 挑
  phase?: number;   // 動作相位
}

export interface Animal {
  object: THREE.Group;
  update(t: number, pose: Pose): void;
}

export interface AnimalDef {
  id: 'cat' | 'dog';
  label: string;
  variants: string[];     // 毛色名稱，順序對應 variant index
  restPoses: Pose[];      // 停下來時可能的姿勢
  speed: [number, number]; // 島上走路速度範圍
  build(opts: AnimalOptions): Animal;
}

export const ANIMAL_TYPES: AnimalDef[] = [
  { id: 'cat', label: '貓', variants: ['橘貓', '黑白貓'], restPoses: ['sit', 'lie'], speed: [1.0, 1.3], build: buildCat },
  { id: 'dog', label: '狗', variants: ['柴犬', '黑狗'], restPoses: ['sit'], speed: [1.6, 2.0], build: buildDog },
];
if (ANIMAL_TYPES[0].variants.length !== CAT_COLORS.length || ANIMAL_TYPES[1].variants.length !== DOG_COLORS.length) throw new Error('animals: variants 與色組數不符');

export { stroll } from './stroll';
export type { Pose, Stroll, StrollOpts } from './stroll';
