import * as THREE from 'three';
import type { Layout } from '../types';

/** 一組色盤：四區 + 議會 + 環境色。 */
export interface Palette {
  name: string;
  districts: Record<string, string>; // 區名 → 色
  council: string;
  sea: string;
  shallow: string;
  sand: string;
  sandSide: string;
}

/** 低飽和候選色盤。`?palette=<key>` 切換，預設 pastel。 */
export const PALETTES: Record<string, Palette> = {
  // 原型用的高飽和版，留著對照
  vivid: { name: '原型', districts: { 淡水區: '#DB6A41', 八里區: '#3F7FBF', 三芝區: '#5FA55A', 石門區: '#B08BC4' }, council: '#E0B23C', sea: '#6EC1D6', shallow: '#8FD3E3', sand: '#EAD9B4', sandSide: '#D9C08E' },
  // A 粉彩：明度高、飽和低，像手繪地圖
  pastel: { name: '粉彩', districts: { 淡水區: '#E9A98C', 八里區: '#93B5D6', 三芝區: '#A9C89B', 石門區: '#CBB5D8' }, council: '#E6CE8E', sea: '#A6D4DC', shallow: '#C2E2E8', sand: '#F2E7D1', sandSide: '#E0CFAB' },
  // B 大地：中明度、帶灰的暖色，像桌遊紙板
  earth: { name: '大地', districts: { 淡水區: '#C8836B', 八里區: '#7F9CB4', 三芝區: '#8FA983', 石門區: '#A995B1' }, council: '#CDB47C', sea: '#8DBCC6', shallow: '#A9CFD6', sand: '#E2D3B2', sandSide: '#C9B68E' },
  // C 莫蘭迪：全部往灰靠，最安靜
  morandi: { name: '莫蘭迪', districts: { 淡水區: '#C69B88', 八里區: '#8FA0B1', 三芝區: '#9CAB93', 石門區: '#B0A2B4' }, council: '#C9B990', sea: '#9EC2CA', shallow: '#B6D3D9', sand: '#E6DCC8', sandSide: '#CFC2A5' },
};

/** 環境色：由 applyPalette 填入，場景建立前呼叫一次。 */
export const PAL = {
  sea: 0x6ec1d6,
  shallow: 0x8fd3e3,
  sand: 0xead9b4,
  sandSide: 0xd9c08e,
  cream: 0xfbf3e6,
  concrete: 0xede6da,
  road: 0x5c5c5c,
  cable: 0x8c8c8c,
  archRed: 0xc8352b,
  council: 0xe0b23c,
};

const hex = (s: string) => parseInt(s.slice(1), 16);

/** 套用色盤：改 PAL 的環境色、覆寫 layout 的區色。回傳套用的色盤。 */
export function applyPalette(key: string | null, layout: Layout): Palette {
  const p = PALETTES[key ?? ''] ?? PALETTES.pastel;
  PAL.sea = hex(p.sea); PAL.shallow = hex(p.shallow); PAL.sand = hex(p.sand); PAL.sandSide = hex(p.sandSide); PAL.council = hex(p.council);
  for (const d of layout.districts) if (p.districts[d.name]) d.color = p.districts[d.name];
  return p;
}

/** topic 色：元素用在最大的那個面或屋頂（見 elements/types.ts）。順序對應圖庫 gallery-env.ts 的 TOPICS 五色；null → 混凝土灰（照實呈現沒分類的貼文）。 */
export const TOPIC: Record<string, number> = { 交通: 0xc9826a, 民生: 0x7e9bb5, 校園: 0x8fa882, 教育: 0xa894b0, 長照: 0xcdb37a, null: 0xcfc9bd };

export function topicColor(topic: string | null): THREE.Color {
  return new THREE.Color(TOPIC[topic ?? 'null'] ?? TOPIC.null);
}
