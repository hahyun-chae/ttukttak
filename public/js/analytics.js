// 분석 이벤트를 자체 서버(관리자 운영 지표), Mixpanel, Amplitude 로 함께 보낸다.
// 키는 브라우저에 공개되는 프로젝트 토큰이라 코드에 둬도 된다. 비어 있으면 그 도구로는 보내지 않는다.

const KEYS = {
  mixpanel: 'c1a21b7e692ee8a0c7ed917274d03c9e', // Mixpanel → Project Settings → Project Token
  amplitude: '', // Amplitude → Settings → Projects → API Key
};

// Mixpanel 은 공식 로더(snippet)가 본체(104KB)를 불러오는 방식 — 버전을 고정하려고 본체 주소를 지정한다
const SDK = {
  mixpanelSnippet: 'https://cdn.jsdelivr.net/npm/mixpanel-browser@2.83.0/dist/mixpanel-jslib-snippet.min.js',
  mixpanel: 'https://cdn.jsdelivr.net/npm/mixpanel-browser@2.83.0/dist/mixpanel.min.js',
  amplitude: 'https://cdn.jsdelivr.net/npm/@amplitude/analytics-browser@2.45.10/lib/scripts/amplitude-min.umd.js',
};

let ids = { sid: '', vid: '' };
let common = {}; // 모든 이벤트에 붙는 속성
const queue = []; // SDK 를 불러오기 전에 생긴 이벤트
let ready = false;

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

function deviceType() {
  return window.matchMedia('(max-width: 759px)').matches ? 'mobile' : 'desktop';
}

// 광고·공유 링크로 들어온 경로 (utm_*) — 첫 방문 기준
function campaign() {
  const q = new URLSearchParams(location.search);
  const out = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (q.get(k)) out[k] = q.get(k);
  if (document.referrer && !document.referrer.startsWith(location.origin)) out.referrer = document.referrer;
  return out;
}

/** 앱 시작 때 한 번. vid(익명 방문자 ID)를 두 도구의 사용자 ID로 쓴다. */
export async function initAnalytics({ sid, vid }) {
  ids = { sid, vid };
  common = { device: deviceType(), ...campaign() };
  const jobs = [];
  if (KEYS.mixpanel) {
    window.MIXPANEL_CUSTOM_LIB_URL = SDK.mixpanel;
    jobs.push(loadScript(SDK.mixpanelSnippet).then((ok) => {
      if (!ok || !window.mixpanel) return;
      window.mixpanel.init(KEYS.mixpanel, { persistence: 'localStorage', track_pageview: false });
      window.mixpanel.identify(vid);
    }));
  }
  if (KEYS.amplitude) {
    jobs.push(loadScript(SDK.amplitude).then((ok) => {
      if (!ok || !window.amplitude) return;
      window.amplitude.init(KEYS.amplitude, vid, { autocapture: false });
    }));
  }
  await Promise.all(jobs);
  ready = true;
  for (const [name, props] of queue.splice(0)) {
    if (name === '__user__') props();
    else sendTools(name, props);
  }
}

function sendTools(name, props) {
  const p = { ...common, ...props };
  try { window.mixpanel?.track?.(name, p); } catch { /* 분석 실패는 서비스에 영향 없게 */ }
  try { window.amplitude?.track?.(name, p); } catch { /* 위와 같음 */ }
}

/** 이벤트 하나를 세 곳으로 보낸다. */
export function track(name, props = {}) {
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ids, name, props }), keepalive: true }).catch(() => {});
  if (ready) sendTools(name, props);
  else queue.push([name, props]);
}

/** 사용자 속성 — set 은 덮어쓰기, add 는 숫자 누적, once 는 처음 한 번만 */
export function setUser({ set = {}, add = {}, once = {} } = {}) {
  const run = () => {
    const mp = window.mixpanel?.people;
    if (mp) {
      if (Object.keys(set).length) mp.set(set);
      if (Object.keys(once).length) mp.set_once(once);
      for (const [k, v] of Object.entries(add)) mp.increment(k, v);
    }
    const amp = window.amplitude;
    if (amp?.Identify) {
      const id = new amp.Identify();
      for (const [k, v] of Object.entries(set)) id.set(k, v);
      for (const [k, v] of Object.entries(once)) id.setOnce(k, v);
      for (const [k, v] of Object.entries(add)) id.add(k, v);
      amp.identify(id);
    }
  };
  try {
    if (ready) run();
    else queue.push(['__user__', run]);
  } catch { /* 무시 */ }
}
