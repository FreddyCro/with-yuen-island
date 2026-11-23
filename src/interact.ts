// 島上互動：一份篩選狀態（地區、議題、組、篇）同時驅動上方選單、側欄、島上物件的明暗與鏡頭。
//   hover 物件 → 浮起＋提示；click 物件 → 進入該組；選地區 → 鏡頭飛到該區；選議題 → 不符合的物件變淡。
//   狀態寫進網址 ?r=&t=&g=&p=（replaceState，不留歷史）。
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GROUP_BY_KEY, TOPIC_BUCKETS, groupTitle } from './scene/groups';
import { createSidebar, type FilterState } from './ui/sidebar';
import { createFilterNav, REGIONS } from './ui/filter-nav';

interface Opts {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  dom: HTMLElement;
  holders: THREE.Group[];
  /** 離開預設狀態時呼叫（主場景要停止自動環繞）。 */
  onFocus(): void;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const EMPTY: FilterState = { region: null, topic: null, group: null, post: null };

export function setupInteraction({ camera, controls, dom, holders, onFocus }: Opts): { update(dt: number): void } {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const proxies = holders.map((h) => h.userData.proxy as THREE.Mesh);
  const holderOf = new Map(proxies.map((p, i) => [p, holders[i]]));
  const holderByKey = new Map(holders.map((h) => [h.userData.groupKey as string, h]));

  const tip = document.createElement('div');
  tip.id = 'tip';
  document.body.appendChild(tip);

  let state: FilterState = { ...EMPTY };
  let hovered: THREE.Group | null = null;
  let home: { pos: THREE.Vector3; target: THREE.Vector3; minD: number } | null = null;
  let fly: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; k: number } | null = null;

  const sidebar = createSidebar({
    onClose: () => set({ ...EMPTY }),
    onTopic: (topic) => set({ ...state, topic, post: null }),
    onGroup: (group, post = null) => set({ ...state, group, post }),
    onBack: () => set({ ...state, group: null, post: null }),
    onPost: (post) => set({ ...state, post }, { camera: false }),
  });
  const nav = createFilterNav({ onFilter: (region, topic) => set({ region, topic, group: null, post: null }) });

  // ── 狀態 → 畫面 ──
  function set(next: FilterState, opt: { camera?: boolean } = {}): void {
    const prev = state;
    state = next;
    const neutral = !next.region && !next.topic && !next.group;
    if (!neutral && !home) home = { pos: camera.position.clone(), target: controls.target.clone(), minD: controls.minDistance };
    if (!neutral) onFocus();
    // 篩選或聚焦時藏行政區標籤（側欄標題已經寫了地區，標籤只會擋視線）
    document.body.classList.toggle('filtering', !neutral);
    dim();
    sidebar.render(state);
    nav.render(state);
    writeUrl();
    if (opt.camera === false) return;
    // 鏡頭：組 > 地區 > 回原位；只換議題不動鏡頭
    if (next.group && next.group !== prev.group) flyToGroup(holderByKey.get(next.group)!);
    else if (!next.group && next.region && (next.region !== prev.region || prev.group)) flyToRegion(next.region);
    else if (neutral && home) { flyTo(home.pos, home.target); controls.minDistance = home.minD; home = null; }
    else if (!next.group && !next.region && prev.group && home) flyTo(home.pos, home.target);
  }

  /** 物件是否「亮著」：有選組 → 只有那組；否則看地區與議題。 */
  function active(h: THREE.Group): boolean {
    const g = GROUP_BY_KEY.get(h.userData.groupKey)!;
    if (state.group) return g.key === state.group;
    return (!state.region || g.island === state.region) && (!state.topic || (g.topics[state.topic] ?? 0) > 0);
  }

  function dim(): void {
    const any = state.region || state.topic || state.group;
    for (const h of holders) {
      const fade = !!any && !active(h);
      h.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (!m || o === h.userData.proxy) return;
        // 變淡的物件不投影（半透明物件的影子會在地上留一團髒影）
        if (o.userData.baseCast === undefined) o.userData.baseCast = o.castShadow;
        o.castShadow = fade ? false : o.userData.baseCast;
        for (const mm of Array.isArray(m) ? m : [m]) {
          if (mm.userData.baseOpacity === undefined) mm.userData.baseOpacity = mm.opacity;
          const transparent = fade || mm.userData.baseOpacity < 1;
          if (mm.transparent !== transparent) { mm.transparent = transparent; mm.needsUpdate = true; } // 切換透明要重編 shader
          mm.opacity = fade ? 0.55 : mm.userData.baseOpacity; // 0.22 太淡，其他物件幾乎看不見；0.55 還看得出形狀又分得出主次
          mm.depthWrite = !fade;
        }
      });
    }
  }

  // ── 鏡頭 ──
  function flyTo(pos: THREE.Vector3, target: THREE.Vector3): void {
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, k: 0 };
  }
  /** 側欄佔右邊：目標點往鏡頭右側偏，讓主體落在畫面左半（手機則往下偏、讓出底部面板）。 */
  function frame(at: THREE.Vector3, dist: number): void {
    const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const shift = innerWidth > 720 ? right.multiplyScalar(-dist * 0.22) : new THREE.Vector3(0, -dist * 0.15, 0);
    flyTo(at.clone().add(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, dist * 0.65, 0)).add(shift), at.clone().add(shift));
  }
  function flyToGroup(h: THREE.Group): void {
    controls.minDistance = 4;
    const at = new THREE.Vector3(); h.getWorldPosition(at); at.y += 0.8 * h.scale.y;
    frame(at, 9 + 2 * h.scale.x);
  }
  function flyToRegion(region: string): void {
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (const h of holders) if (GROUP_BY_KEY.get(h.userData.groupKey)!.island === region) box.expandByPoint(h.getWorldPosition(p));
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    controls.minDistance = 4;
    frame(box.getCenter(new THREE.Vector3()), Math.max(size.x, size.z) * 1.1 + 14);
  }

  // ── hover / click ──
  function pick(e: PointerEvent): THREE.Group | null {
    const r = dom.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(proxies, false)[0];
    return hit ? holderOf.get(hit.object as THREE.Mesh)! : null;
  }
  function setHover(h: THREE.Group | null, e?: PointerEvent): void {
    if (hovered !== h) {
      if (hovered) hovered.position.y = hovered.userData.baseY;
      hovered = h;
      if (h) h.position.y = h.userData.baseY + 0.25;
      dom.style.cursor = h ? 'pointer' : '';
    }
    if (h && e) {
      const g = GROUP_BY_KEY.get(h.userData.groupKey)!;
      const n = state.topic ? g.topics[state.topic] ?? 0 : g.count;
      tip.innerHTML = `${groupTitle(g)} <b>${n}</b> 篇${state.topic ? `（${state.topic}）` : ''}`;
      tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
      tip.classList.add('on');
    } else tip.classList.remove('on');
  }

  // click 與拖曳分開：按下到放開移動 < 6px 才算點
  let down: { x: number; y: number } | null = null;
  dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  dom.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const h = pick(e);
    // 點已選取的物件 → 取消選取，全部恢復（等同 Esc）；點別的物件 → 換組；點空白 → 退一層
    if (h) { if (h.userData.groupKey !== state.group) set({ ...state, group: h.userData.groupKey, post: null }); else back(); }
    else back();
  });
  dom.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !down) setHover(pick(e), e); });
  dom.addEventListener('pointerleave', () => setHover(null));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

  /** Esc／點空白：單組 → 回篩選清單（有篩選時）；篩選 → 全部清掉。 */
  function back(): void {
    if (state.group && (state.region || state.topic)) set({ ...state, group: null, post: null });
    else if (state.region || state.topic || state.group) set({ ...EMPTY });
  }

  // ── 網址 ──
  function writeUrl(): void {
    const q = new URLSearchParams(location.search);
    const put = (k: string, v: string | number | null) => (v == null || v === '' ? q.delete(k) : q.set(k, String(v)));
    put('r', state.region); put('t', state.topic); put('g', state.group); put('p', state.group ? state.post : null);
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? `?${s}` : ''));
  }
  {
    const q = new URLSearchParams(location.search);
    const region = REGIONS.includes(q.get('r') ?? '') ? q.get('r') : null;
    const topic = TOPIC_BUCKETS.includes(q.get('t') ?? '') ? q.get('t') : null;
    const group = holderByKey.has(q.get('g') ?? '') ? q.get('g') : null;
    const post = group && q.get('p') ? Number(q.get('p')) : null;
    nav.render(state);
    if (region || topic || group) requestAnimationFrame(() => set({ region, topic, group, post }));
  }

  return {
    update(dt: number) {
      if (!fly) return;
      fly.k = Math.min(1, fly.k + dt / 0.9);
      const e = ease(fly.k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (fly.k >= 1) fly = null;
    },
  };
}
