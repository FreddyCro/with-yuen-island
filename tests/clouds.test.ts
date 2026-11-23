import { it, expect } from 'vitest';
import { cloudLayout, CLOUD_Y } from '../src/scene/clouds';

it('雲：決定性、數量正確、都在給定半徑內、高度在 CLOUD_Y 附近', () => {
  const a = cloudLayout(12, 90, 7), b = cloudLayout(12, 90, 7);
  expect(a).toEqual(b);
  expect(a.length).toBe(12);
  for (const c of a) { expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(90); expect(Math.abs(c.y - CLOUD_Y)).toBeLessThanOrEqual(6); expect(c.puffs.length).toBeGreaterThanOrEqual(3); }
});
