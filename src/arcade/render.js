/* Disegno della scena. Stessa lingua visiva del resto del gioco:
   gesso, riflettori, niente fotorealismo. */

import { drawNet } from './net.js';
import { PHASE } from './shot.js';

export const VW = 1000;
/* Una porta è alta 2,44 metri e un portiere circa 1,90: in piedi sulla linea
   arriva quasi ai tre quarti della traversa. Con la scala di prima ne copriva
   meno della metà, e per questo sembrava un pupazzetto lontano. */
export const KEEPER_SCALE = 2.05;

/* La porta resta larga 670 unità su 1000: occupa sempre due terzi della
   larghezza, che sia uno schermo da telefono in verticale o un monitor.
   L'altezza dello spazio virtuale invece segue la forma del riquadro,
   così su mobile si guadagna campo davanti al dischetto invece di
   rimpicciolire tutto. */
const GOAL_W = 670;
const GOAL_H = 308;

export const L = {
  VH: 620,
  GOAL: { left: 165, right: 835, top: 110, bottom: 418 },
  SPOT: { x: 500, y: 566 },
  crowdH: 88,
};

export function layoutFor(vh) {
  const top = Math.max(72, Math.min(vh * 0.13, 150));
  return {
    VH: vh,
    GOAL: { left: (VW - GOAL_W) / 2, right: (VW + GOAL_W) / 2, top, bottom: top + GOAL_H },
    SPOT: { x: VW / 2, y: vh - 54 },
    // la tribuna è una fascia, non mezzo schermo
    crowdH: Math.max(38, Math.min(top - 20, 96)),
  };
}

const C = {
  grass: '#0E2A1E',

  chalk: 'rgba(237,232,218,0.72)',
  chalkFaint: 'rgba(237,232,218,0.18)',
  post: '#EDE8DA',
  net: 'rgba(237,232,218,0.55)',
  ball: '#F4F1E8',
  lime: '#C9F24B',
  amber: '#FFB020',
  flare: '#FF5A3C',
};

export function fitCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  // l'altezza virtuale segue la forma reale del riquadro
  const vh = Math.round(Math.max(520, Math.min(1500, VW * (canvas.height / canvas.width))));
  Object.assign(L, layoutFor(vh));

  const ctx = canvas.getContext('2d');
  const scale = canvas.width / VW;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

export function drawPitch(ctx, tension = 0) {
  const { VH, GOAL, SPOT, crowdH } = L;
  // prato
  const g = ctx.createLinearGradient(0, 120, 0, VH);
  g.addColorStop(0, '#0B2418');
  g.addColorStop(1, '#071A11');
  ctx.fillStyle = g;
  ctx.fillRect(0, crowdH, VW, VH - crowdH);

  // fasce del taglio d'erba, in prospettiva
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 14; i++) {
    if (i % 2) continue;
    const y0 = crowdH + i * 42;
    if (y0 > VH) break;
    ctx.fillStyle = 'rgba(255,255,255,0.022)';
    ctx.fillRect(0, y0, VW, 42);
  }
  ctx.restore();

  // riflettori
  const fl = ctx.createRadialGradient(VW / 2, 40, 20, VW / 2, VH * 0.42, VH);
  fl.addColorStop(0, `rgba(255,246,222,${0.13 + tension * 0.05})`);
  fl.addColorStop(1, 'rgba(255,246,222,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(0, 0, VW, VH);

  // linee di gesso: area, dischetto, arco
  ctx.strokeStyle = C.chalkFaint;
  ctx.lineWidth = 2.5;
  const boxY = GOAL.bottom + (VH - GOAL.bottom) * 0.42;
  ctx.beginPath();
  ctx.moveTo(40, VH - 60); ctx.lineTo(78, GOAL.bottom - 88);
  ctx.lineTo(922, GOAL.bottom - 88); ctx.lineTo(960, VH - 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(232, GOAL.bottom); ctx.lineTo(246, GOAL.bottom - 132);
  ctx.lineTo(754, GOAL.bottom - 132); ctx.lineTo(768, GOAL.bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(SPOT.x, boxY, 165, Math.PI * 0.10, Math.PI * 0.90);
  ctx.stroke();

  ctx.fillStyle = C.chalk;
  ctx.beginPath();
  ctx.ellipse(SPOT.x, SPOT.y - 6, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrowd(ctx, t) {
  const { crowdH } = L;
  ctx.save();
  ctx.fillStyle = '#060A12';
  ctx.fillRect(0, 0, VW, crowdH);
  // puntini di folla che respirano
  const dots = Math.round(crowdH * 2.6);
  for (let i = 0; i < dots; i++) {
    const x = (i * 97) % VW;
    const y = 6 + ((i * 53) % Math.max(12, crowdH - 12));
    const a = 0.05 + 0.05 * Math.sin(t * 0.0012 + i);
    ctx.fillStyle = `rgba(237,232,218,${a})`;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
}

export function drawGoal(ctx, net) {
  const { GOAL } = L;
  drawNet(ctx, net, C.net);

  ctx.save();
  ctx.strokeStyle = C.post;
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.shadowColor = 'rgba(255,246,222,0.35)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(GOAL.left, GOAL.bottom);
  ctx.lineTo(GOAL.left, GOAL.top);
  ctx.lineTo(GOAL.right, GOAL.top);
  ctx.lineTo(GOAL.right, GOAL.bottom);
  ctx.stroke();
  ctx.restore();
}

export function drawBall(ctx, pos, trail) {
  ctx.save();
  // scia
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const a = (i / trail.length) * 0.35;
    ctx.fillStyle = `rgba(244,241,232,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17 * p.scale * (0.4 + a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const r = 17 * pos.scale;
  ctx.fillStyle = C.ball;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // pentagoni sommari, ruotano con il volo
  ctx.strokeStyle = 'rgba(10,14,24,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.beginPath();
  ctx.arc(pos.x - r * 0.2, pos.y - r * 0.15, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ---- indicatori dei tre gesti ---- */

export function drawAim(ctx, shot) {
  const { GOAL, SPOT } = L;
  const x = shot.tx;
  ctx.save();
  ctx.strokeStyle = C.lime;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(x, GOAL.top - 26);
  ctx.lineTo(x, SPOT.y - 26);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.lime;
  ctx.beginPath();
  ctx.moveTo(x, GOAL.top - 18);
  ctx.lineTo(x - 9, GOAL.top - 34);
  ctx.lineTo(x + 9, GOAL.top - 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPower(ctx, shot) {
  const { GOAL } = L;
  const x = shot.tx;
  const y = shot.ty;
  const overBar = y < GOAL.top;
  const col = overBar ? C.flare : shot.power > 0.76 ? C.amber : C.lime;

  ctx.save();
  // colonna della potenza
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = col;
  ctx.fillRect(x - 18, y, 36, GOAL.bottom + 6 - y);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 26, y);
  ctx.lineTo(x + 26, y);
  ctx.stroke();

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCurve(ctx, shot) {
  const { SPOT } = L;
  const x = shot.tx, y = shot.ty;
  const c = shot.curveRaw;
  ctx.save();
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(SPOT.x, SPOT.y - 16);
  ctx.quadraticCurveTo(
    (SPOT.x + x) / 2 + c * 130,
    (SPOT.y + y) / 2,
    x, y,
  );
  ctx.stroke();
  ctx.restore();
}

export function drawFairHint(ctx, alpha) {
  const { GOAL } = L;
  // gli angoli che non si possono parare: mostrati, non nascosti
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = C.lime;
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 2;
  const w = (GOAL.right - GOAL.left) / 3;
  const h = (GOAL.bottom - GOAL.top) / 3;
  [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(([c, r]) => {
    ctx.strokeRect(GOAL.left + c * w + 4, GOAL.top + r * h + 4, w - 8, h - 8);
  });
  ctx.restore();
}

export { C as COLORS };
