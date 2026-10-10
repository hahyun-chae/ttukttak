// 입력값 + 템플릿(톤/필드) → 렌더링용 문서 모델.
// MVP 에서는 AI 생성이 아니라 톤별 고정 문구를 사용한다.

const DOW = '일월화수목금토';

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function todayISO() {
  return toISO(new Date());
}
export function dateRange(start, end, max = 14) {
  if (!start) return [];
  const out = [start];
  if (!end || end <= start) return out;
  let cur = start;
  while (out.length < max) {
    cur = addDays(cur, 1);
    if (cur > end) break;
    out.push(cur);
  }
  return out;
}
export function fmtLong(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}
export function fmtDot(iso) {
  const d = parseDate(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
export function dowOf(iso) {
  return DOW[parseDate(iso).getDay()];
}
const range = (a, b) => `${a} ~ ${b}`;

// 받침에 따라 '로'/'으로'
export function ro(word) {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return '로';
  const jong = code % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

const pick = (table, tone) => table[tone] ?? table.polite;

export const STATUS_LABEL = { on: '정상 영업', off: '휴무', short: '단축 영업' };

export function holidayRows(d) {
  const days = dateRange(d.start, d.end);
  return days.map((iso) => {
    const set = d.days?.[iso] || {};
    const status = set.status || (d.mode === 'allClosed' ? 'off' : 'on');
    let time = '';
    if (status === 'on') time = `${d.open}~${d.close}`;
    if (status === 'short') time = `${set.open || d.open}~${set.close || d.close}`;
    return { iso, md: fmtDot(iso), long: fmtLong(iso), dow: dowOf(iso), status, label: STATUS_LABEL[status], time };
  });
}

export function holidayPeriodName(d) {
  if (d.name === '설날') return '설 연휴';
  if (d.name === '추석') return '추석 연휴';
  if (d.name === '크리스마스' || d.name === '한글날') return d.name;
  return (d.customName || '').trim() || '공휴일';
}

function holidayDoc(d, tone) {
  const P = holidayPeriodName(d);
  const isM = d.name === '설날' || d.name === '추석';
  const term = isM ? '연휴 기간' : '휴일';
  const rows = holidayRows(d);
  const allOff = rows.every((r) => r.status === 'off');
  const allOn = rows.every((r) => r.status === 'on');
  const mode = allOff ? 'allClosed' : allOn ? 'normal' : 'mixed';

  const title = {
    normal: { polite: `${P}에도\n정상 영업합니다`, warm: `${P}에도\n문을 열어요`, short: `${P}에도\n정상 영업!`, premium: `${P}\n정상 영업 안내` },
    allClosed: { polite: `${P}\n휴무 안내`, warm: `${P}에는\n잠시 쉬어갑니다`, short: `${P}\n휴무합니다`, premium: `${P}\n휴무 안내` },
    mixed: { polite: `${P}\n영업 일정 안내`, warm: `${P}\n영업 일정이에요`, short: `${P}\n영업 일정`, premium: `${P}\n영업 안내` },
  }[mode];

  const modeLine = {
    normal: `${term}에도 평소처럼 영업합니다.`,
    allClosed: `${term} 동안 매장을 쉬어갑니다.`,
    mixed: '아래 영업 일정을 확인해 주세요.',
  }[mode];
  const lead = {
    polite: (isM ? '풍성하고 행복한 명절 보내세요.\n' : '') + modeLine,
    warm: (isM ? '가족과 함께 따뜻한 명절 보내세요.\n' : '') +
      { normal: '쉬는 날에도 든든하게 문 열어둘게요.', allClosed: '잠시 쉬고 더 반갑게 맞이할게요.', mixed: '방문 전 일정 한 번만 확인해 주세요.' }[mode],
    short: { normal: '평소처럼 영업합니다!', allClosed: '푹 쉬고 돌아올게요!', mixed: '일정 꼭 확인하세요!' }[mode],
    premium: (isM ? '평안하고 풍요로운 명절 되시길 바랍니다.\n' : '평안한 휴일 보내시길 바랍니다.\n') + modeLine,
  };

  const blocks = [{ kind: 'schedule', rows }];
  const last = rows[rows.length - 1];
  if (last && last.status === 'off') {
    blocks.push({ kind: 'line', text: `${fmtLong(addDays(last.iso, 1))}부터 정상 영업합니다.` });
  }
  return {
    kicker: `${P} 영업 안내`,
    title: pick(title, tone),
    lead: pick(lead, tone),
    blocks,
    footer: pick({ polite: '늘 찾아주셔서 감사합니다.', warm: '늘 고맙습니다.', short: '감사합니다!', premium: '변함없는 성원에 감사드립니다.' }, tone),
  };
}

function closedDoc(d, tone) {
  const single = !d.multi || !d.end || d.end <= d.start;
  const end = single ? d.start : d.end;
  const partial = d.allDay === false && d.from && d.to;
  const blocks = [];
  if (single) {
    blocks.push({
      kind: 'hero',
      label: '휴무일',
      value: fmtLong(d.start),
      sub: partial ? `${range(d.from, d.to)} 휴무\n그 외 시간은 정상 영업합니다` : `${fmtLong(addDays(end, 1))}부터 정상 영업합니다`,
    });
  } else {
    const rows = [{ label: '휴무 기간', value: `${fmtLong(d.start)} ~ ${fmtLong(end)}` }];
    if (partial) rows.push({ label: '휴무 시간', value: `매일 ${range(d.from, d.to)}` });
    rows.push({ label: '영업 재개', value: `${fmtLong(addDays(end, 1))}부터` });
    blocks.push({ kind: 'info', rows });
  }
  return {
    kicker: '임시휴무 안내',
    title: pick({ polite: '임시휴무\n안내', warm: '잠시\n쉬어갑니다', short: '임시휴무\n알림', premium: '임시 휴무\n안내' }, tone),
    lead: pick({
      polite: '매장 사정으로 아래와 같이 휴무합니다.\n너그러운 양해 부탁드립니다.',
      warm: '잠깐 숨 고르고\n더 좋은 모습으로 돌아올게요.',
      short: '방문 전 꼭 확인해 주세요!',
      premium: '아래와 같이 임시 휴무함을 알려드립니다.',
    }, tone),
    blocks,
    footer: pick({ polite: '이용에 불편을 드려 죄송합니다.', warm: '늘 찾아주셔서 고맙습니다.', short: '감사합니다!', premium: '고객님의 너그러운 양해 부탁드립니다.' }, tone),
  };
}

function shortDoc(d, tone) {
  const single = !d.multi || !d.end || d.end <= d.start;
  const dateLabel = single ? fmtLong(d.start) : `${fmtLong(d.start)} ~ ${fmtLong(d.end)}`;
  return {
    kicker: '단축영업 안내',
    title: pick({ polite: '영업시간\n변경 안내', warm: '조금 일찍\n문을 닫아요', short: '단축 영업', premium: '단축 영업\n안내' }, tone),
    lead: pick({
      polite: '매장 사정으로 영업시간을\n아래와 같이 조정합니다.',
      warm: '방문 전 시간 꼭 확인해 주세요.',
      short: '시간 꼭 확인해 주세요!',
      premium: '아래와 같이 영업시간을 조정하여 운영합니다.',
    }, tone),
    blocks: [{ kind: 'compare', dateLabel, before: range(d.open, d.close), after: range(d.newOpen, d.newClose) }],
    footer: pick({ polite: '이용에 착오 없으시길 바랍니다.', warm: '늘 찾아주셔서 고맙습니다.', short: '감사합니다!', premium: '고객님의 양해 부탁드립니다.' }, tone),
  };
}

function soldoutDoc(d, tone) {
  if (d.mode === 'menus') {
    const items = (d.menus || []).map((m) => m.trim()).filter(Boolean);
    return {
      kicker: `${fmtLong(d.date)} 품절 안내`,
      title: pick({ polite: '품절 메뉴\n안내', warm: '오늘은 이 메뉴가\n모두 팔렸어요', short: '오늘의\n품절 메뉴' }, tone),
      lead: pick({ polite: '아래 메뉴는 재료 소진으로\n주문이 어렵습니다.', warm: '다른 메뉴도 맛있게 준비되어 있어요.', short: '다른 메뉴는 주문 가능해요!' }, tone),
      blocks: [{ kind: 'menus', items: items.length ? items : ['메뉴명'] }],
      footer: pick({ polite: '찾아주신 고객님께 죄송합니다.', warm: '내일 더 넉넉히 준비할게요. 고맙습니다!', short: '감사합니다!' }, tone),
    };
  }
  return {
    kicker: '재료 소진 안내',
    title: pick({ polite: '재료 소진으로\n조기 마감합니다', warm: '준비한 재료가\n모두 소진되었어요', short: '재료 소진\n조기 마감' }, tone),
    lead: pick({ polite: '오늘 준비한 재료가 모두 소진되어\n영업을 일찍 마감합니다.', warm: '많은 사랑 덕분에 오늘 준비한\n재료가 일찍 떨어졌어요.', short: '찾아주셔서 감사합니다!' }, tone),
    blocks: [{ kind: 'hero', label: fmtLong(d.date), value: d.time ? `${d.time} 마감` : '영업 종료', sub: '' }],
    footer: pick({ polite: '찾아주신 고객님께 죄송합니다.', warm: '내일 더 넉넉히 준비할게요. 고맙습니다!', short: '다음에 꼭 다시 들러주세요!' }, tone),
  };
}

function reasonSentence(type, reason, tone) {
  if (tone === 'short') return `사유 · ${reason}`;
  const verb = type === 'closed'
    ? { polite: '휴무합니다.', warm: '잠시 쉬어가요.', premium: '휴무합니다.' }
    : { polite: '영업시간을 단축합니다.', warm: '일찍 문을 닫아요.', premium: '영업시간을 단축합니다.' };
  return `${reason}${ro(reason)} ${tone === 'premium' ? '인하여' : '인해'} ${pick(verb, tone)}`;
}

const BUILDERS = { holiday: holidayDoc, closed: closedDoc, short: shortDoc, soldout: soldoutDoc };

export function buildDoc(type, data, template) {
  const tone = template?.tone || 'polite';
  const fields = new Set(template?.fields || []);
  const doc = BUILDERS[type](data, tone);
  doc.store = data.showStore && data.storeName?.trim() ? data.storeName.trim() : '';

  const reason = data.reason === '__custom' ? data.reasonCustom?.trim() : data.reason;
  if (fields.has('reason') && reason) doc.blocks.push({ kind: 'line', text: reasonSentence(type, reason, tone) });
  if (fields.has('nextOpen') && data.nextOpenDate) {
    const when = `${fmtLong(data.nextOpenDate)}${data.nextOpenTime ? ` ${data.nextOpenTime}` : ''}부터`;
    doc.blocks.push({ kind: 'line', text: tone === 'warm' ? `${when} 다시 만나요!` : `${when} 정상 영업합니다.` });
  }
  if (fields.has('note') && data.note?.trim()) doc.blocks.push({ kind: 'line', text: data.note.trim() });
  return doc;
}

// ---- 기본값 / 예시 데이터 ----

export function defaultData(type) {
  const t = todayISO();
  const common = { storeName: '', showStore: true, reason: '', reasonCustom: '', note: '', nextOpenDate: '', nextOpenTime: '' };
  switch (type) {
    case 'holiday':
      return { ...common, name: '설날', customName: '', start: t, end: addDays(t, 2), open: '10:00', close: '21:00', mode: 'allClosed', days: {} };
    case 'closed':
      return { ...common, start: t, end: addDays(t, 1), multi: false, allDay: true, from: '13:00', to: '18:00' };
    case 'short':
      return { ...common, start: t, end: addDays(t, 1), multi: false, open: '10:00', close: '22:00', newOpen: '10:00', newClose: '17:00' };
    case 'soldout':
      return { ...common, mode: 'early', date: t, time: '15:00', menus: [''] };
  }
}

// occasion: 명절 안내 예시를 그 날(설날·크리스마스 등)에 맞춰 보여줄 때
export function sampleData(type, occasion) {
  const base = { ...defaultData(type), storeName: '행복분식', showStore: true };
  switch (type) {
    case 'holiday':
      if (occasion === '설날') return { ...base, name: '설날', start: '2026-02-16', end: '2026-02-18', mode: 'allClosed', days: {} };
      if (occasion === '크리스마스') return { ...base, name: '크리스마스', start: '2026-12-24', end: '2026-12-25', mode: 'partial', days: { '2026-12-24': { status: 'short', open: '10:00', close: '19:00' }, '2026-12-25': { status: 'off' } } };
      if (occasion === '한글날') return { ...base, name: '한글날', start: '2026-10-09', end: '2026-10-09', mode: 'allClosed', days: {} };
      return { ...base, name: '추석', start: '2026-09-24', end: '2026-09-26', mode: 'mixed', days: { '2026-09-25': { status: 'off' }, '2026-09-26': { status: 'short', open: '12:00', close: '18:00' } } };
    case 'closed':
      return { ...base, start: '2026-10-14', reason: '내부 공사' };
    case 'short':
      return { ...base, start: '2026-10-14' };
    case 'soldout':
      return { ...base, date: '2026-10-14', time: '15:00' };
  }
}
