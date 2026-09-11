/* Il portiere.
   Non è uno sprite e non è più un pupazzo rigido: è uno scheletro con bacino,
   busto, testa e quattro arti a due segmenti. Le braccia e le gambe vengono
   piegate con la cinematica inversa, cioè si decide dove finisce la mano e il
   gomito si sistema di conseguenza. È la differenza fra un pupazzo che ruota
   e un portiere che ci arriva.

   Tre cose lo rendono vivo più di ogni altra:
   - da fermo non è mai fermo, sposta il peso da un piede all'altro;
   - prima di tuffarsi carica nella direzione opposta, come fanno tutti;
   - la testa segue la palla, anche quando ormai è dentro. */

const HISTORY = 16;

/* proporzioni, in unità locali: il bacino è l'origine */
/* Proporzioni prese da un corpo vero: otto teste di altezza, spalle più larghe
   dei fianchi, gambe circa metà della statura. Il pupazzo di prima aveva la
   testa troppo grande e le spalle strette, ed è per quello che sembrava storto. */
const P = {
  chest: -30,
  neck: -44,
  headR: 9.5,
  shoulderX: 16,
  shoulderY: -34,
  upperArm: 20,
  foreArm: 20,
  hipX: 8.5,
  hipY: 2,
  /* Coscia e stinco stanno appena sopra la distanza anca-piede in piedi:
     così da fermo la gamba è quasi tesa e il ginocchio accenna soltanto.
     Con ossa più lunghe la cinematica inversa doveva piegare tanto, e le
     ginocchia finivano incrociate. */
  thigh: 23,
  shin: 23,
};

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k;

export function createRig({ x, y, scale = 1 }) {
  return {
    x, y, scale,
    baseX: x, baseY: y,
    rot: 0,
    state: 'idle',
    t: 0,
    dir: 0,
    reach: 0,
    crouch: 0,
    /* dove vogliono arrivare le mani, in coordinate locali */
    hands: { l: { x: -24, y: 12 }, r: { x: 24, y: 12 } },
    feet: { l: { x: -11, y: 44 }, r: { x: 11, y: 44 } },
    look: null,
    lookOff: { x: 0, y: 0 },
    history: [],
    sway: Math.random() * Math.PI * 2,
    step: 0,
  };
}

export function setState(rig, state) {
  if (rig.state === state) return;
  rig.state = state;
  rig.t = 0;
}

/** la scena dice al portiere dove sta la palla: la testa la segue */
export function lookAt(rig, x, y) {
  rig.look = (x === null) ? null : { x, y };
}

/* ---------- cinematica inversa a due segmenti ---------- */
/* dato il punto di attacco e quello di arrivo, trova il gomito (o il ginocchio) */
function twoBone(rx, ry, tx, ty, l1, l2, bend) {
  const dx = tx - rx, dy = ty - ry;
  const raw = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.01;
  const min = Math.abs(l1 - l2) + 0.01;
  const d = clamp(raw, min, max);
  const a = Math.atan2(dy, dx);
  const cos = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const j = a + bend * Math.acos(cos);
  return {
    jx: rx + Math.cos(j) * l1,
    jy: ry + Math.sin(j) * l1,
    ex: rx + Math.cos(a) * d,
    ey: ry + Math.sin(a) * d,
  };
}

/* ---------- le pose ---------- */

function poseIdle(rig, dt) {
  rig.sway += dt * 0.0028;
  rig.step += dt * 0.0014;

  /* In attesa il portiere sta DRITTO: busto in asse, braccia tese e aperte,
     gambe quasi rigide sotto i fianchi. Si muove appena, e si muove tutto
     insieme. Le pieghe servono nel tuffo, non qui. */
  const shift = Math.sin(rig.step) * 4;
  const bob = Math.abs(Math.sin(rig.step * 2)) * 1.8;
  const breathe = Math.sin(rig.sway * 1.5) * 1.2;

  rig.x = rig.baseX + shift;
  rig.y = rig.baseY + bob;
  rig.rot = 0;
  rig.crouch = 0.12;
  rig.reach = 0;

  /* Le mani stanno a braccia distese: l'apertura di un uomo è più o meno la
     sua altezza, e un portiere in attesa le tiene larghe. */
  const span = P.upperArm + P.foreArm;
  const ang = 0.58 + breathe * 0.01;           // circa 33 gradi sotto l'orizzontale
  const hx = P.shoulderX + Math.cos(ang) * span;
  const hy = P.shoulderY + Math.sin(ang) * span;
  rig.hands.l = { x: -hx, y: hy + breathe };
  rig.hands.r = { x: hx, y: hy - breathe };

  // piedi sotto i fianchi: gambe dritte, nessuna posa da accovacciato
  rig.feet.l = { x: -10 - shift * 0.5, y: 46 - bob };
  rig.feet.r = { x: 10 - shift * 0.5, y: 46 - bob };
}

function poseLoad(rig) {
  const k = easeOut(Math.min(1, rig.t / 200));
  rig.crouch = lerp(0.12, 0.5, k);
  rig.y = rig.baseY + 9 * k;
  rig.rot = 0;
  rig.reach = 0.2 * k;

  // si abbassa un poco e porta le mani avanti, senza perdere l'asse
  const span = P.upperArm + P.foreArm;
  const ang = lerp(0.58, 0.34, k);
  const hx = P.shoulderX + Math.cos(ang) * span;
  const hy = P.shoulderY + Math.sin(ang) * span;
  rig.hands.l = { x: -hx, y: hy };
  rig.hands.r = { x: hx, y: hy };
  rig.feet.l = { x: -13, y: lerp(46, 44, k) };
  rig.feet.r = { x: 13, y: lerp(46, 44, k) };
}

function poseDive(rig) {
  const k = Math.min(1, rig.t / rig.diveMs);

  /* Prima di partire si carica dalla parte opposta. Dura un attimo, ma è
     quello che fa sembrare il tuffo una spinta invece di una traslazione. */
  const ANTICIPATION = 0.16;
  let travel;
  if (k < ANTICIPATION) {
    travel = -0.12 * easeIn(k / ANTICIPATION);
  } else {
    const kk = (k - ANTICIPATION) / (1 - ANTICIPATION);
    travel = easeOut(kk);
  }

  const fromX = rig.diveFrom.x, fromY = rig.diveFrom.y;
  rig.x = fromX + (rig.diveTo.x - fromX) * travel;
  rig.y = fromY + (rig.diveTo.y - fromY) * travel - Math.sin(Math.PI * Math.max(0, travel)) * 30 * rig.scale;

  rig.rot = rig.dir * 1.15 * travel;
  rig.crouch = lerp(0.85, 0.05, clamp(travel * 1.4, 0, 1));
  rig.reach = clamp(travel * 1.5, 0, 1);

  const d = rig.dir || 1;
  const ext = clamp(travel * 1.25, 0, 1);

  /* Il braccio che guida punta alla palla, l'altro resta più raccolto:
     un portiere non si tuffa con le braccia parallele. */
  const lead = { x: d * (30 + 42 * ext), y: -8 - 26 * ext };
  const trail = { x: -d * (14 + 10 * ext), y: 6 - 10 * ext };
  rig.hands.l = d < 0 ? lead : trail;
  rig.hands.r = d < 0 ? trail : lead;

  // gamba d'appoggio distesa all'indietro, l'altra raccolta
  const push = { x: -d * (20 + 24 * ext), y: 40 - 18 * ext };
  const tuck = { x: d * (6 + 12 * ext), y: 34 - 22 * ext };
  rig.feet.l = d < 0 ? tuck : push;
  rig.feet.r = d < 0 ? push : tuck;
}

function poseSave(rig, dt) {
  const k = Math.min(1, rig.t / 320);
  // le braccia si chiudono sulla palla e il corpo si raccoglie attorno
  rig.reach = lerp(1, 0.72, k);
  rig.crouch = lerp(0.05, 0.5, k);
  rig.rot += (rig.dir * 1.35 - rig.rot) * 0.10;
  rig.y += (rig.diveTo.y + 26 * rig.scale - rig.y) * 0.10;

  const d = rig.dir || 1;
  const grab = { x: d * (34 - 8 * k), y: -6 + 10 * k };
  rig.hands.l = d < 0 ? grab : { x: -d * 12, y: 8 };
  rig.hands.r = d < 0 ? { x: -d * 12, y: 8 } : grab;
  rig.feet.l = { x: -d * 22, y: 34 };
  rig.feet.r = { x: d * 10, y: 26 };
}

function poseBeaten(rig, dt) {
  // atterra e resta giù, il corpo cede
  rig.reach = Math.max(0.25, rig.reach - dt * 0.0011);
  rig.crouch = lerp(rig.crouch, 0.35, 0.05);
  rig.y += (rig.diveTo.y + 32 * rig.scale - rig.y) * 0.07;
  rig.rot += (rig.dir * 1.5 - rig.rot) * 0.06;

  const d = rig.dir || 1;
  rig.hands.l = { x: d < 0 ? -42 : -16, y: 14 };
  rig.hands.r = { x: d < 0 ? 16 : 42, y: 14 };
  rig.feet.l = { x: -d * 26, y: 30 };
  rig.feet.r = { x: d * 8, y: 22 };
}

function poseCelebrate(rig, dt) {
  rig.sway += dt * 0.010;
  const jump = Math.abs(Math.sin(rig.t * 0.011));
  rig.x = rig.baseX;
  rig.y = rig.baseY - jump * 26 * rig.scale;
  rig.rot = Math.sin(rig.t * 0.018) * 0.14;
  rig.crouch = 0.1 + (1 - jump) * 0.3;
  rig.reach = 1;
  rig.hands.l = { x: -30 - jump * 6, y: -34 - jump * 10 };
  rig.hands.r = { x: 30 + jump * 6, y: -34 - jump * 10 };
  rig.feet.l = { x: -12, y: 42 - jump * 8 };
  rig.feet.r = { x: 12, y: 42 - jump * 8 };
}

export function updateRig(rig, dt) {
  rig.t += dt;
  rig.history.push({ x: rig.x, y: rig.y, rot: rig.rot });
  if (rig.history.length > HISTORY) rig.history.shift();

  switch (rig.state) {
    case 'idle': poseIdle(rig, dt); break;
    case 'load': poseLoad(rig); break;
    case 'dive': poseDive(rig); break;
    case 'save': poseSave(rig, dt); break;
    case 'beaten': poseBeaten(rig, dt); break;
    case 'celebrate': poseCelebrate(rig, dt); break;
    default: break;
  }

  /* La testa segue la palla. Poco, pochissimo, ma si vede: è il dettaglio
     che dà l'impressione che ci sia qualcuno lì dentro. */
  let tx = 0, ty = 0;
  if (rig.look) {
    const dx = rig.look.x - rig.x;
    const dy = rig.look.y - (rig.y - 40 * rig.scale);
    const d = Math.hypot(dx, dy) || 1;
    tx = (dx / d) * 4.5;
    ty = (dy / d) * 3.5;
  }
  rig.lookOff.x += (tx - rig.lookOff.x) * 0.12;
  rig.lookOff.y += (ty - rig.lookOff.y) * 0.12;
}

/* Le mani vere, in coordinate del campo: è su queste che si decide la parata,
   quindi quello che si vede è esattamente quello che para. */
export function handPositions(rig) {
  const c = Math.cos(rig.rot), s = Math.sin(rig.rot);
  const k = rig.scale;
  return [rig.hands.l, rig.hands.r].map((h) => ({
    x: rig.x + (h.x * c - h.y * s) * k,
    y: rig.y + (h.x * s + h.y * c) * k,
  }));
}

/* ---------- disegno ---------- */

function limb(ctx, ax, ay, bx, by, cx, cy, w1, w2, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.lineWidth = w2;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.stroke();
}

export function drawRig(ctx, rig, colors) {
  const { kit, skin, gloves } = colors;
  const shorts = colors.shorts || '#22314F';

  ctx.save();
  ctx.translate(rig.x, rig.y);

  // ombra a terra, non ruota con il corpo
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 46 * rig.scale, 30 * rig.scale, 7 * rig.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.rotate(rig.rot);
  ctx.scale(rig.scale, rig.scale);

  // il busto si accorcia quando le ginocchia si piegano
  const chestY = P.chest + rig.crouch * 6;
  const neckY = P.neck + rig.crouch * 7;
  const shoulderY = P.shoulderY + rig.crouch * 6;

  /* Gambe in due colori, coscia e calzettone: tutte dello stesso tono scuro
     sparivano contro il prato e il portiere sembrava seduto. */
  const socks = colors.socks || kit;
  for (const [side, foot] of [[-1, rig.feet.l], [1, rig.feet.r]]) {
    const hx = side * P.hipX;
    const hy = P.hipY + rig.crouch * 4;
    /* Il ginocchio va piegato verso l'interno, come in un corpo vero: con il
       segno opposto le gambe si aprivano a compasso e il portiere sembrava
       accovacciato invece che in piedi. */
    const { jx, jy, ex, ey } = twoBone(hx, hy, foot.x, foot.y, P.thigh, P.shin, side > 0 ? 1 : -1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = shorts;
    ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(jx, jy); ctx.stroke();
    ctx.strokeStyle = socks;
    ctx.lineWidth = 9.5;
    ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#14181F';
    ctx.beginPath();
    ctx.ellipse(ex + side * 3, ey + 2, 7.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // busto: spalle larghe che si stringono in vita, con un accenno di collo
  ctx.fillStyle = kit;
  ctx.beginPath();
  ctx.moveTo(-P.shoulderX - 2, chestY + 2);
  ctx.quadraticCurveTo(-P.shoulderX - 3, chestY - 5, -8, chestY - 7);
  ctx.lineTo(8, chestY - 7);
  ctx.quadraticCurveTo(P.shoulderX + 3, chestY - 5, P.shoulderX + 2, chestY + 2);
  ctx.lineTo(P.hipX + 2, P.hipY + 5);
  ctx.lineTo(-P.hipX - 2, P.hipY + 5);
  ctx.closePath();
  ctx.fill();

  // pantaloncini: separano il busto dalle gambe e danno una vita
  ctx.fillStyle = shorts;
  ctx.beginPath();
  ctx.moveTo(-P.hipX - 3, P.hipY - 4);
  ctx.lineTo(P.hipX + 3, P.hipY - 4);
  ctx.lineTo(P.hipX + 2, P.hipY + 9);
  ctx.lineTo(-P.hipX - 2, P.hipY + 9);
  ctx.closePath();
  ctx.fill();

  // braccia: il gomito si piega da solo verso il punto in cui va la mano
  for (const [side, hand] of [[-1, rig.hands.l], [1, rig.hands.r]]) {
    const sx = side * P.shoulderX;
    const sy = shoulderY;
    const { jx, jy, ex, ey } = twoBone(sx, sy, hand.x, hand.y, P.upperArm, P.foreArm, side > 0 ? 1 : -1);
    limb(ctx, sx, sy, jx, jy, ex, ey, 10, 8, kit);
    // guanto
    ctx.fillStyle = gloves;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 8, 6.6, Math.atan2(ey - jy, ex - jx), 0, Math.PI * 2);
    ctx.fill();
  }

  // collo e testa, con lo scarto dello sguardo
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, chestY);
  ctx.lineTo(rig.lookOff.x * 0.5, neckY + 4);
  ctx.stroke();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(rig.lookOff.x, neckY - 2 + rig.lookOff.y, P.headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
