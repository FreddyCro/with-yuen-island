// 議會的擺放：三格版面、格內佈局（純幾何，可測）、以及把元素建成 Object3D 掛到格上。
import * as THREE from 'three';
import { RING_R, ROAD_W, WALK_W } from './roads';
import { mulberry32, type HexColumn } from './hex';
import { elementFor } from './elements';
import { PAL, topicColor } from './palette';
import type { CouncilTile } from '../types';
import tiersJson from '../../data/tiers.json';

/** 元素佔地半徑：兩物件最小間距 = 半徑相加（預設 0.45 + 0.45 = 0.9）。小東西（告示牌、牛奶瓶、金幣）可以靠近一點。 */
const FOOTPRINT: Record<string, number> = {
  sign: 0.3, milk: 0.3, coin: 0.35, flag: 0.35, shield: 0.35, suitcase: 0.45, 'elder-card': 0.4, baby: 0.45, 'lunch-tray': 0.45,
  // 建築級照實際佔地（學校 1.6 × 1.2、議會大樓 2.2 × 2.2…）
  school: 0.85, library: 0.6, hall: 0.7, market: 0.7, transit: 0.55, 'council-hall': 1.15, playground: 0.6, parking: 0.6, event: 0.55, port: 0.6, bridge: 0.6,
};
export const footprint = (element: string): number => FOOTPRINT[element] ?? 0.45;
export const MIN_GAP = 0.9;        // 兩個預設大小物件的間距；也是告示牌環的間距上界
export const CLUSTER_GAP = 2.2;    // 簇心最小距離
const GOLDEN = 2.39996;
const SPIRAL_STEP = 0.3;           // 螺旋候選點步距：要比 MIN_GAP 密，貪婪擺放才找得到空隙

/** 三格的版面公尺位移（y 朝北）：A 原位、B 西北、C 西南，格心距 √3·edge。 */
export function councilTileOffsetsM(edgeM: number): Array<[number, number]> {
  const d = Math.sqrt(3) * edgeM;
  return [[0, 0], [d * Math.cos((5 * Math.PI) / 6), d * Math.sin((5 * Math.PI) / 6)], [d * Math.cos((7 * Math.PI) / 6), d * Math.sin((7 * Math.PI) / 6)]];
}

/** 平頂六角形（外接半徑 r）內的點。 */
export function inHex(x: number, z: number, r: number): boolean {
  const ax = Math.abs(x), az = Math.abs(z), k = Math.sqrt(3);
  return az <= (k / 2) * r && k * ax + az <= k * r;
}

export interface Placed { id: number; element: string; topic: string | null; x: number; z: number; rot: number }

/**
 * 格內佈局：同 element 成簇（簇心取樣 + 黃金角螺旋），sign 沿人行道內側一圈；
 * 全部落在可用區六角形內、避開格心保留圓、彼此間距 ≥ MIN_GAP。council-hall 不在輸出裡。
 */
export interface LayoutItem { id: number; element: string; topic: string | null; hint?: [number, number] | null; edge?: [number, number] | null }

/**
 * `hint`：這一簇偏好的位置（相對格心，場景單位，例如貼文的地理重心），會被夾進可用區；沒有就隨機取簇心。
 * `edge`：直接放在這個位置（例如海灘環上的漁港），不受可用區限制，只保留間距。
 * `blocked`：地標（例如紅毛城）佔的圓，物件與簇心都不進去。
 */
/** 格內被地標佔走的圓（相對格心，場景單位）。 */
export interface Blocked { x: number; z: number; r: number }

export function layoutTile(posts: LayoutItem[], opts: { R: number; seed: number; reserve: number; blocked?: Blocked[] }): Placed[] {
  const usable = RING_R * opts.R - ROAD_W / 2 - WALK_W - 0.4;
  const rng = mulberry32(opts.seed);
  const out: Placed[] = [];
  const blocked = opts.blocked ?? [];
  const free = (x: number, z: number, r: number) => blocked.every((b) => Math.hypot(b.x - x, b.z - z) >= b.r + r);
  const ok = (el: string, x: number, z: number) => inHex(x, z, usable) && Math.hypot(x, z) >= opts.reserve && free(x, z, footprint(el)) && out.every((p) => Math.hypot(p.x - x, p.z - z) >= footprint(p.element) + footprint(el));
  const put = (p: LayoutItem, x: number, z: number) => out.push({ id: p.id, element: p.element, topic: p.topic, x, z, rot: Math.atan2(x, z) + (rng() - 0.5) * 0.6 });

  // 指定位置的（格邊，例如漁港）先放
  for (const p of posts) {
    if (!p.edge) continue;
    const [x, z] = p.edge;
    if (out.every((o) => Math.hypot(o.x - x, o.z - z) >= footprint(o.element) + footprint(p.element))) put(p, x, z);
  }
  const groups = new Map<string, LayoutItem[]>();
  for (const p of posts) if (p.element !== 'council-hall' && !p.edge) (groups.get(p.element) ?? groups.set(p.element, []).get(p.element)!).push(p);

  // 告示牌：沿半徑 usable − 0.45 的六角環等距排，多的併成一簇
  const signs = groups.get('sign') ?? [];
  groups.delete('sign');
  const ringR = usable - 0.45;
  const ringN = Math.min(signs.length, Math.floor((6 * ringR) / (2 * footprint('sign') + 0.1))); // 環上放得下幾支（周長 / 間距）
  for (let i = 0; i < ringN; i++) {
    const t = i / ringN, side = Math.floor(t * 6), f = t * 6 - side;
    const a0 = (side * Math.PI) / 3, a1 = ((side + 1) * Math.PI) / 3;
    const x = ringR * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f), z = -ringR * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f);
    if (ok('sign', x, z)) put(signs[i], x, z);
    else spiral([signs[i]], x, z);
  }
  if (signs.length > ringN) groups.set('sign', signs.slice(ringN));

  // 其他：每組一個簇心，組內黃金角螺旋
  const centers: Array<[number, number]> = [];
  for (const [, list] of groups) {
    let cx = 0, cz = 0;
    const hint = list.find((q) => q.hint)?.hint;
    if (hint) {
      // 提示位置夾進可用區：半徑在 [reserve + 1, usable − 1] 之間、方向照提示
      const len = Math.hypot(hint[0], hint[1]) || 1, r = Math.min(usable - 1.0, Math.max(opts.reserve + 1.0, len));
      cx = (hint[0] / len) * r; cz = (hint[1] / len) * r;
      if (!inHex(cx, cz, usable - 1.0)) { const k = ((usable - 1.0) * 0.8) / Math.hypot(cx, cz); cx *= k; cz *= k; }
      // 提示落在地標裡：沿「地標心 → 提示」方向推到地標外
      for (const b of blocked) { const dx = cx - b.x, dz = cz - b.z, d = Math.hypot(dx, dz) || 1; if (d < b.r + 0.5) { cx = b.x + (dx / d) * (b.r + 0.5); cz = b.z + (dz / d) * (b.r + 0.5); } }
      centers.push([cx, cz]); spiral(list, cx, cz); continue;
    }
    for (let a = 0; a < 400; a++) {
      const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * (usable - 1.0);
      cx = rad * Math.cos(ang); cz = rad * Math.sin(ang);
      if (rad < opts.reserve + 1.0 || !inHex(cx, cz, usable - 1.0) || !free(cx, cz, 0.5)) continue;
      if (centers.every(([px, pz]) => Math.hypot(px - cx, pz - cz) >= CLUSTER_GAP)) break;
    }
    centers.push([cx, cz]);
    spiral(list, cx, cz);
  }
  return out;

  function spiral(list: LayoutItem[], cx: number, cz: number): void {
    let k = 0;
    for (const p of list) {
      const kMax = ((2 * usable) / SPIRAL_STEP) ** 2;
      for (; k < kMax; k++) {
        const r = SPIRAL_STEP * Math.sqrt(k), a = k * GOLDEN;
        const x = cx + r * Math.cos(a), z = cz + r * Math.sin(a);
        if (ok(p.element, x, z)) { put(p, x, z); k++; break; }
      }
    }
  }
}

/** 把一格的貼文擺上去；isMain 時格心先放議會大樓（count = 質詢篇數、圓頂固定議會色）。回傳擺上的物件數。 */
export function placeCouncilTile(tile: HexColumn, R: number, posts: CouncilTile['posts'], seed: number, isMain: boolean): number {
  const topY = tile.userData.topY;
  let n = 0;
  if (isMain) {
    const hallPosts = posts.filter((p) => p.element === 'council-hall').length;
    const hall = elementFor('council-hall').build({ color: new THREE.Color(PAL.council), rng: mulberry32(seed), count: Math.max(1, hallPosts) });
    hall.position.set(0, topY, 0);
    tile.add(hall); n++;
  }
  for (const p of layoutTile(posts, { R, seed, reserve: isMain ? 1.7 : 0.8 })) {
    const o = elementFor(p.element).build({ color: topicColor(p.topic), rng: mulberry32(seed * 7919 + p.id), count: 1 });
    o.position.set(p.x, topY, p.z); o.rotation.y = p.rot;
    tile.add(o); n++;
  }
  return n;
}

export interface SceneItem { id: number; element: string; topic: string | null; count: number }
export interface ScenePlaced extends SceneItem { x: number; z: number; rot: number; main: boolean }
export const STREET_OFF = 1.4;   // 配角離主街中心線
export const STREET_W = 0.9;

/**
 * 場景佈局（參考政策島）：主物件（council-hall，否則篇數最多的）在格心面向主街；
 * 其餘沿主街兩側交錯排、面向主街；排不下的繞廣場後側面向格心。告示牌排最後。
 * streetDir：主街從格心指向門的方向（單位向量，局部座標 x/z）。
 */
export function layoutScene(items: SceneItem[], opts: { R: number; streetDir: [number, number]; reserve: number; seed: number }): ScenePlaced[] {
  const usable = RING_R * opts.R - ROAD_W / 2 - WALK_W - 0.4;
  const apothem = RING_R * opts.R * Math.cos(Math.PI / 6); // 門到格心
  const [sx, sz] = opts.streetDir, px = -sz, pz = sx; // 街的左側法線
  const rng = mulberry32(opts.seed);
  const out: ScenePlaced[] = [];
  const faceDir = (dx: number, dz: number) => Math.atan2(dx, dz); // 元素 +z 轉到 (dx, dz)
  const ok = (el: string, x: number, z: number) => out.every((o) => Math.hypot(o.x - x, o.z - z) >= footprint(o.element) + footprint(el));

  const main = items.find((i) => i.element === 'council-hall') ?? [...items].sort((a, b) => b.count - a.count)[0];
  if (!main) return out;
  out.push({ ...main, x: 0, z: 0, rot: faceDir(sx, sz), main: true });

  const rest = items.filter((i) => i !== main).sort((a, b) => (a.element === 'sign' ? 1 : 0) - (b.element === 'sign' ? 1 : 0) || b.count - a.count);
  // 沿主街：從廣場邊往門排，左右交錯
  let along = [opts.reserve + 0.35, opts.reserve + 0.35];
  const endAt = usable * Math.cos(Math.PI / 6) - 0.1; // 門的方向上可用區的邊（邊心距），環道內側人行道邊
  const back: SceneItem[] = [];
  rest.forEach((it, i) => {
    const side = i % 2 === 0 ? 1 : -1, k = i % 2;
    const d = along[k] + footprint(it.element);
    const x = sx * d + px * STREET_OFF * side, z = sz * d + pz * STREET_OFF * side;
    if (d + footprint(it.element) <= endAt && inHex(x, z, usable) && ok(it.element, x, z)) {
      out.push({ ...it, x, z, rot: faceDir(-px * side, -pz * side), main: false });
      along[k] = d + footprint(it.element) + 0.2;
    } else back.push(it);
  });
  // 廣場後側：背對主街那半圈，面向格心
  const r = opts.reserve + 0.9;
  back.forEach((it, i) => {
    const n = back.length, a0 = Math.atan2(-sz, -sx); // 背對主街的方向角
    const spread = Math.PI * 0.9, a = a0 + (n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1)) + (rng() - 0.5) * 0.05;
    let x = r * Math.cos(a), z = r * Math.sin(a), rr = r;
    while (!ok(it.element, x, z) && rr < usable) { rr += 0.3; x = rr * Math.cos(a); z = rr * Math.sin(a); }
    out.push({ ...it, x, z, rot: faceDir(-x, -z), main: false });
  });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 分級 + 固定槽位版面（spec：2026-11-24-slot-layout-design.md）。取代 layoutTile / layoutScene。
// ═══════════════════════════════════════════════════════════════════════════════

export type Tier = 'L' | 'M' | 'S';
interface TierDef { elements: string[]; maxScale: number; k: number }
const TIERS = tiersJson as unknown as Record<Tier, TierDef> & { _comment?: string };
const TIER_OF = new Map<string, Tier>();
for (const t of ['L', 'M', 'S'] as Tier[]) for (const e of TIERS[t].elements) TIER_OF.set(e, t);

/** 元素等級；不在表裡的當 M。 */
export const tierOf = (element: string): Tier => TIER_OF.get(element) ?? 'M';
/** 政績物件整體放大倍率（橋除外）：使用者要求再大 50%。佔地用同一個倍率，間距才對得上。 */
export const OBJECT_SCALE = 1.5;
/** 依篇數放大，每級有自己的上限：1 + k·log2(篇數)，封頂 maxScale，再乘整體倍率。 */
export function tierScale(element: string, count: number): number {
  const t = TIERS[tierOf(element)];
  return Math.min(t.maxScale, 1 + t.k * Math.log2(Math.max(1, count))) * (element === 'bridge' ? 1 : OBJECT_SCALE);
}
/** 可用區外接半徑：環道內側人行道再往內一點。 */
export const usableRadius = (R: number) => RING_R * R - ROAD_W / 2 - WALK_W - 0.4;

export interface SlotItem { id: number; element: string; topic: string | null; count: number; hint?: [number, number] | null; edge?: [number, number] | null }
export type SlotKind = 'center' | 'sector' | 'ring' | 'edge';
export interface SlotPlaced { id: number; element: string; topic: string | null; count: number; x: number; z: number; rot: number; scale: number; tier: Tier; slot: SlotKind }
export interface SlotOpts { R: number; seed: number; reserve: number; blocked?: Blocked[]; streetDir?: [number, number] | null; mainId?: number }

const SECTOR_AT = 0.72;   // 扇區位置 × U（建築大，往外一點才不會擠在一起）
const PAIR_OFF = 0.55;    // 一個扇區放兩個 S 時沿切線的偏移
const RING_IN = 0.45;     // 外圈 = U − RING_IN
const GAP_K = 0.9;        // 間距容許：佔地和的 0.9 倍（物件放大 1.5 後格內很擠，允許邊緣微微交疊）
const JITTER = (5 * Math.PI) / 180;
const CENTER_RESERVE_MAX = 1.0; // reserve 超過這個值（山丘、議會大樓廣場）就視為中心不可用；釘住的主物件不受限

/**
 * 槽位版面：1 個中心 + 6 個扇區（對六條邊，模板依 seed 轉 60° 的倍數）+ 外圈（告示牌、溢出的 S）+ 格邊（海側）。
 * 擺放順序：edge → L（唯一的放中心；兩個以上放相對扇區）→ 沒有 L 時最大的 M 放中心 → 其餘 M、S 挑 offset 最近的空扇區
 * → S 可成對 → 外圈 → 放不下記 unplaced。朝向：主角面向主街／offset，配角面向主角，±5° 抖動。
 */
export function layoutSlots(items: SlotItem[], opts: SlotOpts): { placed: SlotPlaced[]; unplaced: number[] } {
  const U = usableRadius(opts.R), rng = mulberry32(opts.seed), blocked = opts.blocked ?? [];
  const placed: SlotPlaced[] = [], unplaced: number[] = [];
  const fpOf = (it: SlotItem) => footprint(it.element) * tierScale(it.element, it.count);
  const rot0 = (opts.seed % 6) * (Math.PI / 3);
  const sectorAng = (k: number) => Math.PI / 6 + (k * Math.PI) / 3 + rot0; // 邊中點方向（地理角，z 朝 −sin）
  const dir = (a: number): [number, number] => [Math.cos(a), -Math.sin(a)];
  // 扇區半徑：一般 0.62U；山丘格 reserve 大時往外推，但不超過邊心距
  // 邊心距那側允許佔地稍微壓到人行道（路面預設不畫），所以只扣 0.6 倍佔地
  const sectorR = (fp: number) => Math.min(U * Math.cos(Math.PI / 6) - 0.6 * fp, Math.max(SECTOR_AT * U, opts.reserve + fp));

  const clearOf = (x: number, z: number, fp: number) =>
    blocked.every((b) => Math.hypot(b.x - x, b.z - z) >= b.r + fp) && placed.every((p) => Math.hypot(p.x - x, p.z - z) >= (fpOf(p) + fp) * GAP_K);
  const inside = (x: number, z: number, _fp: number) => inHex(x, z, U) && Math.hypot(x, z) >= opts.reserve - 1e-9;
  const centerFree = (fp: number, pinned = false) => (pinned || opts.reserve <= CENTER_RESERVE_MAX) && clearOf(0, 0, fp);

  const sectorUsed = new Map<number, SlotPlaced[]>(); // k → 已放的物件
  const sectorPos = (k: number, fp: number): [number, number] => { const [dx, dz] = dir(sectorAng(k)), r = sectorR(fp); return [dx * r, dz * r]; };
  // 扇區半徑已經照 reserve 往外推過，所以這裡只檢查在可用區內與淨空（山丘格的扇區可能貼著山腳）
  const sectorOk = (k: number, fp: number) => { const [x, z] = sectorPos(k, fp); return inHex(x, z, U) && clearOf(x, z, fp); };
  const angOf = (h: [number, number]) => Math.atan2(-h[1], h[0]);
  const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  /** 依 offset 由近到遠排序的扇區編號（沒有 offset 就模板順序）。 */
  const order = (hint: [number, number] | null | undefined) => {
    const ks = [0, 1, 2, 3, 4, 5];
    if (!hint || (hint[0] === 0 && hint[1] === 0)) return ks;
    const a = angOf(hint);
    return ks.sort((p, q) => angDiff(sectorAng(p), a) - angDiff(sectorAng(q), a));
  };

  const put = (it: SlotItem, x: number, z: number, slot: SlotKind, k?: number): SlotPlaced => {
    const p: SlotPlaced = { id: it.id, element: it.element, topic: it.topic, count: it.count, x, z, rot: 0, scale: tierScale(it.element, it.count), tier: tierOf(it.element), slot };
    placed.push(p);
    if (k !== undefined) (sectorUsed.get(k) ?? sectorUsed.set(k, []).get(k)!).push(p);
    return p;
  };

  // 1) 海側 edge 先放
  for (const it of items) if (it.edge) put(it, it.edge[0], it.edge[1], 'edge');
  const rest = items.filter((it) => !it.edge);
  const byCount = (a: SlotItem, b: SlotItem) => b.count - a.count || a.id - b.id;
  const Ls = rest.filter((it) => tierOf(it.element) === 'L').sort(byCount);
  const Ms = rest.filter((it) => tierOf(it.element) === 'M').sort(byCount);
  const Ss = rest.filter((it) => tierOf(it.element) === 'S' && it.element !== 'sign').sort(byCount);
  const signs = rest.filter((it) => it.element === 'sign');

  let main: SlotPlaced | null = null;
  const tryCenter = (it: SlotItem, pinned = false) => { const fp = fpOf(it); if (!centerFree(fp, pinned)) return null; return put(it, 0, 0, 'center'); };
  const trySector = (it: SlotItem, ks: number[]) => { const fp = fpOf(it); for (const k of ks) if (!sectorUsed.has(k) && sectorOk(k, fp)) { const [x, z] = sectorPos(k, fp); return put(it, x, z, 'sector', k); } return null; };
  const tryPair = (it: SlotItem, ks: number[]) => {
    const fp = fpOf(it);
    for (const k of ks) {
      const used = sectorUsed.get(k);
      if (!used || used.length !== 1 || used[0].tier !== 'S') continue;
      const a = sectorAng(k), [tx, tz] = [-Math.sin(a), -Math.cos(a)]; // 切線
      const first = used[0], r = Math.hypot(first.x, first.z);
      for (const sgn of [1, -1]) {
        const x = first.x + tx * PAIR_OFF * 2 * sgn, z = first.z + tz * PAIR_OFF * 2 * sgn;
        if (inside(x, z, fp) && clearOf(x, z, fp) && Math.hypot(x, z) >= opts.reserve) return put(it, x, z, 'sector', k);
      }
      void r;
    }
    return null;
  };
  let ringN = 0;
  const tryRing = (it: SlotItem, hint: [number, number] | null | undefined) => {
    const fp = fpOf(it);
    const a0 = hint && (hint[0] || hint[1]) ? angOf(hint) : rot0 + ringN * 2.39996;
    // 先外圈、再往內一圈（U − 1.3），各試 24 個角度
    for (let j = 0; j < 48; j++) {
      const r = U - RING_IN - (j >= 24 ? 0.85 : 0);
      const a = a0 + (j % 2 ? 1 : -1) * Math.ceil((j % 24) / 2) * (Math.PI / 12);
      // 六角環（外接半徑 r、平頂）上的點：方向 a 到邊的距離 = r·cos30° / cos(a 相對最近邊法線的夾角)
      const b = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
      const edgeR = (r * Math.cos(Math.PI / 6)) / Math.cos(b - Math.PI / 6);
      const x = Math.cos(a) * edgeR, z = -Math.sin(a) * edgeR;
      if (Math.hypot(x, z) >= opts.reserve && clearOf(x, z, fp) && inHex(x, z, U)) { ringN++; return put(it, x, z, 'ring'); }
    }
    return null;
  };

  // 外圈也滿：退到海灘環（環道外側、格邊往內一點），只檢查淨空，面向格心。寧可站在岸邊也不要消失（側欄要點得到）
  const tryBeach = (it: SlotItem, hint: [number, number] | null | undefined) => {
    const fp = fpOf(it), r = (Math.cos(Math.PI / 6) - 0.06) * opts.R;
    const a0 = hint && (hint[0] || hint[1]) ? angOf(hint) : rot0 + ringN * 2.39996;
    for (let j = 0; j < 24; j++) {
      const a = a0 + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * (Math.PI / 12);
      const b = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
      const edgeR = (r * Math.cos(Math.PI / 6)) / Math.cos(b - Math.PI / 6);
      const x = Math.cos(a) * edgeR, z = -Math.sin(a) * edgeR;
      if (clearOf(x, z, fp)) { ringN++; return put(it, x, z, 'edge'); }
    }
    return null;
  };

  // 2) L
  const pinned = opts.mainId !== undefined ? rest.find((it) => it.id === opts.mainId) : undefined;
  if (pinned) main = tryCenter(pinned, true) ?? trySector(pinned, order(pinned.hint)) ?? main;
  const Lrest = Ls.filter((it) => it !== pinned);
  if (Lrest.length === 1 && !pinned) {
    const it = Lrest[0];
    main = tryCenter(it) ?? trySector(it, order(it.hint));
    if (!main) unplaced.push(it.id);
  } else if (Lrest.length >= 1) {
    const first = trySector(Lrest[0], order(Lrest[0].hint));
    if (first) { main = main ?? first; } else unplaced.push(Lrest[0].id);
    const k1 = first ? [...sectorUsed.entries()].find(([, v]) => v.includes(first))![0] : -1;
    Lrest.slice(1).forEach((it, i) => {
      const ks = i === 0 && k1 >= 0 ? [(k1 + 3) % 6, ...order(it.hint)] : order(it.hint);
      if (!trySector(it, ks)) unplaced.push(it.id);
    });
  }
  // 3) 沒有 L：最大的 M 放中心
  if (!main && Ms.length) { const m = tryCenter(Ms[0]); if (m) { main = m; Ms.shift(); } }
  // 4) 其餘 M、S
  for (const it of [...Ms, ...Ss].sort(byCount)) {
    const ks = order(it.hint);
    const p = trySector(it, ks) ?? (tierOf(it.element) === 'S' ? tryPair(it, ks) : null) ?? tryRing(it, it.hint) ?? tryBeach(it, it.hint);
    if (!p) unplaced.push(it.id); else if (!main) main = p;
  }
  // 5) 告示牌上外圈
  for (const it of signs) if (!tryRing(it, it.hint) && !tryBeach(it, it.hint)) unplaced.push(it.id);

  // 朝向：主角面向主街／offset／扇區 0；配角面向主角；海側面朝外；再加 ±5° 抖動
  const faceTo = (dx: number, dz: number) => Math.atan2(dx, dz);
  for (const p of placed) {
    const jitter = (rng() - 0.5) * 2 * JITTER;
    if (p.slot === 'edge') { p.rot = faceTo(p.x, p.z); continue; }
    if (p === main) {
      const it = items.find((i) => i.id === p.id)!;
      const d = opts.streetDir ?? (it.hint && (it.hint[0] || it.hint[1]) ? it.hint : null) ?? dir(sectorAng(0));
      p.rot = faceTo(d[0], d[1]) + jitter;
    } else if (main) p.rot = faceTo(main.x - p.x, main.z - p.z) + jitter;
    else p.rot = faceTo(-p.x, -p.z) + jitter;
  }
  return { placed, unplaced };
}
