import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * 吉祥物：粉紅皮卡＋站在車斗上揮手的 Q 版議員。
 *
 * 不是貼文元素（不進 ELEMENTS、不受「≤12 mesh、無動畫」契約限制），但沿用同一套視覺語言：
 * 不用貼圖——五官也用小幾何體拼。車是低多邊形 flatShading；人偶參考政策島／樂高人，
 * 用平滑著色、圓角方塊與膠囊，看起來圓潤。
 * 車身只保留造型（粉紅車身、黑輪拱、銀踏板、黑防滾架），不放任何文字或號碼。
 *
 * 座標：原點在車底中心、y 朝上；車頭朝 +x，人面向 +z（車的側面）。
 * 尺寸以元素單位計：車長約 1.6、高約 0.9；人站上去總高約 1.25。
 */
export interface Mascot {
  object: THREE.Group;
  /** 每幀呼叫，t 為秒。 */
  update(t: number): void;
}

const mat = (c: THREE.ColorRepresentation, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true });

const C = {
  pink: 0xe2558f,      // 車身
  black: 0x2b2b2e,     // 輪拱、保險桿、防滾架
  glass: 0x3a4450,
  silver: 0xc9ccd0,
  tire: 0x222224,
  rim: 0x8e9196,
  light: 0xfff4d6,
  skin: 0xf6d8c8,
  hair: 0x1e1a1c,
  top: 0xe8868c,       // 插畫的珊瑚粉上衣
  collar: 0xffffff,
  pants: 0x3b3f52,
  blush: 0xf2a3b0,
  lip: 0xd9667a,
  eye: 0x2a2224,
};

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function buildTruck(): { group: THREE.Group; wheels: THREE.Object3D[]; bedY: number } {
  const g = new THREE.Group();
  const pink = mat(C.pink, 0.55);
  const black = mat(C.black);
  const glass = mat(C.glass, 0.3);
  const silver = mat(C.silver, 0.35);

  const wheelR = 0.17, wheelY = wheelR;
  const bodyBottom = 0.22, bodyTop = 0.5;
  const bodyH = bodyTop - bodyBottom, bodyW = 0.72;

  // 下車身：車頭到車尾一整塊
  g.add(box(1.62, bodyH, bodyW, pink, 0, bodyBottom + bodyH / 2, 0));
  // 引擎蓋略高一點、往前收
  g.add(box(0.44, 0.04, bodyW - 0.04, pink, 0.57, bodyTop + 0.02, 0));
  // 駕駛艙
  const cabX0 = -0.2, cabX1 = 0.34, cabH = 0.3;
  g.add(box(cabX1 - cabX0, cabH, bodyW - 0.06, pink, (cabX0 + cabX1) / 2, bodyTop + cabH / 2, 0));
  // 側窗（比艙稍寬，兩側都露出）、前後擋風
  g.add(box(0.44, 0.16, bodyW - 0.04, glass, (cabX0 + cabX1) / 2 + 0.01, bodyTop + 0.17, 0));
  const windshield = box(0.03, 0.2, bodyW - 0.1, glass, cabX1 + 0.005, bodyTop + 0.15, 0);
  windshield.rotation.z = 0.35;
  g.add(windshield);
  g.add(box(0.02, 0.14, bodyW - 0.14, glass, cabX0 - 0.005, bodyTop + 0.18, 0));
  // 車頂架
  for (const x of [-0.08, 0.2]) g.add(box(0.03, 0.03, bodyW - 0.02, black, x, bodyTop + cabH + 0.02, 0));

  // 車斗：底板（深色）＋兩側與尾門（粉紅）
  const bedX0 = -0.8, bedX1 = cabX0 - 0.02, bedLen = bedX1 - bedX0;
  const bedY = bodyTop - 0.06; // 人站的高度（底板面）
  g.add(box(bedLen - 0.04, 0.02, bodyW - 0.08, black, (bedX0 + bedX1) / 2, bedY, 0));
  for (const s of [-1, 1]) g.add(box(bedLen, 0.1, 0.04, pink, (bedX0 + bedX1) / 2, bodyTop + 0.05, s * (bodyW / 2 - 0.02)));
  g.add(box(0.04, 0.1, bodyW, pink, bedX0 + 0.02, bodyTop + 0.05, 0));

  // 防滾架：駕駛艙後的門形框 + 兩條往後斜的側桿
  const rollX = bedX1 - 0.05, rollTop = bodyTop + 0.36;
  for (const s of [-1, 1]) {
    g.add(box(0.035, rollTop - bodyTop, 0.035, black, rollX, (bodyTop + rollTop) / 2, s * (bodyW / 2 - 0.05)));
  }
  g.add(box(0.035, 0.035, bodyW - 0.06, black, rollX, rollTop, 0));

  // 輪拱（黑色寬體）、保險桿、水箱罩、大燈、踏板
  for (const x of [-0.52, 0.52]) g.add(box(0.46, 0.09, bodyW + 0.05, black, x, bodyBottom + 0.12, 0));
  g.add(box(0.06, 0.1, bodyW + 0.02, black, 0.82, bodyBottom + 0.05, 0));
  g.add(box(0.06, 0.08, bodyW, black, -0.82, bodyBottom + 0.04, 0));
  g.add(box(0.02, 0.12, 0.4, black, 0.815, bodyTop - 0.08, 0));
  for (const s of [-1, 1]) g.add(box(0.02, 0.06, 0.12, mat(C.light, 0.3), 0.815, bodyTop - 0.06, s * 0.27));
  g.add(box(0.52, 0.025, bodyW + 0.12, silver, (cabX0 + cabX1) / 2, bodyBottom - 0.01, 0));

  // 輪子：胎＋輪框
  const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.13, 14);
  const rimGeo = new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, 0.135, 8);
  const tire = mat(C.tire, 0.95), rim = mat(C.rim, 0.4);
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.52, 0.52]) for (const s of [-1, 1]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(tireGeo, tire); t.castShadow = true;
    const r = new THREE.Mesh(rimGeo, rim);
    w.add(t, r);
    w.rotation.x = Math.PI / 2;           // 軸朝 z
    w.position.set(x, wheelY, s * (bodyW / 2 - 0.02));
    g.add(w);
    wheels.push(w);
  }
  return { group: g, wheels, bedY: bedY + 0.01 };
}

/** 人偶用的平滑材質（不用 flatShading），參考政策島／樂高人的圓潤質感。 */
const soft = (c: THREE.ColorRepresentation, rough = 0.6) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: false });

function rbox(w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function capsule(r: number, len: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Q 版人偶（樂高人比例）：大圓頭、圓角方塊身體、膠囊手臂、圓球手、兩隻圓柱腿。
 * 原點在腳底；面向 +z。特徵照插畫：黑色及肩直髮（側分瀏海）、珊瑚粉上衣、白圓領、腮紅、微笑。
 */
function buildPerson(): { group: THREE.Group; waveShoulder: THREE.Group; head: THREE.Group } {
  const g = new THREE.Group();
  const skin = soft(C.skin, 0.55), hair = soft(C.hair, 0.45), top = soft(C.top, 0.6);
  const pants = soft(C.pants, 0.6), shoe = soft(0xf2efe9, 0.5), white = soft(C.collar, 0.5);

  // 腳：圓角鞋 + 膠囊腿
  const legX = 0.055;
  for (const s of [-1, 1]) {
    g.add(rbox(0.085, 0.05, 0.12, 0.022, shoe, s * legX, 0.025, 0.012));
    const leg = capsule(0.045, 0.1, pants);
    leg.position.set(s * legX, 0.05 + 0.095, 0);
    g.add(leg);
  }
  // 腰 + 上身（圓角方塊，樂高軀幹的感覺）
  g.add(rbox(0.2, 0.07, 0.13, 0.03, pants, 0, 0.245, 0));
  const torsoY0 = 0.27, torsoH = 0.26;
  g.add(rbox(0.26, torsoH, 0.17, 0.065, top, 0, torsoY0 + torsoH / 2, 0));
  const torsoTop = torsoY0 + torsoH;
  // 白色背心：比上身略大的圓角塊，上緣低於肩線，露出裡面的粉色上衣；前襟一條開口
  const vestH = 0.235, vestTop = torsoTop - 0.035;
  const vestD = 0.19;
  g.add(rbox(0.285, vestH, vestD, 0.07, white, 0, vestTop - vestH / 2, 0));
  g.add(rbox(0.05, 0.15, 0.02, 0.01, top, 0, vestTop - 0.075, vestD / 2 - 0.004));
  // 白圓領 + 脖子
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 10, 24), white);
  collar.rotation.x = Math.PI / 2; collar.position.y = torsoTop + 0.005; collar.castShadow = true;
  g.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.05, 16), skin);
  neck.position.y = torsoTop + 0.02;
  g.add(neck);

  // 頭（大圓頭）
  const headR = 0.2;
  const sx = 1.05, sy = 0.98; // 略寬略扁
  const head = new THREE.Group();
  head.position.y = torsoTop + 0.03 + headR * sy;
  g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(headR, 32, 24), skin);
  face.scale.set(sx, sy, 1); face.castShadow = true;
  head.add(face);
  /** 臉表面在 (x, y) 處的 z（含縮放），五官貼著曲面放。 */
  const zAt = (x: number, y: number) => headR * Math.sqrt(Math.max(0, 1 - (x / (headR * sx)) ** 2 - (y / (headR * sy)) ** 2));

  // 頭髮：後腦、側分瀏海、兩側垂肩（膠囊）、後背一片（圓角塊）
  const back = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.07, 32, 24), hair);
  back.scale.set(sx, sy, 1); back.position.set(0, 0.018, -0.03); back.castShadow = true;
  head.add(back);
  const bangs = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.065, 32, 14, 0, Math.PI * 2, 0, 1.05), hair);
  bangs.scale.set(sx, sy, 1); bangs.rotation.set(0.28, 0, -0.18); bangs.position.y = 0.01;
  head.add(bangs);
  for (const s of [-1, 1]) {
    const strand = capsule(0.055, 0.2, hair);
    strand.position.set(s * headR * sx * 0.93, -0.12, -0.02);
    strand.rotation.z = s * 0.05;
    head.add(strand);
  }
  head.add(rbox(0.36, 0.3, 0.12, 0.05, hair, 0, -0.12, -0.12));

  // 五官：黑豆眼＋反光、細眉、腮紅、微笑
  const eyeMat = soft(C.eye, 0.3), shineMat = soft(0xffffff, 0.2), blushMat = soft(C.blush, 0.8);
  for (const s of [-1, 1]) {
    const ex = s * 0.072, ey = -0.005;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), eyeMat);
    eye.scale.set(0.85, 1.15, 0.45); eye.position.set(ex, ey, zAt(ex, ey) - 0.004);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), shineMat);
    shine.position.set(ex + s * 0.004 + 0.008, ey + 0.012, zAt(ex, ey) + 0.008);
    const bx = s * 0.075, by = 0.065;
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.04, 4, 8), soft(C.hair, 0.5));
    brow.rotation.z = Math.PI / 2 + s * 0.12; brow.position.set(bx, by, zAt(bx, by) - 0.004);
    const cx = s * 0.122, cy = -0.06;
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 10), blushMat);
    blush.scale.set(1.15, 0.65, 0.3); blush.position.set(cx, cy, zAt(cx, cy) - 0.006);
    head.add(eye, shine, brow, blush);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.009, 8, 20, Math.PI), soft(C.lip, 0.5));
  smile.rotation.z = Math.PI; // 下半弧 = 微笑
  smile.position.set(0, -0.075, zAt(0, -0.075) - 0.006);
  head.add(smile);

  // 手臂：只有一節（樂高人那種短手），肩膀為支點；袖子色膠囊＋膚色圓球手
  const armLen = 0.08, armR = 0.045, handR = 0.048;
  const makeArm = () => {
    const shoulder = new THREE.Group();
    const arm = capsule(armR, armLen, top);
    arm.position.y = -(armLen / 2 + armR * 0.6);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(handR, 20, 14), skin);
    hand.position.y = -(armLen + armR + handR * 0.7); hand.castShadow = true;
    shoulder.add(arm, hand);
    return shoulder;
  };
  const shoulderY = torsoTop - 0.05;
  // 揮手（-x 側）：肩膀稍往前，舉起時不被垂肩的頭髮擋住；整隻手從肩膀擺
  const wave = makeArm();
  wave.position.set(-0.165, shoulderY, 0.05);
  g.add(wave);
  // 另一隻手自然放下、略往外
  const rest = makeArm();
  rest.position.set(0.165, shoulderY, 0.02);
  rest.rotation.z = 0.35;
  g.add(rest);

  return { group: g, waveShoulder: wave, head };
}

export function buildCampaignTruck(): Mascot {
  const root = new THREE.Group();
  const truck = buildTruck();
  root.add(truck.group);

  const person = buildPerson();
  // 站在車斗前段、靠近防滾架；面向 +z（車側），+x 那隻手扶架、-x 那隻手揮
  person.group.position.set(-0.4, truck.bedY, 0.02);
  root.add(person.group);

  const baseY = person.group.position.y;
  return {
    object: root,
    update(t: number) {
      // 揮手（-x 側，旋轉方向取負）：一節手臂斜舉約 140°，從肩膀左右擺 ±17°
      const w = Math.sin(t * 6);
      person.waveShoulder.rotation.z = -(2.45 + 0.3 * w);
      // 頭跟著節奏輕擺、身體微微上下（像車在走）
      person.head.rotation.z = 0.06 * Math.sin(t * 3);
      person.head.rotation.y = 0.12 * Math.sin(t * 0.7);
      person.group.position.y = baseY + 0.006 * Math.abs(Math.sin(t * 4));
      truck.group.position.y = 0.004 * Math.sin(t * 8);
      for (const wh of truck.wheels) wh.rotation.y = -t * 2; // 輪子慢慢轉（輪軸朝 z）
    },
  };
}
