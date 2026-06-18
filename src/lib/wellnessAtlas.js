import { demoState } from '../data/demoState.js';

// Near-square tiles (≈4:3), fully painted edge-to-edge. Padding=0 so the shader's
// UV math (col+localUV.x)/cols maps exactly onto each tile with no bleed. Rounding
// and clean edges come from the fragment shader's rounded-box SDF, not from canvas.
const TILE_W = 600;
const TILE_H = 460;

// Espresso cards on a white stage — cream text, warm latte accent.
// (INK = the primary light text colour painted onto the dark espresso cards.)
const INK = '#f1ebdd';
const INK_60 = 'rgba(241,235,221,0.62)';
const INK_45 = 'rgba(241,235,221,0.42)';
const INK_35 = 'rgba(241,235,221,0.3)';
const GOLD = '#c9a87a';        // warm latte accent
const CARD_BG = '#47362a';     // espresso (warm brown, not black)
const CREAM = '#4d3b2c';       // lighter espresso (badge fills)
const STATUS = { gap: '#e0a184', declining: '#d6bd82', healthy: '#a9c186' };

// Royalty-free warm/cozy photos (Unsplash CDN sends CORS *, so canvas stays untainted).
// Swap these for your own files later — drop them in public/images/wellness/ and
// replace the URLs with /images/wellness/your-file.jpg.
const PHOTO_PARAMS = 'fit=crop&auto=format&q=72&w=600&h=460';
const PHOTOS = [
  `https://images.unsplash.com/photo-1536256263959-770b48d82b0a?${PHOTO_PARAMS}`, // matcha latte
  `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?${PHOTO_PARAMS}`, // cozy coffee
  `https://images.unsplash.com/photo-1542838132-92c53300491e?${PHOTO_PARAMS}`,     // market produce
  `https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?${PHOTO_PARAMS}`, // homemade breakfast
  `https://images.unsplash.com/photo-1490750967868-88aa4486c946?${PHOTO_PARAMS}`, // flowers in bloom
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) {
  const words = text.split(' ');
  let line = '', cursorY = y, lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
      lines++;
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

function spacedCaps(ctx, text, x, y, spacing = 3) {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

// Fill the whole tile with card bg + a header label. No rounded rect here — the
// shader masks the rounded corners, so we paint the tile solid edge-to-edge.
function cardBase(ctx, x, y, label, index) {
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(x, y, TILE_W, TILE_H);

  if (label) {
    ctx.fillStyle = INK_45;
    ctx.font = '600 15px Karla, sans-serif';
    spacedCaps(ctx, label, x + 40, y + 50);
  }
  if (index) {
    ctx.font = '700 15px Doto, monospace';
    ctx.fillStyle = 'rgba(201,168,122,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(index, x + TILE_W - 40, y + 50);
    ctx.textAlign = 'left';
  }
}

// ── Info card draw functions (designed for 600×460) ──────────────────────────

function drawScore(ctx, x, y) {
  cardBase(ctx, x, y, 'Daily score', '01');

  ctx.fillStyle = INK;
  ctx.font = '700 150px Doto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(demoState.score), x + TILE_W / 2, y + 240);

  ctx.font = '600 14px Karla, sans-serif';
  ctx.fillStyle = INK_45;
  ctx.textAlign = 'center';
  spacedCaps(ctx, '/ 100 nourished', x + TILE_W / 2 - 56, y + 280);

  ctx.fillStyle = CREAM;
  const bw = 132;
  ctx.beginPath();
  ctx.roundRect(x + TILE_W / 2 - bw / 2, y + 300, bw, 32, 16);
  ctx.fill();
  ctx.fillStyle = INK_60;
  ctx.font = '700 12px Karla, sans-serif';
  ctx.fillText(demoState.confidence.toUpperCase(), x + TILE_W / 2, y + 321);
  ctx.textAlign = 'left';

  // sparkline
  const v = demoState.spark;
  const min = Math.min(...v), max = Math.max(...v);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  v.forEach((val, i) => {
    const px = x + 80 + (i * (TILE_W - 240)) / (v.length - 1);
    const py = y + 400 - ((val - min) / (max - min || 1)) * 40;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = '700 24px Doto, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`+${demoState.delta7}`, x + TILE_W - 70, y + 392);
  ctx.fillStyle = INK_35;
  ctx.font = '600 11px Karla, sans-serif';
  ctx.fillText('7-DAY', x + TILE_W - 70, y + 410);
  ctx.textAlign = 'left';
}

function drawNutrients(ctx, x, y) {
  cardBase(ctx, x, y, 'Nutrients', '02');

  const items = demoState.nutrients26.slice(0, 9);
  const cols = 3;
  items.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const nx = x + 40 + col * 178;
    const ny = y + 96 + row * 120;

    ctx.beginPath();
    ctx.arc(nx + 6, ny + 10, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = STATUS[n.status];
    ctx.fill();

    ctx.fillStyle = INK_60;
    ctx.font = '500 13px Karla, sans-serif';
    ctx.fillText(n.name, nx + 18, ny + 14);

    ctx.fillStyle = INK;
    ctx.font = '700 34px Doto, monospace';
    const pct = String(n.pct);
    ctx.fillText(pct, nx, ny + 54);
    const pw = ctx.measureText(pct).width;
    ctx.fillStyle = INK_35;
    ctx.font = '700 15px Doto, monospace';
    ctx.fillText('%', nx + pw + 5, ny + 52);

    ctx.fillStyle = 'rgba(241,235,221,0.12)';
    ctx.beginPath();
    ctx.roundRect(nx, ny + 64, 150, 4, 2);
    ctx.fill();
    ctx.fillStyle = STATUS[n.status];
    ctx.beginPath();
    ctx.roundRect(nx, ny + 64, Math.min(n.pct / 100, 1) * 150, 4, 2);
    ctx.fill();
  });

  ctx.fillStyle = INK_35;
  ctx.font = '600 12px Karla, sans-serif';
  spacedCaps(ctx, `${demoState.nutrients26.length} nutrients tracked`, x + 40, y + TILE_H - 32, 2);
}

function drawWisdom(ctx, x, y) {
  // A handwritten note on a faint paper card
  cardBase(ctx, x, y, 'Ancient wisdom', '03');

  // faint ruled lines, like notebook paper
  ctx.strokeStyle = 'rgba(241,235,221,0.1)';
  ctx.lineWidth = 1;
  for (let ly = y + 132; ly < y + TILE_H - 80; ly += 44) {
    ctx.beginPath();
    ctx.moveTo(x + 40, ly);
    ctx.lineTo(x + TILE_W - 40, ly);
    ctx.stroke();
  }

  ctx.fillStyle = INK;
  ctx.font = '600 34px "Dancing Script", cursive';
  wrapText(ctx, demoState.wisdom.text, x + 44, y + 126, TILE_W - 88, 44, 7);

  ctx.fillStyle = GOLD;
  ctx.font = '600 26px "Dancing Script", cursive';
  ctx.textAlign = 'right';
  ctx.fillText(`— ${demoState.wisdom.tradition}`, x + TILE_W - 44, y + TILE_H - 40);
  ctx.textAlign = 'left';
}

function drawPodcast(ctx, x, y) {
  cardBase(ctx, x, y, 'Podcast insight', '04');

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.roundRect(x + 40, y + 74, 188, 30, 15);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 52, y + 89, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#c08570';
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = '700 12px Karla, sans-serif';
  spacedCaps(ctx, 'Huberman Lab', x + 64, y + 94);

  ctx.fillStyle = INK;
  ctx.font = '600 30px "Dancing Script", cursive';
  wrapText(
    ctx,
    'Morning sunlight for 10–20 min anchors your circadian rhythm, sharpens focus & improves sleep.',
    x + 44, y + 158, TILE_W - 88, 40, 6,
  );

  ctx.fillStyle = INK_60;
  ctx.font = '500 15px Karla, sans-serif';
  ctx.fillText('Light & Circadian Rhythms', x + 40, y + TILE_H - 56);
  ctx.fillStyle = INK_35;
  ctx.font = '600 12px Karla, sans-serif';
  spacedCaps(ctx, 'Ep. 68  ·  4 days ago', x + 40, y + TILE_H - 32, 2);
}

function drawAction(ctx, x, y) {
  cardBase(ctx, x, y, 'Best next action', '05');

  ctx.fillStyle = INK;
  ctx.font = 'italic 500 30px Fraunces, serif';
  wrapText(ctx, demoState.action.food, x + 40, y + 116, TILE_W - 80, 40, 2);

  ctx.fillStyle = INK_60;
  ctx.font = '400 18px Karla, sans-serif';
  wrapText(ctx, demoState.action.why, x + 40, y + 200, TILE_W - 80, 27, 4);

  ctx.strokeStyle = 'rgba(241,235,221,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 40, y + 330);
  ctx.lineTo(x + TILE_W - 40, y + 330);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = '700 19px Doto, monospace';
  wrapText(ctx, demoState.action.impact, x + 40, y + 362, TILE_W - 80, 30, 2);

  ctx.fillStyle = INK_45;
  ctx.font = '500 15px Karla, sans-serif';
  wrapText(ctx, `${demoState.action.roi} ROI · ${demoState.action.synergy}`, x + 40, y + TILE_H - 44, TILE_W - 80, 22, 2);
}

// Cover-fit a loaded image into the tile cell (center crop), with a subtle caption.
function drawPhoto(ctx, x, y, img, caption) {
  const iw = img.width, ih = img.height;
  const scale = Math.max(TILE_W / iw, TILE_H / ih);
  const dw = iw * scale, dh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TILE_W, TILE_H);
  ctx.clip();
  ctx.drawImage(img, x + (TILE_W - dw) / 2, y + (TILE_H - dh) / 2, dw, dh);
  // warm wash so photos sit in the same palette as the cards
  ctx.fillStyle = 'rgba(250,246,238,0.12)';
  ctx.fillRect(x, y, TILE_W, TILE_H);
  if (caption) {
    const grad = ctx.createLinearGradient(x, y + TILE_H - 120, x, y + TILE_H);
    grad.addColorStop(0, 'rgba(40,34,28,0)');
    grad.addColorStop(1, 'rgba(40,34,28,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + TILE_H - 120, TILE_W, 120);
    ctx.fillStyle = '#fdfaf4';
    ctx.font = 'italic 500 22px Fraunces, serif';
    ctx.fillText(caption, x + 40, y + TILE_H - 36);
  }
  ctx.restore();
}

// Fallback gradient if a photo fails to load (offline, blocked, etc.)
function drawPhotoFallback(ctx, x, y, caption) {
  const grad = ctx.createLinearGradient(x, y, x + TILE_W, y + TILE_H);
  grad.addColorStop(0, '#5a4636');
  grad.addColorStop(0.5, '#4a3727');
  grad.addColorStop(1, '#3a2c21');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, TILE_W, TILE_H);
  if (caption) {
    ctx.fillStyle = 'rgba(241,235,221,0.6)';
    ctx.font = 'italic 500 22px Fraunces, serif';
    ctx.fillText(caption, x + 40, y + TILE_H - 36);
  }
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function buildWellnessAtlas() {
  // Canvas-drawn fonts must be explicitly loaded — document.fonts.ready only
  // covers fonts already used in the DOM, and these are only used on the canvas.
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load('600 34px "Dancing Script"'),
      document.fonts.load('500 30px Fraunces'),
      document.fonts.load('italic 500 30px Fraunces'),
      document.fonts.load('700 150px Doto'),
      document.fonts.load('600 15px Karla'),
    ]).catch(() => {});
    await document.fonts.ready;
  }

  // Interleave info cards and wellness photos around the spiral
  const tiles = [
    { kind: 'photo', url: PHOTOS[0], caption: 'matcha' },
    { kind: 'info', id: 'score', draw: drawScore },
    { kind: 'photo', url: PHOTOS[1], caption: 'slow mornings' },
    { kind: 'info', id: 'nutrients', draw: drawNutrients },
    { kind: 'photo', url: PHOTOS[2], caption: 'market haul' },
    { kind: 'info', id: 'wisdom', draw: drawWisdom },
    { kind: 'photo', url: PHOTOS[3], caption: 'homemade' },
    { kind: 'info', id: 'podcast', draw: drawPodcast },
    { kind: 'photo', url: PHOTOS[4], caption: 'in bloom' },
    { kind: 'info', id: 'action', draw: drawAction },
  ];

  const count = tiles.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_W;
  canvas.height = rows * TILE_H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Kick off photo loads in parallel
  const loaded = await Promise.all(
    tiles.map((t) => (t.kind === 'photo' ? loadImage(t.url) : Promise.resolve(null))),
  );

  const entries = [];
  tiles.forEach((tile, i) => {
    const cx = (i % cols) * TILE_W;
    const cy = Math.floor(i / cols) * TILE_H;
    if (tile.kind === 'info') {
      tile.draw(ctx, cx, cy);
    } else {
      const img = loaded[i];
      if (img) drawPhoto(ctx, cx, cy, img, tile.caption);
      else drawPhotoFallback(ctx, cx, cy, tile.caption);
    }
    entries.push({ id: tile.id || `photo-${i}`, kind: tile.kind, tileIndex: i });
  });

  return { canvas, cols, rows, count, entries, tileAspect: TILE_W / TILE_H };
}
