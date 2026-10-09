// 유형 선택 카드 하단의 스티커 일러스트 (임시 에셋 — 추후 디자이너 일러스트로 교체)
// 흰 테두리·그림자는 CSS(.sticker)에서 입힌다.

const svg = (body, vb = '0 0 100 100') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

const moon = svg(`
  <circle cx="50" cy="50" r="44" fill="#F7D15C"/>
  <circle cx="35" cy="37" r="8" fill="#EDBE3F"/>
  <circle cx="62" cy="61" r="11" fill="#EDBE3F"/>
  <circle cx="61" cy="29" r="5" fill="#EDBE3F"/>
  <circle cx="34" cy="66" r="4" fill="#EDBE3F"/>`);

const rabbit = svg(`
  <ellipse cx="38" cy="28" rx="9" ry="25" fill="#fff" stroke="#D8D2C8" stroke-width="2"/>
  <ellipse cx="38" cy="30" rx="4" ry="17" fill="#F6B8C3"/>
  <ellipse cx="62" cy="28" rx="9" ry="25" fill="#fff" stroke="#D8D2C8" stroke-width="2"/>
  <ellipse cx="62" cy="30" rx="4" ry="17" fill="#F6B8C3"/>
  <ellipse cx="50" cy="97" rx="28" ry="15" fill="#fff" stroke="#D8D2C8" stroke-width="2"/>
  <circle cx="50" cy="64" r="25" fill="#fff" stroke="#D8D2C8" stroke-width="2"/>
  <circle cx="41" cy="61" r="3.2" fill="#2B2B2B"/>
  <circle cx="59" cy="61" r="3.2" fill="#2B2B2B"/>
  <ellipse cx="35" cy="70" rx="5" ry="3" fill="#F6B8C3"/>
  <ellipse cx="65" cy="70" rx="5" ry="3" fill="#F6B8C3"/>
  <path d="M47 67 Q50 71 53 67" stroke="#E88A9A" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, '0 0 100 114');

const songpyeon = svg(`
  <ellipse cx="50" cy="72" rx="46" ry="17" fill="#E2D9C6"/>
  <ellipse cx="50" cy="70" rx="38" ry="12" fill="#F6F1E6"/>
  <path d="M16 68 Q31 38 46 68 Z" fill="#F5B5C2"/>
  <path d="M36 62 Q51 30 66 62 Z" fill="#A9D29B"/>
  <path d="M54 69 Q69 40 84 69 Z" fill="#F4EFE3" stroke="#D6CDBA" stroke-width="1.5"/>
  <path d="M60 22 l6 -8 M66 24 l9 -5 M58 20 l-1 -9" stroke="#5E9A4C" stroke-width="2.5" stroke-linecap="round"/>`);

const persimmon = svg(`
  <circle cx="50" cy="60" r="35" fill="#F2862E"/>
  <ellipse cx="36" cy="48" rx="9" ry="5.5" fill="#F8AA62" transform="rotate(-25 36 48)"/>
  <path d="M50 30 L34 22 L44 34 L30 38 L46 38 L50 46 L54 38 L70 38 L56 34 L66 22 Z" fill="#4E8B3A"/>
  <rect x="47.5" y="14" width="5" height="14" rx="2.5" fill="#6B4A2B"/>`);

const closedSign = svg(`
  <path d="M28 34 L50 12 L72 34" stroke="#7A5A3C" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="50" cy="12" r="4.5" fill="#9C9C9C"/>
  <rect x="8" y="32" width="84" height="50" rx="9" fill="#2B2B2B"/>
  <text x="50" y="50" text-anchor="middle" font-size="9.5" font-weight="900" letter-spacing="2" fill="#F4C542" font-family="Noto Sans KR, sans-serif">CLOSED</text>
  <text x="50" y="74" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="Noto Sans KR, sans-serif">휴무</text>`);

const padlock = svg(`
  <path d="M32 48 V33 a18 18 0 0 1 36 0 V48" stroke="#A9AFB6" stroke-width="9" fill="none" stroke-linecap="round"/>
  <rect x="20" y="44" width="60" height="46" rx="11" fill="#F2B544"/>
  <rect x="20" y="44" width="60" height="10" rx="5" fill="#F7C866"/>
  <circle cx="50" cy="64" r="6.5" fill="#7A5A1E"/>
  <rect x="47" y="66" width="6" height="13" rx="3" fill="#7A5A1E"/>`);

const coffee = svg(`
  <path d="M38 12 q-6 7 0 14 q6 7 0 14 M52 10 q-6 7 0 14 q6 7 0 14" stroke="#BDB7AE" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="46" cy="90" rx="38" ry="7" fill="#D6E5F4"/>
  <path d="M70 52 a12 12 0 0 1 0 24" stroke="#7FAEE0" stroke-width="7" fill="none"/>
  <rect x="18" y="44" width="54" height="44" rx="12" fill="#8FB9E8"/>
  <rect x="18" y="44" width="54" height="9" rx="4.5" fill="#A9CAF0"/>`);

const wallClock = svg(`
  <circle cx="50" cy="50" r="42" fill="#fff" stroke="#E5533D" stroke-width="8"/>
  <g stroke="#C9C3B9" stroke-width="3" stroke-linecap="round">
    <path d="M50 16 v6 M50 78 v6 M16 50 h6 M78 50 h6"/>
  </g>
  <path d="M50 50 V25" stroke="#222" stroke-width="5" stroke-linecap="round"/>
  <path d="M50 50 L68 60" stroke="#222" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="5" fill="#E5533D"/>`);

const hourglass = svg(`
  <path d="M30 16 H70 L53 50 L70 84 H30 L47 50 Z" fill="#EAF4F8" stroke="#B9D3DE" stroke-width="2"/>
  <path d="M38 24 H62 L52 42 H48 Z" fill="#F2C14E"/>
  <path d="M34 82 Q50 62 66 82 Z" fill="#F2C14E"/>
  <rect x="49" y="46" width="2" height="30" fill="#F2C14E"/>
  <rect x="22" y="8" width="56" height="10" rx="4" fill="#B07A4A"/>
  <rect x="22" y="82" width="56" height="10" rx="4" fill="#B07A4A"/>`);

const calendar = svg(`
  <rect x="12" y="20" width="76" height="70" rx="11" fill="#fff" stroke="#E2DED6" stroke-width="2"/>
  <path d="M12 31 a11 11 0 0 1 11 -11 H77 a11 11 0 0 1 11 11 V42 H12 Z" fill="#E5533D"/>
  <rect x="30" y="12" width="6" height="16" rx="3" fill="#6B6A66"/>
  <rect x="64" y="12" width="6" height="16" rx="3" fill="#6B6A66"/>
  <text x="50" y="38" text-anchor="middle" font-size="10" font-weight="900" fill="#fff" font-family="Noto Sans KR, sans-serif">오늘만</text>
  <text x="50" y="74" text-anchor="middle" font-size="21" font-weight="900" fill="#222" font-family="Noto Sans KR, sans-serif">~17시</text>`);

const soldStamp = svg(`
  <circle cx="50" cy="50" r="44" fill="#E8473B"/>
  <circle cx="50" cy="50" r="35" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 4"/>
  <text x="50" y="47" text-anchor="middle" font-size="19" font-weight="900" fill="#fff" font-family="Noto Sans KR, sans-serif">SOLD</text>
  <text x="50" y="68" text-anchor="middle" font-size="19" font-weight="900" fill="#fff" font-family="Noto Sans KR, sans-serif">OUT</text>`);

const emptyBowl = svg(`
  <path d="M60 8 L44 50" stroke="#B9B4AC" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="63" cy="10" rx="7" ry="10" fill="#C9C4BB" transform="rotate(22 63 10)"/>
  <path d="M10 46 H90 Q88 86 50 88 Q12 86 10 46 Z" fill="#F4F1EA"/>
  <rect x="10" y="44" width="80" height="8" rx="4" fill="#3E6FB0"/>
  <path d="M26 64 q8 6 16 0 q8 -6 16 0 q8 6 16 0" stroke="#3E6FB0" stroke-width="2.5" fill="none"/>`);

const onigiri = svg(`
  <path d="M50 10 Q58 10 86 68 Q91 86 74 86 H26 Q9 86 14 68 Q42 10 50 10 Z" fill="#fff" stroke="#D8D2C8" stroke-width="2.5"/>
  <rect x="35" y="58" width="30" height="28" rx="3" fill="#2E3B2E"/>
  <circle cx="44" cy="34" r="1.8" fill="#2B2B2B"/>
  <circle cx="56" cy="34" r="1.8" fill="#2B2B2B"/>
  <path d="M46 41 Q50 44 54 41" stroke="#2B2B2B" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="38" cy="42" rx="3.5" ry="2" fill="#F6B8C3"/>
  <ellipse cx="62" cy="42" rx="3.5" ry="2" fill="#F6B8C3"/>`);

export const STICKERS = {
  holiday: [moon, rabbit, songpyeon, persimmon],
  closed: [closedSign, padlock, coffee],
  short: [wallClock, hourglass, calendar],
  soldout: [soldStamp, emptyBowl, onigiri],
};
