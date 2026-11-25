import { describe, it, expect } from 'vitest';
import { taipeiDate } from '../src/ui/help';

describe('taipeiDate', () => {
  it('ISO 時間換成台北日期 YYYY/MM/DD（UTC+8，跨日要進位）', () => {
    expect(taipeiDate('2026-11-23T21:41:44.604Z')).toBe('2026/11/24');
    expect(taipeiDate('2026-11-23T15:59:59Z')).toBe('2026/11/23');
    expect(taipeiDate('2026-12-31T16:00:00Z')).toBe('2027/01/01');
  });
});
