import { it, expect } from 'vitest';
import { CITIZEN_PLAN, CITIZEN_TYPES } from '../src/scene/citizens';
import { mulberry32 } from '../src/scene/hex';

// 島上會沿人行道走的民眾（main.ts 的 pedestrians）：除了釣客站在碼頭邊，其他都在動，腿就得擺
const walking = [...new Set(CITIZEN_PLAN.map((p) => p.id))].filter((id) => id !== 'fisher');

it('會走動的每一種民眾，走路時兩條腿都會前後擺', () => {
  for (const id of walking) {
    const c = CITIZEN_TYPES.find((t) => t.id === id)!.build({ rng: mulberry32(3), phase: 0.7 });
    const legs = () => ['legL', 'legR'].map((n) => c.object.getObjectByName(n)!.rotation.x);
    c.update(0.1); const a = legs();
    c.update(0.4); const b = legs();
    expect(a[0], `${id} 左腿`).not.toBeCloseTo(b[0], 3);
    expect(a[1], `${id} 右腿`).not.toBeCloseTo(b[1], 3);
  }
});
