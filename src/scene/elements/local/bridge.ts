import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
  const b = new THREE.BoxGeometry(w, h, d);
  if (rz) b.rotateZ(rz);
  b.translate(x, y, z);
  return b;
};

/** 橋梁：一座小拱橋，混凝土弧形橋面、三座橋墩、topic 色欄杆，下面一道小水道。4 個 mesh。 */
export const bridge: ElementDef = {
  id: 'bridge',
  label: '橋梁',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const L = 1.3, W = 0.44;
    const rise = 0.18, deckY = 0.32, thick = 0.09;
    const arcY = (t: number) => deckY + Math.sin(t * Math.PI) * rise;

    // 橋下的小水道（沿 z 向，橋跨過它）
    const stream = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 1.1), mat(ELEMENT_PAL.water));
    stream.position.y = 0.015;
    g.add(stream);

    // 橋面：弓形斷面沿 z 擠出
    const shape = new THREE.Shape();
    const seg = 8;
    shape.moveTo(-L / 2, deckY);
    for (let i = 1; i <= seg; i++) shape.lineTo(-L / 2 + (i / seg) * L, arcY(i / seg));
    for (let i = seg; i >= 0; i--) shape.lineTo(-L / 2 + (i / seg) * L, arcY(i / seg) - thick);
    shape.closePath();
    const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    deckGeo.translate(0, 0, -W / 2);
    const deck = new THREE.Mesh(deckGeo, mat(ELEMENT_PAL.concrete));
    deck.castShadow = true;
    g.add(deck);

    // 橋墩：兩端方墩 + 中央一座細墩，合成一個 mesh
    const piers = new THREE.Mesh(
      mergeGeometries([
        box(0.16, deckY - 0.02, W + 0.04, -L / 2 + 0.08, (deckY - 0.02) / 2, 0),
        box(0.16, deckY - 0.02, W + 0.04, L / 2 - 0.08, (deckY - 0.02) / 2, 0),
        box(0.1, deckY, W - 0.06, 0, deckY / 2 + 0.02, 0),
      ]),
      mat(ELEMENT_PAL.grey),
    );
    piers.castShadow = true;
    g.add(piers);

    // topic 色欄杆：兩側扶手沿弧分段 + 立柱，全部合成一個 mesh
    const railParts: THREE.BufferGeometry[] = [];
    const n = 7, railH = 0.17;
    for (const side of [-1, 1]) {
      const z = side * (W / 2 - 0.025);
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x0 = -L / 2 + t0 * L, x1 = -L / 2 + t1 * L;
        const y0 = arcY(t0) + railH, y1 = arcY(t1) + railH;
        const len = Math.hypot(x1 - x0, y1 - y0);
        railParts.push(box(len + 0.01, 0.04, 0.04, (x0 + x1) / 2, (y0 + y1) / 2, z, Math.atan2(y1 - y0, x1 - x0)));
        railParts.push(box(0.035, railH, 0.035, x0 + 0.03, arcY(t0) + railH / 2, z));
      }
      railParts.push(box(0.035, railH, 0.035, L / 2 - 0.03, arcY(1) + railH / 2, z));
    }
    const rails = new THREE.Mesh(mergeGeometries(railParts), mat(color));
    rails.castShadow = true;
    g.add(rails);

    g.rotation.y = (rng() < 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.3;
    return g;
  },
};
