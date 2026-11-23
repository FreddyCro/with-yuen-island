import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 牛奶：一個白色牛奶瓶（topic 色瓶蓋、標籤帶）旁邊靠一個山形頂牛奶盒（topic 色腰帶）。 */
export const milk: ElementDef = {
  id: 'milk',
  label: '牛奶',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const white = mat(ELEMENT_PAL.white);
    const topic = mat(color);

    // 牛奶瓶：瓶身、肩、頸、瓶蓋、標籤帶
    const bottle = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.52, 8), white);
    body.position.y = 0.26;
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 0.12, 8), white);
    shoulder.position.y = 0.52 + 0.06;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), white);
    neck.position.y = 0.64 + 0.06;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 8), topic);
    cap.position.y = 0.76 + 0.035;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.16, 8), topic);
    label.position.y = 0.22;
    body.castShadow = cap.castShadow = true;
    bottle.add(body, shoulder, neck, cap, label);
    bottle.position.x = -0.2;

    // 牛奶盒：方身 + 山形頂（四角錐轉 45°）+ 腰帶
    const carton = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.3), white);
    box.position.y = 0.23;
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.215, 0.16, 4), white);
    gable.position.y = 0.46 + 0.08;
    gable.rotation.y = Math.PI / 4;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.14, 0.31), topic);
    band.position.y = 0.2;
    box.castShadow = true;
    carton.add(box, gable, band);
    carton.position.set(0.2, 0, 0.05);
    carton.rotation.y = (rng() - 0.5) * 0.6;

    g.add(bottle, carton);
    g.rotation.y = (rng() - 0.5) * 0.8;
    return g;
  },
};
