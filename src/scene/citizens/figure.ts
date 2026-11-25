import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * 民眾共用人偶（樂高人比例，和競選車上的議員人偶同一套風格）：
 * 大圓頭、圓角方塊身體、一節膠囊手臂＋圓球手、兩條膠囊腿＋圓角鞋，平滑著色。
 *
 * 原點在腳底中心、y 朝上、面向 +z。成人高約 0.97 單位；小孩用 `scale` 縮小。
 * 可換色部位見 `CitizenColors`；同一種民眾出現多次時，靠換色與髮型避免長得一模一樣。
 * 議員的識別色（珊瑚粉上衣、白背心）不放進民眾色盤。
 */

export type HairStyle = 'short' | 'bob' | 'ponytail';

export interface CitizenColors {
  hair: number;
  top: number;
  bottom: number;
  skin: number;
  accent: number; // 配件主色（書包、肩背包、雨傘…）
}

/** 民眾色盤（低飽和，和元素的 pastel 系搭）。 */
export const CITIZEN_PAL = {
  hair: [0x2b2523, 0x4a3426, 0x7a5638],
  elderHair: 0xf4f1ea, // 白髮
  top: [0x7e9bb5, 0x8fa882, 0xe3c76a, 0xa894b0, 0xc96a5a, 0xeadfc8],
  bottom: [0x3b3f52, 0xb9a47e, 0x7a7a76, 0x2e2e30],
  skin: [0xf6d8c8, 0xe8c0a4],
  accent: [0x5b7fa6, 0xc96a5a, 0x6f8f5e, 0x8a6aa0, 0xd9a441],
};

const pick = <T>(arr: readonly T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];

/** 用決定性亂數挑一組配色；`over` 可以指定部分顏色。 */
export function pickColors(rng: () => number, over: Partial<CitizenColors> = {}): CitizenColors {
  return {
    hair: pick(CITIZEN_PAL.hair, rng()),
    top: pick(CITIZEN_PAL.top, rng()),
    bottom: pick(CITIZEN_PAL.bottom, rng()),
    skin: pick(CITIZEN_PAL.skin, rng()),
    accent: pick(CITIZEN_PAL.accent, rng()),
    ...over,
  };
}

export const soft = (c: THREE.ColorRepresentation, rough = 0.6) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: false });

export function rbox(w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function capsule(r: number, len: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  mesh.castShadow = true;
  return mesh;
}

/** 人偶的尺寸（成人、scale 1 時）。配件依這些值對位。 */
export const FIG = {
  hipY: 0.24,
  torsoY0: 0.27,
  torsoH: 0.26,
  torsoW: 0.26,
  torsoD: 0.17,
  torsoTop: 0.53,
  shoulderY: 0.48,
  shoulderX: 0.165,
  headR: 0.2,
  headY: 0.756,
} as const;

export interface Figure {
  group: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group; // -x 側（人偶自己的右手）
  armR: THREE.Group; // +x 側
  legL: THREE.Group;
  legR: THREE.Group;
}

export function buildFigure(c: CitizenColors, hairStyle: HairStyle = 'short'): Figure {
  const g = new THREE.Group();
  const skin = soft(c.skin, 0.55), hair = soft(c.hair, 0.45), top = soft(c.top, 0.6);
  const bottom = soft(c.bottom, 0.6), shoe = soft(0x3a3a3e, 0.5);

  // 腿：以髖關節為支點，走路時前後擺
  const makeLeg = (s: number) => {
    const leg = new THREE.Group();
    leg.name = s < 0 ? 'legL' : 'legR';
    leg.position.set(s * 0.055, FIG.hipY, 0);
    const l = capsule(0.045, 0.1, bottom); l.position.y = -0.095;
    const sh = rbox(0.085, 0.05, 0.12, 0.022, shoe, 0, -FIG.hipY + 0.025, 0.012);
    leg.add(l, sh);
    g.add(leg);
    return leg;
  };
  const legL = makeLeg(-1), legR = makeLeg(1);

  // 腰、上身
  g.add(rbox(0.2, 0.07, 0.13, 0.03, bottom, 0, 0.245, 0));
  g.add(rbox(FIG.torsoW, FIG.torsoH, FIG.torsoD, 0.065, top, 0, FIG.torsoY0 + FIG.torsoH / 2, 0));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.05, 16), skin);
  neck.position.y = FIG.torsoTop + 0.02;
  g.add(neck);

  // 頭
  const R = FIG.headR, sx = 1.05, sy = 0.98;
  const head = new THREE.Group();
  head.position.y = FIG.headY;
  g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), skin);
  face.scale.set(sx, sy, 1); face.castShadow = true;
  head.add(face);
  const zAt = (x: number, y: number) => R * Math.sqrt(Math.max(0, 1 - (x / (R * sx)) ** 2 - (y / (R * sy)) ** 2));

  // 五官（簡化：黑豆眼、腮紅、微笑）——遠看只剩配件和顏色，臉不用太細
  const eyeMat = soft(0x2a2224, 0.3), blushMat = soft(0xf2a3b0, 0.8);
  for (const s of [-1, 1]) {
    const ex = s * 0.072, ey = -0.005;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), eyeMat);
    eye.scale.set(0.85, 1.15, 0.45); eye.position.set(ex, ey, zAt(ex, ey) - 0.004);
    const cx = s * 0.122, cy = -0.06;
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 8), blushMat);
    blush.scale.set(1.15, 0.65, 0.3); blush.position.set(cx, cy, zAt(cx, cy) - 0.006);
    head.add(eye, blush);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 8, 18, Math.PI), soft(0xb85a68, 0.5));
  smile.rotation.z = Math.PI; smile.position.set(0, -0.075, zAt(0, -0.075) - 0.006);
  head.add(smile);

  // 頭髮：共用後腦＋瀏海，再依髮型加
  const back = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 32, 24), hair);
  back.scale.set(sx, sy, 1); back.position.set(0, 0.018, -0.03); back.castShadow = true;
  head.add(back);
  const bangs = new THREE.Mesh(new THREE.SphereGeometry(R * 1.065, 32, 14, 0, Math.PI * 2, 0, hairStyle === 'short' ? 0.95 : 1.05), hair);
  bangs.scale.set(sx, sy, 1); bangs.rotation.set(0.26, 0, hairStyle === 'short' ? 0.12 : -0.18); bangs.position.y = 0.01;
  head.add(bangs);
  if (hairStyle === 'bob') {
    // 及肩：兩側垂到下巴、後面一片
    for (const s of [-1, 1]) {
      const strand = capsule(0.05, 0.1, hair);
      strand.position.set(s * R * sx * 0.93, -0.08, -0.02);
      head.add(strand);
    }
    head.add(rbox(0.36, 0.2, 0.12, 0.05, hair, 0, -0.08, -0.11));
  } else if (hairStyle === 'ponytail') {
    // 馬尾：後腦一束往下垂，加一個髮圈
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), soft(0xc96a5a, 0.5));
    tie.position.set(0, 0.03, -R * 1.02); head.add(tie);
    const tail = capsule(0.05, 0.14, hair);
    tail.position.set(0, -0.06, -R * 1.08); tail.rotation.x = -0.25; head.add(tail);
  }

  // 手臂：一節膠囊（袖子色）＋膚色圓球手，以肩膀為支點
  const makeArm = (s: number) => {
    const sh = new THREE.Group();
    sh.position.set(s * FIG.shoulderX, FIG.shoulderY, 0);
    const arm = capsule(0.045, 0.08, top); arm.position.y = -(0.04 + 0.027);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 12), skin);
    hand.position.y = -(0.08 + 0.045 + 0.034); hand.castShadow = true;
    sh.add(arm, hand);
    sh.rotation.z = s * 0.12; // 自然垂放、略往外
    g.add(sh);
    return sh;
  };
  const armL = makeArm(-1), armR = makeArm(1);

  return { group: g, head, armL, armR, legL, legR };
}

/** 手在手臂群組裡的位置（肩膀為原點、手臂垂下時）；要拿東西就把道具加到手臂群組的這個點。 */
export const HAND_Y = -(0.08 + 0.045 + 0.034);

/** 兩點之間拉一根圓桿（推車架、拐杖、釣竿、車架都用它）。 */
export function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  mesh.castShadow = true;
  return mesh;
}

/** 圖庫／島上放的一個民眾：物件＋每幀更新。 */
export interface Citizen {
  object: THREE.Group;
  update(t: number): void;
}

export interface CitizenOptions {
  rng: () => number;
  colors?: Partial<CitizenColors>;
  hairStyle?: HairStyle;
  phase?: number; // 動作相位，讓同畫面的人錯開
}

export const pickHair = (rng: () => number): HairStyle => (['short', 'bob', 'ponytail'] as const)[Math.floor(rng() * 3)];

/**
 * 原地走路：手腳反向擺動、身體微微上下。`phase` 讓同一畫面裡的人步伐錯開；
 * `speed` 步頻、`amp` 擺幅（長輩慢走就用小值）。`arms=false` 時手臂不動（手上拿著東西）。
 */
export function walk(f: Figure, t: number, phase = 0, speed = 5, amp = 0.4, arms = true): void {
  const a = Math.sin(t * speed + phase);
  f.legL.rotation.x = amp * a;
  f.legR.rotation.x = -amp * a;
  if (arms) {
    f.armL.rotation.x = -0.35 * a;
    f.armR.rotation.x = 0.35 * a;
  }
  f.group.position.y = 0.012 * Math.abs(Math.cos(t * speed + phase));
  f.head.rotation.z = 0.04 * a;
}

/** 站著不動時的小動作：重心左右微移、頭偶爾轉一下，不然像假人。 */
export function sway(f: Figure, t: number, phase = 0): void {
  f.group.rotation.z = 0.02 * Math.sin(t * 1.3 + phase);
  f.head.rotation.y = 0.15 * Math.sin(t * 0.6 + phase);
  f.group.position.y = 0.004 * Math.sin(t * 2.2 + phase);
}
