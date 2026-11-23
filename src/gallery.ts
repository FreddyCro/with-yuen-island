// 元素圖庫（?gallery=1）：把所有註冊的元素排成一格一格，附中文名，檢查造型與比例用。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ELEMENTS } from './scene/elements';
import { mulberry32 } from './scene/hex';
import { buildCampaignTruck } from './scene/mascot/campaign-truck';
import { buildFerry } from './scene/mascot/ferry';
import { buildFortSanDomingo } from './scene/landmarks/fort-san-domingo';
import { PAL, PALETTES } from './scene/palette';
import { addEnvironment, addDensityTile, TILE_R } from './gallery-env';
import { CITIZEN_TYPES, CITIZEN_PLAN, CITIZEN_PAL, type Citizen } from './scene/citizens';
import { ANIMAL_TYPES, stroll, type Animal, type AnimalDef, type Stroll } from './scene/animals';

export function runGallery(app: HTMLElement): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  app.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.setSize(innerWidth, innerHeight);
  Object.assign(labels.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
  app.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe8ea);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0c0c4, 0.9));
  // 六角格用的環境色跟島一樣取粉彩色盤（applyPalette 需要 layout，這裡只抄環境色）
  const pastel = PALETTES.pastel;
  const hexNum = (s: string) => parseInt(s.slice(1), 16);
  PAL.sea = hexNum(pastel.sea); PAL.shallow = hexNum(pastel.shallow); PAL.sand = hexNum(pastel.sand); PAL.sandSide = hexNum(pastel.sandSide);

  // 陳列範圍：元素格 z 0–12，下方是環境區（左）與密度測試格（右），中心約在 z = 15
  const CENTER_Z = 15;
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.5); sun.position.set(8, 14, CENTER_Z + 6); sun.castShadow = true;
  sun.target.position.set(0, 0, CENTER_Z); scene.add(sun.target);
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0xe9a98c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = CENTER_Z; ground.receiveShadow = true; scene.add(ground);

  const cols = 6, gap = 3.8;
  const topics = [0xc9826a, 0x7e9bb5, 0x8fa882, 0xa894b0, 0xcdb37a];
  ELEMENTS.forEach((e, i) => {
    const x = (i % cols - (cols - 1) / 2) * gap, z = Math.floor(i / cols) * gap;
    const obj = e.build({ color: new THREE.Color(topics[i % topics.length]), rng: mulberry32(i + 1), count: 1 });
    obj.position.set(x, 0, z);
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(obj);
    const el = document.createElement('div'); el.className = 'label small'; el.textContent = `${e.label}（${e.id}）`;
    const o = new CSS2DObject(el); o.position.set(x, -0.3, z + 1.1); scene.add(o);
  });

  // 吉祥物（不是貼文元素）：最後一列若還有 ≥2 格空位就放那裡，否則另起一列；放大、會揮手
  const elementRows = Math.ceil(ELEMENTS.length / cols);
  const lastCount = ELEMENTS.length % cols || cols;
  const fitsLastRow = cols - lastCount >= 2;
  const mascot = buildCampaignTruck();
  const mx = fitsLastRow ? ((lastCount + (cols - 1)) / 2 - (cols - 1) / 2) * gap : 0;
  const mz = fitsLastRow ? (elementRows - 1) * gap : elementRows * gap + 0.6;
  mascot.object.position.set(mx, 0, mz);
  mascot.object.scale.setScalar(1); // 原始尺寸（不額外放大）
  mascot.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(mascot.object);
  const mel = document.createElement('div'); mel.className = 'label small'; mel.textContent = '競選車（吉祥物）';
  const mlabel = new CSS2DObject(mel); mlabel.position.set(mx, -0.3, mz + 1.0); scene.add(mlabel);
  // 渡輪（吉祥物）：競選車右側
  const ferry = buildFerry();
  ferry.object.position.set(mx + 2.6, 0, mz);
  ferry.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(ferry.object);
  const fel = document.createElement('div'); fel.className = 'label small'; fel.textContent = '渡輪（吉祥物）';
  const flabel = new CSS2DObject(fel); flabel.position.set(mx + 2.6, -0.3, mz + 1.0); scene.add(flabel);
  // 地標：紅毛城（渡輪右側）
  const fort = buildFortSanDomingo();
  const lx = mx + 6.6; // 渡輪放大後長約 3.6，留出間距
  fort.position.set(lx, 0, mz);
  scene.add(fort);
  const lel = document.createElement('div'); lel.className = 'label small'; lel.textContent = '紅毛城（地標）';
  const llabel = new CSS2DObject(lel); llabel.position.set(lx, -0.3, mz + 1.2); scene.add(llabel);
  const clock = new THREE.Clock();

  // 民眾（元素格上方，z < 0）：照 CITIZEN_PLAN 的 20 人排 4 列 × 5；同種的用不同髮型與配色
  const ccols = 5, cgap = 1.55, crow = 1.7, citizenZ0 = -3.4;
  const citizens: Citizen[] = [];
  const styles = ['short', 'bob', 'ponytail'] as const;
  const seen = new Map<string, number>();
  CITIZEN_PLAN.forEach((p, i) => {
    const def = CITIZEN_TYPES.find((t) => t.id === p.id)!;
    const n = seen.get(p.id) ?? 0; seen.set(p.id, n + 1);
    // 同一種的第 n 個：髮型輪流、上衣與配件色錯開，保證三個不會一樣
    const ci = citizens.length;
    const cz = def.build({
      rng: mulberry32(300 + i),
      hairStyle: styles[n % 3],
      colors: { top: CITIZEN_PAL.top[(ci * 2 + n) % CITIZEN_PAL.top.length], accent: CITIZEN_PAL.accent[(ci + n * 2) % CITIZEN_PAL.accent.length], hair: CITIZEN_PAL.hair[n % 3] },
      phase: i * 1.1,
    });
    const x = (i % ccols - (ccols - 1) / 2) * cgap, z = citizenZ0 - Math.floor(i / ccols) * crow;
    cz.object.position.set(x, 0, z);
    cz.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = !o.userData.noCastShadow; o.receiveShadow = true; } });
    scene.add(cz.object);
    citizens.push(cz);
    const el = document.createElement('div'); el.className = 'label small'; el.textContent = `${def.label} · ${p.region}`;
    const o = new CSS2DObject(el); o.position.set(x, 1.3, z); scene.add(o); // 標籤放頭頂上方，才不會跟別列混
  });
  const citizenZ = citizenZ0 - 1.5 * crow; // 四列的中心，給近看鏡頭用

  // 動物（民眾第一列前面那條空帶、元素格上方）：貓兩隻在左、狗兩隻在右（各兩組毛色）；原地走、照 stroll 偶爾坐下
  const animalZ = citizenZ0 + 1.6;
  const animals: Array<{ animal: Animal; stroll: Stroll }> = [];
  {
    const spots: Array<[AnimalDef, number, number]> = [
      [ANIMAL_TYPES[0], 0, -1.8], [ANIMAL_TYPES[0], 1, -0.6],
      [ANIMAL_TYPES[1], 0, 0.6], [ANIMAL_TYPES[1], 1, 1.8],
    ];
    spots.forEach(([def, v, x], i) => {
      const animal = def.build({ rng: mulberry32(400 + i), variant: v, phase: i * 1.7 });
      animal.object.position.set(x, 0, animalZ);
      animal.object.rotation.y = -(Math.PI / 2 - 0.7); // 面向 +x 的動物轉成斜 3/4 面向鏡頭（+z），身體尾巴都看得到
      animal.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(animal.object);
      animals.push({ animal, stroll: stroll(mulberry32(500 + i), { walkMin: 3, walkMax: 6, restMin: 2, restMax: 3, restPoses: def.restPoses }) });
      const el = document.createElement('div'); el.className = 'label small'; el.textContent = `${def.label} · ${def.variants[v]}`;
      const o = new CSS2DObject(el); o.position.set(x, 0.75, animalZ); scene.add(o);
    });
  }

  // 環境區（左下）與實際密度測試格（右下）
  const q = new URLSearchParams(location.search);
  const rows = fitsLastRow ? elementRows : elementRows + 1;
  const belowZ = rows * gap + 3;                       // 元素格最後一列再往下
  const envOrigin = new THREE.Vector3(-13, 0, belowZ);
  addEnvironment(scene, envOrigin);
  const tileCenter = new THREE.Vector3(8.5, 0.05, belowZ + 6);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(TILE_R * 1.45, 48), new THREE.MeshStandardMaterial({ color: PAL.sea, roughness: 0.6 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(tileCenter.x, 0.01, tileCenter.z); sea.receiveShadow = true; scene.add(sea);
  const density = Math.max(0, Number(q.get('density') ?? 80));  // 預設 80：淡水 471 篇 / 6 格
  const treeN = Math.max(0, Number(q.get('trees') ?? 8));
  addDensityTile(scene, tileCenter, pastel.districts['淡水區'], density, treeN);

  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(0, 30, CENTER_Z + 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  // 圖庫要能自由移動去看每個物件：左鍵拖曳＝沿地面平移、右鍵＝旋轉、滾輪＝縮放、方向鍵＝平移
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.screenSpacePanning = false; // 平移貼著地面走，不會往天上飄
  controls.panSpeed = 1.5;
  controls.keyPanSpeed = 25;
  controls.listenToKeyEvents(window);
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  document.getElementById('brand')!.querySelector('p')!.textContent = '元素圖庫 · 拖曳或方向鍵移動、右鍵旋轉、滾輪縮放';
  controls.target.set(0, 0.5, CENTER_Z);
  // 近看：&landmark=1 紅毛城、&mascot=1 吉祥物、&citizens=1 民眾、&animals=1 貓狗、&tile=1 密度測試格、&env=1 環境區
  if (q.has('animals')) {
    controls.target.set(0, 0.25, animalZ);
    camera.position.set(0, 1.5, animalZ + 3.8);
  } else if (q.has('citizens')) {
    // &citizens=1 全部四列；&citizens=r1..r4 近看某一列（r1 = 最前面那列）
    const m = /^r([1-4])$/.exec(q.get('citizens') ?? '');
    if (m) {
      const rz = citizenZ0 - (Number(m[1]) - 1) * crow;
      controls.target.set(0, 0.5, rz);
      camera.position.set(0, 2.6, rz + 6.2);
    } else {
      controls.target.set(0, 0.3, citizenZ + 0.4);
      camera.position.set(0, 6.5, citizenZ + 9.5);
    }
  } else if (q.has('landmark')) {
    controls.target.set(lx, 0.6, mz);
    camera.position.set(lx + 1.8, 2.4, mz + 4.0);
  } else if (q.has('mascot')) {
    controls.target.set(mx, 0.75, mz);
    camera.position.set(mx + 0.75, 1.6, mz + 3.25);
  } else if (q.has('tile')) {
    controls.target.set(tileCenter.x, 2.3, tileCenter.z);
    camera.position.set(tileCenter.x, 15, tileCenter.z + 15);
  } else if (q.has('env')) {
    controls.target.set(envOrigin.x + 6, 1, envOrigin.z + 4);
    camera.position.set(envOrigin.x + 6, 13, envOrigin.z + 26);
  }
  controls.update();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight); });
  let lastT = 0;
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    mascot.update(t); ferry.update(t);
    for (const c of citizens) c.update(t);
    for (const a of animals) a.animal.update(t, a.stroll.advance(dt).pose);
    controls.update(); renderer.render(scene, camera); labels.render(scene, camera);
  });
}
