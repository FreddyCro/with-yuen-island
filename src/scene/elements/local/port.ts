import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 漁港：一片水面、一段木棧碼頭、一艘小漁船（topic 色船身、白色駕駛艙）、兩根繫船柱。 */
export const port: ElementDef = {
  id: 'port',
  label: '漁港',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 水面：薄薄一塊水色
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.9), mat(ELEMENT_PAL.water));
    water.position.y = 0.02;
    g.add(water);

    // 木棧碼頭：沿後緣的一條木板路，架在短樁上
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.26), mat(ELEMENT_PAL.wood));
    deck.position.set(0, 0.17, -0.32);
    deck.castShadow = true;
    g.add(deck);
    const pileGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5);
    const piles = new THREE.Group();
    for (const x of [-0.45, 0, 0.45]) {
      const p = new THREE.Mesh(pileGeo, mat(ELEMENT_PAL.dark));
      p.position.set(x, 0.1, -0.32);
      piles.add(p);
    }
    g.add(piles);

    // 繫船柱：碼頭上兩根短粗柱
    const bollardGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.18, 6);
    const bollardA = new THREE.Mesh(bollardGeo, mat(ELEMENT_PAL.dark));
    bollardA.position.set(-0.3, 0.29, -0.26);
    const bollardB = bollardA.clone();
    bollardB.position.x = 0.3;
    g.add(bollardA, bollardB);

    // 漁船：topic 色船身（梯形：底窄上寬）、白色駕駛艙、小桅桿
    const boat = new THREE.Group();
    const hullGeo = new THREE.BoxGeometry(0.74, 0.2, 0.32);
    // 把底部四個頂點往內縮，做出船體梯形
    const pos = hullGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0) {
        pos.setX(i, pos.getX(i) * 0.75);
        pos.setZ(i, pos.getZ(i) * 0.6);
      }
    }
    hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, mat(color));
    hull.position.y = 0.12;
    hull.castShadow = true;
    // 船頭：前方一個小楔形
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 4), mat(color));
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0.48, 0.12, 0);
    bow.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), mat(ELEMENT_PAL.white));
    cabin.position.set(-0.12, 0.32, 0);
    cabin.castShadow = true;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 4), mat(ELEMENT_PAL.wood));
    mast.position.set(0.12, 0.47, 0);
    boat.add(hull, bow, cabin, mast);
    boat.position.set(0.02 + (rng() - 0.5) * 0.15, 0.0, 0.14);
    boat.rotation.y = (rng() - 0.5) * 0.3;
    g.add(boat);

    g.rotation.y = (rng() - 0.5) * 0.8;
    return g;
  },
};
