// 저장소: 로컬은 파일(data/), Vercel 은 Upstash Redis(데이터) + Vercel Blob(이미지).
// Redis 환경변수가 있으면 Redis 를, 없으면 파일을 쓴다.
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_TEMPLATES, DEFAULT_SETTINGS, CATALOG_VERSION } from '../public/js/catalog.js';

const seedTemplates = () => structuredClone(DEFAULT_TEMPLATES).map(({ downloads, ...t }) => t);
const seed = () => ({
  templates: seedTemplates(),
  settings: structuredClone(DEFAULT_SETTINGS),
  catalogVersion: CATALOG_VERSION,
});

// 기본 템플릿 구성이 바뀌면(CATALOG_VERSION) 저장된 템플릿 목록을 새 기본값으로 바꾼다. 설정은 그대로 둔다.
function migrate(db) {
  if (db.catalogVersion === CATALOG_VERSION) return false;
  db.templates = seedTemplates();
  db.catalogVersion = CATALOG_VERSION;
  return true;
}

// ---------- 파일 저장소 (로컬 개발) ----------
function fileStore(dataDir) {
  const DB_FILE = path.join(dataDir, 'db.json');
  const EVENTS_FILE = path.join(dataDir, 'events.jsonl');
  const UPLOADS = path.join(dataDir, 'uploads');
  let cache;
  let writing = Promise.resolve();

  async function load() {
    if (cache) return cache;
    await fs.mkdir(UPLOADS, { recursive: true });
    try {
      cache = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
    } catch {
      cache = { ...seed(), surveys: [], downloads: {}, downloadsByFormat: { pdf: 0, png: 0 } };
    }
    // 예전 형식(템플릿 안에 downloads)에서 옮겨오기
    if (!cache.downloads) {
      cache.downloads = {};
      for (const t of cache.templates) if (t.downloads) cache.downloads[t.id] = t.downloads;
    }
    for (const t of cache.templates) delete t.downloads;
    cache.surveys ||= [];
    cache.downloadsByFormat ||= { pdf: 0, png: 0 };
    if (migrate(cache)) await persist();
    return cache;
  }
  function persist() {
    writing = writing.then(async () => {
      const tmp = DB_FILE + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(cache, null, 2));
      await fs.rename(tmp, DB_FILE);
    });
    return writing;
  }

  return {
    kind: 'file',
    uploadsDir: UPLOADS,
    async getDb() {
      const d = await load();
      return { templates: d.templates, settings: d.settings, catalogVersion: d.catalogVersion };
    },
    async saveDb(db) {
      const d = await load();
      d.templates = db.templates;
      d.settings = db.settings;
      d.catalogVersion = db.catalogVersion ?? d.catalogVersion;
      await persist();
    },
    async incrDownload(templateId, format) {
      const d = await load();
      if (templateId) d.downloads[templateId] = (d.downloads[templateId] || 0) + 1;
      if (format) d.downloadsByFormat[format] = (d.downloadsByFormat[format] || 0) + 1;
      await persist();
    },
    async getDownloads() {
      const d = await load();
      return { byTemplate: { ...d.downloads }, byFormat: { pdf: 0, png: 0, ...d.downloadsByFormat } };
    },
    async addSurvey(s) {
      const d = await load();
      d.surveys.push(s);
      await persist();
    },
    async getSurveys() {
      return (await load()).surveys;
    },
    async addEvent(e) {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.appendFile(EVENTS_FILE, JSON.stringify(e) + '\n');
    },
    async getEvents() {
      try {
        const raw = await fs.readFile(EVENTS_FILE, 'utf8');
        return raw.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { return []; }
    },
    async saveUpload(name, buffer) {
      await fs.mkdir(UPLOADS, { recursive: true });
      await fs.writeFile(path.join(UPLOADS, name), buffer);
      return `/uploads/${name}`;
    },
  };
}

// ---------- Redis 저장소 (Vercel) — Upstash REST API 를 직접 호출 ----------
function redisStore(url, token) {
  const K = { db: 'tt:db', downloads: 'tt:downloads', formats: 'tt:formats', surveys: 'tt:surveys', events: 'tt:events' };
  async function cmd(...args) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args.map(String)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(`Redis 오류: ${json.error || res.status}`);
    return json.result;
  }
  const hashToObject = (arr) => {
    const o = {};
    for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = Number(arr[i + 1]) || 0;
    return o;
  };
  const parseList = (arr) => (arr || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

  return {
    kind: 'redis',
    async getDb() {
      let raw = await cmd('GET', K.db);
      if (!raw) {
        await cmd('SET', K.db, JSON.stringify(seed()), 'NX');
        raw = await cmd('GET', K.db);
      }
      const db = JSON.parse(raw);
      if (migrate(db)) await cmd('SET', K.db, JSON.stringify(db));
      return db;
    },
    async saveDb(db) {
      await cmd('SET', K.db, JSON.stringify({ templates: db.templates, settings: db.settings, catalogVersion: db.catalogVersion }));
    },
    async incrDownload(templateId, format) {
      if (templateId) await cmd('HINCRBY', K.downloads, templateId, 1);
      if (format) await cmd('HINCRBY', K.formats, format, 1);
    },
    async getDownloads() {
      const [byTemplate, byFormat] = await Promise.all([cmd('HGETALL', K.downloads), cmd('HGETALL', K.formats)]);
      return { byTemplate: hashToObject(byTemplate), byFormat: { pdf: 0, png: 0, ...hashToObject(byFormat) } };
    },
    async addSurvey(s) { await cmd('RPUSH', K.surveys, JSON.stringify(s)); },
    async getSurveys() { return parseList(await cmd('LRANGE', K.surveys, 0, -1)); },
    async addEvent(e) { await cmd('RPUSH', K.events, JSON.stringify(e)); },
    async getEvents() { return parseList(await cmd('LRANGE', K.events, 0, -1)); },
    async saveUpload(name, buffer, contentType) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw Object.assign(new Error('이미지 저장소(Vercel Blob)가 연결되지 않았습니다.'), { status: 503 });
      const { put } = await import('@vercel/blob');
      const blob = await put(`uploads/${name}`, buffer, { access: 'public', contentType, addRandomSuffix: false });
      return blob.url;
    },
  };
}

let instance;
export function getStore({ dataDir } = {}) {
  if (instance) return instance;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  instance = url && token ? redisStore(url, token) : fileStore(dataDir || path.join(process.cwd(), 'data'));
  return instance;
}
