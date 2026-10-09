// 뚝딱 로컬 개발 서버 — 정적 파일 + API. (Vercel 에서는 api/[...path].js 가 API 를 처리)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from './lib/store.js';
import { safeHandleApi, send } from './lib/api.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const store = getStore({ dataDir: process.env.DATA_DIR || path.join(ROOT, 'data') });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

async function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) && file !== base) return send(res, 403, { error: 'forbidden' });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    send(res, 404, { error: 'not found' });
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return safeHandleApi(req, res, store);
  if (pathname.startsWith('/uploads/') && store.uploadsDir) return serveFile(res, store.uploadsDir, decodeURIComponent(pathname.slice('/uploads/'.length)));
  if (pathname === '/admin' || pathname === '/admin/') return serveFile(res, PUB, 'admin.html');
  return serveFile(res, PUB, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
});

server.listen(PORT, () => {
  console.log(`뚝딱:          http://localhost:${PORT}  (저장소: ${store.kind === 'redis' ? 'Upstash Redis' : '로컬 파일'})`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin  (비밀번호: ${process.env.ADMIN_PASSWORD ? '환경변수 ADMIN_PASSWORD' : 'admin1234'})`);
});
