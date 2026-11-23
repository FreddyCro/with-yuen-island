import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

const mat = (c: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });

/** 修復工程：一段護岸擋土牆（混凝土）＋後方土坡；前面是一台小挖土機（topic 色機身、黑履帶）或幾個交通錐。 */
export const repair: ElementDef = {
  id: 'repair',
  label: '修復工程',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();

    // 土坡（擋土牆後方的半球）
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9c7a55));
    mound.scale.set(1.1, 0.7, 0.8);
    mound.position.set(0, 0, -0.45);
    mound.castShadow = true;
    // 擋土牆：直立混凝土牆 + 頂緣
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.14), mat(ELEMENT_PAL.concrete));
    wall.position.set(0, 0.26, -0.12);
    wall.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.18), mat(ELEMENT_PAL.grey));
    cap.position.set(0, 0.545, -0.12);
    cap.castShadow = true;
    g.add(mound, wall, cap);

    if (rng() < 0.65) {
      // 小挖土機
      const ex = new THREE.Group();
      const tracks = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.3), mat(ELEMENT_PAL.dark));
      tracks.position.y = 0.05;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.26), mat(color));
      body.position.y = 0.17;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), mat(ELEMENT_PAL.white));
      cab.position.set(-0.07, 0.31, 0.05);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.06), mat(color));
      boom.rotation.z = 0.7; boom.position.set(0.26, 0.33, -0.04);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.05), mat(color));
      arm.rotation.z = -1.0; arm.position.set(0.46, 0.3, -0.04);
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat(ELEMENT_PAL.dark));
      bucket.position.set(0.54, 0.1, -0.04);
      for (const m of [tracks, body, cab, boom, arm, bucket]) m.castShadow = true;
      ex.add(tracks, body, cab, boom, arm, bucket);
      ex.scale.setScalar(1.3);
      ex.position.set(-0.12, 0, 0.3);
      ex.rotation.y = 0.4 + (rng() - 0.5) * 0.6;
      g.add(ex);
    } else {
      // 交通錐 ×3（橘錐 + 白帶）
      const n = 3;
      for (let i = 0; i < n; i++) {
        const x = (i - 1) * 0.28 + (rng() - 0.5) * 0.08, z = 0.25 + (rng() - 0.5) * 0.12;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), mat(0xe8884a));
        cone.position.set(x, 0.1, z);
        cone.castShadow = true;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.047, 0.035, 6), mat(ELEMENT_PAL.white));
        band.position.set(x, 0.11, z);
        g.add(cone, band);
      }
      // 一塊 topic 色的工程告示板，讓 topic 色仍看得到
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.03), mat(color));
      board.position.set(0.4, 0.2, 0.05);
      board.rotation.y = -0.5;
      board.castShadow = true;
      g.add(board);
    }

    g.scale.setScalar(1.15);
    g.rotation.y = (rng() - 0.5) * 0.7;
    return g;
  },
};
