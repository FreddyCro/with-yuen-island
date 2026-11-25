// 北海岸政績島：六角柱 + 淡水河 + 兩座橋 + 議會（三格）。政績依「島 × 類型」分組，每組一個物件，點了在側欄看政績。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import layoutJson from '../data/layout.json';
import cellsJson from '../data/cells.json';
import type { Layout } from './types';
import { hexColumn, tree, hill, hillHeight, shade, mulberry32, TOP_H, type HexColumn } from './scene/hex';
import { buildBridge } from './scene/bridges';
import { buildRoads } from './scene/roads';
import { PAL, applyPalette } from './scene/palette';
import { councilTileOffsetsM } from './scene/place';
import { GROUPS, placeGroups, type Group, updateGlows } from './scene/groups';
import { setupInteraction } from './interact';
import { HARBOURS, buildHarbour, BEACH_Y } from './scene/harbours';
import { LANDMARKS, landmarkBlocked, placeLandmark } from './scene/landmarks';
import { buildRoute, routeState } from './scene/ferry-route';
import { lakeWater, lakeWanderer } from './scene/lake-wander';
import { buildFerry } from './scene/mascot/ferry';
import { buildCampaignTruck } from './scene/mascot/campaign-truck';
import { CITIZEN_TYPES, CITIZEN_PLAN, CITIZEN_PAL, type Citizen } from './scene/citizens';
import { ANIMAL_TYPES, stroll, type Animal, type Stroll } from './scene/animals';
import { roadsideOffset, ANIMAL_SIDE } from './scene/animals/roadside';
import { buildRoadGraph, roadWalker, sidewalkWalk } from './scene/traffic';
import { gateDir, vertexOf } from './scene/roads';
import { buildStreet } from './scene/streets';
import { buildClouds } from './scene/clouds';
import { buildLamps } from './scene/lamps';
import { decorateTile } from './scene/flora';
import { buildCrater, LAKE_R, setLake, setGap, lakeLocal, LAKE, terrainHeight } from './scene/crater';
import { applySunset, sunsetSunPosition } from './scene/sunset';

const layout = layoutJson as unknown as Layout;
// 標籤上的篇數用落格後的實際數字（哪些貼文真的在這座島上），不是 WordPress 分類的篇數
for (const d of layout.districts) d.posts = (cellsJson.byDistrict as Record<string, number>)[d.name] ?? d.posts;
layout.council.posts = cellsJson.council;
const query = new URLSearchParams(location.search);
applyPalette(query.get('palette'), layout);

// ── 比例：1 場景單位 = 500 m ──
const M = 1 / 500;
const R = layout.edgeM * M;
const DIST = Object.fromEntries(layout.districts.map((d) => [d.name, d]));
const $ = (id: string) => document.getElementById(id)!;

// ── renderer / scene / camera ──
const app = $('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
Object.assign(labels.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
app.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.sea);
scene.fog = new THREE.Fog(PAL.sea, 150, 380); // 火山口山稜在 110–190
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47; // 可以壓到接近水平（85°），看得到地平線上的夕陽；鏡頭不鑽進山壁由每幀的地形保險負責
controls.minDistance = 40;
controls.maxDistance = 125; // 最遠大約看到整個湖，不用看到山外
controls.enablePan = true; controls.screenSpacePanning = false; controls.panSpeed = 0.8; // 右鍵／雙指可以平移（貼著地面），才看得到議會

// 場景中心 = 所有格的平均；y 朝北 → -z
const cx = (layout.cells.reduce((a, c) => a + c.x, 0) / layout.cells.length) * M;
const cy = (layout.cells.reduce((a, c) => a + c.y, 0) / layout.cells.length) * M;
const P = (x: number, y: number) => new THREE.Vector3(x * M - cx, 0, -(y * M - cy));

// ── 光 ──
const hemi = new THREE.HemisphereLight(0xffffff, 0x9fc0c8, 0.9);
const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 300 });
scene.add(hemi, sun);

// ── 海 ──
const seaMat = new THREE.MeshStandardMaterial({ color: PAL.sea, roughness: 0.6 });
const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 64), seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.05;
sea.receiveShadow = true;
scene.add(sea);


// ── 格 ──
// 具名的山（地標名以「山」結尾）畫在地標位置；真實海拔：觀音山 616 m、大屯山 1092 m
const MOUNTAIN_ELE: Record<string, number> = { 觀音山: 616, 大屯山: 1092 };
const mountains = layout.places.filter((p) => p.name.endsWith('山'));
const guanduCell = layout.bridges.find((b) => b.name.startsWith('關渡'))!.from.join(',');
const nearestCell = (x: number, y: number) => [...layout.cells].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
const byKey = new Map<string, HexColumn>();
for (const c of layout.cells) {
  const g = hexColumn(R, P(c.x, c.y), shade(DIST[c.district].color, c.ele), TOP_H, c.q * 31 + c.r * 17 + 101);
  scene.add(g);
  byKey.set(`${c.q},${c.r}`, g);
  if (c.ele > 150) {
    const rng = mulberry32(c.q * 73 + c.r * 131 + 7);
    const n = 6 + Math.floor(c.ele / 60);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * R * 0.7;
      const tr = tree(rad * Math.cos(ang), g.userData.topY, -rad * Math.sin(ang), 0.7 + rng() * 0.9, rng());
      tr.userData.tree = true; // 擺政績物件時，擋路的樹會被拿掉
      g.add(tr);
    }
    const named = mountains.some((p) => mountainCellKey(p) === `${c.q},${c.r}`);
    if (c.ele > 200 && !named) g.add(hill(R, g.userData.topY, c.ele));
  }
}
function mountainCellKey(p: { name: string; x: number; y: number }): string {
  if (p.name === '觀音山') return guanduCell; // 觀音山在關渡大橋八里端那格
  const c = nearestCell(p.x, p.y); return `${c.q},${c.r}`;
}
for (const p of mountains) {
  const g = byKey.get(mountainCellKey(p))!;
  g.add(hill(R, g.userData.topY, MOUNTAIN_ELE[p.name] ?? 500));
  const rng = mulberry32(p.name.length * 977 + 7);
  for (let i = 0; i < 10; i++) { const ang = rng() * Math.PI * 2, rad = R * (0.5 + rng() * 0.22); const tr = tree(rad * Math.cos(ang), g.userData.topY, rad * Math.sin(ang), 0.6 + rng() * 0.7, rng()); tr.userData.tree = true; g.add(tr); }
}

// ── 議會：兩格（A 大樓 + 政務 + 告示牌、碼頭在 A；B 民生），B 在 A 的西北 ──
const COUNCIL_KEYS = ['council', 'council-1'];
councilTileOffsetsM(layout.edgeM).slice(0, 2).forEach(([dx, dy], i) => {
  const g = hexColumn(R, P(layout.council.x + dx, layout.council.y + dy), new THREE.Color(PAL.council), TOP_H, 7 + i);
  scene.add(g);
  byKey.set(COUNCIL_KEYS[i], g);
});

// ── 標籤 ──
// 行政區標籤放在同區格子的交接處（兩圈環道相接的地方）：物件只放在環道內側的頂面，交接處本來就空著。
for (const d of layout.districts) {
  const keys = layout.cells.filter((c) => c.district === d.name).map((c) => `${c.q},${c.r}`);
  addLabel(junctionSpot(keys), d.name, d.posts);
}
addLabel(junctionSpot(COUNCIL_KEYS.filter((k) => byKey.has(k))), layout.council.name, layout.council.posts);
for (const p of layout.places) {
  const o = new THREE.Object3D(); o.position.copy(P(p.x, p.y)); o.position.y = TOP_H + 1.2;
  const el = document.createElement('div'); el.className = 'label small place'; el.textContent = p.name;
  o.add(new CSS2DObject(el));
  scene.add(o);
}

// ── 地標（紅毛城…）：不是政績物件，?elements=0 也在；佔的圓政績物件不進去 ──
for (const l of LANDMARKS) placeLandmark(byKey.get(l.key)!, R, l);

// ── 火山口湖：整座島坐在湖裡，四周一圈綠色山稜與樹（參考政策島）──
// 湖的中心 = 所有格（含議會）外框的中心；長軸 = 格分布的主軸（PCA）；長短軸比照外框；湖岸半徑 = 長軸半長 × 1.3
{
  const pts = [...byKey.values()].map((g) => [g.position.x, g.position.z] as [number, number]);
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, mz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of pts) { sxx += (x - mx) ** 2; szz += (z - mz) ** 2; sxz += (x - mx) * (z - mz); }
  const angle = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  const ca = Math.cos(-angle), sa = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of pts) { const u = (x - mx) * ca - (z - mz) * sa, v = (x - mx) * sa + (z - mz) * ca; minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  const halfU = (maxU - minU) / 2 + R, halfV = (maxV - minV) / 2 + R;
  // 外框中心轉回世界座標
  const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
  const cx = mx + cu * Math.cos(angle) - cv * Math.sin(angle), cz = mz + cu * Math.sin(angle) + cv * Math.cos(angle);
  // 島四周留兩格寬（2·√3·R）的水面，再加半格當岸邊
  const gap = 2 * Math.sqrt(3) * R + R * 0.5;
  setLake(cx, cz, angle, Math.max(0.55, Math.min(1, (halfV + gap) / (halfU + gap))), (halfU + gap) / LAKE_R);
  // 山稜朝夕陽方向開低窪：太陽方向 = 淡江大橋中點 → 議會（和 sunset.ts 同一條線）
  {
    const tj = layout.bridges.find((b) => b.name.startsWith('淡江'))!;
    const mid = byKey.get(tj.from.join(','))!.position.clone().add(byKey.get(tj.to.join(','))!.position).multiplyScalar(0.5);
    const d = byKey.get('council')!.position.clone().sub(mid).setY(0).normalize();
    setGap(lakeLocal(cx + d.x * 100, cz + d.z * 100).a);
  }
  scene.add(buildCrater());
}

// ── 路網（環道 + 人行道 + 連接路）──
const roads = buildRoads(scene, R, byKey, query.has('roads'));

// ── 路燈：每條格間連接路旁一盞，微微發光 ──
const lamps = buildLamps(roads);
scene.add(lamps.object);

// ── 政績物件：每組（島 × 元素）一個，依 data/groups.json 的 cell 擺；點了開側欄（?elements=0 可關）──
// 見 docs/superpowers/specs/2026-11-24-groups-sidebar-design.md。原本議會一篇一個（placeCouncilTile）已停用。
const holders: THREE.Group[] = [];
if (query.get('elements') !== '0') {
  const byCell = new Map<string, Group[]>();
  for (const g of GROUPS) (byCell.get(g.cell) ?? byCell.set(g.cell, []).get(g.cell)!).push(g);
  // 有山丘的格（格心有錐體）：格心保留大一點
  const hillCells = new Set(layout.cells.filter((c) => c.ele > 200).map((c) => `${c.q},${c.r}`));
  for (const p of mountains) hillCells.add(mountainCellKey(p));
  let i = 0;
  for (const [cell, list] of byCell) {
    const tile = byKey.get(cell);
    if (!tile) { console.warn('groups.json 的格不存在', cell); continue; }
    // 海方向：那個門的方向上沒有鄰格（格心距 √3 R）就是海
    const seaDirs = [0, 1, 2, 3, 4, 5].map(gateDir).filter((d) => ![...byKey.values()].some((o) => o !== tile && o.position.clone().sub(tile.position).normalize().dot(d) > 0.95 && Math.abs(o.position.distanceTo(tile.position) - Math.sqrt(3) * R) < 0.2 * R));
    const blocked = LANDMARKS.filter((l) => l.key === cell).map((l) => landmarkBlocked(l, R));
    // 議會先試場景化佈局（spec：tile-scene）：主街朝向主島中心（場景原點）那扇門，主物件在格心廣場
    let sceneOpt: { streetDir: [number, number] } | undefined;
    let sceneReserve: number | undefined;
    if (cell.startsWith('council')) {
      const toCenter = tile.position.clone().negate().setY(0).normalize();
      const gate = [0, 1, 2, 3, 4, 5].sort((a, b) => gateDir(b).dot(toCenter) - gateDir(a).dot(toCenter))[0];
      sceneReserve = cell === 'council' ? 2.0 : 1.2;
      sceneOpt = { streetDir: buildStreet(tile, R, gate, sceneReserve) };
    }
    const hs = placeGroups(tile, R, list, 11 + i++, { isMain: cell === 'council', reserve: sceneReserve ?? (hillCells.has(cell) ? R * 0.42 + 0.6 : undefined), seaDirs, blocked , scene: sceneOpt });
    holders.push(...hs);
    // 物件周圍的樹拿掉，免得擋住
    const near = (o: THREE.Object3D) => hs.some((h) => Math.hypot(h.position.x - o.position.x, h.position.z - o.position.z) < 0.9 * h.scale.x + 0.6);
    for (const o of [...tile.children]) if (o.userData.tree && near(o)) tile.remove(o);
  }
  console.info('政績物件', holders.length, '組');
}

// ── 花草與盆栽：每格都放，避開政績物件與格心（山丘格避開山腳）──
{
  const hillCells = new Set(layout.cells.filter((c) => c.ele > 200).map((c) => `${c.q},${c.r}`));
  for (const p of mountains) hillCells.add(mountainCellKey(p));
  let n = 0, i = 0;
  for (const [key, tile] of byKey) {
    const avoid = holders.filter((h) => h.parent === tile).map((h) => ({ x: h.position.x, z: h.position.z, r: 0.9 * h.scale.x }));
    n += decorateTile(tile, R, 900 + i++, avoid, hillCells.has(key) ? R * 0.42 + 0.6 : key === 'council' ? 2.0 : 0.8);
  }
  console.info('花草盆栽', n);
}

// ── 夕陽（預設；?sunset=0 回白天）：太陽在「淡江大橋 → 議會」方向、低仰角；天空、霧、光、海面都換成夕陽色 ──
let sunPos: THREE.Vector3 | null = null;
if (query.get('sunset') !== '0') {
  const tj = layout.bridges.find((b) => b.name.startsWith('淡江'))!;
  const mid = byKey.get(tj.from.join(','))!.position.clone().add(byKey.get(tj.to.join(','))!.position).multiplyScalar(0.5);
  sunPos = sunsetSunPosition(mid, byKey.get('council')!.position);
  applySunset({ scene, sun, hemi, seaMat }, sunPos);
}

// ── 橋：從環道的門起坡、過水拱起、落到對岸的門 ──
// 最高的山頂（世界座標）：橋塔不高過它
let peakY = 0;
for (const c of layout.cells) { const g = byKey.get(`${c.q},${c.r}`)!; const named = mountains.some((p) => mountainCellKey(p) === `${c.q},${c.r}`); if (c.ele > 200 && !named) peakY = Math.max(peakY, g.position.y + g.userData.topY + hillHeight(c.ele) - 0.1); }
for (const p of mountains) { const g = byKey.get(mountainCellKey(p))!; peakY = Math.max(peakY, g.position.y + g.userData.topY + hillHeight(MOUNTAIN_ELE[p.name] ?? 500) - 0.1); }
const bridgePaths = layout.bridges.map((b) => buildBridge(scene, R, b, byKey.get(b.from.join(','))!, byKey.get(b.to.join(','))!, roads, peakY + 0.9)); // 塔尖可以比最高山頂略高一點

// ── 三個漁港與渡輪：議會 → 八里 → 淡水河口 閉環巡航，進港停泊（不是政績物件，?elements=0 也在）──
const harbours = HARBOURS.map((h) => buildHarbour(scene, byKey.get(h.key)!, R, h.gate));
const legs = buildRoute(harbours);
{
  // 航線淡虛線（只畫離岸段與進港段）
  const pts: THREE.Vector3[] = [];
  for (const l of legs) if (!l.fromDock) pts.push(l.from.clone().setY(0.05), l.to.clone().setY(0.05));
  const route = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.1 }));
  route.computeLineDistances(); scene.add(route);
}
const ferry = buildFerry();
ferry.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
scene.add(ferry.object);

// ── 兩艘遊湖船：在湖面隨機繞（避開陸地、橋，互相閃避），不靠港 ──
const bridgeSegs = layout.bridges.map((b) => {
  const A = byKey.get(b.from.join(','))!, T = byKey.get(b.to.join(','))!;
  let best: [THREE.Vector3, THREE.Vector3] | null = null;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const p = vertexOf(A, R, i), q = vertexOf(T, R, j); if (!best || p.distanceTo(q) < best[0].distanceTo(best[1])) best = [p, q]; }
  return best!;
});
const water = lakeWater([...byKey.values()].map((g) => g.position), R, bridgeSegs);
const cruisers = [{ accent: 0x3f6fb0, seed: 7 }, { accent: 0x4f9a5c, seed: 31 }].map(({ accent, seed }) => {
  const boat = buildFerry({ accent });
  boat.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  scene.add(boat.object);
  return { boat, walk: lakeWanderer(water, seed, { speed: 2.0 }) };
});
let cruiseLastT = 0;

// ── 競選車：在路網圖（環道 + 連接路 + 橋）上不迴轉隨機走；少量行人在人行道環上繞 ──
// ── 雲：低多邊形、會投影、整層慢慢飄 ──
const clouds = buildClouds(18, LAKE_R * LAKE.scale + 80, 2026, 0.6);
clouds.object.position.set(LAKE.cx, 0, LAKE.cz);
scene.add(clouds.object);

const roadGraph = buildRoadGraph(roads, bridgePaths);
const truck = buildCampaignTruck();
truck.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
truck.object.scale.setScalar(2);
scene.add(truck.object);
const truckWalk = roadWalker(roadGraph, 2026, 2.2, Math.max(0, roadGraph.nodes.findIndex((p) => p.distanceTo(byKey.get('-2,0')!.position) < R)));
// 貓狗各兩隻：各自一個 roadWalker 沿路邊隨機走（起點散在不同節點），走一段停一段（坐下／趴下）
const animals: Array<{ animal: Animal; walk: ReturnType<typeof roadWalker>; stroll: Stroll }> = [];
for (let i = 0; i < 4; i++) {
  const def = ANIMAL_TYPES[i < 2 ? 0 : 1], variant = i % 2, rng = mulberry32(600 + i);
  const animal = def.build({ rng, variant, phase: i * 1.7 });
  animal.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  animal.object.scale.setScalar(2);
  scene.add(animal.object);
  const speed = def.speed[0] + (def.speed[1] - def.speed[0]) * rng();
  const startNode = Math.floor((roadGraph.nodes.length * (i + 1)) / 5);
  animals.push({ animal, walk: roadWalker(roadGraph, 2100 + i, speed, startNode), stroll: stroll(mulberry32(700 + i), { restPoses: def.restPoses }) });
}
// 20 個民眾（CITIZEN_PLAN：種類 × 區）：各自在所屬區的一格人行道環上繞；山的格不放人
const pedestrians: Array<{ tile: HexColumn; citizen: Citizen; phase: number; omega: number }> = [];
const standing: Citizen[] = []; // 不走動的（釣客站在碼頭邊）
{
  const hill = new Set(layout.cells.filter((c) => c.ele > 200).map((c) => `${c.q},${c.r}`));
  for (const p of mountains) hill.add(mountainCellKey(p));
  const cellsOf: Record<string, string[]> = {};
  for (const c of layout.cells) { const k = `${c.q},${c.r}`; if (!hill.has(k)) (cellsOf[c.district.replace(/區$/, '')] ??= []).push(k); }
  const used: Record<string, number> = {}, seen = new Map<string, number>();
  const styles = ['short', 'bob', 'ponytail'] as const;
  CITIZEN_PLAN.forEach((p, i) => {
    const def = CITIZEN_TYPES.find((t) => t.id === p.id)!;
    const fisher = p.id === 'fisher';
    const list = cellsOf[p.region] ?? []; if (!fisher && !list.length) return;
    const n = seen.get(p.id) ?? 0; seen.set(p.id, n + 1);
    const citizen = def.build({
      rng: mulberry32(300 + i), hairStyle: styles[n % 3],
      colors: { top: CITIZEN_PAL.top[(i * 2 + n) % CITIZEN_PAL.top.length], accent: CITIZEN_PAL.accent[(i + n * 2) % CITIZEN_PAL.accent.length], hair: CITIZEN_PAL.hair[n % 3] },
      phase: i * 1.1,
    });
    citizen.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = !o.userData.noCastShadow; });
    citizen.object.scale.setScalar(2);
    if (fisher) {
      // 釣客：站在八里漁港（港）旁邊的海灘環上，面朝海，釣竿伸出格邊。石門沒有漁港，所以放八里。
      const h = harbours[1];
      const side = new THREE.Vector3(-h.dir.z, 0, h.dir.x);
      citizen.object.position.copy(h.portPos).add(side.multiplyScalar(0.95)).setY(BEACH_Y);
      citizen.object.rotation.y = h.portRot; // 人物 +z（釣竿方向）轉到海
      scene.add(citizen.object);
      standing.push(citizen);
      return;
    }
    const k = list[(used[p.region] = (used[p.region] ?? 0) + 1) % list.length];
    const tile = byKey.get(k)!;
    tile.add(citizen.object);
    // 同一格的人用相位錯開（黃金角），速度略有不同
    pedestrians.push({ tile, citizen, phase: i * 2.39996, omega: 0.05 + (i % 5) * 0.008 });
  });
}
let truckLastT = 0;

function addLabel(at: THREE.Vector3, name: string, count: number): void {
  const el = document.createElement('div'); el.className = 'label district';
  el.innerHTML = `<b>${count}</b>${name}`;
  const o = new CSS2DObject(el); o.position.copy(at);
  scene.add(o);
}

/**
 * 一組格的標籤點：同組裡三格兩兩相鄰 → 三格交會的頂點；否則兩格相鄰 → 共用邊的中點；
 * 都取最靠近這組重心的那一個。高度在環道（海灘環）表面上方一點。只有一格就退回格心。
 * 相鄰 = 格心距 ≈ √3·R（平頂六角形）。
 */
function junctionSpot(keys: string[]): THREE.Vector3 {
  const ps = keys.map((k) => byKey.get(k)!.position.clone().setY(0));
  const cen = ps.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ps.length);
  const adj = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b) < Math.sqrt(3) * R * 1.1;
  const nearest = (list: THREE.Vector3[]) => list.sort((a, b) => a.distanceTo(cen) - b.distanceTo(cen))[0];
  const triples: THREE.Vector3[] = [], pairs: THREE.Vector3[] = [];
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (!adj(ps[i], ps[j])) continue;
    pairs.push(ps[i].clone().add(ps[j]).multiplyScalar(0.5));
    for (let k = j + 1; k < ps.length; k++) if (adj(ps[i], ps[k]) && adj(ps[j], ps[k])) triples.push(ps[i].clone().add(ps[j]).add(ps[k]).multiplyScalar(1 / 3));
  }
  const at = triples.length ? nearest(triples) : pairs.length ? nearest(pairs) : cen;
  return at.setY(TOP_H + 0.25 + 0.35); // 環道表面（格高 + 海灘環厚）再高一點
}

// ── 鏡頭與 UI ──
type Mode = 'orbit' | 'top' | 'free';
let mode: Mode = 'orbit';
const t0 = performance.now();
const ORBIT_R = 78, ORBIT_H = 78; // 環繞半徑在湖面上方、高度高過火口緣（55），從高處俯看整個火山口湖

function setMode(m: Mode): void {
  mode = m;
  document.body.classList.toggle('top', m === 'top');
  $('b-orbit').classList.toggle('on', m === 'orbit');
  $('b-top').classList.toggle('on', m === 'top');
  if (m === 'top') { camera.position.set(LAKE.cx, 120, LAKE.cz + 30); controls.target.set(LAKE.cx, 0, LAKE.cz); }
}
$('b-orbit').onclick = () => setMode('orbit');
$('b-top').onclick = () => setMode('top');
controls.addEventListener('start', () => { if (mode === 'orbit') mode = 'free'; $('b-orbit').classList.remove('on'); });
camera.position.set(ORBIT_R, ORBIT_H, ORBIT_R * 0.6);

// ?cam=bridge 側看淡江大橋；?cam=guandu 側看關渡大橋；?cam=council 看議會；?cam=harbour 看河口漁港與渡輪；?cam=top 鳥瞰；夕陽是預設，?sunset=0 回白天（?cam=sunset 低角度看夕陽）；?still=1 不自動環繞（都是截圖用）
{
  const q = query;
  const cam = q.get('cam');
  if (cam === 'bridge' || cam === 'guandu') {
    const [ka, kt] = cam === 'bridge' ? ['-2,-1', '-2,0'] : ['-1,-2', '-1,-1'];
    const A = byKey.get(ka)!, T = byKey.get(kt)!;
    const m = A.position.clone().add(T.position).multiplyScalar(0.5);
    const d = T.position.clone().sub(A.position).normalize();
    const sd = new THREE.Vector3(-d.z, 0, d.x);
    mode = 'free';
    camera.position.copy(m).add(sd.multiplyScalar(cam === 'bridge' ? -20 : 14)).add(d.multiplyScalar(-4)); camera.position.y = cam === 'bridge' ? 7 : 5;
    controls.target.set(m.x, 2.5, m.z); controls.update();
  } else if (cam === 'council') {
    // 從東南方斜看三格議會
    const A = byKey.get('council')!, B = byKey.get('council-1')!;
    const m = A.position.clone().add(B.position).multiplyScalar(0.5);
    mode = 'free';
    camera.position.copy(A.position).add(new THREE.Vector3(26, 14, 18));
    controls.target.set(m.x, 2, m.z); controls.update();
  } else if (cam === 'harbour') {
    // 從外海看淡水河口的漁港與渡輪
    const h = harbours[2];
    mode = 'free';
    const side = new THREE.Vector3(-h.dir.z, 0, h.dir.x);
    camera.position.copy(h.dock).add(h.dir.clone().multiplyScalar(3.5)).add(side.multiplyScalar(4)).setY(3.2);
    controls.minDistance = 4; controls.target.copy(h.portPos).setY(1.2); controls.update();
  } else if (cam === 'sunset' && sunPos) {
    // 從太陽的反方向低角度看過去：議會在前、夕陽在後
    const d = sunPos.clone().setY(0).normalize();
    mode = 'free';
    camera.position.copy(d).multiplyScalar(-70).setY(16);
    controls.target.set(d.x * 20, 2, d.z * 20); controls.update();
  } else if (q.get('cell') && byKey.has(q.get('cell')!)) {
    // ?cell=q,r：從東南上方近看某一格（檢查擺放用）
    const tile = byKey.get(q.get('cell')!)!;
    mode = 'free'; controls.minDistance = 4;
    camera.position.copy(tile.position).add(new THREE.Vector3(9, 11, 9));
    controls.target.copy(tile.position).setY(tile.userData.topY + 0.5); controls.update();
  } else if (cam === 'top') setMode('top');
  else if (q.get('still')) { mode = 'free'; controls.update(); }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight);
});
// ── 點物件看政績（hover 提示、飛過去、側欄）──
const interaction = setupInteraction({
  camera, controls, dom: renderer.domElement, holders,
  onFocus: () => { if (mode !== 'free') { mode = 'free'; document.body.classList.remove('top'); $('b-orbit').classList.remove('on'); $('b-top').classList.remove('on'); } },
});
let lastT = 0;

renderer.setAnimationLoop(() => {
  const t = (performance.now() - t0) / 1000;
  interaction.update(Math.min(0.1, t - lastT)); lastT = t;
  if (mode === 'orbit') { const a = -0.6 + t * 0.07; camera.position.set(LAKE.cx + Math.cos(a) * ORBIT_R, ORBIT_H, LAKE.cz + Math.sin(a) * ORBIT_R); camera.lookAt(LAKE.cx, 0, LAKE.cz); }
  else controls.update();
  // 鏡頭不鑽進火山口山壁：低於地形 + 6 就推上去（政策島的做法是限制角度與距離，這裡再加一道保險）
  {
    // 鏡頭留在湖面上空：壓低視角時若退到湖岸外（山坡上會被樹和山擋住），沿視線往目標縮回湖內
    if (mode !== 'orbit') {
      const { r } = lakeLocal(camera.position.x, camera.position.z);
      const lim = LAKE_R * 0.93;
      if (r > lim) {
        const d = camera.position.clone().sub(controls.target);
        for (let i = 0; i < 12 && lakeLocal(camera.position.x, camera.position.z).r > lim; i++) camera.position.copy(controls.target).add(d.multiplyScalar(0.93));
      }
      if (camera.position.y < 3) camera.position.y = 3; // 不貼到水面
    }
    const floor = terrainHeight(camera.position.x, camera.position.z) + 6; if (camera.position.y < floor) camera.position.y = floor;
    if (mode !== 'orbit') controls.update();
  }
  for (const o of scene.children) if ((o.userData as { topY?: number }).topY) o.position.y = Math.sin(t * 0.8 + o.position.x * 0.1) * 0.08;
  { const s = routeState(legs, t); ferry.object.position.copy(s.pos).setY(-0.04); ferry.object.rotation.y = s.heading; ferry.update(t); }
  {
    const dt = Math.min(0.1, Math.max(0, t - truckLastT)); truckLastT = t;
    const s = truckWalk.advance(dt);
    truck.object.position.copy(s.pos); truck.object.rotation.y = s.heading; truck.update(t);
    for (const a of animals) {
      const r = a.stroll.advance(dt);
      if (r.moving) { const w = a.walk.advance(dt); a.animal.object.position.copy(roadsideOffset(w.pos, w.heading, ANIMAL_SIDE)); a.animal.object.rotation.y = w.heading; }
      a.animal.update(t, r.pose);
    }
    clouds.update(t);
    updateGlows(holders, t);
    lamps.update(t);
    // 平移範圍：目標點不出湖（湖局部等效半徑 ≤ 0.85 LAKE_R），超過就連鏡頭一起拉回來
    if (mode !== 'orbit') {
      const { r } = lakeLocal(controls.target.x, controls.target.z);
      if (r > LAKE_R * 0.85) {
        const k = (LAKE_R * 0.85) / r;
        const nx = LAKE.cx + (controls.target.x - LAKE.cx) * k, nz = LAKE.cz + (controls.target.z - LAKE.cz) * k;
        camera.position.x += nx - controls.target.x; camera.position.z += nz - controls.target.z;
        controls.target.x = nx; controls.target.z = nz;
      }
    }
    for (const p of pedestrians) { const w = sidewalkWalk(R, p.tile.userData.topY, p.phase, p.omega, t); p.citizen.object.position.set(w.x, w.y, w.z); p.citizen.object.rotation.y = w.heading; p.citizen.update(t); }
    for (const c of standing) c.update(t);
  }
  {
    // 遊湖船：互相閃避，也閃渡輪
    const dt = Math.min(0.1, Math.max(0, t - cruiseLastT)); cruiseLastT = t;
    cruisers.forEach((c, i) => {
      const others = [ferry.object.position, ...cruisers.filter((_, j) => j !== i).map((o) => o.boat.object.position)];
      const s = c.walk.advance(dt, others);
      c.boat.object.position.copy(s.pos).setY(-0.04); c.boat.object.rotation.y = s.heading; c.boat.update(t + 1.7 * (i + 1));
    });
  }
  renderer.render(scene, camera);
  labels.render(scene, camera);
});
