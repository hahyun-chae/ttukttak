// 피그마 시안 템플릿 렌더러.
// 좌표·폰트·색은 피그마 프레임(620×877)에서 그대로 옮겼다. 캔버스(2480×3508)에는 4배로 그린다.
// 배경 이미지(글자를 숨기고 내보낸 PNG/JPG) 위에 사용자 입력으로 만든 글자와 날짜 표시를 그린다.

import { LAYOUTS } from './catalog.js';
import { parseDate, toISO, addDays, dateRange, holidayRows, holidayPeriodName, ro } from './copy.js';

const FW = 620;
const FH = 877;
const DOW = '일월화수목금토';
const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DOW_EN_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// 설날·추석 당일 (음력이라 해마다 다르다)
const LUNAR = {
  설날: ['2025-01-29', '2026-02-17', '2027-02-07', '2028-01-27', '2029-02-13', '2030-02-03'],
  추석: ['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12'],
};

// ---------- 날짜 표현 ----------
function day(iso) {
  const d = parseDate(iso);
  return { iso, y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), w: d.getDay() };
}
const md = (iso) => { const x = day(iso); return `${x.m}월 ${x.d}일(${DOW[x.w]})`; };
const slash = (iso) => { const x = day(iso); return `${x.m}/${x.d}(${DOW[x.w]})`; };
// 뒤쪽 날짜는 같은 달이면 월을 생략한다: "9월 24일(목)부터 27일(일)까지"
function tail(a, b) {
  const x = day(a);
  const y = day(b);
  return x.m === y.m ? `${y.d}일(${DOW[y.w]})` : md(b);
}
function span(a, b) {
  return a === b ? md(a) : `${md(a)}부터 ${tail(a, b)}까지`;
}
function dotRange(a, b) {
  const x = day(a);
  const y = day(b);
  return a === b ? `${x.m}.${x.d}` : `${x.m}.${x.d} – ${y.m}.${y.d}`;
}
function slashRange(a, b) {
  if (a === b) return slash(a);
  const x = day(a);
  const y = day(b);
  return `${x.m}/${x.d}~${y.m}/${y.d}`;
}
function enRange(a, b) {
  const x = day(a);
  const y = day(b);
  if (a === b) return `${DOW_EN_LONG[x.w]}  ${MONTH_EN[x.m - 1]} ${x.d}`;
  return x.m === y.m ? `${MONTH_EN[x.m - 1]} ${x.d} – ${y.d}` : `${MONTH_EN[x.m - 1]} ${x.d} – ${MONTH_EN[y.m - 1]} ${y.d}`;
}
const closeOf = (time) => String(time || '').split('~')[1] || '';

const GREETING = {
  추석: '넉넉한 한가위, 따뜻한 시간 보내세요.',
  설날: '새해 복 많이 받으세요!',
  크리스마스: '따뜻한 연말 보내세요!',
  한글날: '참고하여 방문해 주세요.',
  기타: '즐거운 휴일 보내세요.',
};

/**
 * 입력값 → 피그마 시안에 넣을 문구와 날짜 정보.
 * days: 안내 대상 날짜들 { iso, m, d, w, status: off|on|short|part, label }
 */
export function buildView(type, data, template) {
  const fields = new Set(template?.fields || []);
  const reasonRaw = data.reason === '__custom' ? data.reasonCustom?.trim() : data.reason;
  const reason = fields.has('reason') && reasonRaw ? reasonRaw : '';
  const v = {
    type,
    store: data.showStore && data.storeName?.trim() ? data.storeName.trim() : '',
    note: fields.has('note') && data.note?.trim() ? data.note.trim() : '',
    occasion: null,
    peak: null,
    message: [],
    detail: [],
    resume: '',
    resumeISO: null,
    greeting: '',
  };

  if (type === 'holiday') {
    const rows = holidayRows(data);
    v.days = rows.map((r) => ({ ...day(r.iso), status: r.status, label: r.status === 'off' ? '휴무' : r.status === 'on' ? '정상영업' : `~${closeOf(r.time)}` }));
    v.occasion = data.name;
    const P = holidayPeriodName(data);
    v.mode = rows.every((r) => r.status === 'off') ? 'allClosed' : rows.every((r) => r.status === 'on') ? 'normal' : 'mixed';
    const suffix = { allClosed: '휴무 안내', normal: '정상 영업 안내', mixed: '영업 안내' }[v.mode];
    v.headline = `${P} ${suffix}`;
    v.head2 = [P, suffix];
    const a = v.days[0].iso;
    const b = v.days[v.days.length - 1].iso;
    if (v.mode === 'allClosed') {
      v.message = [a === b ? `${md(a)}은 ${P}${ro(P)} 하루 쉬어 갑니다.` : `${span(a, b)} ${P}${ro(P)} 쉬어 갑니다.`];
    } else if (v.mode === 'normal') {
      v.message = [a === b ? `${md(a)}에도 정상 영업합니다.` : `${span(a, b)} 정상 영업합니다.`];
      v.detail = [`영업시간 ${data.open} ~ ${data.close}`];
    } else {
      // "12월 24일은 19:00까지 영업하고 / 25일은 하루 쉬어 갑니다." — 날이 많으면 한 줄로 줄인다
      const special = v.days.filter((x) => x.status !== 'on');
      const close = (x) => closeOf(rows.find((r) => r.iso === x.iso).time);
      if (special.length <= 2) {
        v.message = special.map((x, i) => {
          const when = i === 0 || special[0].m !== x.m ? `${x.m}월 ${x.d}일은` : `${x.d}일은`;
          const lastOne = i === special.length - 1;
          if (x.status === 'off') return `${when} ${lastOne ? '하루 쉬어 갑니다.' : '쉬고'}`;
          return `${when} ${close(x)}까지 ${lastOne ? '영업합니다.' : '영업하고'}`;
        });
      } else {
        v.message = [special.map((x) => (x.status === 'off' ? `${x.d}일(${DOW[x.w]}) 휴무` : `${x.d}일(${DOW[x.w]}) ${close(x)}까지 영업`)).join(' · ')];
      }
      if (v.days.some((x) => x.status === 'on')) v.detail = ['그 외 날짜는 정상 영업합니다.'];
    }
    const last = v.days[v.days.length - 1];
    if (last.status === 'off') {
      v.resumeISO = addDays(last.iso, 1);
      v.resume = `${md(v.resumeISO)}부터 정상 영업합니다.`;
      v.resumeShort = `${tail(last.iso, v.resumeISO)}부터 정상 영업합니다.`;
      if (v.mode === 'allClosed') v.detail = [v.resume];
      else v.detail.push(v.resume);
    }
    v.greeting = GREETING[v.occasion] || GREETING.기타;
    const peak = data.name === '크리스마스' ? v.days.map((x) => x.iso).find((iso) => iso.endsWith('-12-25'))
      : data.name === '한글날' ? v.days.map((x) => x.iso).find((iso) => iso.endsWith('-10-09'))
      : (LUNAR[data.name] || []).find((iso) => v.days.some((x) => x.iso === iso));
    v.peak = peak || null;
    v.headlineDate = `${dateWords(a, b)} ${suffix}`;
  }

  if (type === 'closed') {
    const single = !data.multi || !data.end || data.end <= data.start;
    const end = single ? data.start : data.end;
    const partial = data.allDay === false && data.from && data.to;
    const summer = !single && [7, 8].includes(day(data.start).m);
    v.days = dateRange(data.start, end).map((iso) => ({ ...day(iso), status: partial ? 'part' : 'off', label: partial ? `${data.from}~` : '휴무' }));
    v.mode = 'allClosed';
    v.headline = summer ? '여름 휴가 안내' : '임시 휴무 안내';
    v.head2 = summer ? ['여름 휴가', '안내'] : ['임시 휴무', '안내'];
    const why = reason ? `${reason}${ro(reason)} 인해 ` : summer ? '여름 휴가로 ' : '매장 사정으로 ';
    if (partial) {
      v.message = [`${why}${single ? md(data.start) : span(data.start, end)} ${data.from}~${data.to} 잠시 쉬어 갑니다.`];
      v.detail = ['그 외 시간은 정상 영업합니다.'];
    } else {
      v.message = [single ? `${why}${md(data.start)} 하루 쉬어 갑니다.` : `${why}${span(data.start, end)} 쉬어 갑니다.`];
      v.resumeISO = addDays(end, 1);
      v.resume = `${md(v.resumeISO)}부터 정상 영업합니다.`;
      v.resumeShort = `${tail(end, v.resumeISO)}부터 정상 영업합니다.`;
      v.detail = [v.resume];
    }
    v.greeting = summer ? '시원한 여름 보내세요!' : '이용에 불편을 드려 죄송합니다.';
    v.summer = summer;
    v.partial = partial;
    v.partialTime = partial ? `${data.from}~${data.to}` : '';
    v.reason = reason;
    v.headlineDate = `${dateWords(data.start, end)} 휴무 안내`;
  }

  if (type === 'short') {
    const single = !data.multi || !data.end || data.end <= data.start;
    const end = single ? data.start : data.end;
    v.days = dateRange(data.start, end).map((iso) => ({ ...day(iso), status: 'short', label: `~${data.newClose}` }));
    v.mode = 'short';
    v.headline = '단축 영업 안내';
    v.head2 = ['단축 영업', '안내'];
    v.hours = `${data.newOpen} ~ ${data.newClose}`;
    const why = reason ? `${reason}${ro(reason)} 인해 ` : '매장 사정으로 ';
    v.message = [`${why}${single ? md(data.start) : span(data.start, end)} 영업시간을 단축합니다.`];
    v.detail = [`변경 영업시간 ${v.hours}`, `(기존 ${data.open} ~ ${data.close})`];
    v.greeting = '이용에 참고 부탁드립니다.';
    v.reason = reason;
    v.headlineDate = `${dateWords(data.start, end)} 단축 영업 안내`;
  }

  if (type === 'soldout') {
    v.days = [{ ...day(data.date), status: 'off', label: data.mode === 'early' ? '조기마감' : '품절' }];
    v.mode = data.mode === 'menus' ? 'menus' : 'early';
    if (v.mode === 'menus') {
      const items = (data.menus || []).map((m) => m.trim()).filter(Boolean);
      v.menus = items.length ? items : ['메뉴명'];
      v.headline = '품절 메뉴 안내';
      v.head2 = ['품절 메뉴', '안내'];
      v.message = ['아래 메뉴는 재료 소진으로 주문이 어렵습니다.', v.menus.join(' · ')];
    } else {
      v.headline = '재료 소진 안내';
      v.head2 = ['재료 소진', '안내'];
      v.message = ['오늘 준비한 재료가 모두 소진되어', `${data.time ? `${data.time}에 ` : ''}조기 마감합니다.`];
    }
    v.time = data.time;
    if (fields.has('nextOpen') && data.nextOpenDate) {
      v.resumeISO = data.nextOpenDate;
      v.resume = `${md(data.nextOpenDate)}${data.nextOpenTime ? ` ${data.nextOpenTime}` : ''}부터 정상 영업합니다.`;
      v.resumeShort = v.resume;
      v.detail = [v.resume];
    } else {
      v.detail = ['내일 더 넉넉히 준비할게요.'];
    }
    v.greeting = '찾아주셔서 감사합니다.';
    v.headlineDate = `${dateWords(data.date, data.date)} ${v.headline.replace(' 안내', '')} 안내`;
  }

  v.first = v.days[0];
  v.last = v.days[v.days.length - 1];
  v.when = v.first.iso === v.last.iso ? md(v.first.iso) : `${md(v.first.iso)} ~ ${md(v.last.iso)}`;
  v.dot = dotRange(v.first.iso, v.last.iso);
  v.slash = slashRange(v.first.iso, v.last.iso);
  v.en = enRange(v.first.iso, v.last.iso);
  return v;
}

// "10월 9일" / "10월 9일~10일" / "9월 30일~10월 2일"
function dateWords(a, b) {
  const x = day(a);
  const y = day(b);
  if (a === b) return `${x.m}월 ${x.d}일`;
  return x.m === y.m ? `${x.m}월 ${x.d}일~${y.d}일` : `${x.m}월 ${x.d}일~${y.m}월 ${y.d}일`;
}

// 영문 장식 문구 (만능 시안은 유형마다 바뀐다)
function enWords(v) {
  const t = v.type;
  if (t === 'holiday') {
    const xmas = v.occasion === '크리스마스';
    return {
      kicker: xmas ? 'CHRISTMAS NOTICE' : 'HOLIDAY NOTICE',
      greet: xmas ? 'Happy Christmas!' : 'Happy Holidays!',
      pair: xmas ? ['Merry', 'Christmas'] : ['Happy', 'Holidays'],
      bottom: v.mode === 'normal' ? 'we are open !' : v.mode === 'mixed' ? 'see you soon !' : 'we are closed !',
      big: xmas ? ['MERRY', 'CHRISTMAS'] : ['HOLIDAY', 'NOTICE'],
      photo: { 추석: 'CHUSEOK HOLIDAY', 설날: 'NEW YEAR HOLIDAY', 크리스마스: 'CHRISTMAS HOLIDAY', 한글날: 'HANGEUL DAY' }[v.occasion] || 'HOLIDAY NOTICE',
    };
  }
  if (t === 'closed') {
    const multi = v.days.length > 1;
    const winter = multi && [12, 1, 2].includes(v.first.m);
    return {
      kicker: 'CLOSED NOTICE',
      greet: 'Sorry,',
      pair: v.summer ? ['Summer', 'Vacation'] : winter ? ['Winter', 'Vacation'] : multi ? ['Taking', 'a Break'] : ['Day', 'Off'],
      bottom: 'we are closed !',
      big: ['CLOSED', multi ? 'NOTICE' : 'TODAY'],
      photo: v.summer ? 'SUMMER HOLIDAY' : 'CLOSED NOTICE',
    };
  }
  if (t === 'short') {
    return { kicker: 'SHORT HOURS NOTICE', greet: 'Notice', pair: ['Short', 'Hours'], bottom: 'short hours today', big: ['SHORT', 'HOURS'], photo: 'BUSINESS HOURS' };
  }
  return {
    kicker: 'SOLD OUT NOTICE',
    greet: 'Thank you!',
    pair: ['Sold', 'Out'],
    bottom: 'we are sold out !',
    big: v.mode === 'menus' ? ['SOLD', 'OUT'] : ['EARLY', 'SOLDOUT'],
    photo: 'SOLD OUT',
  };
}

// ---------- 그리기 도구 ----------
let K = 1; // 캔버스 픽셀 / 피그마 단위 (그림자 크기 보정용)
const FALLBACK = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

function setFont(ctx, f) {
  ctx.font = `${f.italic ? 'italic ' : ''}${f.w || 400} ${f.size}px "${f.family}",${FALLBACK}`;
}
function measure(ctx, s, f) {
  setFont(ctx, f);
  if (!f.ls) return ctx.measureText(s).width;
  let w = 0;
  for (const ch of s) w += ctx.measureText(ch).width + f.ls;
  return w - f.ls;
}

/**
 * 글자 한 줄. f: { family, size, w, italic, color, alpha, ls, align, maxW, stroke, shadow }
 * maxW 를 넘으면 글자 크기를 줄여서 맞춘다. 그린 폭을 돌려준다.
 */
function text(ctx, s, x, y, f) {
  s = String(s ?? '');
  if (!s) return 0;
  let w = measure(ctx, s, f);
  if (f.maxW && w > f.maxW) {
    f = { ...f, size: f.size * (f.maxW / w), ls: (f.ls || 0) * (f.maxW / w) };
    w = measure(ctx, s, f);
  }
  const left = f.align === 'center' ? x - w / 2 : f.align === 'right' ? x - w : x;
  ctx.save();
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.globalAlpha = f.alpha ?? 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = f.color;
  if (f.shadow) {
    ctx.shadowColor = f.shadow.color;
    ctx.shadowBlur = f.shadow.blur * K;
    ctx.shadowOffsetY = f.shadow.y * K;
  }
  const one = (str, xx) => {
    if (f.stroke) {
      ctx.lineWidth = f.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = f.color;
      ctx.strokeText(str, xx, y);
    }
    ctx.fillText(str, xx, y);
  };
  if (!f.ls) one(s, left);
  else {
    let cx = left;
    for (const ch of s) {
      one(ch, cx);
      cx += ctx.measureText(ch).width + f.ls;
    }
  }
  ctx.restore();
  return w;
}

// 띄어쓰기 단위 줄바꿈
function wrap(ctx, s, f, maxW) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (!line || measure(ctx, t, f) <= maxW) line = t;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

// 여러 줄로 나뉠 때 마지막 줄만 짧게 남지 않도록 줄 길이를 고르게 맞춘다
function balanced(ctx, s, f, maxW) {
  const base = wrap(ctx, s, f, maxW);
  if (base.length < 2) return base;
  let lo = maxW / 2;
  let hi = maxW;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(ctx, s, f, mid).length > base.length) lo = mid;
    else hi = mid;
  }
  return wrap(ctx, s, f, hi);
}

// 문장 목록을 최대 max 줄로 — 문장마다 새 줄에서 시작하고, 남은 줄에 안 들어가는 문장은 뺀다
function fitLines(ctx, sentences, f, maxW, max) {
  const out = [];
  for (const s of sentences) {
    if (!s) continue;
    const w = balanced(ctx, s, f, maxW);
    if (out.length + w.length <= max) out.push(...w);
  }
  return out;
}
function para(ctx, sentences, x, y, lh, f, maxW, max) {
  const ls = fitLines(ctx, sentences, f, maxW, max);
  ls.forEach((l, i) => text(ctx, l, x, y + lh * i, { ...f, maxW }));
  return ls.length;
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillRR(ctx, x, y, w, h, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}
function strokeRR(ctx, x, y, w, h, r, color, lw = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}
function circle(ctx, cx, cy, r, { fill, stroke, lw = 1, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// 안내 대상 날짜가 가운데 오도록 n일짜리 창을 만든다
function windowDays(v, n, pad = Math.max(0, Math.floor((n - v.days.length) / 2))) {
  const start = addDays(v.first.iso, -pad);
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(start, i);
    return { ...day(iso), ev: v.days.find((x) => x.iso === iso) || null };
  });
}
// 같은 상태가 이어지는 칸 묶음 [{ a, b }] — 연속 휴무를 띠로 잇는 데 쓴다
function runs(cells, test) {
  const out = [];
  cells.forEach((c, i) => {
    if (!test(c)) return;
    const last = out[out.length - 1];
    if (last && last.b === i - 1) last.b = i;
    else out.push({ a: i, b: i });
  });
  return out;
}
const isOff = (c) => c.ev && c.ev.status === 'off';
const isSoft = (c) => c.ev && (c.ev.status === 'short' || c.ev.status === 'part');

// 작은 리본 (12번 시안)
function bow(ctx, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + s * 6, y - 11, x + s * 17, y - 9, x + s * 15, y);
    ctx.bezierCurveTo(x + s * 14, y + 6, x + s * 6, y + 3, x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + s * 5, y + 7, x + s * 9, y + 12);
    ctx.stroke();
  }
  circle(ctx, x, y, 2.4, { fill: color });
  ctx.restore();
}

// ---------- 시안별 그리기 ----------
const SHADOW = { color: 'rgba(0,0,0,0.3)', blur: 8, y: 1 };

const DESIGNS = {
  // 01 추석 · 보름달 밤하늘
  chuseokMoon(ctx, v) {
    const gold = '#E9D9A6';
    text(ctx, `${v.first.y} CHUSEOK HOLIDAY`, 310, 59, { family: 'Cormorant', w: 600, size: 14, ls: 5.6, color: gold, align: 'center' });
    ['풍', '성', '한', '', '한', '가', '위'].forEach((ch, i) => text(ctx, ch, 77.2, 165.5 + 19 * i, { family: 'Noto Serif KR', w: 500, size: 14, color: gold, align: 'center' }));
    text(ctx, '추석', 310, 283, { family: 'Nanum Brush Script', size: 170, color: '#14204A', align: 'center' });
    text(ctx, v.headline, 310, 461.7, { family: 'Noto Serif KR', w: 600, size: 26, color: '#F7EBC4', align: 'center', maxW: 500 });

    // 피그마처럼 앞쪽을 조금 더 비워서 연휴 다음 날(정상영업)까지 보이게 한다
    const cells = windowDays(v, 7, Math.max(0, Math.ceil((7 - v.days.length) / 2)));
    const cx = (i) => 104.9 + 68.57 * i;
    for (const r of runs(cells, isOff)) fillRR(ctx, cx(r.a) - 27, 526, cx(r.b) - cx(r.a) + 54, 42, 21, '#F2D48A', 0.2);
    cells.forEach((c, i) => {
      const peak = c.iso === v.peak;
      if (peak) circle(ctx, cx(i), 547, 21, { fill: '#F2D48A' });
      const marked = c.ev && c.ev.status !== 'on';
      text(ctx, DOW[c.w], cx(i), 513.2, { family: 'Noto Sans KR', w: 500, size: 13, color: c.w === 0 ? '#F29A8A' : '#AEB6CF', align: 'center' });
      text(ctx, String(c.d), cx(i), 554.2, { family: 'Poppins', w: 500, size: 19, color: peak ? '#14204A' : marked ? '#F7E3A8' : '#D9DDEA', align: 'center' });
      const label = c.ev ? c.ev.label : c.iso === v.resumeISO ? '정상영업' : '';
      text(ctx, label, cx(i), 587.7, { family: 'Noto Sans KR', w: 500, size: 12, color: marked ? '#F2D48A' : '#AEB6CF', align: 'center', maxW: 64 });
    });
    para(ctx, [...v.message, v.mode === 'normal' ? v.detail[0] : '', v.note, v.greeting], 310, 636.1, 23,
      { family: 'Noto Sans KR', size: 14, color: '#C9CFE0', align: 'center' }, 480, 3);
    text(ctx, v.store, 310, 817.9, { family: 'Gowun Batang', w: 700, size: 17, color: gold, align: 'center', maxW: 400 });
  },

  // 02 추석·설날 · 따뜻한 물결
  harvestWave(ctx, v) {
    text(ctx, 'NOTICE', 310, 170.8, { family: 'Cormorant', w: 600, size: 15, ls: 3, color: '#B5835A', align: 'center' });
    text(ctx, v.head2[0], 310, 248.8, { family: 'Noto Serif KR', w: 700, size: 62, color: '#4A2E1E', align: 'center', maxW: 500 });
    text(ctx, v.head2[1], 310, 322.8, { family: 'Noto Serif KR', w: 700, size: 62, color: '#C2532F', align: 'center', maxW: 500 });
    const lead = v.mode === 'normal' ? ['명절 연휴에도', '변함없이 문을 엽니다.']
      : v.mode === 'mixed' ? ['명절 연휴 동안', '영업 일정이 달라집니다.']
      : v.occasion === '설날' ? ['새해 복 많이 받으시라고', '저희 매장도 잠시 쉬어 갑니다.']
      : ['풍성하고 넉넉한 한가위 보내시라고', '저희 매장도 잠시 쉬어 갑니다.'];
    lead.forEach((l, i) => text(ctx, l, 310, 380.4 + 26 * i, { family: 'Noto Sans KR', size: 16, color: '#7A5A45', align: 'center', maxW: 480 }));
    fillRR(ctx, 105.75, 457.75, 408.5, 110.5, 55.25, '#FFFFFF', 0.75);
    strokeRR(ctx, 105.75, 457.75, 408.5, 110.5, 55.25, '#E8B98E', 1.5);
    const label = { allClosed: '연휴 휴무 기간', normal: '연휴 영업 기간', mixed: '연휴 영업 일정' }[v.mode];
    text(ctx, `◆  ${label}  ◆`, 310, 491.1, { family: 'Noto Sans KR', w: 500, size: 14, color: '#C2532F', align: 'center' });
    text(ctx, v.when, 310, 534.7, { family: 'Noto Serif KR', w: 600, size: 26, color: '#4A2E1E', align: 'center', maxW: 370 });
    const body = v.mode === 'mixed' ? [...v.message, ...v.detail] : v.detail;
    para(ctx, [...body, v.note, v.greeting], 310, 615.5, 25, { family: 'Noto Sans KR', size: 15, color: '#7A5A45', align: 'center' }, 480, 3);
    text(ctx, v.store, 310, 841.8, { family: 'Gowun Batang', w: 700, size: 18, color: '#FFF6EC', align: 'center', maxW: 400 });
  },

  // 03 크리스마스 · 트리
  xmasTree(ctx, v) {
    const ink = '#F7F3EA';
    const pink = '#F2B9A6';
    text(ctx, 'CHRISTMAS HOLIDAY', 310, 75, { family: 'Cormorant', w: 600, size: 14, ls: 5.6, color: '#5F7352', align: 'center' });
    text(ctx, 'Merry', 310, 427.5, { family: 'DM Serif Display', italic: true, size: 40, color: ink, align: 'center' });
    text(ctx, 'Christmas!', 310, 470.5, { family: 'DM Serif Display', italic: true, size: 40, color: ink, align: 'center' });
    const cols = v.days.length <= 3 ? v.days : [v.first, v.last];
    const gap = 111;
    const x = (i) => 310 + (i - (cols.length - 1) / 2) * gap;
    for (let i = 1; i < cols.length; i++) rect(ctx, (x(i - 1) + x(i)) / 2 - 0.75, 500, 1.5, 58, '#FFFFFF', 0.6);
    cols.forEach((c, i) => {
      const color = c.status === 'off' ? pink : ink;
      text(ctx, String(c.d), x(i), 542.6, { family: 'Poppins', w: 500, size: 46, color, align: 'center' });
      text(ctx, c.label, x(i), 569.2, { family: 'Noto Sans KR', w: 500, size: 13, color, align: 'center', maxW: 100 });
    });
    para(ctx, [...v.message, ...(v.mode === 'allClosed' ? [] : v.detail), v.note, v.greeting], 310, 627.1, 23,
      { family: 'Noto Sans KR', size: 14, color: ink, align: 'center' }, 330, 3);
    text(ctx, v.store, 310, 775.9, { family: 'Gowun Batang', w: 700, size: 17, color: ink, align: 'center', maxW: 300 });
  },

  // 04 크리스마스 · 레드 카드
  xmasRed(ctx, v) {
    const red = '#B51F24';
    const ink = '#2E2522';
    const sub = '#8B6F67';
    text(ctx, "Season's Greetings", 310, 131.2, { family: 'Gowun Dodum', size: 13, ls: 0.2, color: sub, align: 'center' });
    text(ctx, 'HOLIDAY', 310, 251, { family: 'Bodoni Moda', w: 700, size: 58, ls: -1, color: red, align: 'center' });
    text(ctx, 'Notice', 310, 308.8, { family: 'Great Vibes', size: 79, color: ink, align: 'center' });
    const head = { allClosed: 'CLOSED', normal: 'OPEN AS USUAL', mixed: 'HOLIDAY HOURS' }[v.mode];
    text(ctx, `${head}  ·  ${v.en}`, 310, 353.4, { family: 'Inter', w: 600, size: 12, ls: 0.7, color: ink, align: 'center', maxW: 400 });
    const cells = windowDays(v, 3);
    const x = (i) => 183 + 127 * i;
    ctx.save();
    ctx.strokeStyle = '#D8CBBE';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(138.5, 452.5);
    ctx.lineTo(481.5, 452.5);
    ctx.stroke();
    ctx.restore();
    cells.forEach((c, i) => {
      text(ctx, DOW_EN[c.w], x(i), 437.1, { family: 'Inter', size: 14, color: sub, align: 'center' });
      if (isOff(c)) circle(ctx, x(i), 494.5, 29, { stroke: red, lw: 1.8 });
      else if (isSoft(c)) circle(ctx, x(i), 494.5, 29, { stroke: red, lw: 1.2, alpha: 0.45 });
      text(ctx, String(c.d), x(i), 508.5, { family: 'Bodoni Moda', size: 40, color: ink, align: 'center' });
    });
    para(ctx, [...v.message, ...v.detail, v.note, v.greeting], 310, 585.1, 22, { family: 'Gowun Dodum', size: 14, color: sub, align: 'center' }, 420, 3);
    text(ctx, v.store, 310, 668, { family: 'Gowun Dodum', size: 15, ls: 1, color: red, align: 'center', maxW: 360 });
  },

  // 05 한글날
  hangeul(ctx, v) {
    const ink = '#3B2A1E';
    const red = '#C9553A';
    text(ctx, '세종대왕께 감사하는 날', 310, 164, { family: 'Noto Serif KR', w: 500, size: 14, ls: 1.4, color: '#9C7B55', align: 'center' });
    text(ctx, '한글날', 310, 257.1, { family: 'Nanum Brush Script', size: 128, color: ink, align: 'center' });
    text(ctx, v.headlineDate, 310, 362.5, { family: 'Noto Serif KR', w: 700, size: 30, color: ink, align: 'center', maxW: 470 });
    const start = addDays(v.first.iso, -v.first.w);
    const cells = Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(start, i);
      return { ...day(iso), ev: v.days.find((x) => x.iso === iso) || null };
    });
    const cx = (i) => 104.9 + 68.57 * i;
    const offRuns = runs(cells, isOff);
    for (const r of offRuns) fillRR(ctx, cx(r.a) - 21, 483, cx(r.b) - cx(r.a) + 42, 42, 21, red);
    cells.forEach((c, i) => {
      const dc = c.w === 0 ? red : c.w === 6 ? '#3D5A8A' : ink;
      text(ctx, DOW[c.w], cx(i), 443.1, { family: 'Noto Sans KR', w: 500, size: 14, color: dc, align: 'center' });
      if (isSoft(c)) circle(ctx, cx(i), 504, 21, { stroke: red, lw: 1.5 });
      text(ctx, String(c.d), cx(i), 511.4, { family: 'Poppins', w: 500, size: 21, color: isOff(c) ? '#FFFFFF' : isSoft(c) ? red : dc, align: 'center' });
      if (isSoft(c)) text(ctx, c.ev.label, cx(i), 542.8, { family: 'Noto Sans KR', w: 500, size: 12, color: red, align: 'center', maxW: 64 });
    });
    for (const r of offRuns) text(ctx, '휴무', (cx(r.a) + cx(r.b)) / 2, 542.8, { family: 'Noto Sans KR', w: 500, size: 12, color: red, align: 'center' });
    para(ctx, [...v.message, ...v.detail, v.note, v.greeting], 310, 621.4, 26, { family: 'Noto Sans KR', size: 16, color: '#5B4634', align: 'center' }, 480, 3);
    if (v.store) {
      const f = { family: 'Noto Serif KR', w: 700, size: 15, color: '#FFFFFF', align: 'center' };
      // 네 글자 이하면 피그마처럼 정사각 도장에 두 줄로 ("뚝딱 국밥" → 뚝딱 / 국밥)
      const words = v.store.split(/\s+/);
      const chars = [...words.join('')];
      if (chars.length <= 4) {
        const half = Math.ceil(chars.length / 2);
        const ls = words.length === 2 ? words : chars.length > 2 ? [chars.slice(0, half).join(''), chars.slice(half).join('')] : [v.store];
        fillRR(ctx, 282, 782, 56, 56, 6, red);
        ls.forEach((l, i) => text(ctx, l, 310, ls.length === 2 ? 807.5 + 18 * i : 815.5, f));
      } else {
        const w = Math.min(320, measure(ctx, v.store, f) + 24);
        fillRR(ctx, 310 - w / 2, 792, w, 36, 6, red);
        text(ctx, v.store, 310, 815.5, { ...f, maxW: w - 20 });
      }
    }
  },

  // 06 설날 · 색동과 산
  seollal(ctx, v) {
    const ink = '#4A3426';
    const red = '#C8423B';
    const sub = '#8A7462';
    text(ctx, '설날', 247, 218, { family: 'Gowun Batang', w: 700, size: 70, color: ink });
    text(ctx, v.head2[1], 310, 268.3, { family: 'Gowun Batang', size: 34, color: ink, align: 'center', maxW: 420 });
    fillRR(ctx, 111, 328, 398, 148, 13, '#FFFFFF');
    strokeRR(ctx, 111, 328, 398, 148, 13, '#D9CBB4', 2);
    strokeRR(ctx, 118.5, 335.5, 383, 133, 9.5, '#E8DFCF', 1);
    const cols = v.days.slice(0, 5);
    const cw = 383 / cols.length;
    const x = (i) => 118.5 + cw * (i + 0.5);
    for (let i = 1; i < cols.length; i++) rect(ctx, 118.5 + cw * i, 359, 1, 92, '#E8DFCF');
    cols.forEach((c, i) => {
      const color = c.status === 'on' ? sub : red;
      text(ctx, String(c.d), x(i), 420.2, { family: 'Gowun Batang', w: 700, size: cols.length >= 4 ? 38 : 44, color, align: 'center' });
      text(ctx, c.label, x(i), 443.1, { family: 'Noto Sans KR', w: 500, size: 14, color: sub, align: 'center', maxW: cw - 10 });
      if (c.iso === v.peak) {
        fillRR(ctx, x(i) - 27, 343, 54, 22, 11, red);
        text(ctx, '설날', x(i), 357.8, { family: 'Noto Sans KR', w: 700, size: 12, color: '#FFFFFF', align: 'center' });
      }
    });
    const n = para(ctx, v.message, 310, 515.7, 30, { family: 'Noto Sans KR', w: 500, size: 20, color: ink, align: 'center' }, 520, 2);
    const after = v.mode === 'allClosed' ? [v.resumeShort] : v.detail;
    para(ctx, [...after, v.note, v.greeting], 310, n > 1 ? 618 : 603.2, 33, { family: 'Noto Sans KR', size: 20, color: sub, align: 'center' }, 500, 2);
    text(ctx, v.store, 310, 685.9, { family: 'Gowun Batang', w: 700, size: 17, color: ink, align: 'center', maxW: 400 });
  },

  // 07 만능A · 월간 달력
  calendarMonth(ctx, v) {
    const blue = '#1F4FD8';
    const navy = '#1B2440';
    const red = '#FF5A4E';
    const soft = '#E3ECFF';
    const { y, m } = v.first;
    const title = v.type === 'holiday' ? v.headline : v.type === 'short' ? `${m}월 단축 영업 안내` : `${m}월 휴무 안내`;
    text(ctx, title, 310, 142.2, { family: 'NPS', w: 800, size: 52, color: blue, align: 'center', maxW: 540 });
    text(ctx, '방문 전 꼭 확인해 주세요!', 310, 185.9, { family: 'Noto Sans KR', w: 500, size: 16, color: '#3C4A6B', align: 'center' });
    text(ctx, String(m), 80, 304, { family: 'Poppins', w: 600, size: 40, color: navy });
    text(ctx, `${MONTH_EN[m - 1]} ${y}`, 540, 298.4, { family: 'Poppins', w: 500, size: 11, ls: 2.2, color: '#8A94AD', align: 'right' });
    const cx = (i) => 112.86 + 65.714 * i;
    for (let i = 0; i < 7; i++) {
      text(ctx, DOW[i], cx(i), 365.2, { family: 'Noto Sans KR', w: 500, size: 13, color: i === 0 ? '#E5484D' : i === 6 ? '#3A6FE0' : '#6B7590', align: 'center' });
    }
    const firstDow = new Date(y, m - 1, 1).getDay();
    const dim = new Date(y, m, 0).getDate();
    const rows = Math.ceil((firstDow + dim) / 7);
    const gap = rows > 5 ? 46 : 54;
    const cy = (r) => 416 + gap * r;
    // 주 단위로 칸을 나눠서 연속된 날을 띠로 잇는다
    const secondaryISO = v.mode === 'normal' ? null : v.resumeISO;
    const kind = (iso) => {
      const ev = v.days.find((x) => x.iso === iso);
      if (ev && ev.status === 'off') return 'primary';
      if (ev && (ev.status === 'short' || ev.status === 'part' || (v.mode === 'normal' && ev.status === 'on'))) return 'secondary';
      if (iso === secondaryISO) return 'secondary';
      return '';
    };
    const cells = [];
    for (let dd = 1; dd <= dim; dd++) {
      const pos = firstDow + dd - 1;
      cells.push({ d: dd, iso: toISO(new Date(y, m - 1, dd)), col: pos % 7, row: Math.floor(pos / 7) });
    }
    for (const k of ['secondary', 'primary']) {
      for (let r = 0; r < rows; r++) {
        const inRow = cells.filter((c) => c.row === r);
        for (const run of runs(inRow, (c) => kind(c.iso) === k)) {
          const a = inRow[run.a];
          const b = inRow[run.b];
          fillRR(ctx, cx(a.col) - 19, cy(r) - 19, cx(b.col) - cx(a.col) + 38, 38, 19, k === 'primary' ? red : soft);
        }
      }
    }
    for (const c of cells) {
      const k = kind(c.iso);
      const color = k === 'primary' ? '#FFFFFF' : k === 'secondary' ? blue : c.col === 0 ? '#E5484D' : c.col === 6 ? '#3A6FE0' : navy;
      text(ctx, String(c.d), cx(c.col), cy(c.row) + 5.95, { family: 'Poppins', w: 500, size: 17, color, align: 'center' });
    }
    // 범례 — 왼쪽(연한 파랑)은 보조 정보, 오른쪽(빨강)은 핵심 정보
    const offDays = v.days.filter((x) => x.status === 'off');
    const softDays = v.days.filter((x) => x.status === 'short' || x.status === 'part');
    let left = '';
    let right = '';
    if (v.type === 'holiday') {
      if (v.mode === 'normal') { left = `정상영업  ${v.slash}`; right = `영업시간  ${v.detail[0].replace('영업시간 ', '')}`; }
      else {
        right = `휴무  ${offDays.length ? slashRange(offDays[0].iso, offDays[offDays.length - 1].iso) : '-'}`;
        left = softDays.length ? `단축  ${softDays.map((x) => slash(x.iso)).join(', ')}` : v.resumeISO ? `정상영업  ${slash(v.resumeISO)}` : '';
      }
    } else if (v.type === 'short') {
      left = `영업시간  ${v.hours}`;
      right = `단축영업  ${v.slash}`;
    } else if (v.partial) {
      left = `휴무시간  ${v.partialTime}`;
      right = `부분휴무  ${v.slash}`;
    } else {
      left = v.resumeISO ? `영업재개  ${slash(v.resumeISO)}` : '';
      right = `임시휴무  ${v.slash}`;
    }
    const lf = { family: 'Noto Sans KR', w: 500, size: 14, color: navy, maxW: 186 };
    text(ctx, left, 101, 736.1, lf);
    text(ctx, right, 361, 736.1, lf);
    text(ctx, v.store, 310, 841.1, { family: 'Noto Sans KR', w: 700, size: 14, color: blue, align: 'center', maxW: 500 });
  },

  // 08 만능B · 고양이 NOTICE
  catNotice(ctx, v) {
    const blue = '#4A78B5';
    text(ctx, 'NOTICE', 50, 170.1, { family: 'Bagel Fat One', size: 100, color: blue });
    const f = v.first;
    const date = `${f.m}월 ${f.d}일 (${DOW[f.w]})`;
    const why = v.reason ? `${v.reason}${ro(v.reason)} 인해` : '매장 사정으로';
    let lead;
    let big;
    if (v.type === 'closed') {
      lead = [why, v.partial ? '잠시 쉬어 갑니다.' : v.days.length > 1 ? '잠시 쉬어 갑니다.' : '하루 쉬어 갑니다.'];
      big = v.partial ? [date, `${v.partialTime} 휴무`]
        : v.days.length > 1 ? [`${f.m}.${f.d} ~ ${v.last.m}.${v.last.d}`, `${v.days.length}일간 휴무!`] : [date, '단 하루!'];
    } else if (v.type === 'short') {
      lead = [why, '영업시간을 단축합니다.'];
      big = v.days.length > 1 ? [`${f.m}.${f.d} ~ ${v.last.m}.${v.last.d}`, `${v.hours.split(' ~ ')[1]}까지 영업!`] : [date, `${v.hours.split(' ~ ')[1]}까지 영업!`];
    } else if (v.type === 'soldout') {
      lead = v.mode === 'menus' ? ['오늘은 아래 메뉴가', '모두 품절되었어요.'] : ['오늘 준비한 재료가', '모두 소진되었어요.'];
      big = v.mode === 'menus' ? [date, '품절 안내'] : [date, v.time ? `${v.time} 조기 마감!` : '조기 마감!'];
    } else {
      lead = [`${v.head2[0]} 동안`, v.mode === 'normal' ? '정상 영업합니다.' : '영업 일정을 알려드려요.'];
      big = [v.dot.replace(' – ', ' ~ '), v.mode === 'allClosed' ? '휴무합니다!' : '꼭 확인하세요!'];
    }
    lead.forEach((l, i) => text(ctx, l, 50, 287.5 + 38 * i, { family: 'Noto Sans KR', w: 500, size: 24, color: '#2B2B2B', maxW: 520 }));
    big.forEach((l, i) => text(ctx, l, 50, 404.1 + 65 * i, { family: 'Jua', size: 52, color: blue, maxW: 520 }));
    const small = v.type === 'soldout' && v.mode === 'menus' ? [v.menus.join(' · '), ...v.detail] : v.type === 'holiday' ? [...v.message, ...v.detail] : v.detail;
    para(ctx, [...small, v.note], 50, 519, 26, { family: 'Noto Sans KR', size: 16, color: '#555555' }, 330, 3);
    text(ctx, v.store, 60, 830.5, { family: 'Noto Sans KR', w: 500, size: 16, color: blue, maxW: 300 });
  },

  // 09 만능C · 블루 그라데이션
  blueGradient(ctx, v) {
    const en = enWords(v);
    text(ctx, en.kicker, 310, 77.2, { family: 'Poppins', w: 500, size: 12, ls: 4.8, color: '#FFFFFF', alpha: 0.85, align: 'center' });
    en.pair.forEach((l, i) => text(ctx, l, 310, 282.1 + 84 * i, { family: 'DM Serif Display', italic: true, size: 86, color: '#FFFFFF', align: 'center', maxW: 540 }));
    text(ctx, v.type === 'short' ? `${v.dot}  ${v.hours.replace(' ~ ', '–')}` : v.dot, 310, 479.5, { family: 'DM Serif Display', size: 40, color: '#FFFFFF', align: 'center', maxW: 520 });
    rect(ctx, 290, 514, 40, 1.5, '#FFFFFF', 0.8);
    const extra = v.type === 'soldout' && v.mode === 'menus' ? [] : v.detail;
    para(ctx, [...v.message, ...extra, v.note, v.greeting], 310, 563.5, 26, { family: 'Noto Sans KR', w: 500, size: 15, color: '#FFFFFF', align: 'center' }, 440, 3);
    text(ctx, v.store, 310, 831.2, { family: 'Poppins', w: 500, size: 12, ls: 2.4, color: '#FFFFFF', alpha: 0.9, align: 'center', maxW: 480 });
  },

  // 10 만능D · 메모지 (원본 Palast 이탤릭 → DM Serif Display 이탤릭)
  memoDark(ctx, v) {
    const cream = '#EFEAE0';
    const en = enWords(v);
    text(ctx, en.kicker, 310, 76.8, { family: 'Inter', w: 600, size: 9, ls: 1.2, color: cream, alpha: 0.84, align: 'center' });
    text(ctx, en.greet, 310, 234.1, { family: 'DM Serif Display', italic: true, size: 58, ls: 0.4, color: cream, align: 'center', maxW: 520 });
    const f = v.first;
    let label;
    let big;
    if (v.type === 'short') { label = `${MONTH_EN[f.m - 1]} ${f.d}`; big = v.hours.replace(' ~ ', ' - '); }
    else if (v.type === 'soldout') { label = `${MONTH_EN[f.m - 1]} ${f.d}`; big = v.mode === 'menus' ? 'SOLD OUT' : v.time || 'TODAY'; }
    else {
      label = f.m === v.last.m ? MONTH_EN[f.m - 1] : `${MONTH_EN[f.m - 1]} – ${MONTH_EN[v.last.m - 1]}`;
      big = v.days.length === 1 ? String(f.d) : v.days.length === 2 ? `${f.d} · ${v.last.d}` : `${f.d} - ${v.last.d}`;
    }
    // 메모지가 살짝 기울어져 있어서 글자도 같은 각도로 돌린다
    ctx.save();
    ctx.translate(316, 449);
    ctx.rotate((-1.4 * Math.PI) / 180);
    ctx.translate(-316, -449);
    text(ctx, label, 310, 434.1, { family: 'EF Jejudoldam', size: 28, ls: 1.2, color: '#111111', align: 'center', maxW: 340 });
    text(ctx, big, 310, 507.8, { family: 'EF Jejudoldam', size: 58, color: '#111111', align: 'center', maxW: 340 });
    ctx.restore();
    text(ctx, en.bottom, 310, 698.6, { family: 'DM Serif Display', italic: true, size: 58, color: cream, align: 'center', maxW: 520 });
    text(ctx, v.store, 310, 794.8, { family: 'Inter', w: 600, size: 9, ls: 1.2, color: cream, alpha: 0.86, align: 'center', maxW: 400 });
  },

  // 11 만능E · 주간 Notice
  weekNotice(ctx, v) {
    const ink = '#3F3D3B';
    const brown = '#9B7C53';
    const top = v.type === 'holiday' ? v.headline.replace(' 안내', '안내') : v.type === 'short' ? `${v.first.m}월 단축영업 안내` : `${v.first.m}월 휴무안내`;
    text(ctx, top, 310, 109.3, { family: 'Gowun Dodum', size: 19, color: ink, align: 'center', maxW: 480 });
    text(ctx, 'Notice', 310, 162.6, { family: 'Cormorant Garamond', w: 600, size: 49, color: brown, align: 'center' });
    // 피그마처럼 휴무 첫날을 맨 앞에 두고 뒤로 영업재개일을 보여준다 (하루만 쉬면 전날도 보여준다)
    const cells = windowDays(v, 5, v.days.length === 1 ? 1 : 0);
    const cx = (i) => 130.4 + 89.8 * i;
    for (const r of runs(cells, isOff)) fillRR(ctx, cx(r.a) - 38.4, 297, cx(r.b) - cx(r.a) + 76.8, 52, 26, '#D5CAB8');
    for (const r of runs(cells, isSoft)) fillRR(ctx, cx(r.a) - 38.4, 297, cx(r.b) - cx(r.a) + 76.8, 52, 26, '#ECE4D6');
    cells.forEach((c, i) => {
      text(ctx, DOW_EN[c.w], cx(i), 241.3, { family: 'Cormorant Garamond', w: 500, size: 23, color: ink, align: 'center' });
      if (c.iso === v.resumeISO) circle(ctx, cx(i), 322, 31.5, { stroke: brown, lw: 1.3 });
      text(ctx, String(c.d), cx(i), 330.2, { family: 'Arita Buri', w: 500, size: 24, color: ink, align: 'center' });
      if (c.iso === v.resumeISO) text(ctx, '영업재개', cx(i), 390.8, { family: 'Gowun Dodum', size: 19, color: ink, align: 'center' });
    });
    for (const r of runs(cells, isOff)) text(ctx, '휴무', (cx(r.a) + cx(r.b)) / 2, 390.8, { family: 'Gowun Dodum', size: 19, color: ink, align: 'center' });
    for (const r of runs(cells, isSoft)) text(ctx, cells[r.a].ev.label, (cx(r.a) + cx(r.b)) / 2, 390.8, { family: 'Gowun Dodum', size: 19, color: ink, align: 'center', maxW: 80 + 90 * (r.b - r.a) });
    para(ctx, [...v.message, ...v.detail, v.note], 310, 536.9, 42, { family: 'Gowun Dodum', size: 25, color: ink, align: 'center' }, 500, 5);
    text(ctx, v.store, 310, 811.5, { family: 'Gowun Dodum', size: 14, color: '#8F8580', align: 'center', maxW: 400 });
  },

  // 12 만능F · 물결 테두리
  softWave(ctx, v) {
    const coral = '#FF686F';
    const pink = '#F58E89';
    const en = enWords(v);
    text(ctx, 'NOTICE', 310, 150, { family: 'Nanum GoDigANiGoGoDing', size: 19, ls: 1.2, color: coral, stroke: 0.8, align: 'center' });
    en.big.forEach((word, i) => {
      const y = 256.4 + 90 * i;
      const f = { family: 'Nanum GoDigANiGoGoDing', size: 120, stroke: 7, align: 'center', maxW: 500 };
      text(ctx, word, 315, y + 5, { ...f, color: '#F5A8A5', alpha: 0.7 });
      text(ctx, word, 310, y, { ...f, color: coral });
    });
    const pf = { family: 'Ownglyph PDH', size: 28, color: pink, align: 'center' };
    ['안녕하세요 고객님,', '저희 매장을 찾아주셔서 감사합니다.'].forEach((l, i) => text(ctx, l, 310, 451.6 + 34 * i, pf));
    const msg = v.type === 'soldout' && v.mode === 'early' ? [`죄송하게도 금일 재료 소진으로 ${v.time ? `${v.time}에 ` : ''}조기 마감하게 되었습니다.`] : v.message;
    para(ctx, msg, 310, 539.6, 34, pf, 440, 3);
    const info = v.type === 'short' ? `영업시간 : ${v.hours}`
      : v.type === 'soldout' ? (v.mode === 'menus' ? `품절 : ${v.menus.join(', ')}` : v.resume ? `다음 영업 : ${slash(v.resumeISO)}` : `마감 : ${v.time || '조기 마감'}`)
      : v.resumeISO ? `영업 재개 : ${slash(v.resumeISO)}` : `${v.type === 'holiday' ? '휴무' : '휴무 시간'} : ${v.slash}`;
    const w = text(ctx, info, 310, 707.6, { family: 'Ownglyph PDH', size: 28, color: '#585858', align: 'center', maxW: 420 });
    bow(ctx, 310 - w / 2 - 28, 699, pink);
    bow(ctx, 310 + w / 2 + 28, 699, pink);
    text(ctx, v.store, 310, 797, { family: 'Nanum GoDigANiGoGoDing', size: 16, ls: 0.8, color: '#585858', align: 'center', maxW: 400 });
  },

  // 13~18 사진형 — 사진마다 글자 묶음의 높이가 달라서 변형별 위치(variant.at)를 쓴다
  photo(ctx, v, variant) {
    const at = variant.at || { kicker: 303.6, s: 1, store: 792 };
    const s = at.s;
    const sz = s === 1 ? 1 : 0.77;
    const y = (dy) => at.kicker + dy * s;
    const en = enWords(v);
    const white = { color: '#FFFFFF', align: 'center', shadow: SHADOW };
    // 배경에 Notice 테두리가 없는 사진(15~18)은 직접 그린다
    if (at.notice) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      strokeRR(ctx, 254.6, at.notice - 16.4, 110.8, 32.8, 16.4, '#FFFFFF', 1.2);
      ctx.restore();
      text(ctx, 'Notice', 310, at.notice + 5.8, { ...white, family: 'DM Serif Display', italic: true, size: 18 });
    }
    text(ctx, en.photo, 310, at.kicker, { ...white, family: 'Poppins', w: 500, size: 16 * sz, ls: 6.4 * sz, alpha: 0.9 });
    text(ctx, v.headline, 310, y(81.35), { ...white, family: 'Noto Serif KR', w: 700, size: 60 * sz, maxW: 520 });
    rect(ctx, 290, y(130.4), 40, 1.5, '#FFFFFF', 0.85);
    const date = v.type === 'short' ? `${v.when}  ${v.hours}` : v.when;
    text(ctx, date, 310, y(196.6), { ...white, family: 'Noto Sans KR', w: 500, size: 28 * sz, maxW: 500 });
    const lead = v.type === 'closed' && !v.reason && !v.partial ? (v.summer ? ['무더운 여름, 잠시 쉬어 갑니다.'] : v.days.length > 1 ? ['잠시 쉬어 갑니다.'] : ['하루 쉬어 갑니다.']) : v.message;
    para(ctx, [...lead, ...v.detail, v.note], 310, y(244.6), s === 1 ? 34 : 26, { ...white, family: 'Noto Sans KR', size: 20 * sz, alpha: 0.95 }, 480, 3);
    text(ctx, v.store, 310, at.store, { ...white, family: 'Noto Sans KR', w: 500, size: 15, ls: 1.5, maxW: 400 });
  },
};

// 시안마다 쓰는 폰트 — 미리 불러와야 캔버스에 제대로 그려진다
const FONTS = {
  chuseokMoon: [['Cormorant', 600], ['Noto Serif KR', 500], ['Noto Serif KR', 600], ['Nanum Brush Script', 400], ['Poppins', 500], ['Gowun Batang', 700]],
  harvestWave: [['Cormorant', 600], ['Noto Serif KR', 700], ['Noto Serif KR', 600], ['Gowun Batang', 700]],
  xmasTree: [['Cormorant', 600], ['DM Serif Display', 400, true], ['Poppins', 500], ['Gowun Batang', 700]],
  xmasRed: [['Gowun Dodum', 400], ['Bodoni Moda', 700], ['Bodoni Moda', 400], ['Great Vibes', 400], ['Inter', 600], ['Inter', 400]],
  hangeul: [['Noto Serif KR', 500], ['Noto Serif KR', 700], ['Nanum Brush Script', 400], ['Poppins', 500]],
  seollal: [['Gowun Batang', 700], ['Gowun Batang', 400]],
  calendarMonth: [['NPS', 800], ['Poppins', 500], ['Poppins', 600]],
  catNotice: [['Bagel Fat One', 400], ['Jua', 400]],
  blueGradient: [['Poppins', 500], ['DM Serif Display', 400, true], ['DM Serif Display', 400]],
  memoDark: [['Inter', 600], ['DM Serif Display', 400, true], ['EF Jejudoldam', 400]],
  weekNotice: [['Gowun Dodum', 400], ['Cormorant Garamond', 600], ['Cormorant Garamond', 500], ['Arita Buri', 500]],
  softWave: [['Nanum GoDigANiGoGoDing', 400], ['Ownglyph PDH', 400]],
  photo: [['Poppins', 500], ['Noto Serif KR', 700], ['DM Serif Display', 400, true]],
};
const BASE_FONTS = [['Noto Sans KR', 400], ['Noto Sans KR', 500], ['Noto Sans KR', 700]];
const FIXED_TEXT = '0123456789 ·~–-:!?,.()◆NOTICE추석풍성한가위설날한글날세종대왕께감사하는휴무안내영업재개정상단축품절방문전꼭확인해주세요안녕하세요고객님저희매장을찾아셔서합니다';

const loaded = new Set();
async function ensureFonts(design, sample) {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const chars = [...new Set(sample + FIXED_TEXT)].join('');
  const jobs = [];
  for (const [family, w, italic] of [...BASE_FONTS, ...(FONTS[design] || [])]) {
    const id = `${family}|${w}|${italic ? 1 : 0}|${chars}`;
    if (loaded.has(id)) continue;
    jobs.push(document.fonts.load(`${italic ? 'italic ' : ''}${w} 40px "${family}"`, chars).then(() => loaded.add(id)).catch(() => {}));
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 6000))]);
}

const images = new Map();
function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (!images.has(url)) {
    images.set(url, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return images.get(url);
}

export function isFigmaTemplate(template) {
  return !!LAYOUTS[template?.layout]?.figma;
}

export async function renderFigma(canvas, { type, data, template, paletteId, width }) {
  const layout = LAYOUTS[template.layout];
  const variant = layout.palettes[paletteId] || Object.values(layout.palettes)[0];
  const v = buildView(type, data, template);
  // 미리보기(작은 캔버스)는 가벼운 배경을, 출력용은 원본 배경을 쓴다
  const bg = width > 1240 ? variant.image : variant.imageSm || variant.image;
  const [img] = await Promise.all([loadImage(bg), ensureFonts(layout.design, JSON.stringify(v) + enWordsText(v))]);
  K = width / FW;
  canvas.width = Math.round(width);
  canvas.height = Math.round(FH * K);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.clearRect(0, 0, FW, FH);
  if (img) ctx.drawImage(img, 0, 0, FW, FH);
  else { ctx.fillStyle = variant.bg || '#FFFFFF'; ctx.fillRect(0, 0, FW, FH); }
  DESIGNS[layout.design](ctx, v, variant);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function enWordsText(v) {
  return JSON.stringify(enWords(v)) + MONTH_EN.join('') + DOW_EN.join('') + DOW_EN_LONG.join('');
}
