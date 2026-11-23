import type { ElementDef } from '../types';
import { parking } from './parking';
import { library } from './library';
import { event } from './event';
import { port } from './port';
import { hall } from './hall';
import { market } from './market';
import { bridge } from './bridge';
// 這一組的元素：每個元素一個檔案，在這裡 import 後加進陣列（順序 = 圖庫順序）。
export const GROUP_B: ElementDef[] = [parking, library, event, port, hall, market, bridge];
