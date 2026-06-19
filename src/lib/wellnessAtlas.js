import { demoState } from '../data/demoState.js';
import { recipes } from '../data/recipes.js';

const TILE_W = 600;
const TILE_H = 460;

const INK = '#2e2a26';
const MUTED = '#6e665e';
const MUTED_SOFT = 'rgba(110,102,94,0.66)';
const FAINT = 'rgba(46,42,38,0.13)';
const GOLD = '#c9a97d';
const SAGE = '#a8b39f';
const OLIVE = '#8f9a82';
const MUSHROOM = '#d9d0c5';
const TAUPE = '#b8aa9a';
const CREAM = '#f1ece4';
const IVORY = '#f7f4ef';
const BODY = 'Inter, sans-serif';
const DISPLAY = '"Cormorant Garamond", serif';
const STATUS = { gap: '#bf8a6f', declining: '#c9a97d', healthy: '#8f9a82' };

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

function spacedCaps(ctx, text, x, y, spacing = 2.4) {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

function fillSurface(ctx, x, y, top = MUSHROOM, bottom = '#cec2b5') {
  const gradient = ctx.createLinearGradient(x, y, x + TILE_W, y + TILE_H);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, TILE_W, TILE_H);
}

function cardBase(ctx, x, y, label, index, surface = {}) {
  fillSurface(ctx, x, y, surface.top || MUSHROOM, surface.bottom || '#cdc1b5');

  ctx.fillStyle = 'rgba(247,244,239,0.22)';
  ctx.beginPath();
  ctx.arc(x + TILE_W * 0.84, y + TILE_H * 0.12, 150, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.fillStyle = MUTED_SOFT;
    ctx.font = `700 14px ${BODY}`;
    spacedCaps(ctx, label, x + 38, y + 50);
  }
  if (index) {
    ctx.font = `700 14px ${BODY}`;
    ctx.fillStyle = 'rgba(201,169,125,0.86)';
    ctx.textAlign = 'right';
    ctx.fillText(index, x + TILE_W - 38, y + 50);
    ctx.textAlign = 'left';
  }
}

function drawNode(ctx, x, y, label, strong = false) {
  ctx.fillStyle = strong ? GOLD : SAGE;
  ctx.beginPath();
  ctx.arc(x, y, strong ? 6 : 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = strong ? INK : MUTED;
  ctx.font = `${strong ? 700 : 600} ${strong ? 13 : 11}px ${BODY}`;
  ctx.fillText(label, x + 13, y + 4);
}

function drawScore(ctx, x, y) {
  cardBase(ctx, x, y, 'Daily score', '01', { top: '#ddd5cb', bottom: MUSHROOM });

  ctx.fillStyle = INK;
  ctx.font = `italic 500 42px ${DISPLAY}`;
  ctx.fillText('Nourishment', x + 48, y + 124);

  ctx.font = `700 118px ${BODY}`;
  ctx.fillText(String(demoState.score), x + 48, y + 250);
  ctx.font = `700 26px ${BODY}`;
  ctx.fillStyle = 'rgba(46,42,38,0.35)';
  ctx.fillText('/100', x + 204, y + 244);

  ctx.fillStyle = MUTED;
  ctx.font = `500 18px ${BODY}`;
  wrapText(ctx, `Today you're ${demoState.delta7} points closer to your nourishment goal.`, x + 48, y + 300, 380, 27, 2);

  const values = demoState.spark;
  const min = Math.min(...values);
  const max = Math.max(...values);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, i) => {
    const px = x + 48 + (i * 315) / (values.length - 1);
    const py = y + 384 - ((value - min) / (max - min || 1)) * 54;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.roundRect(x + 420, y + 332, 118, 42, 21);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = `800 13px ${BODY}`;
  ctx.textAlign = 'center';
  ctx.fillText(demoState.confidence.toUpperCase(), x + 479, y + 358);
  ctx.textAlign = 'left';
}

function drawNutrients(ctx, x, y) {
  cardBase(ctx, x, y, 'Nutrients', '02', { top: '#ded7ce', bottom: MUSHROOM });

  ctx.fillStyle = INK;
  ctx.font = `italic 500 34px ${DISPLAY}`;
  ctx.fillText('Priority constellation', x + 40, y + 104);

  ctx.strokeStyle = 'rgba(143,154,130,0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 84, y + 170);
  ctx.bezierCurveTo(x + 190, y + 132, x + 292, y + 236, x + 420, y + 184);
  ctx.bezierCurveTo(x + 484, y + 160, x + 520, y + 222, x + 506, y + 298);
  ctx.stroke();

  const nodes = demoState.gaps.slice(0, 6);
  const positions = [
    [84, 170], [214, 142], [348, 202], [484, 178], [160, 292], [408, 320],
  ];
  nodes.forEach((n, i) => {
    const [dx, dy] = positions[i];
    drawNode(ctx, x + dx, y + dy, n.name, i === 0);
    ctx.fillStyle = INK;
    ctx.font = `800 28px ${BODY}`;
    ctx.fillText(`${n.coverage}%`, x + dx - 6, y + dy + 42);
  });

  ctx.fillStyle = 'rgba(46,42,38,0.09)';
  ctx.beginPath();
  ctx.roundRect(x + 40, y + 374, TILE_W - 80, 2, 1);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = `600 13px ${BODY}`;
  ctx.fillText('Vitamin D is pulling the strongest recommendation pathway.', x + 40, y + 410);
}

function drawWisdom(ctx, x, y) {
  cardBase(ctx, x, y, 'Ancient wisdom', '03', { top: '#cfc4b8', bottom: TAUPE });

  ctx.fillStyle = 'rgba(247,244,239,0.55)';
  ctx.beginPath();
  ctx.roundRect(x + 40, y + 86, TILE_W - 80, TILE_H - 138, 22);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `italic 500 30px ${DISPLAY}`;
  wrapText(ctx, demoState.wisdom.text, x + 66, y + 148, TILE_W - 132, 38, 6);

  ctx.fillStyle = OLIVE;
  ctx.font = `800 14px ${BODY}`;
  spacedCaps(ctx, demoState.wisdom.tradition, x + 66, y + TILE_H - 58, 2);
}

function drawPodcast(ctx, x, y) {
  cardBase(ctx, x, y, 'Podcast insight', '04', { top: '#d7cec3', bottom: '#c8baaa' });

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.roundRect(x + 40, y + 78, 198, 32, 16);
  ctx.fill();
  drawNode(ctx, x + 58, y + 94, 'Huberman Lab', true);

  ctx.fillStyle = INK;
  ctx.font = `italic 500 34px ${DISPLAY}`;
  wrapText(ctx, 'Morning light is a sleep nutrient.', x + 42, y + 174, TILE_W - 84, 42, 2);

  ctx.fillStyle = MUTED;
  ctx.font = `500 17px ${BODY}`;
  wrapText(
    ctx,
    'Ten to twenty minutes of outdoor light helps set the rhythm your appetite, focus, and recovery follow all day.',
    x + 44, y + 264, TILE_W - 88, 27, 4,
  );

  ctx.fillStyle = 'rgba(46,42,38,0.38)';
  ctx.font = `700 12px ${BODY}`;
  spacedCaps(ctx, 'Light and circadian rhythms · 4 days ago', x + 44, y + TILE_H - 44, 1.5);
}

function drawAction(ctx, x, y) {
  cardBase(ctx, x, y, 'Best next action', '05', { top: '#dcd3c8', bottom: MUSHROOM });

  ctx.fillStyle = INK;
  ctx.font = `italic 500 42px ${DISPLAY}`;
  wrapText(ctx, demoState.action.food, x + 40, y + 124, TILE_W - 80, 48, 2);

  ctx.fillStyle = MUTED;
  ctx.font = `500 18px ${BODY}`;
  wrapText(ctx, demoState.action.why, x + 42, y + 230, TILE_W - 84, 28, 3);

  ctx.strokeStyle = 'rgba(143,154,130,0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 76, y + 330);
  ctx.bezierCurveTo(x + 188, y + 296, x + 284, y + 356, x + 396, y + 326);
  ctx.stroke();
  drawNode(ctx, x + 76, y + 330, 'Vitamin D', true);
  drawNode(ctx, x + 286, y + 348, 'Omega-3');
  drawNode(ctx, x + 444, y + 320, 'Recipe');

  ctx.fillStyle = INK;
  ctx.font = `800 18px ${BODY}`;
  wrapText(ctx, demoState.action.impact, x + 40, y + 396, TILE_W - 80, 25, 2);
}

function drawRecipes(ctx, x, y) {
  cardBase(ctx, x, y, 'Recipes', '06', { top: '#d7cec4', bottom: '#c7baaa' });

  ctx.fillStyle = INK;
  ctx.font = `italic 500 34px ${DISPLAY}`;
  ctx.fillText('Make this week', x + 40, y + 104);

  recipes.slice(0, 3).forEach((recipe, i) => {
    const rowY = y + 168 + i * 78;
    ctx.fillStyle = INK;
    ctx.font = `700 20px ${BODY}`;
    ctx.fillText(recipe.name, x + 40, rowY);

    ctx.fillStyle = OLIVE;
    ctx.font = `700 13px ${BODY}`;
    spacedCaps(ctx, `${recipe.targets.join(' · ')} · ${recipe.time}`, x + 40, rowY + 25, 1);

    if (i < 2) {
      ctx.strokeStyle = 'rgba(46,42,38,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 40, rowY + 46);
      ctx.lineTo(x + TILE_W - 40, rowY + 46);
      ctx.stroke();
    }
  });

  ctx.fillStyle = MUTED_SOFT;
  ctx.font = `600 12px ${BODY}`;
  spacedCaps(ctx, 'Designed around your current gaps', x + 40, y + TILE_H - 42, 1.5);
}

export async function buildWellnessAtlas() {
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load('500 42px "Cormorant Garamond"'),
      document.fonts.load('italic 500 42px "Cormorant Garamond"'),
      document.fonts.load('700 118px Inter'),
      document.fonts.load('700 20px Inter'),
      document.fonts.load('500 18px Inter'),
    ]).catch(() => {});
    await document.fonts.ready;
  }

  const tiles = [
    { id: 'score', draw: drawScore },
    { id: 'nutrients', draw: drawNutrients },
    { id: 'wisdom', draw: drawWisdom },
    { id: 'podcast', draw: drawPodcast },
    { id: 'action', draw: drawAction },
    { id: 'recipes', draw: drawRecipes },
  ];

  const count = tiles.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_W;
  canvas.height = rows * TILE_H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const entries = [];
  tiles.forEach((tile, i) => {
    const cx = (i % cols) * TILE_W;
    const cy = Math.floor(i / cols) * TILE_H;
    tile.draw(ctx, cx, cy);
    entries.push({ id: tile.id, kind: 'info', tileIndex: i });
  });

  return { canvas, cols, rows, count, entries, tileAspect: TILE_W / TILE_H };
}
