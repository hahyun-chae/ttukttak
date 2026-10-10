// 공지 유형, 레이아웃(디자인 스타일), 색상 팔레트, 기본 템플릿 메타데이터.
// 브라우저와 서버(Node) 양쪽에서 import 하므로 DOM 을 쓰지 않는다.

export const A4 = { W: 2480, H: 3508, MM_W: 210, MM_H: 297, DPI: 300 };

export const TYPES = [
  { id: 'holiday', name: '명절/공휴일 영업 안내', short: '명절·공휴일', desc: '설·추석·공휴일 영업 일정을 알려요' },
  { id: 'closed', name: '임시휴무', short: '임시휴무', desc: '갑자기 쉬는 날을 알려요' },
  { id: 'short', name: '단축영업', short: '단축영업', desc: '바뀐 영업시간을 알려요' },
  { id: 'soldout', name: '재료소진', short: '재료소진', desc: '조기 마감·품절 메뉴를 알려요' },
];

export const STYLE_KEYWORDS = ['깔끔한', '고급스러운', '감성적인', '눈에 잘 띄는', '트렌디한'];

export const BADGES = ['HOT', '추천', '요즘 많이 쓰는'];

export const TONES = {
  polite: '정중한',
  warm: '친근한',
  short: '짧고 굵게',
  premium: '격식 있는',
};

// 템플릿마다 "필요한 경우에만" 추가로 묻는 입력 항목
export const EXTRA_FIELDS = {
  reason: { label: '사유', types: ['closed', 'short'] },
  nextOpen: { label: '다음 영업 안내', types: ['soldout'] },
  note: { label: '추가 안내 문구', types: ['holiday', 'closed', 'short', 'soldout'] },
};

export const REASONS = ['개인 사정', '내부 공사', '매장 정비', '직원 교육', '재료 준비'];

const BASE_PALETTE = {
  offInk: '#FFFFFF',
  shortInk: '#FFFFFF',
};

// 레이아웃 = Figma 의 마스터 컴포넌트에 해당. 팔레트 = 색상 토큰 세트.
export const LAYOUTS = {
  clean: {
    name: '깔끔한 정보형',
    palettes: {
      mono: { name: '블랙', bg: '#FFFFFF', ink: '#111111', sub: '#666666', accent: '#111111', accentInk: '#FFFFFF', line: '#E3E3E3', card: '#F4F4F2', cardInk: '#111111', cardSub: '#6B6B6B', off: '#D93A2B', short: '#C77700' },
      green: { name: '그린', bg: '#FFFFFF', ink: '#14281D', sub: '#5E6B63', accent: '#1F6F4A', accentInk: '#FFFFFF', line: '#DCE6DF', card: '#F0F6F2', cardInk: '#14281D', cardSub: '#5E6B63', off: '#1F6F4A', short: '#B7791F' },
      blue: { name: '블루', bg: '#FFFFFF', ink: '#0F1B3D', sub: '#5B6478', accent: '#1D4ED8', accentInk: '#FFFFFF', line: '#DDE3F0', card: '#F0F4FC', cardInk: '#0F1B3D', cardSub: '#5B6478', off: '#1D4ED8', short: '#C2410C' },
    },
  },
  premium: {
    name: '고급스러운 액자형',
    palettes: {
      navy: { name: '네이비 골드', bg: '#14213D', ink: '#F4EBDD', sub: '#BDB4A6', accent: '#C9A96E', accentInk: '#14213D', line: 'rgba(201,169,110,0.55)', card: 'rgba(255,255,255,0.04)', cardInk: '#F4EBDD', cardSub: '#BDB4A6', off: '#C9A96E', offInk: '#14213D', short: '#E8DCC0', shortInk: '#14213D' },
      ivory: { name: '아이보리', bg: '#F6F1E7', ink: '#2B2620', sub: '#7A7064', accent: '#9A7B4F', accentInk: '#FFFFFF', line: 'rgba(154,123,79,0.5)', card: 'rgba(154,123,79,0.07)', cardInk: '#2B2620', cardSub: '#7A7064', off: '#8A2E2E', short: '#9A7B4F' },
      burgundy: { name: '버건디', bg: '#4A1621', ink: '#F6E9DF', sub: '#CDB8AE', accent: '#D9B77E', accentInk: '#4A1621', line: 'rgba(217,183,126,0.55)', card: 'rgba(255,255,255,0.05)', cardInk: '#F6E9DF', cardSub: '#CDB8AE', off: '#D9B77E', offInk: '#4A1621', short: '#F0E2C8', shortInk: '#4A1621' },
    },
  },
  bold: {
    name: '눈에 띄는 강조형',
    palettes: {
      yellow: { name: '옐로', bg: '#FFD400', ink: '#111111', sub: '#3A3200', accent: '#111111', accentInk: '#FFD400', line: '#111111', card: '#FFFFFF', cardInk: '#111111', cardSub: '#555555', cardBorder: '#111111', off: '#E5322D', short: '#111111', shortInk: '#FFD400' },
      red: { name: '레드', bg: '#E5322D', ink: '#FFFFFF', sub: '#FFE1DE', accent: '#FFFFFF', accentInk: '#E5322D', line: '#FFFFFF', card: '#FFFFFF', cardInk: '#111111', cardSub: '#666666', cardBorder: '#111111', off: '#E5322D', short: '#111111' },
      orange: { name: '오렌지', bg: '#FF7A1A', ink: '#1A0E00', sub: '#4A2600', accent: '#1A0E00', accentInk: '#FF7A1A', line: '#1A0E00', card: '#FFFFFF', cardInk: '#1A0E00', cardSub: '#6A4A30', cardBorder: '#1A0E00', off: '#1A0E00', short: '#FF7A1A' },
    },
  },
  soft: {
    name: '감성적인 라운드형',
    palettes: {
      peach: { name: '피치', bg: '#FFF3EA', ink: '#4A3428', sub: '#8C7364', accent: '#E58B6B', accentInk: '#FFFFFF', line: '#F1D9CB', card: '#FFFFFF', cardInk: '#4A3428', cardSub: '#9C8374', off: '#E58B6B', short: '#C9A15B', blob1: '#FFDCC8', blob2: '#FDE9D7' },
      sage: { name: '세이지', bg: '#EFF3EA', ink: '#2F3B2C', sub: '#6B7A66', accent: '#7A9A6B', accentInk: '#FFFFFF', line: '#D7E2D0', card: '#FFFFFF', cardInk: '#2F3B2C', cardSub: '#7A8775', off: '#7A9A6B', short: '#C49A5A', blob1: '#D5E3CB', blob2: '#E3ECDB' },
      lavender: { name: '라벤더', bg: '#F4F1FA', ink: '#39324F', sub: '#77708E', accent: '#8C7BC8', accentInk: '#FFFFFF', line: '#E0DAF0', card: '#FFFFFF', cardInk: '#39324F', cardSub: '#857EA0', off: '#8C7BC8', short: '#D08A9B', blob1: '#E1D9F6', blob2: '#ECE6F9' },
    },
  },
  trendy: {
    name: '트렌디한 투톤형',
    palettes: {
      lime: { name: '라임', bg: '#F3F3EE', ink: '#0E0E0E', sub: '#5A5A55', panel: '#D7FF3B', panelInk: '#0E0E0E', accent: '#0E0E0E', accentInk: '#D7FF3B', line: '#0E0E0E', card: '#FFFFFF', cardInk: '#0E0E0E', cardSub: '#666666', off: '#0E0E0E', offInk: '#D7FF3B', short: '#7A7A72' },
      blue: { name: '코발트', bg: '#F2F1EC', ink: '#0B1033', sub: '#55597A', panel: '#2F5BFF', panelInk: '#FFFFFF', accent: '#2F5BFF', accentInk: '#FFFFFF', line: '#0B1033', card: '#FFFFFF', cardInk: '#0B1033', cardSub: '#5D6180', off: '#2F5BFF', short: '#0B1033' },
      pink: { name: '핑크', bg: '#F6F2F0', ink: '#141014', sub: '#5E555C', panel: '#FF5FA2', panelInk: '#141014', accent: '#141014', accentInk: '#FF5FA2', line: '#141014', card: '#FFFFFF', cardInk: '#141014', cardSub: '#6A6268', off: '#FF3D8B', short: '#141014' },
    },
  },
};

export function getPalette(layoutId, paletteId) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.clean;
  const p = layout.palettes[paletteId] || Object.values(layout.palettes)[0];
  return { ...BASE_PALETTE, cardInk: p.ink, cardSub: p.sub, ...p };
}

export function fieldsForType(type) {
  return Object.keys(EXTRA_FIELDS).filter((k) => EXTRA_FIELDS[k].types.includes(type));
}

// 피그마 시안 템플릿. 배경 이미지는 public/templates/ (원본: design/뚝딱 템플릿 파일)
// 레이아웃처럼 등록해 두면 관리자 화면·색상(변형) 선택이 기존 방식 그대로 동작한다.
const bgImage = (name, ext = 'png') => ({ image: `/templates/${name}.${ext}`, imageSm: `/templates/${name}-sm.jpg` });
const figma = (name, design, palettes) => ({ name, figma: true, design, palettes });
const one = (name, ext, bg, accent) => ({ base: { name: '기본', bg, accent, ...bgImage(name, ext) } });
const photo = (id, name, at) => ({ name, bg: '#2F3B33', accent: '#FFFFFF', swatch: `/templates/photo-${id}-xs.jpg`, at, ...bgImage(`photo-${id}`, 'jpg') });

Object.assign(LAYOUTS, {
  chuseokMoon: figma('추석 · 보름달 밤하늘', 'chuseokMoon', one('chuseok-moon', 'jpg', '#1A2A57', '#F2D48A')),
  harvestWave: figma('추석·설날 · 따뜻한 물결', 'harvestWave', one('harvest-wave', 'jpg', '#FCEBDD', '#C2532F')),
  xmasTree: figma('크리스마스 · 트리', 'xmasTree', one('xmas-tree', 'png', '#EEEAE3', '#5F7352')),
  xmasRed: figma('크리스마스 · 레드 카드', 'xmasRed', one('xmas-red', 'png', '#991A1C', '#FFF9EF')),
  hangeul: figma('한글날', 'hangeul', one('hangeul', 'png', '#F2EBDD', '#C9553A')),
  seollal: figma('설날 · 색동과 산', 'seollal', one('seollal', 'png', '#F4EFE6', '#C8423B')),
  calendarMonth: figma('만능 · 월간 달력', 'calendarMonth', one('calendar-month', 'png', '#D6E4FF', '#1F4FD8')),
  catNotice: figma('만능 · 고양이 NOTICE', 'catNotice', one('cat-notice', 'png', '#F4F0E6', '#4A78B5')),
  blueGradient: figma('만능 · 블루 그라데이션', 'blueGradient', one('blue-gradient', 'jpg', '#7FB2DC', '#FFFFFF')),
  memoDark: figma('만능 · 메모지', 'memoDark', one('memo-dark', 'png', '#322421', '#EFEAE0')),
  weekNotice: figma('만능 · 주간 Notice', 'weekNotice', one('week-notice', 'png', '#FFFCF6', '#9B7C53')),
  softWave: figma('만능 · 물결 테두리', 'softWave', one('soft-wave', 'jpg', '#FBF7EF', '#FF686F')),
  photo: figma('만능 · 사진형', 'photo', {
    lake: photo('lake', '호수', { kicker: 303.6, s: 1, store: 792 }),
    duck: photo('duck', '물결', { kicker: 246, s: 0.8, store: 806 }),
    beach: photo('beach', '바다', { kicker: 318, s: 0.8, store: 829, notice: 237.7 }),
    dusk: photo('dusk', '노을', { kicker: 332, s: 0.8, store: 788, notice: 208.7 }),
    clouds: photo('clouds', '구름', { kicker: 309, s: 0.8, store: 788, notice: 156 }),
    flowers: photo('flowers', '꽃밭', { kicker: 309, s: 0.8, store: 788, notice: 156 }),
  }),
});

// 명절 안내에서 고르는 날. 템플릿의 occasions 가 비어 있으면 모든 날에 쓸 수 있다.
export const OCCASIONS = ['설날', '추석', '크리스마스', '한글날', '기타'];

// 저장된 템플릿 목록을 새 기본 템플릿으로 바꿔야 할 때 올린다 (lib/store.js 참고)
export const CATALOG_VERSION = 2;

const ALL = ['holiday', 'closed', 'short', 'soldout'];
const ALL_FIELDS = ['reason', 'nextOpen', 'note'];

// types: 들어가는 공지 유형 / occasions: 명절 안내에서 해당하는 날 (없으면 전체)
export const DEFAULT_TEMPLATES = [
  { id: 'chuseok-moon', name: '보름달 밤하늘', layout: 'chuseokMoon', types: ['holiday'], occasions: ['추석'], keywords: ['고급스러운'], palettes: ['base'], fields: ['note'], badge: '추천', order: 1 },
  { id: 'harvest-wave', name: '따뜻한 물결', layout: 'harvestWave', types: ['holiday'], occasions: ['추석', '설날'], keywords: ['감성적인'], palettes: ['base'], fields: ['note'], badge: '', order: 2 },
  { id: 'xmas-tree', name: '크리스마스 트리', layout: 'xmasTree', types: ['holiday'], occasions: ['크리스마스'], keywords: ['감성적인'], palettes: ['base'], fields: ['note'], badge: '추천', order: 3 },
  { id: 'xmas-red', name: '레드 홀리데이', layout: 'xmasRed', types: ['holiday'], occasions: ['크리스마스'], keywords: ['고급스러운'], palettes: ['base'], fields: ['note'], badge: '', order: 4 },
  { id: 'hangeul', name: '한글날 붓글씨', layout: 'hangeul', types: ['holiday'], occasions: ['한글날'], keywords: ['깔끔한'], palettes: ['base'], fields: ['note'], badge: '추천', order: 5 },
  { id: 'seollal', name: '색동 설날', layout: 'seollal', types: ['holiday'], occasions: ['설날'], keywords: ['깔끔한'], palettes: ['base'], fields: ['note'], badge: '추천', order: 6 },
  { id: 'calendar-month', name: '한눈에 달력', layout: 'calendarMonth', types: ['closed', 'holiday'], occasions: [], keywords: ['깔끔한'], palettes: ['base'], fields: ALL_FIELDS, badge: '요즘 많이 쓰는', order: 7 },
  { id: 'cat-notice', name: '고양이 NOTICE', layout: 'catNotice', types: ['closed', 'short', 'soldout'], occasions: [], keywords: ['트렌디한'], palettes: ['base'], fields: ALL_FIELDS, badge: '', order: 8 },
  { id: 'blue-gradient', name: '블루 그라데이션', layout: 'blueGradient', types: ['closed', 'short'], occasions: [], keywords: ['트렌디한'], palettes: ['base'], fields: ALL_FIELDS, badge: '', order: 9 },
  { id: 'memo-dark', name: '메모지 한 장', layout: 'memoDark', types: ALL, occasions: [], keywords: ['감성적인'], palettes: ['base'], fields: ALL_FIELDS, badge: '', order: 10 },
  { id: 'week-notice', name: '주간 Notice', layout: 'weekNotice', types: ['closed', 'holiday'], occasions: [], keywords: ['고급스러운'], palettes: ['base'], fields: ALL_FIELDS, badge: '', order: 11 },
  { id: 'soft-wave', name: '물결 테두리', layout: 'softWave', types: ALL, occasions: [], keywords: ['눈에 잘 띄는'], palettes: ['base'], fields: ALL_FIELDS, badge: 'HOT', order: 12 },
  { id: 'photo', name: '사진 감성', layout: 'photo', types: ['closed', 'short', 'holiday'], occasions: [], keywords: ['감성적인'], palettes: ['lake', 'duck', 'beach', 'dusk', 'clouds', 'flowers'], fields: ALL_FIELDS, badge: '', order: 13 },
].map((t) => ({ public: true, thumbnail: null, asset: null, downloads: 0, tone: 'polite', type: t.types[0], ...t }));

// 템플릿이 이 공지 유형에 들어가는지 (예전 템플릿은 type 하나만 가진다)
export function templateHasType(t, type) {
  return (t.types?.length ? t.types : [t.type]).includes(type);
}

export const DEFAULT_SETTINGS = {
  typeBadges: { holiday: 'HOT' },
};
