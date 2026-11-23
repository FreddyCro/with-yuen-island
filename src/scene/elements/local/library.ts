import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

/** 圖書館：一棟方正建築（topic 色外牆、大窗、淺色屋頂）+ 門口一本翻開的大書。 */
export const library: ElementDef = {
  id: 'library',
  label: '圖書館',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const H = 1.1 + rng() * 0.25;

    // 主體：topic 色外牆
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, H, 1.0), mat(color));
    body.position.y = H / 2;
    body.castShadow = true;
    g.add(body);

    // 屋頂板（淺色，略大於牆）
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 1.12), mat(ELEMENT_PAL.white));
    roof.position.y = H + 0.05;
    roof.castShadow = true;
    g.add(roof);

    // 正面大窗：一整面玻璃帶（水色），分兩層
    const glass = mat(ELEMENT_PAL.water);
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, H * 0.28, 0.04), glass);
    win1.position.set(0, H * 0.68, 0.51);
    const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, H * 0.22, 0.04), glass);
    win2.position.set(0.15, H * 0.3, 0.51);
    g.add(win1, win2);

    // 窗框豎條（白色），一個 mesh 蓋在上層窗上
    const mullions = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, H * 0.3, 0.05), mat(ELEMENT_PAL.white));
      m.position.set(i * 0.33, H * 0.68, 0.52);
      mullions.add(m);
    }
    g.add(mullions);

    // 門（深色）
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, H * 0.32, 0.04), mat(ELEMENT_PAL.dark));
    door.position.set(-0.4, H * 0.16, 0.51);
    g.add(door);

    // 門口一本翻開的大書：兩片白頁呈 V 字，下面 topic 色封面
    const book = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.42), mat(color));
    cover.position.y = 0.025;
    cover.castShadow = true;
    const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.38), mat(ELEMENT_PAL.white));
    pageL.position.set(-0.15, 0.07, 0);
    pageL.rotation.z = 0.22;
    const pageR = pageL.clone();
    pageR.position.x = 0.15;
    pageR.rotation.z = -0.22;
    pageL.castShadow = pageR.castShadow = true;
    book.add(cover, pageL, pageR);
    book.position.set(0.1, 0, 0.78);
    book.rotation.y = (rng() - 0.5) * 0.5;
    g.add(book);

    g.rotation.y = (rng() - 0.5) * 0.5;
    return g;
  },
};
