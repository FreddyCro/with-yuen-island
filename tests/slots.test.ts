import { describe, it, expect } from 'vitest';
import { layoutSlots, tierOf, tierScale, inHex, footprint, usableRadius, OBJECT_SCALE, type SlotItem } from '../src/scene/place';

const R = 7, U = usableRadius(R);
const it_ = (id: number, element: string, count: number, hint: [number, number] | null = null, edge: [number, number] | null = null): SlotItem => ({ id, element, topic: null, count, hint, edge });
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('分級', () => {
  it('分級表：school 是 L、playground 是 M、sign 是 S，不在表裡的當 M', () => {
    expect(tierOf('school')).toBe('L'); expect(tierOf('playground')).toBe('M'); expect(tierOf('sign')).toBe('S'); expect(tierOf('whatever')).toBe('M');
  });
  it('縮放上限依級：118 篇的 crosswalk（S）不會比 7 篇的 school（L）大', () => {
    expect(tierScale('crosswalk', 118)).toBeLessThanOrEqual(1.0 * OBJECT_SCALE);
    expect(tierScale('school', 7)).toBeGreaterThan(1.0 * OBJECT_SCALE);
    expect(tierScale('school', 1000)).toBeLessThanOrEqual(1.25 * OBJECT_SCALE);
    expect(tierScale('playground', 1000)).toBeLessThanOrEqual(1.12 * OBJECT_SCALE);
    expect(tierScale('bridge', 41)).toBeLessThanOrEqual(1.12); // 橋不放大
  });
});

describe('layoutSlots', () => {
  it('唯一的 L 在中心、面向 offset 方向；配角面向主角', () => {
    const out = layoutSlots([it_(0, 'school', 14, [3, -2]), it_(1, 'playground', 5, [-2, 1]), it_(2, 'crosswalk', 7)], { R, seed: 1, reserve: 0.8 });
    const main = out.placed.find((p) => p.id === 0)!;
    expect(main.slot).toBe('center'); expect(main.x).toBeCloseTo(0, 6); expect(main.z).toBeCloseTo(0, 6);
    const face = { x: Math.sin(main.rot), z: Math.cos(main.rot) };
    expect(face.x * 3 + face.z * -2).toBeGreaterThan(0.95 * Math.hypot(3, -2));
    for (const p of out.placed.filter((q) => q.id !== 0 && q.slot === 'sector')) {
      const f = { x: Math.sin(p.rot), z: Math.cos(p.rot) }, toMain = { x: -p.x, z: -p.z };
      expect(f.x * toMain.x + f.z * toMain.z).toBeGreaterThan(0.95 * Math.hypot(toMain.x, toMain.z));
    }
  });
  it('中心不可用（山丘格 reserve 太大）時 L 落在 offset 最近的扇區', () => {
    const out = layoutSlots([it_(0, 'school', 14, [0, -5])], { R, seed: 0, reserve: R * 0.42 + 0.6 });
    const main = out.placed[0];
    expect(main.slot).toBe('sector');
    expect(Math.hypot(main.x, main.z)).toBeGreaterThan(2.0); // 扇區往外推，但學校佔地大，被邊心距夾回來
    const ang = Math.atan2(-main.z, main.x), want = Math.atan2(5, 0);
    expect(Math.abs(Math.atan2(Math.sin(ang - want), Math.cos(ang - want)))).toBeLessThan(Math.PI / 6 + 1e-6);
  });
  it('中心被地標擋住時 L 改放扇區', () => {
    const out = layoutSlots([it_(0, 'school', 14, [3, 0])], { R, seed: 0, reserve: 0.8, blocked: [{ x: 0, z: 0, r: 0.8 }] });
    expect(out.placed[0].slot).toBe('sector');
  });
  it('兩個 L 落在相對扇區，中心留空', () => {
    const out = layoutSlots([it_(0, 'school', 27, [2, 1]), it_(1, 'market', 2, [-1, 3]), it_(2, 'sign', 19)], { R, seed: 2, reserve: 0.8 });
    const a = out.placed.find((p) => p.id === 0)!, b = out.placed.find((p) => p.id === 1)!;
    expect(a.slot).toBe('sector'); expect(b.slot).toBe('sector');
    const da = Math.atan2(-a.z, a.x), db = Math.atan2(-b.z, b.x);
    expect(Math.abs(Math.atan2(Math.sin(da - db), Math.cos(da - db)))).toBeCloseTo(Math.PI, 3); // 方向相對（半徑依佔地不同）
    expect(out.placed.some((p) => p.slot === 'center')).toBe(false);
  });
  it('沒有 L 的格：最大的 M 在中心', () => {
    const out = layoutSlots([it_(0, 'event', 15), it_(1, 'parking', 12)], { R, seed: 3, reserve: 0.8 });
    expect(out.placed.find((p) => p.id === 0)!.slot).toBe('center');
  });
  it('告示牌在外圈；海側 edge 照給的位置', () => {
    const out = layoutSlots([it_(0, 'school', 5), it_(1, 'sign', 59, [1, 1]), it_(2, 'port', 3, null, [0, -5.9])], { R, seed: 4, reserve: 0.8 });
    const sign = out.placed.find((p) => p.id === 1)!, port = out.placed.find((p) => p.id === 2)!;
    expect(sign.slot).toBe('ring'); expect(Math.hypot(sign.x, sign.z)).toBeGreaterThanOrEqual((U - 0.45) * 0.86 - 1e-6); expect(Math.hypot(sign.x, sign.z)).toBeLessThanOrEqual(U - 0.45 + 1e-6);
    expect(port.slot).toBe('edge'); expect(port.x).toBeCloseTo(0, 6); expect(port.z).toBeCloseTo(-5.9, 6);
  });
  it('10 組的擠格（0,2）全部放得下，都在可用區內、不進 blocked、彼此不重疊（佔地 × 縮放）', () => {
    const items = [it_(0, 'sign', 23, [1, 2]), it_(1, 'repair', 19, [-2, 1]), it_(2, 'playground', 14, [2, -1]), it_(3, 'school', 14, [0, 2]), it_(4, 'transit', 9, [-3, 0]), it_(5, 'library', 8, [1, -3]), it_(6, 'crosswalk', 7, [2, 2]), it_(7, 'hall', 6, [-1, -2]), it_(8, 'event', 3, [3, 1]), it_(9, 'port', 1, null, [5.9, 0])];
    const blocked = [{ x: -2.6, z: 1.8, r: 0.9 }];
    const out = layoutSlots(items, { R, seed: 5, reserve: 0.8, blocked });
    expect(out.unplaced).toEqual([]);
    expect(out.placed.length).toBe(10);
    for (const p of out.placed) {
      const fp = footprint(p.element) * p.scale;
      if (p.slot !== 'edge') { expect(inHex(p.x, p.z, U + 0.6)).toBe(true); /* 建築可略壓到人行道 */ expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(0.8 - 1e-6); }
      for (const b of blocked) if (p.slot !== 'edge') expect(dist(p, b)).toBeGreaterThanOrEqual(b.r + fp - 1e-6);
      for (const q of out.placed) if (q !== p) expect(dist(p, q)).toBeGreaterThanOrEqual((fp + footprint(q.element) * q.scale) * 0.9 - 1e-6);
    }
  });
  it('同 seed 結果相同；不同 seed 模板轉動', () => {
    const items = [it_(0, 'school', 14, [3, 0]), it_(1, 'playground', 5), it_(2, 'event', 3)];
    expect(layoutSlots(items, { R, seed: 7, reserve: 0.8 })).toEqual(layoutSlots(items, { R, seed: 7, reserve: 0.8 }));
    const a = layoutSlots(items.map((i) => ({ ...i, hint: null })), { R, seed: 0, reserve: 0.8 }), b = layoutSlots(items.map((i) => ({ ...i, hint: null })), { R, seed: 1, reserve: 0.8 });
    const pa = a.placed.find((p) => p.id === 1)!, pb = b.placed.find((p) => p.id === 1)!;
    expect(dist(pa, pb)).toBeGreaterThan(0.5);
  });
  it('議會主格：council-hall 固定中心', () => {
    const out = layoutSlots([it_(0, 'sign', 44), it_(1, 'council-hall', 27), it_(2, 'coin', 13), it_(3, 'suitcase', 9), it_(4, 'shield', 7), it_(5, 'flag', 6)], { R, seed: 11, reserve: 2.0, mainId: 1 });
    expect(out.placed.find((p) => p.id === 1)!.slot).toBe('center');
    expect(out.unplaced).toEqual([]);
  });
});
