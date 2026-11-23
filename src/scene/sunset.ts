// 夕陽模式（預設；?sunset=0 回白天）：太陽落在「淡江大橋 → 議會」的方向、低仰角；天空漸層、暖色平行光、紫調補光、
// 海面有反光帶、霧色換成地平線橘。只改光與環境，不改格子與元素的材質。
import * as THREE from 'three';

export const SUNSET = {
  skyTop: 0x5c62a3,     // 天頂：偏紫藍
  skyMid: 0xd08a94,     // 中段：玫瑰
  horizon: 0xf5a05a,    // 地平線：橘
  sun: 0xffd9a0,        // 太陽盤
  sunLight: 0xffb070,   // 平行光
  hemiSky: 0xf3cdb4,    // 半球光天空側
  hemiGround: 0xa092b0, // 半球光地面側（淡紫影，不能太暗，字和元素要看得清）
  sea: 0x8894c0,        // 海面：偏藍紫，太陽反光自己會染橘
  fog: 0xe3ad8c,
} as const;

export const SUN_DIST = 140, SUN_ELEV_DEG = 9;

/** 太陽位置：從橋中點指向議會的水平方向，距原點 SUN_DIST，仰角 SUN_ELEV_DEG。 */
export function sunsetSunPosition(bridgeMid: THREE.Vector3, council: THREE.Vector3): THREE.Vector3 {
  const dir = council.clone().sub(bridgeMid).setY(0).normalize();
  const p = dir.multiplyScalar(SUN_DIST);
  p.y = SUN_DIST * Math.tan((SUN_ELEV_DEG * Math.PI) / 180);
  return p;
}

/** 天空漸層貼圖（2D 背景，不隨鏡頭轉）。 */
function skyTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
  g.addColorStop(0, hex(SUNSET.skyTop)); g.addColorStop(0.55, hex(SUNSET.skyMid)); g.addColorStop(0.78, hex(SUNSET.horizon)); g.addColorStop(1, hex(SUNSET.horizon));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 柔邊圓盤貼圖（中心不透明、邊緣漸透明）。 */
function discTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

export interface SunsetTargets { scene: THREE.Scene; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; seaMat: THREE.MeshStandardMaterial }

/** 套用夕陽：改背景、霧、兩盞燈、海面材質，並在太陽方向放一個發光盤與光暈。 */
export function applySunset(t: SunsetTargets, sunPos: THREE.Vector3): void {
  t.scene.background = skyTexture();
  t.scene.fog = new THREE.Fog(SUNSET.fog, 150, 380); // 火山口山稜在 110–190
  t.sun.color.set(SUNSET.sunLight); t.sun.intensity = 1.2;
  t.sun.position.copy(sunPos);
  Object.assign(t.sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 400 });
  t.sun.shadow.camera.updateProjectionMatrix();
  t.hemi.color.set(SUNSET.hemiSky); t.hemi.groundColor.set(SUNSET.hemiGround); t.hemi.intensity = 2.0;
  t.seaMat.color.set(SUNSET.sea); t.seaMat.roughness = 0.45; t.seaMat.metalness = 0; // 沒有環境貼圖，metalness 只會讓海變黑

  // 太陽盤 + 光暈：sprite 永遠面向鏡頭，放在太陽方向的遠處
  const dir = sunPos.clone().normalize();
  const at = dir.clone().multiplyScalar(300); at.y = Math.max(at.y, 8);
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(), color: SUNSET.sun, fog: false, depthWrite: false }));
  disc.position.copy(at); disc.scale.setScalar(22);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(), color: SUNSET.horizon, transparent: true, opacity: 0.45, fog: false, depthWrite: false }));
  glow.position.copy(at); glow.scale.setScalar(70);
  t.scene.add(glow, disc);
}
