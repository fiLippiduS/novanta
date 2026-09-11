/* Il tiro in tre gesti: mira, potenza, effetto.
   Il terzo gesto è quello che separa questo da un gioco di rigori qualunque:
   permette di battere un portiere che ha già letto la direzione. */

export const PHASE = {
  AIM: 'aim',
  POWER: 'power',
  CURVE: 'curve',
  FLIGHT: 'flight',
  DONE: 'done',
};

const CURVE_WINDOW = 720;   // ms per decidere l'effetto, poi parte dritto

/* onda triangolare 0..1: prevedibile, quindi imparabile */
function tri(t, period) {
  const k = (t % period) / period;
  return k < 0.5 ? k * 2 : 2 - k * 2;
}

export function createShot(goal, round) {
  return {
    phase: PHASE.AIM,
    t: 0,
    aimPeriod: Math.max(620, 1150 - round * 34),
    powerPeriod: Math.max(520, 980 - round * 30),
    curvePeriod: 620,
    aim: 0.5,
    power: 0.5,
    curveRaw: 0,
    tx: goal.left + (goal.right - goal.left) / 2,
    ty: goal.top + (goal.bottom - goal.top) / 2,
    curve: 0,
    tell: 0,
    flightMs: 700,
    flightT: 0,
    goal,
  };
}

export function updateShot(shot, dt) {
  shot.t += dt;
  const g = shot.goal;
  const halfW = (g.right - g.left) / 2;

  if (shot.phase === PHASE.AIM) {
    shot.aim = tri(shot.t, shot.aimPeriod);
    // si può mirare anche fuori dai pali: sbagliare deve essere possibile
    shot.tx = g.left - 52 + shot.aim * (halfW * 2 + 104);
  } else if (shot.phase === PHASE.POWER) {
    const v = tri(shot.t, shot.powerPeriod);
    shot.ty = (g.bottom + 4) + v * ((g.top - 58) - (g.bottom + 4));
    shot.power = 0.30 + v * 0.75;
  } else if (shot.phase === PHASE.CURVE) {
    shot.curveRaw = tri(shot.t, shot.curvePeriod) * 2 - 1;
    if (shot.t >= CURVE_WINDOW) lockCurve(shot, true);
  }
}

export function advance(shot) {
  if (shot.phase === PHASE.AIM) {
    shot.phase = PHASE.POWER;
    shot.t = 0;
    return PHASE.POWER;
  }
  if (shot.phase === PHASE.POWER) {
    shot.phase = PHASE.CURVE;
    shot.t = 0;
    return PHASE.CURVE;
  }
  if (shot.phase === PHASE.CURVE) {
    lockCurve(shot, false);
    return PHASE.FLIGHT;
  }
  return shot.phase;
}

function lockCurve(shot, timedOut) {
  // l'effetto costa un po' di precisione: la palla parte leggermente
  // fuori bersaglio e ci rientra curvando
  shot.curve = timedOut ? 0 : shot.curveRaw * 86;
  shot.tx += shot.curve * 0.16;

  // quanto è leggibile il tiro: piano e dritto è un regalo al portiere
  shot.tell = Math.min(1, (1 - shot.power) * 0.6 + (timedOut ? 0.4 : 0));

  shot.flightMs = 900 - shot.power * 400;
  shot.phase = PHASE.FLIGHT;
  shot.t = 0;
  shot.flightT = 0;
}

/** posizione della palla lungo il volo, con la deriva dell'effetto */
export function ballAt(shot, k, origin) {
  const e = k;
  const bend = Math.sin(Math.PI * e) * shot.curve;
  return {
    x: origin.x + (shot.tx - origin.x) * e + bend,
    y: origin.y + (shot.ty - origin.y) * e - Math.sin(Math.PI * e) * 22,
    scale: 1 - e * 0.42,
  };
}

/** dove il portiere crede che finisca, guardando la palla a metà volo */
export function apparentTarget(shot, origin) {
  const half = ballAt(shot, 0.5, origin);
  const dx = half.x - origin.x;
  return { x: origin.x + dx * 2, y: shot.ty };
}
