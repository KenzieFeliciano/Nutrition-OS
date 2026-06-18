import { demoState } from '../data/demoState.js';

// Paints the 6 section cards + 26 nutrient tiles into a single texture atlas
// (the repo's approach) so the whole helix renders as one instanced draw call.
const ATLAS_W = 4096;
const ATLAS_H = 1024;
const CARD_W = 512;
const CARD_H = 640;
const TILE_W = 256;
const TILE_H = 160;

const INK = '#403a32';
const INK_60 = 'rgba(64,58,50,0.6)';
const INK_45 = 'rgba(64,58,50,0.45)';
const INK_35 = 'rgba(64,58,50,0.35)';
const GOLD = '#c2a878';
const CARD_BG = '#fdfbf7';
const CREAM = '#f3efe7';
const STATUS = { gap: '#c98268', declining: '#c2a878', healthy: '#9faf91' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
      lines += 1;
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
  return cursor;
}

function cardChrome(ctx, x, y, w, h, label, index) {
  ctx.fillStyle = CARD_BG;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(194,168,120,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // corner brackets
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  const b = 26;
  const inset = 20;
  ctx.beginPath();
  ctx.moveTo(x + inset, y + inset + b);
  ctx.lineTo(x + inset, y + inset);
  ctx.lineTo(x + inset + b, y + inset);
  ctx.moveTo(x + w - inset - b, y + h - inset);
  ctx.lineTo(x + w - inset, y + h - inset);
  ctx.lineTo(x + w - inset, y + h - inset - b);
  ctx.stroke();

  ctx.fillStyle = INK_45;
  ctx.font = '600 17px Karla, sans-serif';
  spacedCaps(ctx, label, x + 44, y + 64);
  ctx.font = '700 18px Doto, monospace';
  ctx.fillStyle = 'rgba(194,168,120,0.9)';
  ctx.textAlign = 'right';
  ctx.fillText(index, x + w - 44, y + 64);
  ctx.textAlign = 'left';
}

function drawDots(ctx, x, y, pct, count = 12) {
  const filled = Math.round((Math.min(pct, 100) / 100) * count);
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(x + i * 17, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = i < filled ? STATUS.gap : 'rgba(64,58,50,0.12)';
    ctx.fill();
  }
}

function drawScore(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Score', '01');
  ctx.fillStyle = INK;
  ctx.font = '700 170px Doto, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(demoState.score), x + CARD_W / 2, y + 330);
  ctx.font = '600 16px Karla, sans-serif';
  ctx.fillStyle = INK_45;
  ctx.textAlign = 'left';
  spacedCaps(ctx, '/100 nourished', x + 168, y + 384);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#efe3cd';
  roundRect(ctx, x + CARD_W / 2 - 70, y + 420, 140, 38, 19);
  ctx.fill();
  ctx.fillStyle = INK_60;
  ctx.font = '700 15px Karla, sans-serif';
  ctx.fillText(demoState.confidence.toUpperCase(), x + CARD_W / 2, y + 445);
  ctx.textAlign = 'left';

  // sparkline
  const values = demoState.spark;
  const min = Math.min(...values);
  const max = Math.max(...values);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, i) => {
    const px = x + 70 + (i * (CARD_W - 220)) / (values.length - 1);
    const py = y + 560 - ((value - min) / (max - min || 1)) * 50;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '700 30px Doto, monospace';
  ctx.fillText(`+${demoState.delta7}`, x + CARD_W - 120, y + 545);
  ctx.fillStyle = INK_35;
  ctx.font = '600 13px Karla, sans-serif';
  spacedCaps(ctx, '7 days', x + CARD_W - 120, y + 568, 2);
}

function drawGaps(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Nutrient state', '02');
  demoState.gaps.forEach((gap, i) => {
    const rowY = y + 130 + i * 78;
    ctx.fillStyle = INK;
    ctx.font = '500 24px Karla, sans-serif';
    ctx.fillText(gap.name, x + 44, rowY);
    drawDots(ctx, x + 50, rowY + 26, gap.coverage);
    ctx.fillStyle = INK;
    ctx.font = '700 30px Doto, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${gap.coverage}`, x + CARD_W - 48, rowY + 8);
    ctx.textAlign = 'left';
    if (i < demoState.gaps.length - 1) {
      ctx.strokeStyle = 'rgba(64,58,50,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 44, rowY + 46);
      ctx.lineTo(x + CARD_W - 44, rowY + 46);
      ctx.stroke();
    }
  });
  ctx.fillStyle = INK_45;
  ctx.font = '600 15px Karla, sans-serif';
  spacedCaps(ctx, 'Click to view all 26 →', x + 44, y + CARD_H - 56, 2);
}

function drawToday(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Today remaining', '03');
  demoState.today.forEach((row, i) => {
    const rowY = y + 150 + i * 88;
    ctx.fillStyle = INK;
    ctx.font = '500 25px Karla, sans-serif';
    ctx.fillText(row.name, x + 44, rowY);
    ctx.font = '700 42px Doto, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(row.remaining), x + CARD_W - 92, rowY + 2);
    ctx.font = '500 18px Karla, sans-serif';
    ctx.fillStyle = INK_35;
    ctx.fillText(row.unit, x + CARD_W - 46, rowY);
    ctx.textAlign = 'left';
    if (i < demoState.today.length - 1) {
      ctx.strokeStyle = 'rgba(64,58,50,0.07)';
      ctx.beginPath();
      ctx.moveTo(x + 44, rowY + 36);
      ctx.lineTo(x + CARD_W - 44, rowY + 36);
      ctx.stroke();
    }
  });
}

function drawAction(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Best next action', '04');
  ctx.fillStyle = INK;
  ctx.font = 'italic 500 40px Fraunces, serif';
  wrapText(ctx, demoState.action.food, x + 44, y + 160, CARD_W - 96, 50, 3);
  ctx.fillStyle = INK_60;
  ctx.font = '400 22px Karla, sans-serif';
  wrapText(ctx, demoState.action.why, x + 44, y + 286, CARD_W - 96, 33, 5);
  ctx.fillStyle = INK;
  ctx.font = '700 24px Doto, monospace';
  wrapText(ctx, demoState.action.impact, x + 44, y + 460, CARD_W - 96, 36, 2);
  ctx.strokeStyle = 'rgba(64,58,50,0.1)';
  ctx.beginPath();
  ctx.moveTo(x + 44, y + 520);
  ctx.lineTo(x + CARD_W - 44, y + 520);
  ctx.stroke();
  ctx.fillStyle = INK_45;
  ctx.font = '600 19px Karla, sans-serif';
  wrapText(ctx, `${demoState.action.roi} ROI · ${demoState.action.synergy}`, x + 44, y + 556, CARD_W - 96, 27, 3);
}

function drawMeals(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Meal log', '05');
  const tones = [
    ['#c9b18c', '#8a9b6e'],
    ['#c98268', '#c2a878'],
    ['#efe3cd', '#b87f95'],
  ];
  tones.forEach((tone, i) => {
    ctx.save();
    ctx.translate(x + CARD_W / 2, y + 220);
    ctx.rotate(((i - 1) * 8 * Math.PI) / 180);
    const grad = ctx.createLinearGradient(-110, -70, 110, 70);
    grad.addColorStop(0, tone[0]);
    grad.addColorStop(1, tone[1]);
    ctx.fillStyle = grad;
    roundRect(ctx, -110, -70, 220, 140, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
  demoState.meals.forEach((meal, i) => {
    const rowY = y + 400 + i * 52;
    ctx.fillStyle = INK;
    ctx.font = '500 21px Karla, sans-serif';
    ctx.fillText(meal.summary, x + 44, rowY);
    ctx.fillStyle = INK_35;
    ctx.font = '600 14px Karla, sans-serif';
    ctx.textAlign = 'right';
    spacedCaps(ctx, meal.time, x + CARD_W - 110, rowY, 1);
    ctx.textAlign = 'left';
  });
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(64,58,50,0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 44, y + CARD_H - 88, CARD_W - 88, 48, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = INK_60;
  ctx.font = '600 17px Karla, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+ Log a meal', x + CARD_W / 2, y + CARD_H - 57);
  ctx.textAlign = 'left';
}

function drawWisdom(ctx, x, y) {
  cardChrome(ctx, x, y, CARD_W, CARD_H, 'Ancient wisdom', '06');
  ctx.fillStyle = INK;
  ctx.font = 'italic 500 30px Fraunces, serif';
  wrapText(ctx, `“${demoState.wisdom.text}”`, x + 44, y + 180, CARD_W - 96, 44, 9);
  ctx.fillStyle = INK_45;
  ctx.font = '600 16px Karla, sans-serif';
  spacedCaps(ctx, demoState.wisdom.tradition, x + 44, y + CARD_H - 60);
}

function drawTile(ctx, x, y, nutrient) {
  ctx.fillStyle = CREAM;
  roundRect(ctx, x + 4, y + 4, TILE_W - 8, TILE_H - 8, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(194,168,120,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = STATUS[nutrient.status];
  ctx.beginPath();
  ctx.arc(x + 26, y + 32, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK_60;
  ctx.font = '600 16px Karla, sans-serif';
  ctx.fillText(nutrient.name, x + 42, y + 38);
  ctx.fillStyle = INK;
  ctx.font = '700 56px Doto, monospace';
  const pctText = String(nutrient.pct);
  ctx.fillText(pctText, x + 22, y + 110);
  const pctWidth = ctx.measureText(pctText).width;
  ctx.font = '700 22px Doto, monospace';
  ctx.fillStyle = INK_35;
  ctx.fillText('%', x + 28 + pctWidth, y + 108);
  // status bar
  ctx.fillStyle = 'rgba(64,58,50,0.1)';
  roundRect(ctx, x + 22, y + 128, TILE_W - 44, 6, 3);
  ctx.fill();
  ctx.fillStyle = STATUS[nutrient.status];
  roundRect(ctx, x + 22, y + 128, (TILE_W - 44) * Math.min(nutrient.pct, 100) / 100, 6, 3);
  ctx.fill();
}

export async function buildAtlas() {
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  const sections = [
    { id: 'score', draw: drawScore },
    { id: 'gaps', draw: drawGaps },
    { id: 'today', draw: drawToday },
    { id: 'action', draw: drawAction },
    { id: 'meals', draw: drawMeals },
    { id: 'wisdom', draw: drawWisdom },
  ];

  const entries = [];
  sections.forEach((section, i) => {
    const x = i * CARD_W;
    section.draw(ctx, x, 0);
    entries.push({
      id: section.id,
      kind: 'section',
      uv: [x / ATLAS_W, 0, CARD_W / ATLAS_W, CARD_H / ATLAS_H],
      size: [2.3, 2.875],
    });
  });

  demoState.nutrients26.forEach((nutrient, i) => {
    const x = (i % 16) * TILE_W;
    const y = CARD_H + Math.floor(i / 16) * TILE_H;
    drawTile(ctx, x, y, nutrient);
    entries.push({
      id: `nutrient:${nutrient.name}`,
      kind: 'tile',
      nutrient,
      uv: [x / ATLAS_W, y / ATLAS_H, TILE_W / ATLAS_W, TILE_H / ATLAS_H],
      size: [1.35, 0.845],
    });
  });

  return { canvas, entries };
}
