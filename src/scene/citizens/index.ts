import { buildStudent } from './student';
import { buildParent } from './parent';
import { buildPedestrian } from './pedestrian';
import { buildCommuter } from './commuter';
import { buildAthlete } from './athlete';
import { buildTourist } from './tourist';
import { buildElder } from './elder';
import { buildFarmer } from './farmer';
import { buildFisher } from './fisher';
import { buildCyclist } from './cyclist';
import type { Citizen, CitizenOptions } from './figure';

export interface CitizenDef {
  id: string;
  label: string;
  build(opts: CitizenOptions): Citizen;
}

/** 民眾種類（順序 = 圖庫顯示順序）。 */
export const CITIZEN_TYPES: CitizenDef[] = [
  { id: 'student', label: '學生', build: buildStudent },
  { id: 'parent', label: '家長', build: buildParent },
  { id: 'pedestrian', label: '行人', build: buildPedestrian },
  { id: 'commuter', label: '通勤族', build: buildCommuter },
  { id: 'athlete', label: '運動者', build: buildAthlete },
  { id: 'tourist', label: '遊客', build: buildTourist },
  { id: 'elder', label: '長輩', build: buildElder },
  { id: 'farmer', label: '農民', build: buildFarmer },
  { id: 'fisher', label: '漁民', build: buildFisher },
  { id: 'cyclist', label: '單車族', build: buildCyclist },
];

/** 20 人的分配：每種幾個、放哪一區（依貼文提及比例定的，見對話紀錄）。 */
export const CITIZEN_PLAN: { id: string; region: string }[] = [
  ...['淡水', '淡水', '八里'].map((region) => ({ id: 'student', region })),
  ...['淡水', '八里', '三芝'].map((region) => ({ id: 'parent', region })),
  ...['淡水', '淡水', '淡水'].map((region) => ({ id: 'pedestrian', region })),
  ...['淡水', '淡水', '八里'].map((region) => ({ id: 'commuter', region })),
  ...['淡水', '八里'].map((region) => ({ id: 'athlete', region })),
  ...['三芝', '石門'].map((region) => ({ id: 'tourist', region })),
  { id: 'elder', region: '三芝' },
  { id: 'farmer', region: '三芝' },
  { id: 'fisher', region: '石門' },
  { id: 'cyclist', region: '石門' },
];

export { CITIZEN_PAL, pickColors } from './figure';
export type { Citizen, CitizenOptions, CitizenColors, HairStyle } from './figure';
