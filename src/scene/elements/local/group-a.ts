import type { ElementDef } from '../types';
import { school } from './school';
import { crosswalk } from './crosswalk';
import { transit } from './transit';
import { playground } from './playground';
import { repair } from './repair';
// 這一組的元素：每個元素一個檔案，在這裡 import 後加進陣列（順序 = 圖庫順序）。
export const GROUP_A: ElementDef[] = [school, crosswalk, transit, playground, repair];
