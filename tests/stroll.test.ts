import { it, expect } from 'vitest';
import { stroll } from '../src/scene/animals/stroll';
import { mulberry32 } from '../src/scene/hex';

it('一開始在走，走滿一段後停下，停滿後再走', () => {
  const s = stroll(() => 0.5); // 走 10 秒、停 3 秒
  expect(s.advance(0)).toEqual({ moving: true, pose: 'walk' });
  expect(s.advance(9.9).moving).toBe(true);
  expect(s.advance(0.2)).toEqual({ moving: false, pose: 'sit' });
  expect(s.advance(2.9).moving).toBe(false);
  expect(s.advance(0.2).moving).toBe(true);
});

it('休息姿勢從 restPoses 用 rng 挑；貓會趴下', () => {
  const s = stroll(() => 0.99, { restPoses: ['sit', 'lie'] });
  s.advance(20);
  expect(s.advance(0).pose).toBe('lie');
});

it('dt 為 0、負值或 NaN 不改變狀態', () => {
  const s = stroll(mulberry32(1));
  const a = s.advance(0);
  expect(s.advance(-5)).toEqual(a);
  expect(s.advance(Number.NaN)).toEqual(a); // NaN 當 0 處理
});

it('一次很大的 dt 最多只跨到下一段', () => {
  const s = stroll(() => 0.5); // 走 10、停 3
  expect(s.advance(100)).toEqual({ moving: false, pose: 'sit' });
  expect(s.advance(1).moving).toBe(false); // 剩餘時間重新從停頓段開始算
});

it('不同 seed 的走停長度落在範圍內', () => {
  const s = stroll(mulberry32(7), { walkMin: 1, walkMax: 2, restMin: 0.5, restMax: 1 });
  let t = 0, last = true;
  const changes: number[] = [];
  for (let i = 0; i < 400; i++) { t += 0.05; const m = s.advance(0.05).moving; if (m !== last) { changes.push(t); last = m; } }
  expect(changes.length).toBeGreaterThan(5);
  for (let i = 1; i < changes.length; i++) { const d = changes[i] - changes[i - 1]; expect(d).toBeGreaterThan(0.45); expect(d).toBeLessThan(2.1); }
});
