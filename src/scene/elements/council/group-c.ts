import type { ElementDef } from '../types';
import { councilHall } from './council-hall';
import { lunchTray } from './lunch-tray';
import { milk } from './milk';
import { elderCard } from './elder-card';
import { baby } from './baby';
import { suitcase } from './suitcase';
import { shield } from './shield';
import { coin } from './coin';
import { flag } from './flag';
// 這一組的元素：每個元素一個檔案，在這裡 import 後加進陣列（順序 = 圖庫順序）。
export const GROUP_C: ElementDef[] = [councilHall, lunchTray, milk, elderCard, baby, suitcase, shield, coin, flag];
