// 分組物件：data/groups.json 的每一組 = 島上一個物件（島 × 元素），點了在側欄看該組政績。
// 擺放沿用議會的 layoutTile（同元素成簇、告示牌沿環）；每組只有一個，所以每簇就是一個物件。
import * as THREE from 'three';
import groupsJson from '../../data/groups.json';
import { byId, elementFor } from './elements';
import { mulberry32, type HexColumn } from './hex';
import { PAL, topicColor, TOPIC } from './palette';
import { layoutSlots, tierScale, type Blocked } from './place';

export interface GroupPost { id: number; date: string; title: string; excerpt: string; link: string; topic: string }
export interface Group {
  key: string; island: string; element: string; cell: string; count: number;
  colorTopic: string | null; topics: Record<string, number>; from: string; to: string;
  offset?: [number, number] | null; // 貼文地理重心相對格心（場景單位），擺放的方向提示
  posts: GroupPost[];
}

export const GROUPS = (groupsJson as unknown as { groups: Group[] }).groups;
export const TOPIC_BUCKETS = (groupsJson as unknown as { topics: string[] }).topics;
export const GROUP_BY_KEY = new Map(GROUPS.map((g) => [g.key, g]));

/** 側欄議題篩選四類的顏色（沿用元素的 topic 色）。 */
export const BUCKET_COLOR: Record<string, string> = {
  交通: '#' + TOPIC['交通'].toString(16).padStart(6, '0'),
  民生: '#' + TOPIC['民生'].toString(16).padStart(6, '0'),
  教育與校園: '#' + TOPIC['校園'].toString(16).padStart(6, '0'),
  其他: '#' + TOPIC['null'].toString(16).padStart(6, '0'),
};

/** 類型中文名；告示牌在側欄叫「其他政績」。 */
export function elementLabel(element: string): string {
  if (element === 'sign') return '其他政績';
  return byId.get(element)?.label ?? element;
}
export const groupTitle = (g: Group) => `${g.island} · ${elementLabel(g.element)}`;

/** 篇數 → 物件縮放：對數、上限 1.8（1 篇 = 1、8 篇 ≈ 1.75）。 */
export const groupScale = (count: number) => Math.min(1.8, 1 + 0.25 * Math.log2(Math.max(1, count))); // 舊式（未分級）；擺放改用 tierScale

/**
 * 把一格的組擺上去，回傳每組的「holder」（userData.groupKey、userData.proxy = 點選判定用的隱形圓柱）。
 * isMain：議會主格，議會大樓固定放格心。reserve：格心保留圓半徑（有山丘的格要大）。blocked：地標佔的圓。
 */
/** 靠海的元素：放在海灘環上、朝沒有鄰格的那一邊。 */
const SEASIDE = new Set(['port', 'bridge']);
const BEACH_AT = Math.cos(Math.PI / 6) - 0.05; // × R：海灘環邊往內一點
const BEACH_Y = 1.85;

/** 光柱貼圖：底亮、往上漸透明（遊戲升級那種由下往上的光）。 */
let _beamTex: THREE.CanvasTexture | null = null;
function beamTexture(): THREE.CanvasTexture {
  if (_beamTex) return _beamTex;
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const grd = ctx.createLinearGradient(0, 128, 0, 0);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 16, 128);
  _beamTex = new THREE.CanvasTexture(cv);
  return _beamTex;
}
const beamMat = () => new THREE.MeshBasicMaterial({ map: beamTexture(), color: 0xffe6a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** 建一組「升級光柱」：底盤 + 光柱 + 兩個往上飄的光環，初始全透明。 */
function buildBeam(): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), beamMat()); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.name = 'disc';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 2.6, 16, 1, true), beamMat()); beam.position.y = 1.3; beam.name = 'beam';
  const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 6, 24);
  for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(ringGeo, beamMat()); r.rotation.x = Math.PI / 2; r.name = 'ring' + i; g.add(r); }
  g.add(disc, beam);
  g.renderOrder = 2;
  return g;
}

export const BEAM_PERIOD = 2.6; // 每幾秒換一個物件發光
/**
 * 每幀：一次只有一個物件發光，依時間段隨機輪流（決定性亂數）。
 * 一段內：光柱從底部升起、亮起再淡出；兩個光環由下往上飄。
 */
export function updateGlows(holders: THREE.Group[], t: number): void {
  if (!holders.length) return;
  const slot = Math.floor(t / BEAM_PERIOD), u = (t - slot * BEAM_PERIOD) / BEAM_PERIOD;
  const pick = Math.floor(mulberry32(slot * 7 + 3)() * holders.length);
  const amp = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.5; // 升起、亮、淡出
  for (let i = 0; i < holders.length; i++) {
    const b = holders[i].userData.beam as THREE.Group | undefined; if (!b) continue;
    const on = i === pick, s = 1 / holders[i].scale.x; // 光柱不跟物件一起放大
    b.scale.setScalar(s);
    for (const c of b.children) {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (!on) { m.opacity = 0; continue; }
      if (c.name === 'disc') m.opacity = 0.6 * amp;
      else if (c.name === 'beam') { m.opacity = 0.75 * amp; c.scale.y = 0.4 + 0.6 * Math.min(1, u * 1.6); c.position.y = 1.3 * c.scale.y; }
      else { const k = c.name === 'ring0' ? u : (u + 0.5) % 1; c.position.y = 0.1 + 2.6 * k; m.opacity = amp * (1 - k) * 0.9; c.scale.setScalar(1 - 0.35 * k); }
    }
  }
}

export function placeGroups(tile: HexColumn, R: number, groups: Group[], seed: number, opts: { isMain?: boolean; reserve?: number; seaDirs?: THREE.Vector3[]; blocked?: Blocked[]; scene?: { streetDir: [number, number] } } = {}): THREE.Group[] {
  const topY = tile.userData.topY;
  const holders: THREE.Group[] = [];
  const make = (g: Group, x: number, z: number, rot: number) => {
    const color = g.element === 'council-hall' ? new THREE.Color(PAL.council) : topicColor(g.colorTopic);
    const obj = elementFor(g.element).build({ color, rng: mulberry32(seed * 7919 + g.count), count: g.count });
    obj.rotation.y = rot;
    const s = groupScale(g.count);
    const holder = new THREE.Group();
    holder.add(obj);
    holder.scale.setScalar(s);
    holder.position.set(x, topY, z);
    // 點選判定：比外觀大一圈的隱形圓柱（手機上小物件也點得到）
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 12), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.y = 0.9;
    holder.add(proxy);
    // 升級光柱：有政績的物件腳下由下往上的光，一次只有一個物件亮、隨機輪流（updateGlows 每幀更新）
    const beam = buildBeam();
    holder.add(beam);
    holder.userData = { groupKey: g.key, proxy, baseY: topY, beam };
    tile.add(holder);
    holders.push(holder);
  };

  // 分級 + 固定槽位（spec：slot-layout）：海側先放、L 中心／相對扇區、M/S 挑 offset 最近的扇區、告示牌外圈
  const seaDirs = opts.seaDirs ?? [];
  const items = groups.map((g, i) => {
    const hint = g.offset ?? null;
    let edge: [number, number] | null = null;
    if (SEASIDE.has(g.element) && seaDirs.length) {
      const pick = hint ? [...seaDirs].sort((a, b) => (b.x * hint[0] + b.z * hint[1]) - (a.x * hint[0] + a.z * hint[1]))[0] : seaDirs[0];
      edge = [pick.x * BEACH_AT * R, pick.z * BEACH_AT * R];
    }
    return { id: i, element: g.element, topic: g.colorTopic, count: g.count, hint, edge };
  });
  const mainId = opts.isMain ? groups.findIndex((g) => g.element === 'council-hall') : -1;
  const { placed, unplaced } = layoutSlots(items, { R, seed, reserve: opts.reserve ?? 0.8, blocked: opts.blocked, streetDir: opts.scene?.streetDir ?? null, mainId: mainId >= 0 ? mainId : undefined });
  if (unplaced.length) console.warn('格上放不下的組', unplaced.map((i) => groups[i].key));
  for (const p of placed) {
    make(groups[p.id], p.x, p.z, p.rot);
    const h = holders[holders.length - 1];
    h.scale.setScalar(tierScale(p.element, p.count));
    if (p.slot === 'edge') h.position.y = BEACH_Y;
  }
  return holders;
}
