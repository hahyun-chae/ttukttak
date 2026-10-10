// /api/* 요청 처리 — 로컬 서버(server.js)와 Vercel 함수(api/[...path].js)가 함께 쓴다.
import crypto from 'node:crypto';
import { TYPES, OCCASIONS } from '../public/js/catalog.js';

// Vercel 함수 요청 본문 한도(4.5MB)보다 조금 작게
const UPLOAD_LIMIT = 4 * 1024 * 1024;

export function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(status === 204 ? undefined : typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    // 한도를 넘으면 나머지는 버리면서 끝까지 읽고 413 으로 응답한다 (연결을 끊으면 응답을 못 보냄)
    req.on('data', (c) => {
      size += c.length;
      if (size <= limit) chunks.push(c);
    });
    req.on('end', () => {
      if (size > limit) return reject(Object.assign(new Error('파일이 너무 큽니다.'), { status: 413 }));
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('invalid json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function isAdmin(req) {
  // 기본 비밀번호는 로컬 개발에서만. Vercel 에서는 ADMIN_PASSWORD 가 없으면 관리자 기능을 막는다.
  const password = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'admin1234');
  if (!password) return false;
  const given = crypto.createHash('sha256').update(String(req.headers['x-admin-key'] || '')).digest();
  const want = crypto.createHash('sha256').update(password).digest();
  return crypto.timingSafeEqual(given, want);
}

const publicTemplate = ({ id, type, types, occasions, name, layout, tone, keywords, palettes, fields, badge, order, thumbnail, asset }) =>
  ({ id, type, types, occasions, name, layout, tone, keywords, palettes, fields, badge, order, thumbnail, asset });

function sanitize(prev, b) {
  const t = { ...prev };
  const str = (v, n = 60) => String(v ?? '').slice(0, n);
  const arr = (v) => (Array.isArray(v) ? v.map((x) => str(x, 30)).slice(0, 10) : undefined);
  if (b.type !== undefined && TYPES.some((x) => x.id === b.type)) t.type = b.type;
  if (Array.isArray(b.types)) {
    const types = TYPES.map((x) => x.id).filter((id) => b.types.includes(id));
    if (types.length) { t.types = types; t.type = types[0]; }
  }
  if (Array.isArray(b.occasions)) t.occasions = OCCASIONS.filter((o) => b.occasions.includes(o));
  if (b.name !== undefined) t.name = str(b.name);
  if (b.layout !== undefined) t.layout = str(b.layout, 20);
  if (b.tone !== undefined) t.tone = str(b.tone, 20);
  if (b.badge !== undefined) t.badge = str(b.badge, 20);
  if (b.order !== undefined) t.order = Number(b.order) || 0;
  if (b.public !== undefined) t.public = !!b.public;
  for (const k of ['keywords', 'palettes', 'fields']) if (arr(b[k])) t[k] = arr(b[k]);
  delete t.downloads;
  return t;
}

// 관리자 화면용: 템플릿에 다운로드 수를 붙여서 내려준다
async function withDownloads(store, templates) {
  const { byTemplate } = await store.getDownloads();
  return templates.map((t) => ({ ...t, downloads: byTemplate[t.id] || 0 }));
}

// 2026-10 부터 Mixpanel·Amplitude 와 이름을 맞춘 새 이벤트 이름을 쓴다. 운영 지표는 예전 이름 기준으로 계산하므로 새 이름을 되돌려 읽는다.
const LEGACY_NAME = { page_view: 'visit', create_start: 'start', notice_type_select: 'type_select', info_complete: 'info_done', notice_download: 'download' };
function legacyEvent(e) {
  const name = LEGACY_NAME[e.name] || e.name;
  const p = e.props || {};
  const props = { ...p, type: p.type ?? p.notice_type, templateId: p.templateId ?? p.template_id };
  return { ...e, name, props };
}

async function computeStats(store) {
  const [rawEvents, surveys, db, downloads] = await Promise.all([store.getEvents(), store.getSurveys(), store.getDb(), store.getDownloads()]);
  const events = rawEvents.map(legacyEvent);
  const steps = ['visit', 'type_select', 'info_done', 'template_select', 'download'];
  const bySession = new Map();
  for (const e of events) {
    if (!bySession.has(e.sid)) bySession.set(e.sid, []);
    bySession.get(e.sid).push(e);
  }
  const funnel = steps.map((s) => ({ step: s, sessions: [...bySession.values()].filter((list) => list.some((e) => e.name === s)).length }));

  const durations = [];
  for (const list of bySession.values()) {
    const start = list.find((e) => e.name === 'type_select');
    const dl = list.find((e) => e.name === 'download');
    if (start && dl && dl.t >= start.t) durations.push((dl.t - start.t) / 1000);
  }
  durations.sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;

  const visitorSessions = new Map();
  for (const e of events) {
    if (e.name !== 'visit' || !e.vid) continue;
    if (!visitorSessions.has(e.vid)) visitorSessions.set(e.vid, new Set());
    visitorSessions.get(e.vid).add(e.sid);
  }
  const visitors = visitorSessions.size;
  const returning = [...visitorSessions.values()].filter((s) => s.size > 1).length;

  const selects = events.filter((e) => e.name === 'template_select');
  const selectCount = {};
  for (const e of selects) selectCount[e.props?.templateId] = (selectCount[e.props?.templateId] || 0) + 1;
  const typeCount = {};
  for (const e of events.filter((x) => x.name === 'type_select')) typeCount[e.props?.type] = (typeCount[e.props?.type] || 0) + 1;

  const rated = surveys.filter((s) => s.rating);
  const answered = surveys.filter((s) => s.willUse !== null);
  const visits = funnel[0].sessions;
  return {
    visits,
    downloads: funnel[4].sessions,
    completionRate: visits ? funnel[4].sessions / visits : 0,
    visitors,
    revisitRate: visitors ? returning / visitors : 0,
    medianSeconds: median,
    funnel,
    downloadsByFormat: downloads.byFormat,
    templates: db.templates.map((t) => ({ id: t.id, name: t.name, type: t.type, types: t.types, downloads: downloads.byTemplate[t.id] || 0, selects: selectCount[t.id] || 0, selectRate: selects.length ? (selectCount[t.id] || 0) / selects.length : 0 })),
    types: TYPES.map((t) => ({ id: t.id, name: t.name, selects: typeCount[t.id] || 0 })),
    survey: {
      count: surveys.length,
      avgRating: rated.length ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : null,
      willUseRate: answered.length ? answered.filter((s) => s.willUse === true).length / answered.length : null,
      recent: surveys.slice(-50).reverse(),
    },
  };
}

const ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;

export async function handleApi(req, res, store) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/templates' && m === 'GET') {
    const db = await store.getDb();
    const templates = db.templates.filter((t) => t.public).sort((a, b) => a.order - b.order).map(publicTemplate);
    return send(res, 200, { templates, settings: db.settings });
  }
  if (p === '/api/events' && m === 'POST') {
    const b = await readBody(req);
    const e = { t: Date.now(), sid: String(b.sid || '').slice(0, 64), vid: String(b.vid || '').slice(0, 64), name: String(b.name || '').slice(0, 40), props: b.props && typeof b.props === 'object' ? b.props : {} };
    if (e.sid && e.name) await store.addEvent(e);
    return send(res, 204);
  }
  if (p === '/api/download' && m === 'POST') {
    const b = await readBody(req);
    const db = await store.getDb();
    const templateId = db.templates.some((x) => x.id === b.templateId) ? b.templateId : null;
    const format = b.format === 'pdf' || b.format === 'png' ? b.format : null;
    await store.incrDownload(templateId, format);
    return send(res, 204);
  }
  if (p === '/api/survey' && m === 'POST') {
    const b = await readBody(req);
    const rating = Number(b.rating);
    await store.addSurvey({
      t: Date.now(), sid: String(b.sid || '').slice(0, 64), templateId: String(b.templateId || '').slice(0, 64),
      rating: rating >= 1 && rating <= 5 ? Math.round(rating) : null,
      willUse: typeof b.willUse === 'boolean' ? b.willUse : null,
      comment: String(b.comment || '').slice(0, 300),
    });
    return send(res, 204);
  }

  // ---- 관리자 ----
  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return send(res, 401, { error: '비밀번호가 올바르지 않습니다.' });
    const db = await store.getDb();
    if (p === '/api/admin/templates' && m === 'GET') return send(res, 200, { templates: await withDownloads(store, db.templates), settings: db.settings });
    if (p === '/api/admin/stats' && m === 'GET') return send(res, 200, await computeStats(store));
    if (p === '/api/admin/settings' && m === 'PUT') {
      const b = await readBody(req);
      db.settings = { ...db.settings, typeBadges: b.typeBadges || {} };
      await store.saveDb(db);
      return send(res, 200, db.settings);
    }
    if (p === '/api/admin/templates' && m === 'POST') {
      const b = await readBody(req);
      if (!ID_RE.test(b.id || '')) return send(res, 400, { error: 'ID는 영문 소문자, 숫자, - 만 사용할 수 있습니다.' });
      if (db.templates.some((t) => t.id === b.id)) return send(res, 409, { error: '이미 있는 ID입니다.' });
      const t = sanitize({ public: false, thumbnail: null, asset: null }, b);
      t.id = b.id;
      db.templates.push(t);
      await store.saveDb(db);
      return send(res, 201, { ...t, downloads: 0 });
    }
    const tm = p.match(/^\/api\/admin\/templates\/([a-z0-9-]+)$/);
    if (tm) {
      const idx = db.templates.findIndex((t) => t.id === tm[1]);
      if (idx < 0) return send(res, 404, { error: '템플릿이 없습니다.' });
      if (m === 'PUT') {
        db.templates[idx] = sanitize(db.templates[idx], await readBody(req));
        await store.saveDb(db);
        return send(res, 200, (await withDownloads(store, [db.templates[idx]]))[0]);
      }
      if (m === 'DELETE') {
        db.templates.splice(idx, 1);
        await store.saveDb(db);
        return send(res, 204);
      }
    }
    const um = p.match(/^\/api\/admin\/templates\/([a-z0-9-]+)\/(thumbnail|asset)$/);
    if (um && m === 'POST') {
      const t = db.templates.find((x) => x.id === um[1]);
      if (!t) return send(res, 404, { error: '템플릿이 없습니다.' });
      const b = await readBody(req, UPLOAD_LIMIT);
      if (b.remove) {
        t[um[2]] = null;
      } else {
        const dm = String(b.dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
        if (!dm) return send(res, 400, { error: 'PNG, JPG, WEBP 이미지만 올릴 수 있습니다.' });
        const ext = dm[1] === 'jpeg' ? 'jpg' : dm[1];
        t[um[2]] = await store.saveUpload(`${t.id}-${um[2]}-${Date.now()}.${ext}`, Buffer.from(dm[2], 'base64'), `image/${dm[1]}`);
      }
      await store.saveDb(db);
      return send(res, 200, (await withDownloads(store, [t]))[0]);
    }
  }
  return send(res, 404, { error: 'not found' });
}

export async function safeHandleApi(req, res, store) {
  try {
    await handleApi(req, res, store);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : '서버 오류' });
  }
}
