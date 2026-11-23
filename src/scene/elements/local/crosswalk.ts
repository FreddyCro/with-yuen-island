import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

/** 路口：一小段柏油路面＋斑馬線白條＋一支三色號誌燈；路緣石用 topic 色。 */
export const crosswalk: ElementDef = {
  id: 'crosswalk',
  label: '路口',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 柏油路面
    const road = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.5), mat(ELEMENT_PAL.asphalt));
    road.position.y = 0.025;
    road.castShadow = true;
    g.add(road);
    // 兩側路緣（topic 色）
    for (const s of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.07), mat(color));
      curb.position.set(0, 0.045, s * 0.285);
      curb.castShadow = true;
      g.add(curb);
    }
    // 斑馬線：4 條白條橫跨路面
    const stripes = 4;
    for (let i = 0; i < stripes; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.42), mat(ELEMENT_PAL.white));
      w.position.set((i - (stripes - 1) / 2) * 0.16, 0.055, 0);
      g.add(w);
    }
    // 號誌燈：桿 + 燈箱 + 三顆小球
    const side = rng() < 0.5 ? -1 : 1;
    const px = side * 0.36, pz = -0.33;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.95, 6), mat(ELEMENT_PAL.dark));
    pole.position.set(px, 0.475, pz);
    pole.castShadow = true;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), mat(ELEMENT_PAL.dark));
    box.position.set(px, 0.86, pz);
    box.castShadow = true;
    g.add(pole, box);
    const lights: number[] = [ELEMENT_PAL.red, ELEMENT_PAL.yellow, 0x7fc98a];
    lights.forEach((c, i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 }));
      b.position.set(px, 0.95 - i * 0.09, pz + 0.06);
      g.add(b);
    });

    g.scale.setScalar(1.2);
    g.rotation.y = (rng() < 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.3;
    return g;
  },
};
