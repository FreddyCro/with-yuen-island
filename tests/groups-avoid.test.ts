import { it, expect } from 'vitest';
import { assignCells, isMountainGroup } from '../scripts/lib/groups.mjs';

const grp = (key: string, cells: string[], allowAvoid = false) => ({ key, posts: cells.map((cell) => ({ cell })), allowAvoid });
it('山的格不放物件：候選格是山就改放同島最空的非山格', () => {
  const out = assignCells([grp('a', ['0,0', '0,0', '-1,0'])], { allCells: ['0,0', '-1,0', '-2,0'], avoid: new Set(['0,0']) });
  expect(out.get('a')).toBe('-1,0');
});
it('內容與山有關的組可以放山的格', () => {
  const out = assignCells([grp('a', ['0,0', '0,0'], true)], { allCells: ['0,0', '-1,0'], avoid: new Set(['0,0']) });
  expect(out.get('a')).toBe('0,0');
});
it('isMountainGroup：標題一半以上提到山／步道才算', () => {
  expect(isMountainGroup([{ title: '觀音山步道整修' }, { title: '登山口停車' }, { title: '公車站' }])).toBe(true);
  expect(isMountainGroup([{ title: '路口號誌' }, { title: '山' }, { title: '公園' }])).toBe(false);
});
it('候選格只有山時，改放同島已經有物件的非山格，不填空格', () => {
  const out = assignCells([grp('big', ['-2,0', '-2,0']), grp('lone', ['0,0'])], { allCells: ['0,0', '-2,0', '-1,1'], avoid: new Set(['0,0']) });
  expect(out.get('lone')).toBe('-2,0');
});
