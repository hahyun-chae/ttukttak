// Vercel 함수: /api/* 요청을 lib/api.js 로 넘긴다.
import { getStore } from '../lib/store.js';
import { safeHandleApi } from '../lib/api.js';

export default function handler(req, res) {
  return safeHandleApi(req, res, getStore());
}
