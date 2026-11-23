import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });

/** 遊戲場：淺綠草地圓片上一座溜滑梯（topic 色滑道）＋盪鞦韆架＋一兩棵小樹。 */
export const playground: ElementDef = {
  id: 'playground',
  label: '遊戲場',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 草地圓片
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.04, 12), mat(0xb5cf9a));
    grass.position.y = 0.02;
    g.add(grass);

    // 溜滑梯：階梯塔 + 平台 + 斜滑道
    const sx = -0.22, top = 0.52;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.16, top, 0.26), mat(ELEMENT_PAL.wood));
    tower.position.set(sx - 0.2, top / 2 + 0.04, 0);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.28), mat(ELEMENT_PAL.grey));
    deck.position.set(sx - 0.12, top + 0.06, 0);
    const chuteLen = 0.64;
    const chute = new THREE.Mesh(new THREE.BoxGeometry(chuteLen, 0.05, 0.26), mat(color));
    const ang = Math.atan2(top, chuteLen * 0.9);
    chute.rotation.z = ang;
    chute.position.set(sx + 0.12, top / 2 + 0.07, 0);
    tower.castShadow = deck.castShadow = chute.castShadow = true;
    g.add(tower, deck, chute);

    // 盪鞦韆：兩根柱 + 橫桿 + 座板（單一吊帶簡化成一根細桿）
    const wx = 0.3, wh = 0.62;
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, wh, 5), mat(ELEMENT_PAL.grey));
      leg.position.set(wx, wh / 2 + 0.04, s * 0.22);
      leg.castShadow = true;
      g.add(leg);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), mat(ELEMENT_PAL.grey));
    bar.rotation.x = Math.PI / 2; bar.position.set(wx, wh + 0.04, 0);
    bar.castShadow = true;
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.012, wh - 0.22, 0.012), mat(ELEMENT_PAL.dark));
    rope.position.set(wx, wh / 2 + 0.13, 0);
    const swing = (rng() - 0.5) * 0.5;
    rope.rotation.z = swing;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.06), mat(ELEMENT_PAL.red));
    seat.position.set(wx + Math.sin(swing) * (wh - 0.2), 0.04 + 0.2 + (wh - 0.2) * (1 - Math.cos(swing)), 0);
    seat.castShadow = true;
    g.add(bar, rope, seat);

    // 小樹一棵（樹幹 + 低多邊形樹冠），rng 決定要不要再加一叢矮灌木（mesh 總數上限 12）
    const a = 2.2 + (rng() - 0.5) * 0.8, r = 0.42, th = 0.14 + rng() * 0.08;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, th, 5), mat(ELEMENT_PAL.wood));
    trunk.position.set(Math.cos(a) * r, th / 2 + 0.04, Math.sin(a) * r);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + rng() * 0.04, 0), mat(ELEMENT_PAL.green));
    crown.position.set(trunk.position.x, th + 0.14, trunk.position.z);
    crown.castShadow = true;
    g.add(trunk, crown);
    if (rng() < 0.5) {
      const b = 4.2 + (rng() - 0.5) * 0.8;
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(ELEMENT_PAL.green));
      bush.position.set(Math.cos(b) * r, 0.11, Math.sin(b) * r);
      bush.castShadow = true;
      g.add(bush);
    }

    g.scale.setScalar(1.2);
    g.rotation.y = rng() * Math.PI * 2;
    return g;
  },
};
