import * as THREE from 'three';
import { ELEMENT_PAL, type ElementDef } from '../types';

/** 告示牌：兜底元素。一根木柱、一塊 topic 色的牌子。 */
export const sign: ElementDef = {
  id: 'sign',
  label: '告示牌',
  island: 'local',
  build({ color, rng }) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6), new THREE.MeshStandardMaterial({ color: ELEMENT_PAL.wood, roughness: 1 }));
    post.position.y = 0.4;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.06), new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }));
    board.position.y = 0.78;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.42, 0.04), new THREE.MeshStandardMaterial({ color: ELEMENT_PAL.white, roughness: 0.9 }));
    frame.position.y = 0.78; frame.position.z = -0.02;
    post.castShadow = board.castShadow = true;
    g.add(post, frame, board);
    g.rotation.y = (rng() - 0.5) * 0.6;
    return g;
  },
};
