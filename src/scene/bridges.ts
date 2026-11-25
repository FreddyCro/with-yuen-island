import * as THREE from 'three';
import type { Bridge } from '../types';
import type { HexColumn } from './hex';
import { PAL } from './palette';
import { ROAD_W, vertexOf, type RoadNetwork } from './roads';

/**
 * 橋的外型固定：在自己的座標系裡以參考跨距 REF 建好（x 軸從 −REF/2 到 +REF/2、y = 0 是橋面兩端），
 * 然後整組放到兩個格頂點之間——只做平移、旋轉、等比縮放，造型不變。
 */
const REF = 11;           // 參考跨距（場景單位）
const CREST = 0.8;        // 橋面中點比兩端高多少（淡江大橋）
const CREST_ARCH = 0.45;  // 關渡大橋的橋面更扁
const DECK_W = ROAD_W + 0.5;

/** 橋面弧線（局部座標）。 */
class Deck {
  curve: THREE.QuadraticBezierCurve3;
  constructor(public pierBottom: number, crest = CREST) {
    this.curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-REF / 2, 0, 0), new THREE.Vector3(0, crest * 2, 0), new THREE.Vector3(REF / 2, 0, 0));
  }
  at(t: number): THREE.Vector3 { return this.curve.getPoint(t); }
  get length(): number { return this.curve.getLength(); }
}
const DIR = new THREE.Vector3(1, 0, 0);
const SIDE = new THREE.Vector3(0, 0, 1);

/** @param maxTopY 世界座標的高度上限（最高那座山的山頂）：淡江大橋的塔尖不會高過它 */
/** @returns 橋面（路面高度）的折線，世界座標，從 A 端到 T 端，給車走 */
export function buildBridge(scene: THREE.Scene, R: number, b: Bridge, A: HexColumn, T: HexColumn, net: RoadNetwork, maxTopY = Infinity): THREE.Vector3[] {
  void net;
  // 端點：兩格頂點中最近的一對，高度在海灘環上
  let best: [THREE.Vector3, THREE.Vector3] | null = null;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const p = vertexOf(A, R, i), q = vertexOf(T, R, j); if (!best || p.distanceTo(q) < best[0].distanceTo(best[1])) best = [p, q]; }
  const [ga, gt] = best!;
  // 端點往格內縮一點、落在海灘環面上，橋面底剛好貼地
  ga.lerp(A.position, 0.11); gt.lerp(T.position, 0.11); // 多伸進格內一點，橋面四個角都落在邊環上
  ga.y = A.userData.topY - 0.5; gt.y = T.userData.topY - 0.5; // 端點略低於邊環面，角落埋進去而不是浮著

  const span = ga.distanceTo(gt), s = span / REF;
  const group = new THREE.Group();
  group.position.lerpVectors(ga, gt, 0.5);
  group.rotation.y = -Math.atan2(gt.z - ga.z, gt.x - ga.x);
  group.scale.setScalar(s);
  // 橋墩要插進水裡：水面 y=0 在局部座標是 −(端點高度)/s，再往下 0.6
  const isArch = !b.name.startsWith('淡江');
  const deck = new Deck(-(group.position.y) / s - 0.6 / s, isArch ? CREST_ARCH : CREST);

  // 橋身側面：淡江大橋和橋面同色（PAL.cream）；關渡大橋和拱同色（PAL.archRed）
  const deckMat = new THREE.MeshStandardMaterial({ color: isArch ? PAL.archRed : PAL.cream, roughness: 0.9 });
  const railMat = new THREE.MeshStandardMaterial({ color: PAL.cream, roughness: 0.9 });
  const sweep = (w: number, h: number, mat: THREE.Material, lift: number) => {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
    const c = deck.curve; const path = new THREE.QuadraticBezierCurve3(c.v0.clone().setY(c.v0.y + lift), c.v1.clone().setY(c.v1.y + lift), c.v2.clone().setY(c.v2.y + lift));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { extrudePath: path, steps: 28, bevelEnabled: false }), mat);
    m.castShadow = true; return m;
  };
  group.add(sweep(DECK_W, 0.28, deckMat, 0.14), sweep(DECK_W + 0.2, 0.06, railMat, 0.34));

  if (b.name.startsWith('淡江')) cableStayed(group, deck, (maxTopY - group.position.y) / s);
  else arches(group, deck);

  scene.add(group);
  group.updateMatrixWorld(true);
  return [...Array(25)].map((_, i) => { const p = deck.at(i / 24); p.y += 0.3; return group.localToWorld(p); });
}

/** 橋墩：從橋面底下到水面以下（目前只有關渡大橋用圓墩，這個方墩保留給之後）。 */
export function pier(g: THREE.Group, deck: Deck, t: number, w = 0.5): void {
  const at = deck.at(t);
  const mat = new THREE.MeshStandardMaterial({ color: PAL.concrete, roughness: 0.8 });
  const h = at.y - deck.pierBottom;
  const col = new THREE.Mesh(new THREE.BoxGeometry(w, h, DECK_W * 0.8), mat);
  col.position.copy(at); col.position.y = deck.pierBottom + h / 2; col.castShadow = true;
  g.add(col);
}

/**
 * 淡江大橋：單塔不對稱斜張。塔在 t = 0.62（靠淡水端），長跨朝八里 16 對拉索、短跨朝淡水 9 對。
 * 塔型（照實景）：兩腿沿橋軸張開一小段、22% 高度合攏成主柱、頂端分成兩根短尖；腿直接插進水裡。
 * 注意：橋的 from 是八里側、to 是淡水側，局部 x 軸從八里（−）到淡水（+）。
 */
function cableStayed(g: THREE.Group, deck: Deck, maxTopLocal = Infinity): void {
  const towerAt = 0.62, MERGE = 0.22;
  const base = deck.at(towerAt), y = base.y;
  // 塔尖頂 = y + 1.02 H；不得高於上限（局部座標）
  const H = Math.min(7, (maxTopLocal - y) / 1.02);
  const mat = new THREE.MeshStandardMaterial({ color: PAL.concrete, roughness: 0.55 });
  const up = new THREE.Vector3(0, 1, 0);

  for (const sign of [1, -1]) {
    const foot = base.clone().add(DIR.clone().multiplyScalar(sign * 0.75)); foot.y = deck.pierBottom;
    const knee = base.clone().add(DIR.clone().multiplyScalar(sign * 0.14)); knee.y = y + H * MERGE;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, foot.distanceTo(knee), 6), mat);
    leg.position.copy(foot.clone().add(knee).multiplyScalar(0.5));
    leg.quaternion.setFromUnitVectors(up, knee.clone().sub(foot).normalize());
    leg.castShadow = true; g.add(leg);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, H * 0.12, 6), mat);
    tip.position.copy(base).add(DIR.clone().multiplyScalar(sign * 0.09)); tip.position.y = y + H * 0.96;
    g.add(tip);
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, H * (0.92 - MERGE), 6), mat);
  shaft.position.copy(base); shaft.position.y = y + H * (MERGE + (0.92 - MERGE) / 2); shaft.castShadow = true;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.3), mat);
  beam.position.copy(base); beam.position.y = y - 0.1;
  g.add(shaft, beam);

  const cable = new THREE.LineBasicMaterial({ color: PAL.cable, transparent: true, opacity: 0.9 });
  const fan = (from: number, to: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const t = from + ((to - from) * i) / n, u = i / n;
      for (const sign of [1, -1]) {
        const pt = deck.at(t).add(SIDE.clone().multiplyScalar(sign * DECK_W * 0.4)); pt.y += 0.36;
        const anchor = base.clone(); anchor.y = y + H * (0.5 + 0.47 * u);
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pt, anchor]), cable));
      }
    }
  };
  fan(towerAt - 0.06, 0.04, 16); // 長跨（八里側）
  fan(towerAt + 0.06, 0.96, 9);  // 短跨（淡水側）
}

/**
 * 關渡大橋（照實景）：三跨紅色中承拱，中拱最大。每跨兩片拱肋、拱頂橫向繫桿、白色吊桿；
 * 拱肋穿過橋面後往下在水面的圓形混凝土墩上收成 V 形紅色斜撐。
 * 拱腳就落在 V 形斜撐的頂端（橋墩 ± REACH），拱和墩才連成一體；拱心略低於橋面，拱肋像實景一樣穿過橋面。
 */
function arches(g: THREE.Group, deck: Deck): void {
  const spans = [0.3, 0.4, 0.3];
  const red = new THREE.MeshStandardMaterial({ color: PAL.archRed, roughness: 0.55 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbdb7ad, roughness: 0.9 });
  const hanger = new THREE.LineBasicMaterial({ color: 0xf2f2f2 });
  const up = new THREE.Vector3(0, 1, 0);
  const RIB = DECK_W * 0.42;
  const L = deck.length;
  const ARCH_FLAT = 0.85; // 拱肋壓扁的比例（1 = 半圓）
  const REACH = Math.min(L * 0.03, 0.6); // V 形斜撐頂端離橋墩的距離（沿橋軸）；拱腳落在這裡
  const ARCH_Y = -0.02;   // 拱腳比橋面弧線低這麼多：拱肋穿過橋面板、接上斜撐頂
  const xOf = (t: number) => deck.at(t).x;
  const tOf = (x: number) => x / REF + 0.5; // 橋面弧線左右對稱，x 和 t 是線性的
  const strut = (from: THREE.Vector3, to: THREE.Vector3, w: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, from.distanceTo(to), w), red);
    m.position.copy(from.clone().add(to).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
    m.castShadow = true; g.add(m);
  };
  const T0 = 0.08, T1 = 0.92, span = T1 - T0; // 拱只放在水面上那段，兩端是引道
  const feet = [T0];
  for (const f of spans) feet.push(feet[feet.length - 1] + span * f);

  for (let i = 0; i < spans.length; i++) {
    // 拱腳：左墩右側、右墩左側的斜撐頂端；拱順著兩腳的高差微傾
    const x0 = xOf(feet[i]) + REACH, x1 = xOf(feet[i + 1]) - REACH, rad = (x1 - x0) / 2;
    const y0 = deck.at(tOf(x0)).y + ARCH_Y, y1 = deck.at(tOf(x1)).y + ARCH_Y;
    const c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, 0);
    const tilt = Math.atan2(y1 - y0, x1 - x0), cos = Math.cos(tilt), sin = Math.sin(tilt);
    const onArch = (x: number, h: number) => new THREE.Vector3(c.x + x * cos - h * sin, c.y + x * sin + h * cos, 0); // 拱上一點（沿拱軸 x、高 h）
    for (const sign of [1, -1]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.11, 6, 28, Math.PI), red);
      arch.position.copy(c).add(SIDE.clone().multiplyScalar(sign * RIB));
      arch.scale.y = ARCH_FLAT; arch.rotation.z = tilt; arch.castShadow = true;
      g.add(arch);
    }
    for (let k = 1; k < 7; k++) {
      const u = -1 + (2 * k) / 7, x = u * rad, h = Math.sqrt(Math.max(0, rad * rad - x * x)) * ARCH_FLAT;
      const top = onArch(x, h);
      if (k >= 2 && k <= 5) { const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, RIB * 2), red); tie.position.copy(top); g.add(tie); }
      for (const sign of [1, -1]) {
        const p2 = top.clone().add(SIDE.clone().multiplyScalar(sign * RIB));
        const p1 = deck.at(tOf(top.x)).add(SIDE.clone().multiplyScalar(sign * RIB)); p1.y += 0.36;
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), hanger));
      }
    }
  }
  for (const t of feet) {
    const at = deck.at(t);
    const base = at.clone(); base.y = deck.pierBottom + 0.75; // 圓墩頂在水面上一點
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.75, 10), concrete);
    p.position.copy(at); p.position.y = deck.pierBottom + 0.375; p.castShadow = true; g.add(p);
    for (const sign of [1, -1]) {
      const foot = base.clone().add(SIDE.clone().multiplyScalar(sign * RIB * 0.6));
      for (const d of [1, -1]) {
        if ((t === T0 && d < 0) || (t >= T1 - 1e-6 && d > 0)) continue; // 兩端的墩只朝橋內撐
        const top = new THREE.Vector3(at.x + d * REACH, deck.at(tOf(at.x + d * REACH)).y + ARCH_Y, sign * RIB); // = 該側拱腳
        strut(foot, top, 0.16);
      }
    }
  }
}
