import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 敬老卡：一張 topic 色的卡片斜立在地上（白色橫帶、米色大頭貼），旁邊靠一根彎把拐杖。 */
export const elderCard: ElementDef = {
  id: 'elder-card',
  label: '敬老卡',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 卡片：向後斜 22°，底邊貼地
    const tilt = -0.38;
    const card = new THREE.Group();
    const cardW = 0.62, cardH = 0.4, cardT = 0.035;
    const face = new THREE.Mesh(new THREE.BoxGeometry(cardW, cardH, cardT), mat(color));
    face.position.y = cardH / 2;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(cardW + 0.01, 0.07, cardT + 0.01), mat(ELEMENT_PAL.white));
    stripe.position.y = cardH * 0.72;
    const photo = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, cardT + 0.015), mat(ELEMENT_PAL.cream));
    photo.position.set(-cardW * 0.3, cardH * 0.36, 0);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, cardT + 0.015), mat(ELEMENT_PAL.yellow));
    chip.position.set(cardW * 0.22, cardH * 0.36, 0);
    face.castShadow = true;
    card.add(face, stripe, photo, chip);
    card.rotation.x = tilt;
    card.position.z = -0.05;

    // 拐杖：木桿斜靠 + 彎把（半圓環）+ 橡膠腳
    const cane = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.78, 6), mat(ELEMENT_PAL.wood));
    shaft.position.y = 0.39;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 10, Math.PI), mat(ELEMENT_PAL.wood));
    handle.position.set(-0.08, 0.78, 0);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.05, 6), mat(ELEMENT_PAL.dark));
    foot.position.y = 0.025;
    shaft.castShadow = true;
    cane.add(shaft, handle, foot);
    cane.position.set(0.4, 0, 0.1);
    cane.rotation.z = -0.22;
    cane.rotation.x = 0.1;

    g.add(card, cane);
    g.rotation.y = (rng() - 0.5) * 0.9;
    return g;
  },
};
