import { TYPES, LAYOUTS, REASONS, OCCASIONS, EXTRA_FIELDS, DEFAULT_TEMPLATES, DEFAULT_SETTINGS, getPalette, templateHasType, A4 } from './catalog.js';
import { defaultData, sampleData, dateRange, fmtLong, addDays, holidayRows, holidayPeriodName, buildDoc } from './copy.js';
import { renderNotice } from './render.js';
import { canvasToPdf, canvasToPng, saveBlob } from './export.js';
import { STICKERS } from './stickers.js';

const $root = document.getElementById('app');
const STEPS = ['info', 'template', 'extra', 'done'];
const FLOW = new Set(STEPS);
const LIBRARY_KEY = 'nh.library';
const LIBRARY_MAX = 60;

const state = {
  step: 'home',
  type: null,
  data: null,
  templates: [],
  settings: DEFAULT_SETTINGS,
  tplIndex: 0,
  palette: {}, // templateId → paletteId
  template: null,
  libraryId: null, // 보관함에서 불러와 수정 중인 항목
  survey: { rating: 0, willUse: null, comment: '', sent: false },
};

// ---------- 저장 / 분석 ----------
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
const vid = store.get('nh.vid') || uid();
store.set('nh.vid', vid);
let sid;
try { sid = sessionStorage.getItem('nh.sid') || uid(); sessionStorage.setItem('nh.sid', sid); } catch { sid = uid(); }

function track(name, props = {}) {
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid, vid, name, props }), keepalive: true }).catch(() => {});
}

// ---------- 유틸 ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const typeOf = (id) => TYPES.find((t) => t.id === id);
// 명절 안내는 고른 날(설날·추석·크리스마스 등)에 맞는 시안과 만능 시안만 보여준다
// occasion 을 따로 주지 않으면 지금 입력 중인 명절 이름을 쓰고, 그것도 없으면 거르지 않는다
const templatesOf = (type, occasion = type === 'holiday' && state.type === 'holiday' ? state.data?.name : null) =>
  state.templates.filter((t) => templateHasType(t, type) && (!occasion || !t.occasions?.length || t.occasions.includes(occasion)));
const paletteOf = (tpl) => state.palette[tpl.id] || tpl.palettes[0];
const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

// 캔버스를 부모 너비에 맞춰 선명하게 그린다
function draw(canvas, opts) {
  if (!canvas) return Promise.resolve();
  const cssW = canvas.parentElement?.clientWidth || 300;
  if (!cssW) return Promise.resolve();
  const width = Math.min(1240, Math.round(cssW * Math.min(2.5, window.devicePixelRatio || 1)));
  return renderNotice(canvas, { ...opts, width });
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ---------- 화면 골격 (헤더 + 본문 + 하단 탭) ----------
$root.innerHTML = `
  <header class="gheader">
    <button class="brand" data-act="nav-splash">뚝딱</button>
    <nav class="tabs" aria-label="주요 메뉴">
      <button class="tab" data-act="nav-create" data-tab="create">생성</button>
      <button class="tab" data-act="nav-library" data-tab="library">보관함</button>
    </nav>
  </header>
  <div id="view" class="view"></div>
  <nav class="bnav" aria-label="주요 메뉴">
    <button class="bnav-item" data-act="nav-create" data-tab="create">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>생성</span>
    </button>
    <button class="bnav-item" data-act="nav-library" data-tab="library">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 11h6" /></svg><span>보관함</span>
    </button>
  </nav>`;
const $view = document.getElementById('view');

function syncChrome() {
  const tab = state.step === 'library' ? 'library' : 'create';
  $root.querySelectorAll('[data-tab]').forEach((el) => {
    el.classList.toggle('on', el.dataset.tab === tab);
    el.setAttribute('aria-current', el.dataset.tab === tab ? 'page' : 'false');
  });
  // 만드는 중(하단 CTA 가 있는 단계)에는 모바일 하단 탭을 숨긴다
  document.body.classList.toggle('in-flow', FLOW.has(state.step));
  // 첫 화면(스플래시)은 헤더·하단 탭 없이 전체 화면으로
  document.body.classList.toggle('is-splash', state.step === 'splash');
}

function progress(step) {
  const i = STEPS.indexOf(step);
  return `<div class="progress" aria-label="${i + 1}/${STEPS.length} 단계">${STEPS.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>`;
}
function topbar(step, title) {
  return `<div class="topbar">
    <button class="back" data-act="back" aria-label="뒤로">‹</button>
    <div class="topbar-title">${esc(title)}</div>
    <span class="topbar-step">${STEPS.indexOf(step) + 1}/${STEPS.length}</span>
  </div>${progress(step)}`;
}

// ---------- 라우팅 ----------
function go(step, { push = true } = {}) {
  state.step = step;
  if (push) history.pushState({ step }, '', step === 'splash' ? location.pathname : `#${step}`);
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', (e) => {
  state.step = e.state?.step || 'splash';
  render();
});

function render() {
  if (FLOW.has(state.step) && !state.type) state.step = 'home';
  if ((state.step === 'extra' || state.step === 'done') && !state.template) state.step = state.type ? 'template' : 'home';
  syncChrome();
  ({ splash, home, info, template: templateScreen, extra, done, library }[state.step] || splash)();
}

let lastWidth = window.innerWidth;
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // 모바일 키보드로 높이만 바뀌는 경우는 무시
    if (Math.abs(window.innerWidth - lastWidth) < 60) return;
    lastWidth = window.innerWidth;
    redraw();
  }, 200);
});
function redraw() {
  if (state.step === 'splash') drawSplashPosters();
  if (state.step === 'info') drawLive();
  if (state.step === 'template') templatesOf(state.type).forEach(drawSlide);
  if (state.step === 'extra' || state.step === 'done') drawFinal();
  if (state.step === 'library') drawLibraryThumbs();
}

// ---------- 첫 화면 (스플래시) ----------
function splash() {
  $view.innerHTML = `
  <main class="splash">
    <div class="splash-brand">뚝딱</div>
    <h1>원하는 안내문,<br>뚝딱 만들어 드려요</h1>
    <span class="pill-tag">회원가입 없이 무료</span>
    <div class="stage" aria-hidden="true">
      <div class="stage-track" id="stage-track" style="--n:${SPLASH_POSTERS.length}">
        ${Array.from({ length: SPLASH_POSTERS.length * 3 }, (_, k) => `<div class="ccard"><div class="type-thumb" data-poster="${k}"></div></div>`).join('')}
      </div>
    </div>
    <div class="splash-cta">
      <button class="btn primary big" data-act="start">안내문 만들기 시작</button>
      <button class="link-btn" data-act="nav-library">내 보관함 보기</button>
    </div>
  </main>`;
  drawSplashPosters();
}

// ---------- 공지 유형 선택 ----------
function home() {
  $view.innerHTML = `
  <main class="screen home">
    <section class="hero">
      <h1>어떤 안내문을<br class="m-only"> 만들까요?</h1>
      <p class="lead">날짜·시간만 넣으면 바로 붙일 수 있는 안내문이 완성돼요.</p>
    </section>
    <div class="type-list">
      ${TYPES.map((t) => {
        const badge = state.settings.typeBadges?.[t.id];
        const count = templatesOf(t.id, null).length;
        return `<button class="tcard" data-type="${t.id}">
          <span class="tcard-meta">
            <span class="tcard-count"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1.5" width="9" height="12" rx="1.5"/><path d="M5 4.5h4M5 7h4"/><path d="M13.5 4v9.5a1.5 1.5 0 0 1-1.5 1.5H5"/></svg>디자인 ${count}종</span>
            ${badge ? `<span class="tcard-badge">${esc(badge)}</span>` : ''}
          </span>
          <span class="tcard-title">${esc(t.short)}</span>
          <span class="tcard-desc">${esc(t.desc)}</span>
          <span class="tcard-stickers">${STICKERS[t.id].map((s) => `<span class="sticker">${s}</span>`).join('')}</span>
        </button>`;
      }).join('')}
    </div>
  </main>`;
}

// 첫 화면에 띄우는 포스터 — 피그마 시안 01 추석, 04 레드 크리스마스, 16 사진(노을), 11 주간 Notice, 10 메모지, 09 블루 그라데이션, 03 크리스마스 트리
const SPLASH_POSTERS = [
  { id: 'chuseok-moon', type: 'holiday', data: { ...sampleData('holiday', '추석'), start: '2026-09-24', end: '2026-09-27', mode: 'allClosed', days: {}, storeName: '뚝딱 베이커리' } },
  { id: 'xmas-red', type: 'holiday', data: { ...sampleData('holiday', '크리스마스'), storeName: '뚝딱 카페' } },
  { id: 'photo', type: 'closed', palette: 'dusk', data: { ...sampleData('closed'), start: '2026-08-03', end: '2026-08-07', multi: true, reason: '', storeName: '뚝딱 플라워' } },
  { id: 'week-notice', type: 'closed', data: { ...sampleData('closed'), start: '2026-03-16', end: '2026-03-17', multi: true, reason: '', storeName: '뚝딱 공방' } },
  { id: 'memo-dark', type: 'holiday', data: { ...sampleData('holiday', '크리스마스'), mode: 'allClosed', days: {}, storeName: '뚝딱 카페' } },
  { id: 'blue-gradient', type: 'closed', data: { ...sampleData('closed'), start: '2026-08-03', end: '2026-08-10', multi: true, reason: '', storeName: '뚝딱 카페' } },
  { id: 'xmas-tree', type: 'holiday', data: { ...sampleData('holiday', '크리스마스'), storeName: '뚝딱 카페' } },
];

// 끊김 없이 흘러가도록 포스터를 3벌 이어 붙인다 (움직임은 CSS 애니메이션).
// 그리기는 한 벌만 하고 나머지는 그린 캔버스를 복사한다.
async function drawSplashPosters() {
  const n = SPLASH_POSTERS.length;
  await Promise.all(SPLASH_POSTERS.map((p, i) => {
    const holder = $view.querySelector(`[data-poster="${n + i}"]`);
    const tpl = state.templates.find((t) => t.id === p.id) || DEFAULT_TEMPLATES.find((t) => t.id === p.id);
    if (!holder || !tpl) return null;
    let c = holder.querySelector('canvas');
    if (!c) { c = document.createElement('canvas'); holder.appendChild(c); }
    return draw(c, { type: p.type, data: p.data, template: tpl, paletteId: p.palette || tpl.palettes[0] });
  }));
  for (let i = 0; i < n; i++) {
    const src = $view.querySelector(`[data-poster="${n + i}"] canvas`);
    if (!src?.width) continue;
    for (const k of [i, 2 * n + i]) {
      const holder = $view.querySelector(`[data-poster="${k}"]`);
      if (!holder) continue;
      let c = holder.querySelector('canvas');
      if (!c) { c = document.createElement('canvas'); holder.appendChild(c); }
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
    }
  }
}

function chooseType(type) {
  if (state.type !== type || state.libraryId) {
    const saved = store.get('nh.common', {});
    state.data = { ...defaultData(type), storeName: saved.storeName || '', showStore: saved.showStore ?? true };
    state.tplIndex = 0;
    state.template = null;
    state.libraryId = null;
  }
  state.type = type;
  track('type_select', { type });
  go('info');
}

// ---------- 1. 기본 정보 입력 ----------
const chips = (key, options, value) =>
  `<div class="chips">${options.map(([v, label]) => `<button type="button" class="chip ${String(value) === String(v) ? 'on' : ''}" data-chip="${key}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
const field = (label, inner, hint = '') => `<div class="field"><label class="label">${label}</label>${inner}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
const input = (key, type, value, attrs = '') => `<input class="input" type="${type}" data-k="${key}" value="${esc(value)}" ${attrs}>`;
const timeRange = (a, b, va, vb) => `<div class="row2">${input(a, 'time', va)}<span class="tilde">~</span>${input(b, 'time', vb)}</div>`;
const toggle = (key, label, on) => `<label class="toggle"><input type="checkbox" data-k="${key}" ${on ? 'checked' : ''} data-rerender><span class="switch"></span><span>${label}</span></label>`;

// 입력 항목을 묶는 섹션 카드
const section = (title, inner) => `<section class="fcard"><h3 class="fcard-title">${title}</h3><div class="fcard-body">${inner}</div></section>`;

function infoForm() {
  const d = state.data;
  const dates = (labelOne, labelMany) => d.multi
    ? field(labelMany, `<div class="row2 dates">${input('start', 'date', d.start)}<span class="tilde">~</span>${input('end', 'date', d.end)}</div>`)
    : field(labelOne, input('start', 'date', d.start));
  switch (state.type) {
    case 'holiday': {
      const days = dateRange(d.start, d.end);
      const rows = holidayRows(d);
      return `
      ${section('어떤 날인가요?', `
        ${chips('name', OCCASIONS.map((o) => [o, o === '기타' ? '기타 공휴일' : o]), d.name)}
        ${d.name === '기타' ? field('공휴일 이름', input('customName', 'text', d.customName, 'placeholder="예: 한글날, 성탄절" maxlength="12"')) : ''}`)}
      ${section('기간과 영업시간', `
        ${field('기간', `<div class="row2 dates">${input('start', 'date', d.start, 'data-rerender')}<span class="tilde">~</span>${input('end', 'date', d.end, 'data-rerender')}</div>`, '하루만 해당되면 같은 날짜를 고르세요.')}
        ${field('평소 영업시간', timeRange('open', 'close', d.open, d.close))}`)}
      ${section('연휴 동안 어떻게 하시나요?', `
        ${chips('mode', [['normal', '정상영업'], ['allClosed', '전체휴무'], ['oneDay', '하루만 휴무'], ['partial', '일부 단축영업']], d.mode)}
        ${d.mode === 'oneDay' || d.mode === 'partial' ? field('날짜별로 정해주세요', `<div class="days">${days.map((iso, i) => {
          const r = rows[i];
          return `<div class="day">
            <div class="day-head"><b>${fmtLong(iso)}</b>
            ${chips(`day:${iso}`, [['on', '정상'], ['off', '휴무'], ['short', '단축']], r.status)}</div>
            ${r.status === 'short' ? `<div class="row2">${input(`dayt:${iso}:open`, 'time', d.days[iso]?.open || d.open)}<span class="tilde">~</span>${input(`dayt:${iso}:close`, 'time', d.days[iso]?.close || '17:00')}</div>` : ''}
          </div>`;
        }).join('')}</div>`) : ''}`)}`;
    }
    case 'closed':
      return `
      ${section('언제 쉬시나요?', `
        ${chips('multi', [['false', '하루'], ['true', '여러 날']], d.multi)}
        ${dates('휴무 날짜', '휴무 기간')}`)}
      ${section('휴무 시간', `
        ${chips('allDay', [['true', '종일 휴무'], ['false', '특정 시간만']], d.allDay)}
        ${d.allDay ? '' : field('쉬는 시간', timeRange('from', 'to', d.from, d.to))}`)}`;
    case 'short':
      return `
      ${section('언제 단축하시나요?', `
        ${chips('multi', [['false', '하루'], ['true', '여러 날']], d.multi)}
        ${dates('날짜', '기간')}`)}
      ${section('영업시간', `
        ${field('기존 영업시간', timeRange('open', 'close', d.open, d.close))}
        ${field('변경 영업시간', timeRange('newOpen', 'newClose', d.newOpen, d.newClose))}`)}`;
    case 'soldout':
      return `
      ${section('어떤 안내인가요?', chips('mode', [['early', '재료 소진 조기 마감'], ['menus', '특정 메뉴 품절']], d.mode))}
      ${section(d.mode === 'early' ? '날짜와 마감 시각' : '날짜와 품절 메뉴', `
        ${field('날짜', input('date', 'date', d.date))}
        ${d.mode === 'early'
          ? field('마감 시각', input('time', 'time', d.time))
          : field('품절 메뉴', `<div class="menus">${d.menus.map((m, i) => `<div class="menu-row"><input class="input" type="text" data-menu="${i}" value="${esc(m)}" placeholder="예: 김치찌개" maxlength="20">${d.menus.length > 1 ? `<button type="button" class="icon-btn" data-act="menu-del" data-i="${i}" aria-label="삭제">✕</button>` : ''}</div>`).join('')}
            ${d.menus.length < 8 ? '<button type="button" class="btn ghost small" data-act="menu-add">+ 메뉴 추가</button>' : ''}</div>`, '최대 8개까지 넣을 수 있어요.')}`)}`;
  }
  return '';
}

// 데스크톱에서는 입력하는 동안 오른쪽에 미리보기를 보여준다
function livePreviewPane(note) {
  return `<aside class="pane-preview">
    <div class="sticky">
      <div class="paper"><canvas id="live"></canvas></div>
      <p class="hint center">${note}</p>
    </div>
  </aside>`;
}

function info() {
  const t = typeOf(state.type);
  const d = state.data;
  $view.innerHTML = `
  <main class="screen flow">
    ${topbar('info', t.short)}
    <div class="split">
      <section class="pane-main">
        <form class="form" onsubmit="return false">
          ${infoForm()}
          ${section('매장 정보 <span class="opt">선택</span>', `
            ${field('매장명', input('storeName', 'text', d.storeName, 'placeholder="예: 행복분식" maxlength="20"'))}
            ${toggle('showStore', '안내문에 매장명 넣기', d.showStore)}`)}
          <p class="error" id="err" role="alert"></p>
        </form>
        <div class="cta"><button class="btn primary big" data-act="info-next">다음 · 디자인 고르기</button></div>
      </section>
      ${livePreviewPane('디자인은 다음 단계에서 고를 수 있어요')}
    </div>
  </main>`;
  drawLive();
}

let liveTimer;
function drawLive(delay = 0) {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const c = document.getElementById('live');
    if (!c || !isDesktop() || validate()) return;
    const tpl = state.template || templatesOf(state.type)[state.tplIndex] || templatesOf(state.type)[0];
    if (tpl) draw(c, { type: state.type, data: state.data, template: tpl, paletteId: paletteOf(tpl) });
  }, delay);
}

function validate() {
  const d = state.data;
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  try {
    switch (state.type) {
      case 'holiday':
        need(d.start && d.end, '기간을 입력해 주세요.');
        need(d.end >= d.start, '끝나는 날이 시작일보다 빠를 수 없어요.');
        need(dateRange(d.start, d.end, 15).length <= 14, '기간은 최대 14일까지 가능해요.');
        need(d.open && d.close, '평소 영업시간을 입력해 주세요.');
        if (d.name === '기타') need(d.customName.trim(), '공휴일 이름을 입력해 주세요.');
        break;
      case 'closed':
        need(d.start, '휴무 날짜를 입력해 주세요.');
        if (d.multi) need(d.end && d.end > d.start, '휴무 기간의 마지막 날을 확인해 주세요.');
        if (!d.allDay) need(d.from && d.to, '쉬는 시간을 입력해 주세요.');
        break;
      case 'short':
        need(d.start, '날짜를 입력해 주세요.');
        if (d.multi) need(d.end && d.end > d.start, '기간의 마지막 날을 확인해 주세요.');
        need(d.open && d.close && d.newOpen && d.newClose, '영업시간을 모두 입력해 주세요.');
        break;
      case 'soldout':
        need(d.date, '날짜를 입력해 주세요.');
        if (d.mode === 'early') need(d.time, '마감 시각을 입력해 주세요.');
        else need(d.menus.some((m) => m.trim()), '품절 메뉴를 하나 이상 입력해 주세요.');
        break;
    }
  } catch (e) {
    return e.message;
  }
  return null;
}

function setHolidayMode(mode) {
  const d = state.data;
  d.mode = mode;
  d.days = {};
  const days = dateRange(d.start, d.end);
  if (mode === 'oneDay') days.forEach((iso, i) => { d.days[iso] = { status: i === Math.min(1, days.length - 1) ? 'off' : 'on' }; });
  if (mode === 'partial') days.forEach((iso, i) => { d.days[iso] = i === 0 ? { status: 'short', close: '17:00' } : { status: 'on' }; });
}

// ---------- 2. 템플릿 선택 / 미리보기 ----------
function templateScreen() {
  const list = templatesOf(state.type);
  if (!list.length) {
    $view.innerHTML = `<main class="screen flow">${topbar('template', '디자인 고르기')}<p class="empty">준비된 디자인이 없어요. 잠시 후 다시 시도해 주세요.</p></main>`;
    return;
  }
  state.tplIndex = Math.min(state.tplIndex, list.length - 1);
  $view.innerHTML = `
  <main class="screen flow">
    ${topbar('template', '디자인 고르기')}
    <h2 class="center">마음에 드는 디자인을 골라주세요</h2>
    <p class="sub center"><span class="m-only">옆으로 넘겨서 볼 수 있어요</span><span class="d-only">카드를 눌러 선택하고 색상을 바꿔보세요</span></p>
    <div class="carousel-wrap">
      <button class="nav prev" data-act="prev" aria-label="이전">‹</button>
      <div class="carousel" id="car">
        ${list.map((t, i) => `<div class="slide" data-slide-i="${i}"><div class="paper"><canvas data-slide="${t.id}"></canvas>${t.badge ? `<span class="badge">${esc(t.badge)}</span>` : ''}</div></div>`).join('')}
      </div>
      <button class="nav next" data-act="next" aria-label="다음">›</button>
    </div>
    <div class="dots">${list.map((_, i) => `<span data-dot="${i}"></span>`).join('')}</div>
    <div class="tplinfo" id="tplinfo"></div>
    <div class="cta"><button class="btn primary big" data-act="pick">이 디자인으로 만들기</button></div>
  </main>`;

  const car = document.getElementById('car');
  list.forEach(drawSlide);
  requestAnimationFrame(() => {
    if (isCarousel()) car.scrollLeft = state.tplIndex * car.clientWidth;
    updateTplInfo();
  });
  let raf;
  car.addEventListener('scroll', () => {
    if (!isCarousel()) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.round(car.scrollLeft / car.clientWidth);
      if (i !== state.tplIndex) { state.tplIndex = i; updateTplInfo(); }
    });
  });
}

// 모바일: 한 장씩 스와이프 / 태블릿·데스크톱: 한눈에 보는 그리드
const isCarousel = () => {
  const car = document.getElementById('car');
  return car && car.scrollWidth > car.clientWidth + 4;
};

function drawSlide(tpl) {
  const c = $view.querySelector(`canvas[data-slide="${tpl.id}"]`);
  draw(c, { type: state.type, data: state.data, template: tpl, paletteId: paletteOf(tpl) });
}

function selectSlide(i) {
  state.tplIndex = i;
  const car = document.getElementById('car');
  if (isCarousel()) car.scrollTo({ left: i * car.clientWidth, behavior: 'smooth' });
  updateTplInfo();
}

function updateTplInfo() {
  const list = templatesOf(state.type);
  const t = list[state.tplIndex];
  if (!t) return;
  $view.querySelectorAll('[data-dot]').forEach((el) => el.classList.toggle('on', Number(el.dataset.dot) === state.tplIndex));
  $view.querySelectorAll('[data-slide-i]').forEach((el) => el.classList.toggle('on', Number(el.dataset.slideI) === state.tplIndex));
  const layout = LAYOUTS[t.layout] || LAYOUTS.clean;
  document.getElementById('tplinfo').innerHTML = `
    <div class="tpl-name">${esc(t.name)} ${t.badge ? `<span class="badge inline">${esc(t.badge)}</span>` : ''}</div>
    <div class="tags">${t.keywords.map((k) => `<span class="tag">#${esc(k)}</span>`).join('')}</div>
    ${t.palettes.length > 1 ? `<div class="swatches" role="radiogroup" aria-label="${layout.figma ? '배경' : '색상'}">
      ${t.palettes.map((pid) => {
        const p = getPalette(t.layout, pid);
        const img = p.swatch ? `;background:center/cover url('${esc(p.swatch)}')` : '';
        return `<button class="swatch ${paletteOf(t) === pid ? 'on' : ''}" data-palette="${pid}" role="radio" aria-checked="${paletteOf(t) === pid}" title="${esc(layout.palettes[pid]?.name || pid)}" style="--a:${p.panel || p.bg};--b:${p.accent}${img}"></button>`;
      }).join('')}
      <span class="swatch-label">${esc(layout.palettes[paletteOf(t)]?.name || '')}</span>
    </div>` : ''}`;
}

// ---------- 3. 추가 정보 + 최종 확인 ----------
function extraForm() {
  const d = state.data;
  const f = new Set((state.template.fields || []).filter((k) => EXTRA_FIELDS[k]?.types.includes(state.type)));
  let html = '';
  if (f.has('reason')) {
    const label = state.type === 'closed' ? '휴무 사유' : '단축 사유';
    html += field(`${label} <span class="opt">선택</span>`, chips('reason', [['', '넣지 않기'], ...REASONS.map((r) => [r, r]), ['__custom', '직접 입력']], d.reason));
    if (d.reason === '__custom') html += field('사유 직접 입력', input('reasonCustom', 'text', d.reasonCustom, 'placeholder="예: 가족 행사" maxlength="16"'));
  }
  if (f.has('nextOpen')) {
    html += field('다음 영업 안내 <span class="opt">선택</span>', `<div class="row2">${input('nextOpenDate', 'date', d.nextOpenDate)}${input('nextOpenTime', 'time', d.nextOpenTime)}</div>`, '예: 내일 11:00부터 정상 영업합니다');
  }
  if (f.has('note')) {
    html += field('추가로 전할 말 <span class="opt">선택</span>', input('note', 'text', d.note, 'placeholder="예: 배달 주문은 정상 운영합니다" maxlength="40"'));
  }
  return html;
}

function extra() {
  const hasFields = (state.template.fields || []).some((k) => EXTRA_FIELDS[k]?.types.includes(state.type));
  $view.innerHTML = `
  <main class="screen flow">
    ${topbar('extra', hasFields ? '추가 정보' : '마지막 확인')}
    <div class="split reverse">
      <aside class="pane-preview always">
        <div class="sticky"><div class="paper"><canvas id="final"></canvas></div></div>
      </aside>
      <section class="pane-main">
        <h2>${hasFields ? '이 디자인에 넣을 수 있는 내용이에요' : '이대로 만들까요?'}</h2>
        <p class="sub">${hasFields ? '필요 없으면 비워두셔도 돼요.' : '입력한 내용을 한 번 더 확인해 주세요.'}</p>
        <form class="form" onsubmit="return false">${extraForm()}</form>
        <p class="error" id="err" role="alert"></p>
        <div class="cta"><button class="btn primary big" data-act="download-pdf">인쇄용 PDF 받기</button></div>
      </section>
    </div>
  </main>`;
  drawFinal();
}

let finalTimer;
function drawFinal(delay = 0) {
  clearTimeout(finalTimer);
  finalTimer = setTimeout(() => {
    draw(document.getElementById('final'), { type: state.type, data: state.data, template: state.template, paletteId: paletteOf(state.template) });
  }, delay);
}

function fileName(item, ext) {
  const d = item.data;
  const date = (d.start || d.date || '').replaceAll('-', '');
  const base = item.type === 'holiday' ? holidayPeriodName(d) : typeOf(item.type).short;
  return `${base}_안내문_${date}.${ext}`.replace(/\s+/g, '');
}

const currentItem = () => ({ type: state.type, data: state.data, template: state.template, paletteId: paletteOf(state.template) });

async function exportItem(item, format, btn) {
  const label = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = '만드는 중…'; }
  try {
    const c = document.createElement('canvas');
    await renderNotice(c, { ...item, width: A4.W });
    const blob = format === 'pdf' ? await canvasToPdf(c) : await canvasToPng(c);
    saveBlob(blob, fileName(item, format));
    fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: item.template.id, format }) }).catch(() => {});
    track('download', { templateId: item.template.id, format });
    return true;
  } catch (e) {
    console.error(e);
    toast('파일을 만들지 못했어요. 다시 시도해 주세요.');
    return false;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
}

// ---------- 보관함 (이 기기 브라우저에 저장) ----------
const getLibrary = () => store.get(LIBRARY_KEY, []);

function saveToLibrary() {
  const lib = getLibrary();
  const now = Date.now();
  const entry = {
    id: state.libraryId || uid(),
    type: state.type,
    data: structuredClone(state.data),
    template: structuredClone(state.template), // 관리자가 템플릿을 내려도 다시 열 수 있게 스냅샷 보관
    paletteId: paletteOf(state.template),
    updatedAt: now,
  };
  const idx = lib.findIndex((x) => x.id === entry.id);
  if (idx >= 0) lib.splice(idx, 1);
  lib.unshift(entry);
  lib.length = Math.min(lib.length, LIBRARY_MAX);
  state.libraryId = entry.id;
  if (!store.set(LIBRARY_KEY, lib)) toast('보관함에 저장하지 못했어요 (저장 공간 부족)');
}

function libraryTitle(item) {
  const doc = buildDoc(item.type, item.data, item.template);
  return doc.kicker;
}
function librarySub(item) {
  const d = item.data;
  if (item.type === 'soldout') return fmtLong(d.date);
  if (d.multi || (item.type === 'holiday' && d.end > d.start)) return `${fmtLong(d.start)} ~ ${fmtLong(d.end)}`;
  return fmtLong(d.start);
}

function library() {
  const lib = getLibrary();
  $view.innerHTML = `
  <main class="screen library">
    <div class="lib-head">
      <h1>보관함</h1>
      <p class="sub">다운로드한 안내문이 이 기기에 저장돼요. 다시 받거나 고쳐서 쓸 수 있어요.</p>
    </div>
    ${lib.length ? `<div class="lib-grid">${lib.map((item) => `
      <article class="lib-card" data-lib="${item.id}">
        <div class="paper"><canvas data-lib-thumb="${item.id}"></canvas></div>
        <div class="lib-body">
          <div class="lib-type">${esc(typeOf(item.type)?.short || '')} · ${esc(item.template.name)}</div>
          <div class="lib-title">${esc(libraryTitle(item))}</div>
          <div class="lib-sub">${esc(librarySub(item))}</div>
          <div class="lib-meta">${new Date(item.updatedAt).toLocaleDateString('ko-KR')} 저장</div>
        </div>
        <div class="lib-actions">
          <button class="btn primary small" data-act="lib-pdf" data-id="${item.id}">PDF</button>
          <button class="btn secondary small" data-act="lib-png" data-id="${item.id}">PNG</button>
          <button class="btn ghost small" data-act="lib-edit" data-id="${item.id}">수정</button>
          <button class="btn ghost small" data-act="lib-del" data-id="${item.id}">삭제</button>
        </div>
      </article>`).join('')}</div>`
    : `<div class="lib-empty">
        <svg class="lib-empty-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 11h6" /></svg>
        <p><b>아직 만든 안내문이 없어요</b><br>안내문을 다운로드하면 여기에 모여요.</p>
        <button class="btn primary" data-act="nav-create">안내문 만들기</button>
      </div>`}
  </main>`;
  drawLibraryThumbs();
}

function drawLibraryThumbs() {
  const lib = getLibrary();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const item = lib.find((x) => x.id === e.target.dataset.libThumb);
      if (item) draw(e.target, item);
    }
  }, { rootMargin: '200px' }) : null;
  $view.querySelectorAll('[data-lib-thumb]').forEach((c) => {
    if (io) io.observe(c);
    else draw(c, lib.find((x) => x.id === c.dataset.libThumb));
  });
}

function editFromLibrary(item) {
  // 최신 템플릿이 있으면 그것으로, 삭제된 템플릿이면 보관해둔 스냅샷으로 연다
  const live = state.templates.find((t) => t.id === item.template.id);
  state.type = item.type;
  state.data = structuredClone(item.data);
  state.template = live || item.template;
  if (!live) state.templates.push(item.template);
  state.palette[state.template.id] = item.paletteId;
  state.tplIndex = Math.max(0, templatesOf(item.type).findIndex((t) => t.id === state.template.id));
  state.libraryId = item.id;
  state.survey = { rating: 0, willUse: null, comment: '', sent: false };
  go('info');
}

// ---------- 4. 완료 + 만족도 설문 ----------
function done() {
  const canShare = !!navigator.canShare;
  $view.innerHTML = `
  <main class="screen flow done">
    <div class="split reverse">
      <aside class="pane-preview always">
        <div class="sticky"><div class="paper"><canvas id="final"></canvas></div></div>
      </aside>
      <section class="pane-main">
        <div class="done-head">
          <div class="done-check" aria-hidden="true">✓</div>
          <h2>출력용 PDF 저장 완료</h2>
          <p class="sub">A4 용지에 <b>실제 크기(100%)</b>로 인쇄하세요.<br>보관함에도 저장해 두었어요.</p>
        </div>
        <div class="done-actions">
          <button class="btn secondary" data-act="download-png">공유용 PNG 받기</button>
          ${canShare ? '<button class="btn secondary" data-act="share">카톡·문자로 공유</button>' : ''}
          <button class="btn ghost" data-act="download-pdf-again">PDF 다시 받기</button>
        </div>
        <section class="survey" id="survey">${surveyHtml()}</section>
        <div class="done-actions row">
          <button class="btn ghost" data-act="nav-library">보관함 보기</button>
          <button class="btn primary" data-act="restart">새 안내문 만들기</button>
        </div>
      </section>
    </div>
  </main>`;
  drawFinal();
}

function surveyHtml() {
  const s = state.survey;
  if (s.sent) return '<p class="thanks">의견 고맙습니다! 더 좋은 안내문으로 보답할게요.</p>';
  return `
    <h3>잠깐! 만족하셨나요? <span class="opt">선택</span></h3>
    <div class="stars" role="radiogroup" aria-label="별점">
      ${[1, 2, 3, 4, 5].map((n) => `<button class="star ${n <= s.rating ? 'on' : ''}" data-star="${n}" aria-label="${n}점">★</button>`).join('')}
    </div>
    <p class="q">실제로 매장에 사용하실 것 같나요?</p>
    ${chips('willUse', [['true', '네, 쓸 거예요'], ['false', '아니요']], s.willUse === null ? '' : s.willUse)}
    ${s.willUse === false ? `<input class="input" type="text" id="survey-comment" maxlength="100" placeholder="어떤 점이 아쉬웠나요? 한 줄이면 충분해요" value="${esc(s.comment)}">` : ''}
    <button class="btn primary" data-act="survey-send" ${s.rating || s.willUse !== null ? '' : 'disabled'}>의견 보내기</button>`;
}

function rerenderSurvey() {
  const el = document.getElementById('survey');
  if (el) el.innerHTML = surveyHtml();
}

// ---------- 이벤트 ----------
$root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act],[data-type],[data-chip],[data-palette],[data-star],[data-slide-i]');
  if (!el) return;

  if (el.dataset.type) return chooseType(el.dataset.type);
  if (el.dataset.slideI !== undefined) return selectSlide(Number(el.dataset.slideI));

  if (el.dataset.star) {
    state.survey.rating = Number(el.dataset.star);
    return rerenderSurvey();
  }

  if (el.dataset.palette) {
    const t = templatesOf(state.type)[state.tplIndex];
    state.palette[t.id] = el.dataset.palette;
    drawSlide(t);
    return updateTplInfo();
  }

  if (el.dataset.chip) {
    const key = el.dataset.chip;
    const raw = el.dataset.v;
    const v = raw === 'true' ? true : raw === 'false' ? false : raw;
    if (state.step === 'done') { state.survey.willUse = v; return rerenderSurvey(); }
    const d = state.data;
    if (key.startsWith('day:')) {
      const iso = key.slice(4);
      d.days[iso] = { ...(d.days[iso] || {}), status: v };
      if (v === 'short' && !d.days[iso].close) d.days[iso].close = '17:00';
    } else if (state.type === 'holiday' && key === 'mode') {
      setHolidayMode(v);
    } else {
      d[key] = v;
    }
    const y = window.scrollY;
    if (state.step === 'extra') extra(); else info();
    window.scrollTo(0, y);
    return;
  }

  const act = el.dataset.act;
  const libItem = () => getLibrary().find((x) => x.id === el.dataset.id);
  switch (act) {
    case 'start':
      track('start');
      return go('home');
    case 'nav-splash':
      if (FLOW.has(state.step) && state.step !== 'done') return;
      return go('splash');
    case 'nav-create':
      if (FLOW.has(state.step) && state.step !== 'done') return; // 만드는 중에는 그대로
      return go('home');
    case 'nav-library':
      return go('library');
    case 'back':
      return history.length > 1 ? history.back() : go('home');
    case 'menu-add':
      state.data.menus.push('');
      info();
      return $view.querySelector(`[data-menu="${state.data.menus.length - 1}"]`)?.focus();
    case 'menu-del':
      state.data.menus.splice(Number(el.dataset.i), 1);
      return info();
    case 'info-next': {
      const msg = validate();
      if (msg) { document.getElementById('err').textContent = msg; return; }
      store.set('nh.common', { storeName: state.data.storeName, showStore: state.data.showStore });
      track('info_done', { type: state.type });
      return go('template');
    }
    case 'prev':
    case 'next': {
      const n = templatesOf(state.type).length;
      return selectSlide(Math.max(0, Math.min(n - 1, state.tplIndex + (act === 'next' ? 1 : -1))));
    }
    case 'pick': {
      state.template = templatesOf(state.type)[state.tplIndex];
      track('template_select', { templateId: state.template.id, palette: paletteOf(state.template) });
      return go('extra');
    }
    case 'download-pdf':
      if (await exportItem(currentItem(), 'pdf', el)) {
        saveToLibrary();
        go('done');
      }
      return;
    case 'download-pdf-again':
      return exportItem(currentItem(), 'pdf', el);
    case 'download-png':
      return exportItem(currentItem(), 'png', el);
    case 'share': {
      el.disabled = true;
      try {
        const c = document.createElement('canvas');
        await renderNotice(c, { ...currentItem(), width: A4.W });
        const file = new File([await canvasToPng(c)], fileName(currentItem(), 'png'), { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: '매장 안내' });
        track('share', { templateId: state.template.id });
      } catch { /* 사용자가 공유 취소 */ } finally { el.disabled = false; }
      return;
    }
    case 'survey-send': {
      const s = state.survey;
      s.comment = document.getElementById('survey-comment')?.value || '';
      fetch('/api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid, templateId: state.template?.id, rating: s.rating || null, willUse: s.willUse, comment: s.willUse === false ? s.comment : '' }) }).catch(() => {});
      track('survey', { rating: s.rating, willUse: s.willUse });
      s.sent = true;
      return rerenderSurvey();
    }
    case 'restart':
      state.type = null;
      state.template = null;
      state.libraryId = null;
      state.survey = { rating: 0, willUse: null, comment: '', sent: false };
      return go('home');
    case 'lib-pdf':
    case 'lib-png': {
      const item = libItem();
      if (item) exportItem(item, act === 'lib-pdf' ? 'pdf' : 'png', el);
      return;
    }
    case 'lib-edit': {
      const item = libItem();
      if (item) editFromLibrary(item);
      return;
    }
    case 'lib-del': {
      if (!confirm('이 안내문을 보관함에서 지울까요?')) return;
      store.set(LIBRARY_KEY, getLibrary().filter((x) => x.id !== el.dataset.id));
      return library();
    }
  }
});

function onInput(e) {
  const el = e.target;
  if (el.id === 'survey-comment') { state.survey.comment = el.value; return; }
  if (!state.data) return;
  if (el.dataset.menu !== undefined) { state.data.menus[Number(el.dataset.menu)] = el.value; drawLive(300); return; }
  const k = el.dataset.k;
  if (!k) return;
  if (k.startsWith('dayt:')) {
    const [, iso, part] = k.split(':');
    state.data.days[iso] = { ...(state.data.days[iso] || {}), [part]: el.value };
    drawLive(300);
    return;
  }
  const d = state.data;
  d[k] = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'start' && d.end && d.end < d.start) d.end = state.type === 'holiday' ? addDays(d.start, 2) : addDays(d.start, 1);
  if (state.step === 'extra') drawFinal(250);
  if (state.step === 'info') drawLive(300);
  if (e.type === 'change' && el.hasAttribute('data-rerender') && state.step === 'info') {
    if (state.type === 'holiday' && (k === 'start' || k === 'end') && (d.mode === 'oneDay' || d.mode === 'partial')) setHolidayMode(d.mode);
    const y = window.scrollY;
    info();
    window.scrollTo(0, y);
  }
}
$root.addEventListener('input', onInput);
$root.addEventListener('change', onInput);

// ---------- 시작 ----------
async function boot() {
  try {
    const res = await fetch('/api/templates');
    if (!res.ok) throw new Error();
    const json = await res.json();
    state.templates = json.templates;
    state.settings = json.settings || DEFAULT_SETTINGS;
  } catch {
    // 서버 없이 열었을 때도 동작하도록 기본 템플릿 사용
    state.templates = DEFAULT_TEMPLATES.filter((t) => t.public);
  }
  track('visit', { returning: store.get('nh.visited', false) });
  store.set('nh.visited', true);
  const initial = location.hash === '#library' ? 'library' : 'splash';
  state.step = initial;
  history.replaceState({ step: initial }, '', initial === 'splash' ? location.pathname : '#library');
  render();
}
boot();
