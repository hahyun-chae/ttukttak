import { TYPES, LAYOUTS, STYLE_KEYWORDS, BADGES, TONES, EXTRA_FIELDS, fieldsForType, A4 } from './catalog.js';
import { sampleData } from './copy.js';
import { renderNotice } from './render.js';

const $root = document.getElementById('admin');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (v) => (v == null ? '-' : `${Math.round(v * 1000) / 10}%`);
const typeName = (id) => TYPES.find((t) => t.id === id)?.short || id;

const st = { key: '', tab: 'templates', templates: [], settings: {}, stats: null, editing: null, filter: 'all' };
try { st.key = sessionStorage.getItem('nh.admin') || ''; } catch { /* noop */ }

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-key': st.key, ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); throw new Error('비밀번호가 올바르지 않습니다.'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '요청 실패');
  return res.status === 204 ? null : res.json();
}

function logout() {
  st.key = '';
  try { sessionStorage.removeItem('nh.admin'); } catch { /* noop */ }
  login();
}

function login(msg = '') {
  $root.innerHTML = `<form class="login" id="login">
    <h1>관리자 로그인</h1>
    <input type="password" id="pw" placeholder="비밀번호" autocomplete="current-password" required>
    <button class="btn primary">로그인</button>
    <p class="err">${esc(msg)}</p>
  </form>`;
  document.getElementById('login').onsubmit = async (e) => {
    e.preventDefault();
    st.key = document.getElementById('pw').value;
    try {
      await load();
      try { sessionStorage.setItem('nh.admin', st.key); } catch { /* noop */ }
      shell();
    } catch (err) {
      login(err.message);
    }
  };
}

async function load() {
  const json = await api('/api/admin/templates');
  st.templates = json.templates;
  st.settings = json.settings;
}

function shell() {
  $root.innerHTML = `
  <header class="bar">
    <b>뚝딱 관리자</b>
    <nav>
      ${[['templates', '템플릿'], ['stats', '운영 지표'], ['survey', '만족도 설문'], ['settings', '뱃지 설정']].map(([id, label]) => `<button class="tab ${st.tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
    </nav>
    <a href="/" target="_blank" rel="noopener">서비스 열기 ↗</a>
    <button class="link" data-act="logout">로그아웃</button>
  </header>
  <main id="main"></main>
  <div id="modal"></div>`;
  $root.querySelector('nav').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    st.tab = b.dataset.tab;
    shell();
  };
  $root.querySelector('[data-act="logout"]').onclick = logout;
  ({ templates: templatesTab, stats: statsTab, survey: surveyTab, settings: settingsTab })[st.tab]();
}

// ---------- 템플릿 목록 ----------
function templatesTab() {
  const list = st.templates.filter((t) => st.filter === 'all' || t.type === st.filter).sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order);
  document.getElementById('main').innerHTML = `
  <div class="toolbar">
    <select id="filter">${[['all', '전체 유형'], ...TYPES.map((t) => [t.id, t.short])].map(([v, l]) => `<option value="${v}" ${st.filter === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="muted">${list.length}개 템플릿 · ${list.reduce((a, t) => a + t.palettes.length, 0)}개 색상 변형</span>
    <button class="btn primary" data-act="new">+ 템플릿 등록</button>
  </div>
  <table class="table">
    <thead><tr><th>미리보기</th><th>템플릿</th><th>유형</th><th>스타일</th><th>색상</th><th>뱃지</th><th>공개</th><th>다운로드</th><th></th></tr></thead>
    <tbody>${list.map((t) => `
      <tr>
        <td><div class="thumb" data-thumb="${t.id}">${t.thumbnail ? `<img src="${esc(t.thumbnail)}" alt="">` : ''}</div></td>
        <td><b>${esc(t.name)}</b><div class="muted mono">${esc(t.id)}</div>${t.asset ? '<div class="pill">Figma 에셋</div>' : ''}</td>
        <td>${typeName(t.type)}</td>
        <td>${t.keywords.map(esc).join(', ')}<div class="muted">${esc(TONES[t.tone] || t.tone)} 문구</div></td>
        <td>${t.palettes.map((p) => esc(LAYOUTS[t.layout]?.palettes[p]?.name || p)).join(', ')}</td>
        <td><select data-badge="${t.id}"><option value="">없음</option>${BADGES.map((b) => `<option ${t.badge === b ? 'selected' : ''}>${b}</option>`).join('')}</select></td>
        <td><label class="sw"><input type="checkbox" data-public="${t.id}" ${t.public ? 'checked' : ''}><span></span></label></td>
        <td class="num">${t.downloads || 0}</td>
        <td><button class="btn small" data-edit="${t.id}">수정</button></td>
      </tr>`).join('')}</tbody>
  </table>`;

  for (const t of list) {
    if (t.thumbnail) continue;
    const c = document.createElement('canvas');
    $root.querySelector(`[data-thumb="${t.id}"]`).appendChild(c);
    renderNotice(c, { type: t.type, data: sampleData(t.type), template: t, paletteId: t.palettes[0], width: 160 });
  }
  const main = document.getElementById('main');
  main.querySelector('#filter').onchange = (e) => { st.filter = e.target.value; templatesTab(); };
  main.onclick = (e) => {
    const b = e.target.closest('[data-edit],[data-act="new"]');
    if (!b) return;
    openEditor(b.dataset.edit ? st.templates.find((t) => t.id === b.dataset.edit) : null);
  };
  main.onchange = async (e) => {
    const el = e.target;
    const id = el.dataset.badge || el.dataset.public;
    if (!id) return;
    const patch = el.dataset.badge ? { badge: el.value } : { public: el.checked };
    try {
      const updated = await api(`/api/admin/templates/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      Object.assign(st.templates.find((t) => t.id === id), updated);
      toast('저장했어요');
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- 템플릿 등록/수정 ----------
function openEditor(tpl) {
  const isNew = !tpl;
  const t = tpl ? structuredClone(tpl) : { id: '', type: 'holiday', name: '', layout: 'clean', tone: 'polite', keywords: ['깔끔한'], palettes: ['mono'], fields: [], badge: '', public: false, order: 10 };
  st.editing = t;
  const modal = document.getElementById('modal');
  const draw = () => {
    const layout = LAYOUTS[t.layout];
    const allowed = fieldsForType(t.type);
    t.fields = t.fields.filter((f) => allowed.includes(f));
    t.palettes = t.palettes.filter((p) => layout.palettes[p]);
    if (!t.palettes.length) t.palettes = [Object.keys(layout.palettes)[0]];
    modal.innerHTML = `
    <div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-head"><h2>${isNew ? '템플릿 등록' : '템플릿 수정'}</h2><button class="link" data-act="close">닫기 ✕</button></div>
      <div class="sheet-body">
        <form class="grid" id="ed" onsubmit="return false">
          <label>템플릿 ID<input name="id" value="${esc(t.id)}" ${isNew ? '' : 'disabled'} placeholder="예: closed-modern" pattern="[a-z0-9][a-z0-9-]+"></label>
          <label>템플릿명<input name="name" value="${esc(t.name)}" placeholder="예: 모던 휴무 안내"></label>
          <label>공지 유형<select name="type">${TYPES.map((x) => `<option value="${x.id}" ${t.type === x.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
          <label>레이아웃<select name="layout">${Object.entries(LAYOUTS).map(([id, l]) => `<option value="${id}" ${t.layout === id ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>
          <label>문구 톤<select name="tone">${Object.entries(TONES).map(([id, l]) => `<option value="${id}" ${t.tone === id ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>정렬 순서<input name="order" type="number" value="${t.order}"></label>
          <label>뱃지<select name="badge"><option value="">없음</option>${BADGES.map((b) => `<option ${t.badge === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" name="public" ${t.public ? 'checked' : ''}> 사용자에게 공개</label>
          <fieldset><legend>스타일 키워드</legend>${STYLE_KEYWORDS.map((k) => `<label class="check"><input type="checkbox" name="kw" value="${k}" ${t.keywords.includes(k) ? 'checked' : ''}> ${k}</label>`).join('')}</fieldset>
          <fieldset><legend>색상 버전</legend>${Object.entries(layout.palettes).map(([id, p]) => `<label class="check"><input type="checkbox" name="pal" value="${id}" ${t.palettes.includes(id) ? 'checked' : ''}> <i class="dot" style="background:${p.panel || p.bg};border-color:${p.accent}"></i>${p.name}</label>`).join('')}</fieldset>
          <fieldset><legend>추가 입력 항목</legend>${allowed.map((f) => `<label class="check"><input type="checkbox" name="field" value="${f}" ${t.fields.includes(f) ? 'checked' : ''}> ${EXTRA_FIELDS[f].label}</label>`).join('') || '<span class="muted">없음</span>'}</fieldset>
          ${isNew ? '<p class="muted full">썸네일과 출력용 에셋은 등록 후 업로드할 수 있어요.</p>' : `
          <fieldset class="full"><legend>썸네일 이미지</legend>
            ${t.thumbnail ? `<img class="up-prev" src="${esc(t.thumbnail)}" alt=""> <button class="link" data-remove="thumbnail">삭제</button>` : '<span class="muted">없으면 예시 데이터로 자동 생성</span>'}
            <input type="file" accept="image/png,image/jpeg,image/webp" data-upload="thumbnail">
          </fieldset>
          <fieldset class="full"><legend>출력용 템플릿 에셋 (Figma 배경)</legend>
            <p class="muted">Figma 에서 텍스트 레이어를 숨기고 배경·장식만 A4 ${A4.W}×${A4.H}px(300dpi)로 export 해서 올리세요. 업로드하면 기본 배경 대신 이 이미지 위에 내용이 그려집니다.</p>
            ${t.asset ? `<img class="up-prev" src="${esc(t.asset)}" alt=""> <button class="link" data-remove="asset">삭제</button>` : ''}
            <input type="file" accept="image/png,image/jpeg,image/webp" data-upload="asset">
          </fieldset>`}
        </form>
        <div class="ed-preview">
          <div class="muted">미리보기 (예시 데이터)</div>
          <div class="pv-list">${t.palettes.map((p) => `<canvas data-pv="${p}"></canvas>`).join('')}</div>
        </div>
      </div>
      <div class="sheet-foot">
        ${isNew ? '' : '<button class="btn danger" data-act="delete">삭제</button>'}
        <span class="spacer"></span>
        <button class="btn" data-act="close">취소</button>
        <button class="btn primary" data-act="save">${isNew ? '등록' : '저장'}</button>
      </div>
    </div></div>`;
    for (const p of t.palettes) {
      renderNotice(modal.querySelector(`[data-pv="${p}"]`), { type: t.type, data: sampleData(t.type), template: t, paletteId: p, width: 420 });
    }
  };
  draw();

  const readForm = () => {
    const f = document.getElementById('ed');
    const fd = new FormData(f);
    if (isNew) t.id = fd.get('id').trim();
    t.name = fd.get('name');
    t.type = fd.get('type');
    t.layout = fd.get('layout');
    t.tone = fd.get('tone');
    t.order = Number(fd.get('order')) || 0;
    t.badge = fd.get('badge');
    t.public = fd.get('public') === 'on';
    t.keywords = fd.getAll('kw');
    t.palettes = fd.getAll('pal');
    t.fields = fd.getAll('field');
  };

  modal.onchange = async (e) => {
    const up = e.target.dataset.upload;
    if (up) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) return toast('15MB 이하 이미지만 올릴 수 있어요.', true);
      let dataUrl;
      try { dataUrl = await fitForUpload(file); } catch (err) { return toast(err.message, true); }
      try {
        const updated = await api(`/api/admin/templates/${t.id}/${up}`, { method: 'POST', body: JSON.stringify({ dataUrl }) });
        t[up] = updated[up];
        Object.assign(st.templates.find((x) => x.id === t.id), { [up]: updated[up] });
        toast('업로드했어요');
        readForm();
        draw();
      } catch (err) { toast(err.message, true); }
      return;
    }
    readForm();
    draw();
  };

  modal.onclick = async (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      e.preventDefault();
      const updated = await api(`/api/admin/templates/${t.id}/${rm.dataset.remove}`, { method: 'POST', body: JSON.stringify({ remove: true }) });
      t[rm.dataset.remove] = null;
      Object.assign(st.templates.find((x) => x.id === t.id), { [rm.dataset.remove]: updated[rm.dataset.remove] });
      readForm();
      return draw();
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close' || e.target.classList.contains('overlay')) { modal.innerHTML = ''; return templatesTab(); }
    if (act === 'delete') {
      if (!confirm(`'${t.name}' 템플릿을 삭제할까요? 되돌릴 수 없어요.`)) return;
      await api(`/api/admin/templates/${t.id}`, { method: 'DELETE' });
      st.templates = st.templates.filter((x) => x.id !== t.id);
      modal.innerHTML = '';
      toast('삭제했어요');
      return templatesTab();
    }
    if (act === 'save') {
      readForm();
      if (!t.name.trim()) return toast('템플릿명을 입력해 주세요.', true);
      try {
        if (isNew) {
          const created = await api('/api/admin/templates', { method: 'POST', body: JSON.stringify(t) });
          st.templates.push(created);
        } else {
          const updated = await api(`/api/admin/templates/${t.id}`, { method: 'PUT', body: JSON.stringify(t) });
          Object.assign(st.templates.find((x) => x.id === t.id), updated);
        }
        modal.innerHTML = '';
        toast('저장했어요');
        templatesTab();
      } catch (err) { toast(err.message, true); }
    }
  };
}

// ---------- 운영 지표 ----------
const STEP_LABEL = { visit: '방문', start: '시작 버튼', type_select: '유형 선택', info_done: '정보 입력 완료', template_select: '템플릿 선택', download: '다운로드' };

async function statsTab() {
  const main = document.getElementById('main');
  main.innerHTML = '<p class="muted">불러오는 중…</p>';
  const s = await api('/api/admin/stats');
  st.stats = s;
  const max = Math.max(1, s.funnel[0].sessions);
  const mins = s.medianSeconds == null ? '-' : s.medianSeconds < 60 ? `${Math.round(s.medianSeconds)}초` : `${Math.floor(s.medianSeconds / 60)}분 ${Math.round(s.medianSeconds % 60)}초`;
  main.innerHTML = `
  <div class="kpis">
    <div class="kpi"><span>방문 세션</span><b>${s.visits}</b></div>
    <div class="kpi"><span>다운로드 완료율</span><b>${pct(s.completionRate)}</b></div>
    <div class="kpi"><span>재방문율</span><b>${pct(s.revisitRate)}</b><small>${s.visitors}명 중</small></div>
    <div class="kpi"><span>제작 소요 시간 (중앙값)</span><b>${mins}</b></div>
    <div class="kpi"><span>다운로드 PDF / PNG</span><b>${s.downloadsByFormat.pdf || 0} / ${s.downloadsByFormat.png || 0}</b></div>
    <div class="kpi"><span>평균 만족도</span><b>${s.survey.avgRating ? s.survey.avgRating.toFixed(1) + '점' : '-'}</b></div>
  </div>
  <section class="panel"><h3>단계별 이탈 (세션 수)</h3>
    ${s.funnel.map((f, i) => {
      const prev = i ? s.funnel[i - 1].sessions : f.sessions;
      return `<div class="fun"><span class="fun-l">${STEP_LABEL[f.step]}</span><div class="fun-bar"><i style="width:${(f.sessions / max) * 100}%"></i></div><span class="fun-n">${f.sessions}${i ? ` <small>(${pct(prev ? f.sessions / prev : 0)})</small>` : ''}</span></div>`;
    }).join('')}
  </section>
  <div class="two">
    <section class="panel"><h3>공지 유형 선택</h3><table class="table compact">${s.types.map((t) => `<tr><td>${esc(t.name)}</td><td class="num">${t.selects}</td></tr>`).join('')}</table></section>
    <section class="panel"><h3>템플릿 선택률 · 다운로드</h3><table class="table compact"><tr><th>템플릿</th><th>선택률</th><th>다운로드</th></tr>${s.templates.sort((a, b) => b.downloads - a.downloads).map((t) => `<tr><td>${esc(t.name)} <span class="muted">${typeName(t.type)}</span></td><td class="num">${pct(t.selectRate)}</td><td class="num">${t.downloads}</td></tr>`).join('')}</table></section>
  </div>`;
}

async function surveyTab() {
  const main = document.getElementById('main');
  main.innerHTML = '<p class="muted">불러오는 중…</p>';
  const s = st.stats || await api('/api/admin/stats');
  const v = s.survey;
  const nameOf = (id) => st.templates.find((t) => t.id === id)?.name || id || '-';
  main.innerHTML = `
  <div class="kpis">
    <div class="kpi"><span>응답 수</span><b>${v.count}</b></div>
    <div class="kpi"><span>평균 별점</span><b>${v.avgRating ? v.avgRating.toFixed(1) : '-'}</b></div>
    <div class="kpi"><span>"실제로 사용할 것 같다"</span><b>${pct(v.willUseRate)}</b></div>
  </div>
  <section class="panel"><h3>최근 응답</h3>
    ${v.recent.length ? `<table class="table"><tr><th>시간</th><th>템플릿</th><th>별점</th><th>사용 의향</th><th>아쉬운 점</th></tr>
    ${v.recent.map((r) => `<tr><td class="muted">${new Date(r.t).toLocaleString('ko-KR')}</td><td>${esc(nameOf(r.templateId))}</td><td>${r.rating ? '★'.repeat(r.rating) : '-'}</td><td>${r.willUse == null ? '-' : r.willUse ? '예' : '아니오'}</td><td>${esc(r.comment)}</td></tr>`).join('')}</table>` : '<p class="muted">아직 응답이 없어요.</p>'}
  </section>`;
  st.stats = null;
}

function settingsTab() {
  const main = document.getElementById('main');
  main.innerHTML = `
  <section class="panel"><h3>공지 유형 뱃지</h3>
    <p class="muted">명절·공휴일 시즌에 유형 카드에 뱃지를 붙여 눈에 띄게 할 수 있어요. 템플릿별 뱃지는 '템플릿' 탭에서 설정하세요.</p>
    <form id="badges" class="grid">
      ${TYPES.map((t) => `<label>${t.name}<select name="${t.id}"><option value="">없음</option>${BADGES.map((b) => `<option ${st.settings.typeBadges?.[t.id] === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`).join('')}
      <div class="full"><button class="btn primary">저장</button></div>
    </form>
  </section>`;
  document.getElementById('badges').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const typeBadges = {};
    for (const t of TYPES) if (fd.get(t.id)) typeBadges[t.id] = fd.get(t.id);
    try {
      st.settings = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ typeBadges }) });
      toast('저장했어요');
    } catch (err) { toast(err.message, true); }
  };
}

// 서버 요청 한도(약 4MB) 안에 들어가도록, 큰 이미지는 JPEG 로 다시 압축한다
const UPLOAD_MAX_CHARS = 3_800_000;
async function fitForUpload(file) {
  const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
  if (dataUrl.length <= UPLOAD_MAX_CHARS) return dataUrl;
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
    i.src = dataUrl;
  });
  const scale = Math.min(1, A4.W / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.92, 0.85, 0.75, 0.65]) {
    const out = c.toDataURL('image/jpeg', q);
    if (out.length <= UPLOAD_MAX_CHARS) return out;
  }
  throw new Error('이미지가 너무 커요. 크기를 줄여서 다시 올려주세요.');
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = `toast ${isErr ? 'err' : ''}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

if (st.key) load().then(shell).catch(() => login());
else login();
