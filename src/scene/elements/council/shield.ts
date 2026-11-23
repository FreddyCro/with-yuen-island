import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 盾形輪廓（頂平、底尖），scale 控制整體大小。 */
function shieldShape(scale: number): THREE.Shape {
  const s = new THREE.Shape();
  const w = 0.3 * scale, top = 0.32 * scale, side = 0.06 * scale, tip = -0.34 * scale;
  s.moveTo(-w, top);
  s.lineTo(w, top);
  s.lineTo(w, side);
  s.quadraticCurveTo(w, tip * 0.55, 0, tip);
  s.quadraticCurveTo(-w, tip * 0.55, -w, side);
  s.closePath();
  return s;
}

/** 治安：一面 topic 色盾牌（白色邊框、白色十字徽）插在木樁上。 */
export const shield: ElementDef = {
  id: 'shield',
  label: '治安',
  island: 'council',
  build({ color, rng }) {
    const g = new THREE.Group();
    const centerY = 0.74;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.75, 6), mat(ELEMENT_PAL.wood));
    post.position.y = 0.375;

    // 盾牌本體（框 + 面 + 十字）放在一個子群組裡一起後仰，從俯視也看得到盾面
    const board = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shieldShape(1.3), { depth: 0.05, bevelEnabled: false, curveSegments: 5 }),
      mat(ELEMENT_PAL.white),
    );
    frame.position.z = -0.03;
    const face = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shieldShape(1.16), { depth: 0.05, bevelEnabled: false, curveSegments: 5 }),
      mat(color),
    );

    // 白色十字徽
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.03), mat(ELEMENT_PAL.white));
    crossV.position.set(0, 0.02, 0.06);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.03), mat(ELEMENT_PAL.white));
    crossH.position.set(0, 0.09, 0.06);

    board.add(frame, face, crossV, crossH);
    board.position.set(0, centerY, 0.02);
    board.rotation.x = -0.3;

    post.castShadow = frame.castShadow = face.castShadow = true;
    g.add(post, board);
    g.rotation.y = (rng() - 0.5) * 0.9;
    return g;
  },
};
