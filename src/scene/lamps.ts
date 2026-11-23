// 路燈：放在格與格的連接路（兩扇門之間）旁，一盞微微發光（自發光燈頭 + 加色光暈，不用 PointLight，省效能）。
import * as THREE from 'three';
import type { RoadNetwork } from './roads';
import { ROAD_W } from './roads';

const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a4a46, roughness: 0.9 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd27a, emissiveIntensity: 1.4, roughness: 0.6 });
let _glowTex: THREE.CanvasTexture | null = null;
function glowTexture(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,230,170,0.9)'); g.addColorStop(0.4, 'rgba(255,210,120,0.35)'); g.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(cv);
  return _glowTex;
}

export interface LampSpec { x: number; y: number; z: number; rot: number }

/** 每條連接路一盞：在路中點、往路的側邊偏（ROAD_W/2 + 0.35），燈頭朝路。 */
export function lampSpots(net: RoadNetwork): LampSpec[] {
  return net.links.map(([a, b]) => {
    const mid = a.clone().lerp(b, 0.5);
    const d = b.clone().sub(a).setY(0).normalize();
    const side = new THREE.Vector3(-d.z, 0, d.x);
    const p = mid.add(side.multiplyScalar(ROAD_W / 2 + 0.35));
    return { x: p.x, y: p.y, z: p.z, rot: Math.atan2(-side.x, -side.z) }; // 燈臂朝路（−side）
  });
}

/** 建所有路燈，回傳 group（世界座標）與每幀更新（燈光微微呼吸）。 */
export function buildLamps(net: RoadNetwork): { object: THREE.Group; update(t: number): void } {
  const g = new THREE.Group();
  const glows: THREE.Sprite[] = [];
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 1.6, 6);
  const armGeo = new THREE.BoxGeometry(0.4, 0.04, 0.04);
  const headGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (const s of lampSpots(net)) {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 0.8; pole.castShadow = true;
    const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(0, 1.58, 0.2);
    const head = new THREE.Mesh(headGeo, headMat); head.position.set(0, 1.52, 0.38);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd98a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(head.position); glow.scale.setScalar(1.1);
    lamp.add(pole, arm, head, glow);
    lamp.position.set(s.x, s.y, s.z); lamp.rotation.y = s.rot;
    g.add(lamp); glows.push(glow);
  }
  return {
    object: g,
    update(t: number) { glows.forEach((gl, i) => { gl.material.opacity = 0.45 + 0.15 * Math.sin(t * 2.1 + i * 1.7); }); },
  };
}
