import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs 純函式，沒有型別宣告
import { topicBucket, groupPosts, assignCells, dominantTopic, excerpt } from '../scripts/lib/groups.mjs';

const P = (id: number, island: string, element: string, cell: string, topic: string | null = null) => ({ id, island, element, cell, topic });

describe('topicBucket', () => {
  it('校園、教育併成一類；無議題與長照歸其他', () => {
    expect(topicBucket('校園')).toBe('教育與校園');
    expect(topicBucket('教育')).toBe('教育與校園');
    expect(topicBucket('交通')).toBe('交通');
    expect(topicBucket(null)).toBe('其他');
    expect(topicBucket('長照')).toBe('其他');
  });
});

describe('groupPosts', () => {
  it('島 × 元素 一組', () => {
    const g = groupPosts([P(1, '淡水', 'school', 'a'), P(2, '淡水', 'school', 'b'), P(3, '八里', 'school', 'c'), P(4, '淡水', 'port', 'a')]);
    expect([...g.keys()].sort()).toEqual(['八里-school', '淡水-port', '淡水-school']);
    expect(g.get('淡水-school').posts.map((p: { id: number }) => p.id)).toEqual([1, 2]);
  });
});

describe('assignCells', () => {
  it('放在貼文最多的格', () => {
    const groups = [{ key: 'x', posts: [{ cell: 'a' }, { cell: 'b' }, { cell: 'b' }] }];
    expect(assignCells(groups).get('x')).toBe('b');
  });
  it('同格滿了改放次多的格；大組先挑', () => {
    const groups = [
      { key: 'big', posts: [{ cell: 'a' }, { cell: 'a' }, { cell: 'a' }] },
      { key: 'small', posts: [{ cell: 'a' }, { cell: 'a' }, { cell: 'b' }] },
    ];
    const m = assignCells(groups, { max: 1 });
    expect(m.get('big')).toBe('a');
    expect(m.get('small')).toBe('b');
  });
  it('pinned 優先、且佔名額', () => {
    const groups = [{ key: 'hall', posts: [{ cell: 'b' }] }, { key: 'other', posts: [{ cell: 'a' }, { cell: 'b' }, { cell: 'b' }] }];
    const m = assignCells(groups, { max: 1, pinned: { hall: 'b' } });
    expect(m.get('hall')).toBe('b');
    expect(m.get('other')).toBe('a');
  });
  it('候選格都滿時溢到同區其他格（先有物件的，再空的）', () => {
    const groups = [{ key: 'a1', posts: [{ cell: 'a' }, { cell: 'a' }] }, { key: 'a2', posts: [{ cell: 'a' }] }];
    const m = assignCells(groups, { max: 1, allCells: ['a', 'b', 'c'] });
    expect(m.get('a1')).toBe('a');
    expect(m.get('a2')).toBe('b');
  });
  it('所有候選格都滿、也沒有空格時仍給最多的那格（不丟組）', () => {
    const groups = [{ key: 'a1', posts: [{ cell: 'a' }] }, { key: 'a2', posts: [{ cell: 'a' }] }];
    const m = assignCells(groups, { max: 1 });
    expect(m.get('a1')).toBe('a');
    expect(m.get('a2')).toBe('a');
  });
});

describe('dominantTopic / excerpt', () => {
  it('取最多的原始 topic', () => {
    expect(dominantTopic([{ topic: '交通' }, { topic: null }, { topic: '交通' }])).toBe('交通');
  });
  it('去掉開頭日期、壓空白、截斷', () => {
    expect(excerpt('2026/11/13\n\n去年年底，宇恩到坪頂國小', 6)).toBe('去年年底，宇…');
    expect(excerpt('短文')).toBe('短文');
  });
});

describe('assignCells L 懲罰', () => {
  const L = (key: string, cells: string[]) => ({ key, element: key.split('-')[1], posts: cells.map((cell) => ({ cell })) });
  it('同格已有 L 時，第二個 L 偏好另一格（分數打折）', () => {
    const m = assignCells([L('x-school', ['a', 'a', 'a', 'a', 'a', 'a']), L('x-library', ['a', 'a', 'a', 'b', 'b'])]); // 大組先挑：school 先進 a
    expect(m.get('x-school')).toBe('a');
    expect(m.get('x-library')).toBe('b'); // a 的 3 × 0.6 = 1.8 < b 的 2
  });
  it('地理對應優先：另一格篇數差太多時還是放同格', () => {
    const m = assignCells([L('x-school', ['a', 'a', 'a', 'a', 'a', 'a', 'a']), L('x-library', ['a', 'a', 'a', 'a', 'a', 'b'])]);
    expect(m.get('x-library')).toBe('a'); // 5 × 0.6 = 3 > 1
  });
  it('只有一個候選格時照放', () => {
    const m = assignCells([L('x-school', ['a']), L('x-library', ['a', 'a'])]);
    expect(m.get('x-library')).toBe('a');
  });
  it('M、S 不受影響', () => {
    const m = assignCells([L('x-school', ['a', 'a']), { key: 'x-sign', element: 'sign', posts: [{ cell: 'a' }, { cell: 'a' }, { cell: 'b' }] }]);
    expect(m.get('x-sign')).toBe('a');
  });
});
