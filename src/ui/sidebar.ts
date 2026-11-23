// 政績側欄：兩種畫面，由同一份狀態（地區、議題、組、篇）決定。純 DOM，不依賴 three。
//   篩選模式（選了地區或議題、沒選組）：依類型分段，每段列最新 3 篇＋「看全部 →」。
//   單組模式（點了物件）：年份分段、點一篇展開；有篩選時上方可返回篩選清單。
import { BUCKET_COLOR, GROUPS, TOPIC_BUCKETS, elementLabel, groupTitle, type Group, type GroupPost } from '../scene/groups';

export interface FilterState {
  region: string | null;  // 島名：淡水／八里／三芝／石門／議會
  topic: string | null;   // TOPIC_BUCKETS 之一
  group: string | null;   // groupKey
  post: number | null;
}

export interface SidebarHandlers {
  onClose(): void;
  onTopic(topic: string | null): void;
  onGroup(key: string, post?: number | null): void;
  onBack(): void;
  onPost(id: number | null): void;
}

export const regionLabel = (r: string) => (r === '議會' ? '議會' : `${r}區`);
export const filterTitle = (s: Pick<FilterState, 'region' | 'topic'>) =>
  [s.region ? regionLabel(s.region) : '全部地區', s.topic].filter(Boolean).join(' · ');

/** 符合地區與議題的貼文篇數。 */
export function countFor(region: string | null, topic: string | null, groups: Group[] = GROUPS): number {
  return groups.filter((g) => !region || g.island === region).reduce((a, g) => a + (topic ? g.topics[topic] ?? 0 : g.count), 0);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const colorOf = (t: string) => BUCKET_COLOR[t] ?? BUCKET_COLOR['其他'];

export function createSidebar(h: SidebarHandlers): { render(s: FilterState): void } {
  const el = document.createElement('aside');
  el.id = 'panel';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <nav class="crumb"></nav>
    <header>
      <div><h2></h2><p class="meta"></p></div>
      <button class="x" aria-label="關閉">✕</button>
    </header>
    <div class="bar"></div>
    <div class="chips"></div>
    <div class="list"></div>`;
  document.body.appendChild(el);
  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;

  let last: FilterState | null = null;

  /** 議題比例條＋篩選鈕（兩種模式共用）。topics = 各議題篇數、total = 全部篇數。 */
  function topicBar(topics: Record<string, number>, total: number, active: string | null): void {
    $('.bar').innerHTML = TOPIC_BUCKETS.filter((t) => topics[t]).map((t) =>
      `<span style="flex:${topics[t]};background:${colorOf(t)}" title="${t} ${topics[t]} 篇"></span>`).join('');
    const chips: Array<[string | null, string, number]> = [[null, '全部', total], ...TOPIC_BUCKETS.filter((t) => topics[t]).map((t) => [t, t, topics[t]] as [string, string, number])];
    $('.chips').innerHTML = chips.map(([t, label, n]) =>
      `<button data-t="${t ?? ''}" class="${t === active ? 'on' : ''}">${t ? `<i style="background:${colorOf(t)}"></i>` : ''}${label} <small>${n}</small></button>`).join('');
  }

  function renderFilter(s: FilterState): void {
    const groups = GROUPS.filter((g) => !s.region || g.island === s.region);
    const topics = Object.fromEntries(TOPIC_BUCKETS.map((t) => [t, countFor(s.region, t)]));
    const total = countFor(s.region, null);
    const match = (p: GroupPost) => !s.topic || p.topic === s.topic;
    const sections = groups
      .map((g) => ({ g, posts: g.posts.filter(match) }))
      .filter((x) => x.posts.length)
      .sort((a, b) => b.posts.length - a.posts.length);
    $('.crumb').innerHTML = '';
    $('h2').textContent = filterTitle(s);
    $('.meta').textContent = `${countFor(s.region, s.topic)} 篇 · ${sections.length} 類`;
    topicBar(topics, total, s.topic);
    $('.list').innerHTML = sections.map(({ g, posts }) => `
      <section class="grp">
        <button class="gh" data-g="${g.key}">
          <span class="thumb" style="background:${colorOf(s.topic ?? (g.colorTopic === '交通' ? '交通' : g.colorTopic === '民生' ? '民生' : g.colorTopic === '校園' || g.colorTopic === '教育' ? '教育與校園' : '其他'))}"></span>
          <span class="txt"><b>${esc(s.region ? elementLabel(g.element) : groupTitle(g))}</b><small>${posts.length} 篇</small></span>
          <span class="go">看位置 →</span>
        </button>
        ${posts.slice(0, 3).map((p) => `
          <button class="mini" data-g="${g.key}" data-p="${p.id}"><time>${p.date.slice(0, 7).replace('-', '/')}</time>${esc(p.title)}</button>`).join('')}
        ${posts.length > 3 ? `<button class="more" data-g="${g.key}">看全部 ${posts.length} 篇 →</button>` : ''}
      </section>`).join('') || '<p class="empty">沒有符合的政績</p>';
  }

  function renderGroup(s: FilterState, g: Group): void {
    $('.crumb').innerHTML = s.region || s.topic
      ? `<button class="back">← ${esc(filterTitle({ region: s.region, topic: s.topic }))}</button>` : '';
    $('h2').textContent = groupTitle(g);
    $('.meta').textContent = `${g.count} 篇 · ${g.from.slice(0, 4)}–${g.to.slice(0, 4)}`;
    topicBar(g.topics, g.count, s.topic);
    const list = g.posts.filter((p) => !s.topic || p.topic === s.topic);
    const years = new Map<string, GroupPost[]>();
    for (const p of list) (years.get(p.date.slice(0, 4)) ?? years.set(p.date.slice(0, 4), []).get(p.date.slice(0, 4))!).push(p);
    // 展開的那篇所在年份打開；被篩掉就打開最新一年
    const openYear = list.find((p) => p.id === s.post)?.date.slice(0, 4) ?? [...years.keys()][0];
    $('.list').innerHTML = [...years].map(([y, ps]) => `
      <details ${y === openYear ? 'open' : ''}>
        <summary>${y} <small>${ps.length} 篇</small></summary>
        ${ps.map((p) => item(g, p, p.id === s.post)).join('')}
      </details>`).join('') || '<p class="empty">這個議題沒有政績</p>';
  }

  function item(g: Group, p: GroupPost, on: boolean): string {
    const color = colorOf(p.topic);
    return `
      <article class="post ${on ? 'on' : ''}" data-id="${p.id}">
        <button class="row">
          <span class="thumb" style="background:${color}"></span>
          <span class="txt"><time>${p.date.slice(5).replace('-', '/')}</time>${esc(p.title)}</span>
        </button>
        ${on ? `
        <div class="body">
          <div class="ph" style="background:${color}"><span>${esc(elementLabel(g.element))}</span><small>圖片準備中</small></div>
          <p>${esc(p.excerpt)}</p>
          <p class="foot"><span>${p.date.replace(/-/g, '/')} · ${p.topic}</span><a href="${esc(p.link)}" target="_blank" rel="noopener">閱讀原文 ↗</a></p>
        </div>` : ''}
      </article>`;
  }

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.x')) return h.onClose();
    if (t.closest('.back')) return h.onBack();
    const chip = t.closest('.chips button') as HTMLElement | null;
    if (chip) return h.onTopic(chip.dataset.t || null);
    const jump = t.closest('.gh, .mini, .more') as HTMLElement | null;
    if (jump) return h.onGroup(jump.dataset.g!, jump.dataset.p ? Number(jump.dataset.p) : null);
    const row = t.closest('.row');
    if (row && last) {
      const id = Number((row.parentElement as HTMLElement).dataset.id);
      h.onPost(last.post === id ? null : id);
    }
  });

  return {
    render(s) {
      const open = !!(s.region || s.topic || s.group);
      const g = s.group ? GROUPS.find((x) => x.key === s.group) : undefined;
      const view = (x: FilterState | null) => (x ? `${x.region}|${x.group}` : '');
      const sameView = view(last) === view(s) && last?.topic === s.topic;
      const scroll = $('.list').scrollTop;
      if (open) { if (g) renderGroup(s, g); else renderFilter(s); }
      // 同一個畫面只換展開的那篇：保留捲動位置；換畫面就回到頂端
      $('.list').scrollTop = sameView ? scroll : 0;
      if (!sameView && s.post != null) el.querySelector(`.post[data-id="${s.post}"]`)?.scrollIntoView({ block: 'center' });
      el.classList.toggle('open', open);
      el.setAttribute('aria-hidden', String(!open));
      last = { ...s };
    },
  };
}
