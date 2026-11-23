import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

/** 學校：兩層校舍（topic 色屋頂）＋旁邊一小塊橢圓跑道（紅土＋白線、中間綠操場）。佔地約 1.6 × 1.2。 */
export const school: ElementDef = {
  id: 'school',
  label: '學校',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const bx = -0.45, floors = 0.42, bw = 0.95, bd = 0.5;

    // 校舍本體（兩層）
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, floors * 2, bd), mat(ELEMENT_PAL.cream));
    body.position.set(bx, floors, 0);
    // 屋頂：topic 色，略外凸
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.1, bd + 0.1), mat(color));
    roof.position.set(bx, floors * 2 + 0.05, 0);
    // 兩層窗帶（正面）
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.14, 0.15, 0.02), mat(ELEMENT_PAL.water));
    win1.position.set(bx, floors * 0.55, bd / 2 + 0.005);
    const win2 = win1.clone(); win2.position.y = floors * 1.55;
    // 門口台階
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.16), mat(ELEMENT_PAL.concrete));
    step.position.set(bx, 0.03, bd / 2 + 0.08);
    // 旗桿＋小旗
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.25, 5), mat(ELEMENT_PAL.grey));
    pole.position.set(bx + bw / 2 + 0.1, 0.625, bd / 2 + 0.12);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.01), mat(ELEMENT_PAL.red));
    flag.position.set(pole.position.x + 0.08, 1.18, pole.position.z);

    // 跑道：橢圓紅土 + 白線 + 綠操場
    const tx = 0.6, rx = 0.44, rz = 0.3;
    const track = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 24), mat(0xc4785f));
    track.scale.set(rx, 1, rz); track.position.set(tx, 0.015, 0);
    const lane = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.82, 24), mat(ELEMENT_PAL.white));
    lane.rotation.x = -Math.PI / 2; lane.scale.set(rx, rz, 1); lane.position.set(tx, 0.032, 0);
    const field = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 24), mat(ELEMENT_PAL.green));
    field.scale.set(rx, 1, rz); field.position.set(tx, 0.03, 0);

    for (const m of [body, roof, pole, flag, track]) m.castShadow = true;
    g.add(body, roof, win1, win2, step, pole, flag, track, lane, field);
    g.rotation.y = (rng() - 0.5) * 0.5 + (rng() < 0.5 ? 0 : Math.PI);
    return g;
  },
};
