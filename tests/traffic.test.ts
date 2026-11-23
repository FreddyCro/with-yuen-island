import { it, expect } from 'vitest';
import * as THREE from 'three';
import layout from '../data/layout.json';
import { buildRoads } from '../src/scene/roads';
import { buildRoadGraph, deadEnds, reachable, roadWalker, sidewalkWalk } from '../src/scene/traffic';
import type { HexColumn } from '../src/scene/hex';

const M = 1 / 500, R = layout.edgeM * M;
const cells = new Map<string, HexColumn>();
for (const c of layout.cells) cells.set(`${c.q},${c.r}`, { position: new THREE.Vector3(c.x * M, 0, -c.y * M), userData: { topY: 2.3 } } as unknown as HexColumn);
const net = buildRoads(new THREE.Scene(), R, cells, false);
// 假的橋：淡江大橋兩端頂點之間一條折線（夠測圖的接法）
const tj = layout.bridges.find((b) => b.name.startsWith('淡江'))!;
const A = cells.get(tj.from.join(','))!, T = cells.get(tj.to.join(','))!;
const va = A.position.clone().add(T.position.clone().sub(A.position).normalize().multiplyScalar(R)).setY(2.3);
const vt = T.position.clone().add(A.position.clone().sub(T.position).normalize().multiplyScalar(R)).setY(2.3);
const graph = buildRoadGraph(net, [[va, va.clone().lerp(vt, 0.5).setY(4), vt]]);

it('路網圖：沒有死路（每個節點度 ≥ 2）', () => { expect(deadEnds(graph)).toEqual([]); });
it('路網圖：加了橋之後全島連通', () => { expect(reachable(graph)).toBe(graph.nodes.length); });
it('競選車：走 2000 步不會卡住、位置連續、朝向是數字', () => {
  const w = roadWalker(graph, 7, 2.2);
  let last = w.advance(0);
  for (let i = 0; i < 2000; i++) {
    const s = w.advance(0.05);
    expect(Number.isFinite(s.heading)).toBe(true);
    expect(s.pos.distanceTo(last.pos)).toBeLessThan(0.5);
    last = s;
  }
});
it('行人：在人行道環上', () => {
  const p = sidewalkWalk(R, 2.3, 0, 0.3, 2);
  expect(Math.hypot(p.x, p.z)).toBeCloseTo(0.7 * R - 0.55 / 2 - 0.32 / 2, 5);
});
