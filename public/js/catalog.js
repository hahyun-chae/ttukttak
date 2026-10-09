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

// 공지 유형 4개 × 템플릿 3개 × 색상 2개 = 24개 변형
export const DEFAULT_TEMPLATES = [
  { id: 'holiday-clean', type: 'holiday', name: '단정한 일정표', layout: 'clean', tone: 'polite', keywords: ['깔끔한'], palettes: ['mono', 'green'], fields: ['note'], badge: '추천', order: 1 },
  { id: 'holiday-premium', type: 'holiday', name: '격식 있는 명절 인사', layout: 'premium', tone: 'premium', keywords: ['고급스러운'], palettes: ['navy', 'ivory'], fields: ['note'], badge: 'HOT', order: 2 },
  { id: 'holiday-bold', type: 'holiday', name: '한눈에 쏙', layout: 'bold', tone: 'short', keywords: ['눈에 잘 띄는'], palettes: ['yellow', 'red'], fields: [], badge: '', order: 3 },

  { id: 'closed-soft', type: 'closed', name: '쉼표 하나', layout: 'soft', tone: 'warm', keywords: ['감성적인'], palettes: ['peach', 'sage'], fields: ['reason', 'note'], badge: '', order: 1 },
  { id: 'closed-clean', type: 'closed', name: '기본 휴무 안내', layout: 'clean', tone: 'polite', keywords: ['깔끔한'], palettes: ['mono', 'blue'], fields: ['reason'], badge: '요즘 많이 쓰는', order: 2 },
  { id: 'closed-bold', type: 'closed', name: '굵고 확실하게', layout: 'bold', tone: 'short', keywords: ['눈에 잘 띄는'], palettes: ['yellow', 'orange'], fields: [], badge: '', order: 3 },

  { id: 'short-clean', type: 'short', name: '시간 비교표', layout: 'clean', tone: 'polite', keywords: ['깔끔한'], palettes: ['mono', 'green'], fields: ['reason'], badge: '추천', order: 1 },
  { id: 'short-trendy', type: 'short', name: '요즘 감성', layout: 'trendy', tone: 'short', keywords: ['트렌디한'], palettes: ['lime', 'blue'], fields: ['note'], badge: '', order: 2 },
  { id: 'short-premium', type: 'short', name: '차분한 안내', layout: 'premium', tone: 'premium', keywords: ['고급스러운'], palettes: ['ivory', 'navy'], fields: ['reason'], badge: '', order: 3 },

  { id: 'soldout-bold', type: 'soldout', name: '완판 알림', layout: 'bold', tone: 'short', keywords: ['눈에 잘 띄는'], palettes: ['red', 'yellow'], fields: ['nextOpen'], badge: 'HOT', order: 1 },
  { id: 'soldout-soft', type: 'soldout', name: '따뜻한 감사', layout: 'soft', tone: 'warm', keywords: ['감성적인'], palettes: ['peach', 'lavender'], fields: ['nextOpen', 'note'], badge: '', order: 2 },
  { id: 'soldout-trendy', type: 'soldout', name: '오늘의 품절', layout: 'trendy', tone: 'short', keywords: ['트렌디한'], palettes: ['pink', 'lime'], fields: ['nextOpen'], badge: '', order: 3 },
].map((t) => ({ public: true, thumbnail: null, asset: null, downloads: 0, ...t }));

export const DEFAULT_SETTINGS = {
  typeBadges: { holiday: 'HOT' },
};
