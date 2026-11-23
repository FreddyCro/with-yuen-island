import type { ElementDef } from './types';
import { sign } from './local/sign';
import { GROUP_A } from './local/group-a';
import { GROUP_B } from './local/group-b';
import { GROUP_C } from './council/group-c';

/**
 * 元素註冊表。每個元素一個檔案（`./local/<id>.ts` 或 `./council/<id>.ts`），
 * export 一個 `ElementDef`，在所屬的 group-*.ts 裡加進陣列。順序 = 圖庫（?gallery=1）的顯示順序。
 */
export const ELEMENTS: ElementDef[] = [...GROUP_A, ...GROUP_B, sign, ...GROUP_C];

export const byId = new Map(ELEMENTS.map((e) => [e.id, e]));

/** 找不到的 id 退回告示牌。 */
export function elementFor(id: string): ElementDef {
  return byId.get(id) ?? byId.get('sign')!;
}

export type { ElementDef, ElementBuilder, ElementOptions } from './types';
export { ELEMENT_PAL } from './types';
