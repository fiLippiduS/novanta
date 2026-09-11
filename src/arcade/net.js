/* La rete. Si deforma a onda dal punto colpito e oscilla smorzandosi:
   è il fotogramma che dice "gol" prima di qualunque scritta. */

export function createNet(goal, cols = 16, rows = 9) {
  const pts = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      pts.push({
        bx: goal.left + ((goal.right - goal.left) * c) / cols,
        by: goal.top + ((goal.bottom - goal.top) * r) / rows,
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    }
  }
  return { goal, cols, rows, pts, energy: 0 };
}

export function hitNet(net, x, y, power) {
  net.energy = 1;
  for (const p of net.pts) {
    const dx = p.bx - x, dy = p.by - y;
    const d = Math.hypot(dx, dy);
    const falloff = Math.exp(-(d * d) / (2 * 88 * 88));
    const push = falloff * (16 + power * 26);
    p.vx += (dx / (d || 1)) * push * 0.35;
    p.vy += (dy / (d || 1)) * push * 0.35 + push * 0.5;
  }
}

export function updateNet(net, dt) {
  const k = 0.016;          // richiamo elastico
  const damp = Math.pow(0.90, dt / 16.67);
  let e = 0;
  for (const p of net.pts) {
    p.vx = (p.vx - p.ox * k * dt) * damp;
    p.vy = (p.vy - p.oy * k * dt) * damp;
    p.ox += p.vx * dt * 0.06;
    p.oy += p.vy * dt * 0.06;
    e += Math.abs(p.ox) + Math.abs(p.oy);
  }
  net.energy = e / net.pts.length;
}

export function drawNet(ctx, net, color) {
  const { cols, rows, pts } = net;
  const at = (c, r) => pts[r * (cols + 1) + c];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const p = at(c, r);
      const x = p.bx + p.ox, y = p.by + p.oy;
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const p = at(c, r);
      const x = p.bx + p.ox, y = p.by + p.oy;
      r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
