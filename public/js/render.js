// A4(2480×3508, 300dpi) 좌표계에서 공지를 캔버스로 그린다.
// 미리보기는 같은 함수를 축소 배율로 호출하므로 결과물과 미리보기가 항상 일치한다.

import { A4, getPalette } from './catalog.js';
import { buildDoc } from './copy.js';
import { isFigmaTemplate, renderFigma } from './figma.js';

const { W, H } = A4;

const FAMILY = {
  sans: 'Noto Sans KR',
  serif: 'Noto Serif KR',
  display: 'Black Han Sans',
  soft: 'Gowun Dodum',
  softSerif: 'Gowun Batang',
};
const FALLBACK = {
  sans: '"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
  serif: '"AppleMyungjo","Batang",serif',
  display: '"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
  soft: '"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
  softSerif: '"AppleMyungjo","Batang",serif',
};
const WEIGHTS = { sans: [400, 700, 900], serif: [400, 700, 900], display: [400], soft: [400], softSerif: [400, 700] };

// ---------- 폰트 로딩 ----------
const loadedFonts = new Set();
async function ensureFonts(keys, text) {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const chars = [...new Set(text + '0123456789:~.()·!?NOTICE')].join('');
  const jobs = [];
  for (const k of keys) {
    for (const w of WEIGHTS[k]) {
      const id = `${k}${w}|${chars}`;
      if (loadedFonts.has(id)) continue;
      jobs.push(document.fonts.load(`${w} 64px "${FAMILY[k]}"`, chars).then(() => loadedFonts.add(id)).catch(() => {}));
    }
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 5000))]);
}

// ---------- 텍스트 / 도형 헬퍼 ----------
function setFont(ctx, fam, weight, size) {
  ctx.font = `${weight} ${Math.round(size)}px "${FAMILY[fam]}",${FALLBACK[fam]}`;
}
const tw = (ctx, s) => ctx.measureText(s).width;

function fitSize(ctx, fam, weight, lines, maxSize, maxW, minSize = 24) {
  let s = maxSize;
  for (; s > minSize; s -= Math.max(2, s * 0.03)) {
    setFont(ctx, fam, weight, s);
    if (lines.every((l) => tw(ctx, l) <= maxW)) return s;
  }
  setFont(ctx, fam, weight, minSize);
  return minSize;
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const ch of para) {
      const t = line + ch;
      if (tw(ctx, t) <= maxW || !line) { line = t; continue; }
      const sp = line.lastIndexOf(' ');
      if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; }
      else { out.push(line.trimEnd()); line = ch === ' ' ? '' : ch; }
    }
    out.push(line);
  }
  return out;
}

// 줄 수 제한 안에 들어갈 때까지 글자 크기를 줄이며 문단을 그린다. 그린 높이를 반환.
function para(ctx, text, o) {
  if (!text) return 0;
  let size = o.size;
  let lines;
  for (;;) {
    setFont(ctx, o.fam, o.weight, size);
    lines = wrap(ctx, text, o.maxW);
    if (lines.length <= (o.maxLines || 3) || size <= (o.minSize || 30)) break;
    size -= 4;
  }
  const lh = size * (o.lh || 1.45);
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, o.x, o.y + i * lh));
  return lines.length * lh - (lh - size);
}

function spaced(ctx, s, x, y, sp, align = 'left') {
  const chars = [...s];
  const widths = chars.map((c) => tw(ctx, c));
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + sp; });
  ctx.textAlign = prev;
  return total;
}

function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hline(ctx, x1, x2, y, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function diamond(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

// ---------- 카드 / 뱃지 ----------
function card(ctx, x, y, w, h, th) {
  const p = th.p;
  ctx.save();
  if (th.card === 'outline') {
    rr(ctx, x, y, w, h, th.radius);
    ctx.fillStyle = p.card;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 5;
    ctx.stroke();
  } else if (th.card === 'bold') {
    rr(ctx, x + 18, y + 18, w, h, th.radius);
    ctx.fillStyle = p.cardBorder;
    ctx.fill();
    rr(ctx, x, y, w, h, th.radius);
    ctx.fillStyle = p.card;
    ctx.fill();
    ctx.strokeStyle = p.cardBorder;
    ctx.lineWidth = 12;
    ctx.stroke();
  } else if (th.card === 'soft') {
    ctx.shadowColor = 'rgba(80,50,30,0.10)';
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 24;
    rr(ctx, x, y, w, h, th.radius);
    ctx.fillStyle = p.card;
    ctx.fill();
  } else if (th.card === 'line') {
    rr(ctx, x, y, w, h, th.radius);
    ctx.fillStyle = p.card;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 6;
    ctx.stroke();
  } else {
    rr(ctx, x, y, w, h, th.radius);
    ctx.fillStyle = p.card;
    ctx.fill();
  }
  ctx.restore();
}

// 가운데 정렬 pill. cx 는 중심 x, y 는 위쪽.
function pill(ctx, label, cx, y, h, o) {
  setFont(ctx, o.fam, o.weight || 700, h * 0.5);
  const textW = tw(ctx, label);
  const w = Math.max(o.minW || 0, textW + h * 0.9);
  if (o.maxW && w > o.maxW) fitSize(ctx, o.fam, o.weight || 700, [label], h * 0.5, o.maxW - h * 0.6);
  const pw = Math.min(w, o.maxW || w);
  const x = o.anchor === 'right' ? cx - pw : o.anchor === 'left' ? cx : cx - pw / 2;
  rr(ctx, x, y, pw, h, h / 2);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = Math.max(3, h * 0.06); ctx.stroke(); }
  ctx.fillStyle = o.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pw / 2, y + h / 2 + h * 0.03);
  return pw;
}

function statusStyle(status, p) {
  if (status === 'off') return { fill: p.off, ink: p.offInk };
  if (status === 'short') return { fill: p.short, ink: p.shortInk };
  return { stroke: p.cardInk, ink: p.cardInk };
}

// ---------- 콘텐츠 블록 ----------
function prefHeight(b) {
  switch (b.kind) {
    case 'schedule': return b.rows.length <= 4 ? 760 : b.rows.length * 200 + 60;
    case 'compare': return 1020;
    case 'info': return b.rows.length * 270;
    case 'hero': return 800;
    case 'menus': { const cols = b.items.length > 4 ? 2 : 1; return Math.ceil(b.items.length / cols) * 240; }
    case 'line': return 190;
    default: return 200;
  }
}

function drawBlocks(ctx, blocks, box, th) {
  if (!blocks.length) return;
  const gap = 70;
  const prefs = blocks.map(prefHeight);
  const fixed = blocks.reduce((a, b, i) => a + (b.kind === 'line' ? prefs[i] : 0), 0);
  const flex = prefs.reduce((a, b) => a + b, 0) - fixed;
  const avail = box.h - gap * (blocks.length - 1) - fixed;
  const s = Math.min(1.7, avail / Math.max(1, flex));
  const heights = blocks.map((b, i) => (b.kind === 'line' ? prefs[i] : prefs[i] * s));
  const total = heights.reduce((a, b) => a + b, 0) + gap * (blocks.length - 1);
  let y = box.y + Math.max(0, (box.h - total) / 2);
  blocks.forEach((b, i) => {
    const h = heights[i];
    ctx.save();
    BLOCK[b.kind]?.(ctx, b, box.x, y, box.w, h, th);
    ctx.restore();
    y += h + gap;
  });
}

const BLOCK = {
  schedule(ctx, b, x, y, w, h, th) {
    const p = th.p;
    const n = b.rows.length;
    if (n <= 4) {
      const g = 44;
      const cw = Math.min((w - g * (n - 1)) / n, 760);
      const total = cw * n + g * (n - 1);
      let cx = x + (w - total) / 2;
      for (const r of b.rows) {
        card(ctx, cx, y, cw, h, th);
        const mid = cx + cw / 2;
        const ds = fitSize(ctx, th.head, th.headW, [r.md], Math.min(cw * 0.34, h * 0.22, 240), cw * 0.8);
        ctx.fillStyle = p.cardInk;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(r.md, mid, y + h * 0.11);
        setFont(ctx, th.body, 700, Math.min(ds * 0.42, h * 0.08));
        ctx.fillStyle = p.cardSub;
        ctx.fillText(`${r.dow}요일`, mid, y + h * 0.11 + ds * 1.15);
        const ph = Math.min(h * 0.14, 130);
        const st = statusStyle(r.status, p);
        pill(ctx, r.label, mid, y + h * 0.56, ph, { ...st, fam: th.body, minW: cw * 0.66, maxW: cw * 0.86 });
        if (r.time) {
          fitSize(ctx, th.body, 700, [r.time], Math.min(h * 0.075, 76), cw * 0.86);
          ctx.fillStyle = p.cardInk;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(r.time, mid, y + h * 0.56 + ph + h * 0.06);
        }
        cx += cw + g;
      }
      return;
    }
    card(ctx, x, y, w, h, th);
    const pad = 80;
    const inner = h - 60;
    const rh = inner / n;
    b.rows.forEach((r, i) => {
      const ry = y + 30 + i * rh;
      if (i > 0) hline(ctx, x + pad, x + w - pad, ry, p.cardSub + '33', 3);
      const fs = Math.min(rh * 0.36, 110);
      setFont(ctx, th.body, 700, fs);
      ctx.fillStyle = p.cardInk;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.long, x + pad, ry + rh / 2);
      let right = x + w - pad;
      if (r.time) {
        setFont(ctx, th.body, 700, fs * 0.9);
        ctx.textAlign = 'right';
        ctx.fillStyle = p.cardInk;
        ctx.fillText(r.time, right, ry + rh / 2);
        right -= tw(ctx, r.time) + 40;
      }
      const ph = Math.min(rh * 0.56, 130);
      pill(ctx, r.label, right, ry + (rh - ph) / 2, ph, { ...statusStyle(r.status, p), fam: th.body, anchor: 'right', minW: ph * 2.6 });
    });
  },

  compare(ctx, b, x, y, w, h, th) {
    const p = th.p;
    let cy = y;
    if (b.dateLabel) {
      const fs = fitSize(ctx, th.body, 700, [b.dateLabel], Math.min(h * 0.075, 92), w);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(b.dateLabel, x + w / 2, cy);
      cy += fs * 1.7;
    }
    const rest = y + h - cy;
    const bh = rest * 0.34;
    const ah = rest * 0.14;
    const nh = rest * 0.52;
    const cw = Math.min(w, 1800);
    const cx = x + (w - cw) / 2;
    const mid = x + w / 2;

    card(ctx, cx, cy, cw, bh, th);
    setFont(ctx, th.body, 700, bh * 0.15);
    ctx.fillStyle = p.cardSub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('기존 영업시간', mid, cy + bh * 0.15);
    const ts = fitSize(ctx, th.head, th.headW, [b.before], bh * 0.36, cw * 0.8);
    ctx.fillStyle = p.cardSub;
    ctx.fillText(b.before, mid, cy + bh * 0.44);
    const tW = tw(ctx, b.before);
    hline(ctx, mid - tW / 2 - 20, mid + tW / 2 + 20, cy + bh * 0.44 + ts * 0.55, p.cardSub, Math.max(6, ts * 0.06));

    const ay = cy + bh + ah * 0.2;
    const as = ah * 0.6;
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(mid - as * 0.8, ay);
    ctx.lineTo(mid + as * 0.8, ay);
    ctx.lineTo(mid, ay + as);
    ctx.closePath();
    ctx.fill();

    const ny = cy + bh + ah;
    ctx.save();
    if (th.card === 'bold') {
      rr(ctx, cx + 18, ny + 18, cw, nh, th.radius);
      ctx.fillStyle = p.cardBorder;
      ctx.fill();
    }
    rr(ctx, cx, ny, cw, nh, th.radius);
    ctx.fillStyle = th.card === 'bold' ? p.card : p.accent;
    ctx.fill();
    if (th.card === 'bold') { ctx.strokeStyle = p.cardBorder; ctx.lineWidth = 12; ctx.stroke(); }
    ctx.restore();
    const ink = th.card === 'bold' ? p.cardInk : p.accentInk;
    setFont(ctx, th.body, 700, nh * 0.12);
    ctx.fillStyle = th.card === 'bold' ? p.off : ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('변경 영업시간', mid, ny + nh * 0.14);
    fitSize(ctx, th.head, th.headW, [b.after], nh * 0.38, cw * 0.86);
    ctx.fillStyle = ink;
    ctx.fillText(b.after, mid, ny + nh * 0.4);
  },

  info(ctx, b, x, y, w, h, th) {
    const p = th.p;
    const n = b.rows.length;
    const rh = h / n;
    const ax = th.align === 'center' ? x + w / 2 : x;
    b.rows.forEach((r, i) => {
      const ry = y + i * rh;
      const ls = Math.min(rh * 0.18, 72);
      setFont(ctx, th.body, 700, ls);
      ctx.fillStyle = p.accent;
      ctx.textAlign = th.align;
      ctx.textBaseline = 'top';
      ctx.fillText(r.label, ax, ry + rh * 0.08);
      fitSize(ctx, th.head, th.headW, [r.value], Math.min(rh * 0.34, 170), w);
      ctx.fillStyle = p.ink;
      ctx.fillText(r.value, ax, ry + rh * 0.08 + ls * 1.6);
      if (i < n - 1) hline(ctx, x, x + w, ry + rh - 4, p.line, 4);
    });
  },

  hero(ctx, b, x, y, w, h, th) {
    const p = th.p;
    const cw = Math.min(w, 1900);
    const cx = x + (w - cw) / 2;
    card(ctx, cx, y, cw, h, th);
    const mid = x + w / 2;
    const ph = Math.min(h * 0.12, 120);
    pill(ctx, b.label, mid, y + h * 0.12, ph, { fill: p.accent === p.card ? p.cardInk : p.accent, ink: p.accent === p.card ? p.card : p.accentInk, fam: th.body, maxW: cw * 0.86 });
    const hasSub = !!b.sub;
    const vs = fitSize(ctx, th.head, th.headW, [b.value], h * (hasSub ? 0.22 : 0.3), cw * 0.86);
    ctx.fillStyle = p.cardInk;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const vy = hasSub ? y + h * 0.36 : y + h * 0.12 + ph + (h * 0.88 - ph - vs) / 2 - h * 0.04;
    ctx.fillText(b.value, mid, vy);
    if (hasSub) {
      para(ctx, b.sub, { fam: th.body, weight: 700, size: Math.min(h * 0.065, 80), maxW: cw * 0.86, maxLines: 2, x: mid, y: vy + vs * 1.3, color: p.cardSub, align: 'center', lh: 1.4 });
    }
  },

  menus(ctx, b, x, y, w, h, th) {
    const p = th.p;
    const n = b.items.length;
    const cols = n > 4 ? 2 : 1;
    const rows = Math.ceil(n / cols);
    const g = 36;
    const cw = (w - g * (cols - 1)) / cols;
    const ch = (h - g * (rows - 1)) / rows;
    b.items.forEach((name, i) => {
      const cx = x + (i % cols) * (cw + g);
      const cy = y + Math.floor(i / cols) * (ch + g);
      card(ctx, cx, cy, cw, ch, { ...th, radius: Math.min(th.radius, ch / 2) });
      const ph = ch * 0.44;
      const pad = Math.min(ch * 0.4, 80);
      setFont(ctx, th.body, 900, ph * 0.5);
      const tagW = tw(ctx, '품절') + ph * 0.9;
      pill(ctx, '품절', cx + cw - pad, cy + (ch - ph) / 2, ph, { fill: p.off, ink: p.offInk, fam: th.body, weight: 900, anchor: 'right' });
      fitSize(ctx, th.head, th.headW, [name], Math.min(ch * 0.4, 150), cw - pad * 2 - tagW - 30);
      ctx.fillStyle = p.cardInk;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, cx + pad, cy + ch / 2 + ch * 0.02);
    });
  },

  line(ctx, b, x, y, w, h, th) {
    const ax = th.align === 'center' ? x + w / 2 : x;
    const size = Math.min(h * 0.42, 84);
    setFont(ctx, th.body, 700, size);
    const lines = wrap(ctx, b.text, w);
    const lh = size * 1.4;
    const top = y + (h - (lines.length * lh - (lh - size))) / 2;
    para(ctx, b.text, { fam: th.body, weight: 700, size, maxW: w, maxLines: 2, x: ax, y: Math.max(y, top), color: th.p.ink, align: th.align, lh: 1.4 });
  },
};

// ---------- 레이아웃(디자인 스타일) ----------
// 각 레이아웃은 배경 → 헤더 → 블록 영역 → 푸터 순서로 그린다.
// asset(Figma 에서 export 한 배경 이미지)이 있으면 배경 대신 그 이미지를 쓴다.

function drawBg(ctx, opts, fallback) {
  if (opts.assetImage) ctx.drawImage(opts.assetImage, 0, 0, W, H);
  else fallback();
}

function titleLines(doc) {
  return doc.title.split('\n');
}

const LAYOUT_RENDER = {
  clean(ctx, doc, p, opts) {
    const M = 200;
    drawBg(ctx, opts, () => { ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H); });
    ctx.fillStyle = p.accent;
    ctx.fillRect(M, 230, 150, 22);
    setFont(ctx, 'sans', 700, 74);
    ctx.fillStyle = p.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(doc.kicker, M, 310);

    const lines = titleLines(doc);
    const ts = fitSize(ctx, 'sans', 900, lines, 270, W - M * 2);
    ctx.fillStyle = p.ink;
    let y = 470;
    lines.forEach((l) => { ctx.fillText(l, M, y); y += ts * 1.2; });
    y += 40;
    y += para(ctx, doc.lead, { fam: 'sans', weight: 400, size: 76, maxW: W - M * 2, maxLines: 3, x: M, y, color: p.sub, lh: 1.5 });
    y += 100;
    hline(ctx, M, W - M, y, p.ink, 6);

    const footH = doc.store ? 340 : 160;
    const footTop = H - M - footH;
    drawBlocks(ctx, doc.blocks, { x: M, y: y + 110, w: W - M * 2, h: footTop - y - 200 }, { p, head: 'sans', headW: 900, body: 'sans', card: 'fill', radius: 36, align: 'left' });

    hline(ctx, M, W - M, footTop, p.line, 4);
    setFont(ctx, 'sans', 400, 68);
    ctx.fillStyle = p.sub;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(doc.footer, M, footTop + 60);
    if (doc.store) {
      fitSize(ctx, 'sans', 900, [doc.store], 110, W - M * 2);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(doc.store, W - M, H - M);
    }
  },

  premium(ctx, doc, p, opts) {
    drawBg(ctx, opts, () => { ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H); });
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(110, 110, W - 220, H - 220);
    ctx.lineWidth = 3;
    ctx.strokeRect(150, 150, W - 300, H - 300);
    for (const [cx, cy] of [[150, 150], [W - 150, 150], [150, H - 150], [W - 150, H - 150]]) diamond(ctx, cx, cy, 26, p.accent);

    const mid = W / 2;
    const M = 300;
    setFont(ctx, 'serif', 400, 68);
    ctx.fillStyle = p.accent;
    ctx.textBaseline = 'top';
    spaced(ctx, 'NOTICE', mid, 340, 34, 'center');
    hline(ctx, mid - 360, mid - 60, 470, p.accent, 3);
    hline(ctx, mid + 60, mid + 360, 470, p.accent, 3);
    diamond(ctx, mid, 470, 18, p.accent);

    setFont(ctx, 'serif', 700, 78);
    ctx.fillStyle = p.ink;
    ctx.textAlign = 'center';
    ctx.fillText(doc.kicker, mid, 550);
    const lines = titleLines(doc);
    const ts = fitSize(ctx, 'serif', 900, lines, 240, W - M * 2);
    let y = 700;
    ctx.fillStyle = p.ink;
    lines.forEach((l) => { ctx.fillText(l, mid, y); y += ts * 1.25; });
    y += 30;
    y += para(ctx, doc.lead, { fam: 'serif', weight: 400, size: 70, maxW: W - M * 2, maxLines: 3, x: mid, y, color: p.sub, align: 'center', lh: 1.55 });
    y += 120;

    const footH = doc.store ? 420 : 220;
    const footTop = H - 260 - footH;
    drawBlocks(ctx, doc.blocks, { x: M, y, w: W - M * 2, h: footTop - y - 60 }, { p, head: 'serif', headW: 900, body: 'serif', card: 'outline', radius: 12, align: 'center' });

    setFont(ctx, 'serif', 400, 66);
    ctx.fillStyle = p.sub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(doc.footer, mid, footTop + 40);
    if (doc.store) {
      hline(ctx, mid - 160, mid + 160, footTop + 190, p.accent, 3);
      fitSize(ctx, 'serif', 900, [doc.store], 104, W - M * 2);
      ctx.fillStyle = p.accent;
      ctx.fillText(doc.store, mid, footTop + 250);
    }
  },

  bold(ctx, doc, p, opts) {
    drawBg(ctx, opts, () => { ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H); });
    const M = 170;
    // 상단 띠
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 150, W, 190);
    setFont(ctx, 'display', 400, 96);
    ctx.fillStyle = p.accentInk;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const unit = `${doc.kicker}  ✦  `;
    const uw = tw(ctx, unit);
    for (let x = -uw * 0.35; x < W; x += uw) ctx.fillText(unit, x, 250);

    const lines = titleLines(doc);
    const ts = fitSize(ctx, 'display', 400, lines, 440, W - M * 2);
    ctx.fillStyle = p.ink;
    ctx.textBaseline = 'top';
    let y = 470;
    lines.forEach((l) => { ctx.fillText(l, M, y); y += ts * 1.08; });
    y += 40;
    y += para(ctx, doc.lead, { fam: 'sans', weight: 900, size: 84, maxW: W - M * 2, maxLines: 2, x: M, y, color: p.ink, lh: 1.35 });
    y += 120;

    const bandH = 300;
    const footTop = H - bandH - 200;
    drawBlocks(ctx, doc.blocks, { x: M, y, w: W - M * 2 - 18, h: footTop - y - 60 }, { p, head: 'display', headW: 400, body: 'sans', card: 'bold', radius: 40, align: 'left' });

    setFont(ctx, 'sans', 900, 72);
    ctx.fillStyle = p.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(doc.footer, M, footTop + 50);
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, H - bandH, W, bandH);
    if (doc.store) {
      fitSize(ctx, 'display', 400, [doc.store], 140, W - M * 2);
      ctx.fillStyle = p.accentInk;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(doc.store, W / 2, H - bandH / 2);
    } else {
      setFont(ctx, 'display', 400, 96);
      ctx.fillStyle = p.accentInk;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      spaced(ctx, 'NOTICE', W / 2, H - bandH / 2, 40, 'center');
    }
  },

  soft(ctx, doc, p, opts) {
    drawBg(ctx, opts, () => {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W, H);
      const blob = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
      blob(W * 0.95, 180, 720, p.blob1);
      blob(W * 0.02, H * 0.93, 640, p.blob2);
      blob(W * 0.12, 420, 90, p.blob1);
      blob(W * 0.86, H * 0.8, 60, p.accent + '55');
    });
    const mid = W / 2;
    const M = 230;
    const kh = 130;
    pill(ctx, doc.kicker, mid, 300, kh, { fill: p.accent, ink: p.accentInk, fam: 'soft', weight: 400 });

    const lines = titleLines(doc);
    const ts = fitSize(ctx, 'softSerif', 700, lines, 250, W - M * 2);
    ctx.fillStyle = p.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let y = 560;
    lines.forEach((l) => { ctx.fillText(l, mid, y); y += ts * 1.3; });
    y += 30;
    y += para(ctx, doc.lead, { fam: 'soft', weight: 400, size: 76, maxW: W - M * 2, maxLines: 3, x: mid, y, color: p.sub, align: 'center', lh: 1.55 });
    y += 130;

    const footH = doc.store ? 360 : 200;
    const footTop = H - 230 - footH;
    drawBlocks(ctx, doc.blocks, { x: M, y, w: W - M * 2, h: footTop - y - 40 }, { p, head: 'softSerif', headW: 700, body: 'soft', card: 'soft', radius: 80, align: 'center' });

    setFont(ctx, 'soft', 400, 70);
    ctx.fillStyle = p.sub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(doc.footer, mid, footTop + 60);
    if (doc.store) {
      const s = fitSize(ctx, 'softSerif', 700, [doc.store], 104, W - M * 2 - 300);
      const sw = tw(ctx, doc.store);
      ctx.fillStyle = p.ink;
      ctx.fillText(doc.store, mid, footTop + 210);
      ctx.fillStyle = p.accent;
      for (const dx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(mid + dx * (sw / 2 + 70), footTop + 210 + s * 0.55, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  trendy(ctx, doc, p, opts) {
    const M = 180;
    const lines = titleLines(doc);
    // 패널 높이는 제목 길이에 맞춘다
    const ts = fitSize(ctx, 'sans', 900, lines, 330, W - M * 2 - 260);
    setFont(ctx, 'sans', 700, 76);
    const leadLines = doc.lead ? wrap(ctx, doc.lead, W - M * 2 - 260).length : 0;
    const panelH = Math.max(1250, 470 + lines.length * ts * 1.05 + 60 + leadLines * 76 * 1.45 + 140);

    drawBg(ctx, opts, () => {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = p.panel;
      ctx.fillRect(0, 0, W, panelH);
      ctx.strokeStyle = p.panelInk + '1f';
      ctx.lineWidth = 3;
      for (let gx = 124; gx < W; gx += 124) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, panelH); ctx.stroke(); }
      for (let gy = 124; gy < panelH; gy += 124) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    });

    // 세로 NOTICE
    ctx.save();
    ctx.translate(W - 150, 200);
    ctx.rotate(Math.PI / 2);
    setFont(ctx, 'sans', 900, 150);
    ctx.fillStyle = p.panelInk;
    ctx.textBaseline = 'alphabetic';
    spaced(ctx, 'NOTICE', 0, 0, 30, 'left');
    ctx.restore();

    pill(ctx, doc.kicker, M, 230, 120, { stroke: p.panelInk, ink: p.panelInk, fam: 'sans', anchor: 'left' });
    ctx.fillStyle = p.panelInk;
    setFont(ctx, 'sans', 900, ts);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = 470;
    lines.forEach((l) => { ctx.fillText(l, M - ts * 0.04, y); y += ts * 1.05; });
    y += 60;
    para(ctx, doc.lead, { fam: 'sans', weight: 700, size: 76, maxW: W - M * 2 - 260, maxLines: 3, x: M, y, color: p.panelInk, lh: 1.45 });

    const footTop = H - 380;
    drawBlocks(ctx, doc.blocks, { x: M, y: panelH + 150, w: W - M * 2, h: footTop - panelH - 250 }, { p, head: 'sans', headW: 900, body: 'sans', card: 'line', radius: 44, align: 'left' });

    hline(ctx, M, W - M, footTop, p.ink, 8);
    ctx.textBaseline = 'top';
    if (doc.store) {
      fitSize(ctx, 'sans', 900, [doc.store], 110, (W - M * 2) * 0.55);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'left';
      ctx.fillText(doc.store, M, footTop + 70);
    }
    fitSize(ctx, 'sans', 700, [doc.footer], 66, doc.store ? (W - M * 2) * 0.42 : W - M * 2);
    ctx.fillStyle = p.sub;
    ctx.textAlign = doc.store ? 'right' : 'left';
    ctx.fillText(doc.footer, doc.store ? W - M : M, footTop + 90);
  },
};

const LAYOUT_FONTS = {
  clean: ['sans'],
  premium: ['serif'],
  bold: ['display', 'sans'],
  soft: ['soft', 'softSerif'],
  trendy: ['sans'],
};

const imageCache = new Map();
function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (!imageCache.has(url)) {
    imageCache.set(url, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return imageCache.get(url);
}

function docText(doc) {
  const parts = [doc.kicker, doc.title, doc.lead, doc.footer, doc.store];
  for (const b of doc.blocks) parts.push(JSON.stringify(b));
  return parts.join('') + '정상 영업휴무단축기존변경시간품절요일';
}

/**
 * 캔버스에 공지를 그린다.
 * @param {HTMLCanvasElement} canvas
 * @param {{type, data, template, paletteId, width}} o  width 는 캔버스 픽셀 폭(기본 2480 = 300dpi)
 */
export async function renderNotice(canvas, { type, data, template, paletteId, width = W }) {
  if (isFigmaTemplate(template)) return renderFigma(canvas, { type, data, template, paletteId, width });
  const doc = buildDoc(type, data, template);
  const layout = LAYOUT_RENDER[template.layout] ? template.layout : 'clean';
  const p = getPalette(layout, paletteId || template.palettes?.[0]);
  const [assetImage] = await Promise.all([
    loadImage(template.asset),
    ensureFonts(LAYOUT_FONTS[layout].concat('sans'), docText(doc)),
  ]);
  const scale = width / W;
  canvas.width = Math.round(width);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  LAYOUT_RENDER[layout](ctx, doc, p, { assetImage });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}
