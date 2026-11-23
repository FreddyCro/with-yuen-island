import * as THREE from 'three';
import { buildFigure, pickColors, pickHair, rbox, soft, bar, FIG, type Citizen, type CitizenOptions } from './figure';

/**
 * 單車族：坐在 YouBike 上踩踏板。YouBike 的辨識＝黃色車架＋前籃；車頭朝 +z。
 * 石門、三芝的 YouBike 站、自行車道政績。
 */
export function buildCyclist({ rng, colors, hairStyle, phase = 0 }: CitizenOptions): Citizen {
  const c = pickColors(rng, colors);
  const fig = buildFigure(c, hairStyle ?? pickHair(rng));

  const yellow = soft(0xe8c547, 0.5), dark = soft(0x2e2e30, 0.6), grey = soft(0x8e9196, 0.5);
  const bike = new THREE.Group();
  const wheelR = 0.15, axleY = wheelR;
  const rear = new THREE.Vector3(0, axleY, -0.33), front = new THREE.Vector3(0, axleY, 0.33);
  const bb = new THREE.Vector3(0, 0.2, 0.0), seatTop = new THREE.Vector3(0, 0.47, -0.13), headTop = new THREE.Vector3(0, 0.52, 0.22);
  const wheels: THREE.Mesh[] = [];
  for (const p of [rear, front]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.026, 10, 28), dark);
    w.position.copy(p); w.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 20), grey);
    hub.rotation.z = Math.PI / 2; hub.position.copy(p);
    bike.add(w, hub); wheels.push(hub);
  }
  // 車架（黃）：座管、上管、下管、後下叉、後上叉、前叉
  for (const [a, b] of [[bb, seatTop], [seatTop, headTop], [bb, headTop], [bb, rear], [seatTop, rear], [headTop, front]] as const) {
    bike.add(bar(a, b, 0.014, yellow));
  }
  bike.add(rbox(0.08, 0.035, 0.15, 0.015, dark, 0, 0.49, -0.14));        // 坐墊
  bike.add(bar(headTop, new THREE.Vector3(0, 0.58, 0.24), 0.012, grey));  // 龍頭立管
  bike.add(rbox(0.32, 0.024, 0.024, 0.01, dark, 0, 0.58, 0.24));          // 把手
  bike.add(rbox(0.2, 0.1, 0.14, 0.02, grey, 0, 0.5, 0.4));                // 前籃
  // 曲柄與踏板
  const cranks: THREE.Group[] = [];
  for (const k of [-1, 1]) {
    const cr = new THREE.Group(); cr.position.set(k * 0.045, bb.y, bb.z);
    cr.add(rbox(0.02, 0.02, 0.1, 0.006, dark, 0, 0, k * 0.0));
    const pedal = rbox(0.05, 0.015, 0.035, 0.005, dark, k * 0.03, 0, 0.06 * k);
    cr.add(pedal);
    bike.add(cr); cranks.push(cr);
  }

  // 人坐上去：髖關節對坐墊、略前傾、手扶把手、腿往前踩
  fig.group.position.set(0, 0.49 - FIG.hipY, -0.14);
  fig.group.rotation.x = 0.22;
  fig.armL.rotation.set(-1.15, 0, -0.15);
  fig.armR.rotation.set(-1.15, 0, 0.15);

  const object = new THREE.Group();
  object.add(bike, fig.group);
  return {
    object,
    update(t: number) {
      const a = t * 5 + phase;
      fig.legL.rotation.x = -0.95 + 0.4 * Math.sin(a);
      fig.legR.rotation.x = -0.95 - 0.4 * Math.sin(a);
      cranks[0].rotation.x = a; cranks[1].rotation.x = a + Math.PI;
      for (const w of wheels) w.rotation.y = -t * 4;
      fig.head.rotation.y = 0.1 * Math.sin(t * 0.7 + phase);
    },
  };
}
