import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 黨務：一面 topic 色旗子，白色旗桿立在小水泥座上；旗面用兩片略錯開的薄板做飄動感。 */
export const flag: ElementDef = {
  id: 'flag',
  label: '黨務',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const poleH = 1.15;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.08, 8), mat(ELEMENT_PAL.concrete));
    base.position.y = 0.04;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, poleH, 6), mat(ELEMENT_PAL.white));
    pole.position.y = poleH / 2;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(ELEMENT_PAL.yellow));
    finial.position.y = poleH + 0.03;

    // 旗面：靠桿那片 + 外側那片，外側向後折一點，重疊處錯開
    const topic = mat(color);
    const flagY = poleH - 0.22, fh = 0.34;
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.36, fh, 0.02), topic);
    inner.position.set(0.18 + 0.02, flagY, 0);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.32, fh - 0.02, 0.02), topic);
    outer.rotation.y = -0.35;
    outer.position.set(0.36 + 0.14, flagY + 0.01, -0.05);

    pole.castShadow = inner.castShadow = outer.castShadow = true;
    g.add(base, pole, finial, inner, outer);
    g.rotation.y = rng() * Math.PI * 2;
    return g;
  },
};
