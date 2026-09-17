/* ALLENATORE — la partita.

   Novanta minuti (più recupero) simulati uno per uno, undici contro undici.
   Ogni minuto una squadra ha il pallone; se lo porta avanti può nascere
   un'azione (centrale, sulle fasce, lancio lungo, ripartenza, palla da
   fermo) e l'azione finisce con un tiro, un contrasto, un fallo o un corner.
   Chi tira, chi passa, chi contrasta, chi para sono giocatori veri con le
   loro doti, il loro fiato e il loro umore: per questo un cambio al 60' o una
   mentalità diversa si vedono nei minuti successivi.

   Niente DOM. La partita è un oggetto con stato serializzabile: la si può
   clonare per chiedere al vice "cosa succede se…" e la si può rigiocare
   identica dal seme e dalle scelte fatte. */

import { mulberry32 } from '../core/rng.js';
import { FORMATIONS, STYLES, MENTALITIES, matchup, styleFit } from './tactics.js';
import { roleFit, readiness } from './players.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* taratura: toccare qui e rilanciare test/allenatore.test.mjs          */
/* ------------------------------------------------------------------ */

export const TUNE = {
  attackRate: 0.86,       // azioni per minuto di possesso (prima di stile e mentalità)
  shotRate: 0.2,         // quota di azioni che arrivano al tiro a parità di forze
  ratioPower: 1.75,        // quanto contano le differenze fra reparti
  possessionPower: 2.2,
  foulRate: 0.27,
  yellowPerFoul: 0.15,
  redPerFoul: 0.0008,
  cornerRate: 0.1,
  counterRate: 0.075,
  penaltyPerFoul: 0.0105,
  homeBoost: 1.065,
  injuryPerMinute: 0.00011,
  fatiguePerMinute: 0.27,
  xg: { central: 0.12, wide: 0.095, direct: 0.085, counter: 0.21, long: 0.032, corner: 0.075, freekick: 0.065, penalty: 0.77 },
};

/* ------------------------------------------------------------------ */
/* preparazione                                                         */
/* ------------------------------------------------------------------ */

/**
 * team: { id, name, players: [giocatori], lineup: [11 id nell'ordine del modulo],
 *         bench: [id], formation, style, mentality, familiarity, morale,
 *         penaltyId, freeKickId, captainId, ai }
 */
function makeSide(key, team) {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const slots = FORMATIONS[team.formation];
  const onPitch = team.lineup.map((id, i) => ({ id, slot: i }));
  const bench = team.bench.filter((id) => byId.has(id) && !team.lineup.includes(id));
  return {
    key,
    team,
    byId,
    formation: team.formation,
    slots: slots.map((s) => ({ ...s })),
    onPitch,
    bench,
    style: team.style,
    mentality: team.mentality || 'equilibrata',
    subsLeft: 5,
    windowsLeft: 3,
    lastSubMinute: -1,
    sentOff: [],
    injured: [],
    goals: 0,
    momentum: 0,
    mods: [],
    stats: { shots: 0, onTarget: 0, xg: 0, possession: 0, corners: 0, fouls: 0, yellows: 0, reds: 0, saves: 0, offsides: 0, bigChances: 0 },
  };
}

export function createMatch({ seed, home, away, user = null, neutral = false, knockout = false, derby = false, stakes = 1 }) {
  const state = {
    seed,
    draws: 0,
    minute: 0,
    period: 1,             // 1 primo tempo · 2 secondo · 3 e 4 supplementari · 5 rigori · 6 finita
    added: [0, 0, 0, 0],
    user,
    neutral,
    knockout,
    derby,
    stakes,
    sides: [makeSide('home', home), makeSide('away', away)],
    events: [],
    pstats: {},
    pending: null,
    decisionsTaken: [],
    momentsSeen: [],
    lastMomentMinute: -99,
    finished: false,
    shootout: null,
  };
  for (const s of state.sides) {
    for (const o of s.onPitch) statOf(state, o.id).start = 0;
  }
  return state;
}

function statOf(state, id) {
  if (!state.pstats[id]) {
    state.pstats[id] = {
      start: null, end: null, goals: 0, assists: 0, shots: 0, onTarget: 0, keyPasses: 0, tackles: 0, interceptions: 0,
      recoveries: 0, aerials: 0, saves: 0, conceded: 0, penSaved: 0, errors: 0, yellow: 0, red: 0, fouls: 0, injured: false,
      ownGoals: 0, penMissed: 0, blocks: 0, dribbles: 0,
    };
  }
  return state.pstats[id];
}

/* il generatore si ricrea dal seme e dal numero di estrazioni fatte:
   lo stato resta un oggetto semplice, clonabile */
function rng(state) {
  if (!state._r || state._rSeed !== state.seed) {
    Object.defineProperty(state, '_r', { value: mulberry32(state.seed), writable: true, enumerable: false, configurable: true });
    Object.defineProperty(state, '_rSeed', { value: state.seed, writable: true, enumerable: false, configurable: true });
    for (let i = 0; i < state.draws; i++) state._r();
  }
  return () => { state.draws++; return state._r(); };
}

/* ------------------------------------------------------------------ */
/* reparti                                                              */
/* ------------------------------------------------------------------ */

const P = (side, id) => side.byId.get(id);

function eff(side, o, k) {
  const p = P(side, o.id);
  const fit = roleFit(p.role, side.slots[o.slot].role, p.extra);
  const tired = p.fitness >= 70 ? 1 : 0.72 + p.fitness * 0.004;
  return (p.attrs[k] ?? 40) * readiness(p) * (k === 'reflexes' || k === 'handling' ? 1 : tired) * (0.55 + 0.45 * fit);
}

const UNIT_W = {
  defence: {
    DC: { marking: 0.3, tackling: 0.25, positioning: 0.25, heading: 0.1, strength: 0.1, _w: 1 },
    TZ: { tackling: 0.3, marking: 0.3, pace: 0.2, positioning: 0.2, _w: 0.75 },
    MED: { tackling: 0.45, positioning: 0.4, strength: 0.15, _w: 0.6 },
    CC: { tackling: 0.5, positioning: 0.3, stamina: 0.2, _w: 0.25 },
  },
  control: {
    MED: { passing: 0.35, positioning: 0.25, vision: 0.2, composure: 0.2, _w: 1 },
    CC: { passing: 0.35, vision: 0.25, technique: 0.2, stamina: 0.2, _w: 1 },
    TRQ: { vision: 0.35, technique: 0.35, passing: 0.3, _w: 0.85 },
    DC: { passing: 0.6, composure: 0.4, _w: 0.25 },
    TZ: { passing: 0.5, stamina: 0.5, _w: 0.35 },
    ALA: { technique: 0.5, dribbling: 0.5, _w: 0.35 },
    PUN: { technique: 0.6, strength: 0.4, _w: 0.2 },
    POR: { distribution: 1, _w: 0.2 },
  },
  wide: {
    ALA: { dribbling: 0.35, pace: 0.3, crossing: 0.35, _w: 1 },
    TZ: { crossing: 0.4, pace: 0.3, stamina: 0.3, _w: 0.65 },
    PUN: { heading: 0.6, positioning: 0.4, _w: 0.5 },
    CC: { crossing: 0.5, passing: 0.5, _w: 0.2 },
  },
  central: {
    TRQ: { vision: 0.35, technique: 0.35, dribbling: 0.3, _w: 1 },
    CC: { vision: 0.35, passing: 0.35, longshots: 0.3, _w: 0.6 },
    PUN: { positioning: 0.4, technique: 0.3, finishing: 0.3, _w: 0.9 },
    ALA: { dribbling: 0.5, finishing: 0.5, _w: 0.45 },
    MED: { passing: 0.6, vision: 0.4, _w: 0.2 },
  },
  direct: {
    PUN: { strength: 0.4, heading: 0.35, pace: 0.25, _w: 1 },
    DC: { passing: 1, _w: 0.3 },
    ALA: { pace: 1, _w: 0.5 },
    POR: { distribution: 1, _w: 0.3 },
  },
  counter: {
    ALA: { pace: 0.6, dribbling: 0.4, _w: 1 },
    PUN: { pace: 0.5, finishing: 0.5, _w: 1 },
    TRQ: { vision: 0.5, pace: 0.5, _w: 0.6 },
    TZ: { pace: 1, _w: 0.3 },
  },
  aerial: {
    DC: { heading: 0.7, strength: 0.3, _w: 1 },
    PUN: { heading: 0.7, strength: 0.3, _w: 1 },
    MED: { heading: 0.6, strength: 0.4, _w: 0.4 },
    TZ: { heading: 1, _w: 0.2 },
    CC: { heading: 1, _w: 0.2 },
  },
};

function unit(side, name) {
  const table = UNIT_W[name];
  let sum = 0; let wsum = 0;
  for (const o of side.onPitch) {
    const role = side.slots[o.slot].role;
    const w = table[role];
    if (!w) continue;
    let v = 0;
    for (const k in w) if (k !== '_w') v += eff(side, o, k) * w[k];
    sum += v * w._w;
    wsum += w._w;
  }
  /* un reparto svuotato (espulsioni, moduli strani) non vale zero ma poco */
  return wsum ? sum / wsum * Math.min(1, wsum / { defence: 3.2, control: 3.4, wide: 2.2, central: 2, direct: 1.6, counter: 2, aerial: 2.4 }[name]) ** 0.6 : 30;
}

function keeperOf(side) {
  const o = side.onPitch.find((x) => side.slots[x.slot].role === 'POR') || side.onPitch[0];
  return o;
}

function keeperRating(side) {
  const o = keeperOf(side);
  const p = P(side, o.id);
  if (p.role !== 'POR') return 35; // un giocatore di movimento in porta
  return eff(side, o, 'reflexes') * 0.42 + eff(side, o, 'handling') * 0.23 + eff(side, o, 'positioning') * 0.35;
}

function modValue(side, key, minute) {
  let m = 1;
  for (const x of side.mods) if (x.key === key && (x.until == null || minute <= x.until)) m *= x.value;
  return m;
}

/** i numeri di una squadra in questo minuto */
function teamNumbers(state, side, other) {
  const st = STYLES[side.style];
  const men = MENTALITIES[side.mentality];
  const players = side.onPitch.map((o) => P(side, o.id));
  const fit = styleFit(players, side.style, side.formation, side.team.familiarity?.[side.style] || 0);
  const vs = matchup(side.style, other.style);
  const home = !state.neutral && side.key === 'home' ? TUNE.homeBoost * (state.derby ? 1.01 : 1) : 1;
  const down = side.sentOff.length;
  const morale = 0.97 + ((side.team.morale ?? 60) - 60) * 0.0009;
  const mom = 1 + clamp(side.momentum, -1, 1) * 0.035;
  const base = fit * vs * home * morale * mom;
  const m = (k) => modValue(side, k, state.minute);
  return {
    st, men,
    control: unit(side, 'control') * base * Math.pow(0.9, down) * m('control'),
    defence: unit(side, 'defence') * base * Math.pow(0.88, down) * m('defence') * men.defence ** 0.35,
    wide: unit(side, 'wide') * base * Math.pow(0.92, down) * m('attack') * m('wide'),
    central: unit(side, 'central') * base * Math.pow(0.92, down) * m('attack') * m('central'),
    direct: unit(side, 'direct') * base * Math.pow(0.94, down) * m('attack') * m('direct'),
    counter: unit(side, 'counter') * base * Math.pow(0.94, down) * m('counter'),
    aerial: unit(side, 'aerial') * base * m('aerial'),
    keeper: keeperRating(side) * m('keeper'),
    tempo: st.tempo * men.tempo * m('tempo'),
    attackMult: men.attack * m('attack'),
    block: st.block * men.defence ** 0.5 * m('block'),
    press: st.press * m('press'),
    line: st.line * (men.attack ** 0.5) * m('line'),
    risk: men.risk * m('risk'),
    discipline: m('discipline'),
  };
}

/* ------------------------------------------------------------------ */
/* scelta dei protagonisti                                              */
/* ------------------------------------------------------------------ */

function pick(rand, side, weights, exclude = null) {
  const c = [];
  let total = 0;
  for (const o of side.onPitch) {
    if (o.id === exclude) continue;
    const role = side.slots[o.slot].role;
    const w = weights(role, P(side, o.id), o);
    if (w > 0) { c.push([o, w]); total += w; }
  }
  if (!c.length) return side.onPitch[0];
  let r = rand() * total;
  for (const [o, w] of c) { r -= w; if (r <= 0) return o; }
  return c[c.length - 1][0];
}

const SHOOTER = {
  central: { PUN: 1, TRQ: 0.55, ALA: 0.55, CC: 0.3, MED: 0.08, DC: 0.03, TZ: 0.05 },
  wide: { PUN: 1, ALA: 0.35, TRQ: 0.3, CC: 0.22, DC: 0.1, TZ: 0.06, MED: 0.05 },
  direct: { PUN: 1, ALA: 0.5, TRQ: 0.3, CC: 0.15 },
  counter: { PUN: 1, ALA: 0.85, TRQ: 0.45, CC: 0.2, TZ: 0.08 },
  long: { CC: 1, TRQ: 0.9, MED: 0.6, ALA: 0.55, PUN: 0.35, TZ: 0.2, DC: 0.12 },
  corner: { DC: 1, PUN: 0.9, MED: 0.4, CC: 0.3, TZ: 0.2, ALA: 0.15, TRQ: 0.15 },
};
const ASSISTER = {
  central: { TRQ: 1, CC: 0.75, ALA: 0.5, MED: 0.35, PUN: 0.3, TZ: 0.15 },
  wide: { ALA: 1, TZ: 0.8, CC: 0.25, TRQ: 0.2 },
  direct: { DC: 0.5, MED: 0.5, CC: 0.4, POR: 0.3, PUN: 0.4, TZ: 0.2 },
  counter: { TRQ: 0.9, CC: 0.7, ALA: 0.7, PUN: 0.5, MED: 0.4, TZ: 0.3 },
};
const DEFENDER = { DC: 1, TZ: 0.7, MED: 0.8, CC: 0.4, TRQ: 0.12, ALA: 0.18, PUN: 0.06 };

function event(state, side, type, data = {}) {
  const e = { minute: state.minute, period: state.period, side: side ? side.key : null, type, ...data };
  state.events.push(e);
  return e;
}

/* ------------------------------------------------------------------ */
/* un tiro                                                              */
/* ------------------------------------------------------------------ */

function shot(state, rand, A, D, nA, nD, kind, { shooter = null, assister = null, fixedXg = null } = {}) {
  const o = shooter || pick(rand, A, (role, p) => (SHOOTER[kind]?.[role] || 0.05) * (0.6 + p.attrs.finishing / 120));
  const p = P(A, o.id);
  let xg = fixedXg ?? TUNE.xg[kind];
  if (fixedXg == null) {
    const quality = A.team && nA.st.quality;
    xg *= quality * (0.55 + 0.45 * rand() * 2) / clamp(nD.block, 0.5, 2) ** 0.8;
    if (kind === 'corner') xg *= clamp(nA.aerial / Math.max(30, nD.aerial), 0.6, 1.6) ** 1.2 * nA.st.setPiece;
    xg = clamp(xg, 0.01, 0.62);
  }
  const finishK = kind === 'corner' ? eff(A, o, 'heading') : kind === 'long' ? eff(A, o, 'longshots') : kind === 'wide' ? (eff(A, o, 'heading') + eff(A, o, 'finishing')) / 2 : eff(A, o, 'finishing');
  const composure = eff(A, o, 'composure');
  const finisher = clamp(0.56 + finishK / 200 + composure / 750, 0.55, 1.22);
  const keeper = clamp(1.28 - nD.keeper / 250, 0.8, 1.2);
  const goalP = clamp(xg * finisher * keeper, 0.005, 0.8);
  const onTargetP = clamp(0.17 + xg * 0.95 + finishK / 850, 0.18, 0.9);

  const ps = statOf(state, p.id);
  ps.shots++;
  A.stats.shots++;
  A.stats.xg += xg;
  if (xg >= 0.3) A.stats.bigChances++;
  const as = assister ? P(A, assister.id) : null;
  if (as) statOf(state, as.id).keyPasses++;

  const r = rand();
  if (r < goalP) {
    /* il gol può essere annullato: fuorigioco o fallo al VAR */
    if (kind !== 'penalty' && rand() < 0.045) {
      A.stats.onTarget++;
      event(state, A, 'disallowed', { player: p.id, kind });
      return 'disallowed';
    }
    A.goals++;
    A.stats.onTarget++;
    ps.goals++; ps.onTarget++;
    if (as) statOf(state, as.id).assists++;
    const k = keeperOf(D);
    statOf(state, k.id).conceded++;
    for (const d of D.onPitch) if (['DC', 'TZ'].includes(D.slots[d.slot].role)) statOf(state, d.id).conceded++;
    A.momentum = clamp(A.momentum + 0.7, -1, 1);
    D.momentum = clamp(D.momentum - 0.5, -1, 1);
    const pl = P(A, o.id); pl.form = clamp(pl.form + 1.2, -10, 10);
    event(state, A, kind === 'penalty' ? 'penGoal' : 'goal', { player: p.id, assist: as ? as.id : null, kind, xg: Math.round(xg * 100) / 100, score: [state.sides[0].goals, state.sides[1].goals] });
    return 'goal';
  }
  if (r < onTargetP) {
    A.stats.onTarget++;
    ps.onTarget++;
    const k = keeperOf(D);
    statOf(state, k.id).saves++;
    D.stats.saves++;
    if (kind === 'penalty') statOf(state, k.id).penSaved++;
    event(state, A, kind === 'penalty' ? 'penSaved' : xg > 0.22 ? 'bigSave' : 'saved', { player: p.id, keeper: k.id, kind });
    if (rand() < 0.3) { A.stats.corners++; }
    return 'saved';
  }
  if (kind === 'penalty') ps.penMissed++;
  const blocked = kind !== 'penalty' && rand() < 0.28;
  if (blocked) {
    const d = pick(rand, D, (role) => DEFENDER[role] || 0);
    statOf(state, d.id).blocks++;
    statOf(state, d.id).interceptions++;
  }
  const post = !blocked && rand() < 0.07;
  event(state, A, kind === 'penalty' ? 'penMissed' : post ? 'woodwork' : blocked ? 'blocked' : xg > 0.2 ? 'bigMiss' : 'miss', { player: p.id, kind });
  return 'miss';
}

/* ------------------------------------------------------------------ */
/* il minuto                                                            */
/* ------------------------------------------------------------------ */

function fatigue(state, side) {
  const st = STYLES[side.style];
  const men = MENTALITIES[side.mentality];
  for (const o of side.onPitch) {
    const p = P(side, o.id);
    const age = (state.season || 2026) - p.birth;
    const k = TUNE.fatiguePerMinute * st.fatigue * men.tempo * (1.38 - (p.attrs.stamina || 60) / 100) * (age >= 32 ? 1.15 : 1);
    p.fitness = clamp(p.fitness - (p.role === 'POR' ? k * 0.25 : k), 0, 100);
  }
}

function injuries(state, rand, side) {
  for (const o of [...side.onPitch]) {
    const p = P(side, o.id);
    const risk = TUNE.injuryPerMinute * (0.6 + p.injuryProne / 90) * (p.fitness < 45 ? 2.2 : 1) * (p.flags?.includes('playingHurt') ? 5 : 1);
    if (rand() < risk) {
      const weeks = [1, 1, 1, 2, 2, 3, 4, 5, 7, 10, 16, 24][Math.floor(rand() * 12)];
      p.injury = Math.max(p.injury, weeks);
      statOf(state, p.id).injured = true;
      side.injured.push(o.id);
      event(state, side, 'injury', { player: p.id, weeks });
      return o;
    }
  }
  return null;
}

function card(state, rand, side, o, nSide) {
  const p = P(side, o.id);
  const ps = statOf(state, p.id);
  ps.fouls++;
  side.stats.fouls++;
  const aggression = (p.personality === 'ribelle' ? 1.35 : p.personality === 'professionista' ? 0.85 : 1) * nSide.discipline * (ps.yellow ? 0.55 : 1);
  if (rand() < TUNE.redPerFoul * aggression) {
    sendOff(state, side, o, false);
    return 'red';
  }
  if (rand() < TUNE.yellowPerFoul * aggression * (state.derby ? 1.25 : 1)) {
    if (ps.yellow >= 1) { ps.yellow++; sendOff(state, side, o, true); return 'red'; }
    ps.yellow++;
    side.stats.yellows++;
    event(state, side, 'yellow', { player: p.id });
    return 'yellow';
  }
  return null;
}

function sendOff(state, side, o, second) {
  const p = P(side, o.id);
  statOf(state, p.id).red++;
  statOf(state, p.id).end = state.minute;
  side.stats.reds++;
  side.sentOff.push(o.id);
  side.onPitch = side.onPitch.filter((x) => x !== o);
  side.momentum = clamp(side.momentum - 0.5, -1, 1);
  event(state, side, second ? 'secondYellow' : 'red', { player: p.id });
  /* senza portiere: il più alto dei difensori va in porta, o si cambia */
  if (side.slots[o.slot].role === 'POR') {
    const gk = side.bench.find((id) => P(side, id).role === 'POR');
    if (gk && side.subsLeft > 0 && side.onPitch.length > 0) {
      const victim = [...side.onPitch].sort((a, b) => P(side, a.id).ovr - P(side, b.id).ovr).find((x) => side.slots[x.slot].role !== 'DC') || side.onPitch[0];
      substitute(state, side, victim.id, gk, { forced: true, slot: o.slot });
    } else if (side.onPitch.length) {
      const tallest = [...side.onPitch].sort((a, b) => (P(side, b.id).height || 0) - (P(side, a.id).height || 0))[0];
      tallest.slot = o.slot;
    }
  }
}

/** un minuto intero; restituisce gli eventi nuovi */
export function step(state) {
  if (state.finished || state.pending) return [];
  const rand = rng(state);
  const before = state.events.length;
  const [H, A] = state.sides;

  const limit = periodLength(state);
  if (state.minute === 0 && state.period === 1) event(state, null, 'kickoff');
  state.minute++;

  fatigue(state, H); fatigue(state, A);
  for (const s of state.sides) s.momentum *= 0.93;

  const nH = teamNumbers(state, H, A);
  const nA = teamNumbers(state, A, H);

  /* chi ha il pallone */
  const ctrlH = nH.control * nH.st.possession * (1 + (nH.press - nA.press) * 0.03);
  const ctrlA = nA.control * nA.st.possession * (1 + (nA.press - nH.press) * 0.03);
  const pH = ctrlH ** TUNE.possessionPower / (ctrlH ** TUNE.possessionPower + ctrlA ** TUNE.possessionPower);
  const attHome = rand() < pH;
  const [S1, S2, n1, n2] = attHome ? [H, A, nH, nA] : [A, H, nA, nH];
  S1.stats.possession++;
  /* chi ha poco il pallone lo usa in fretta: meno azioni, ma più dirette */
  const share = attHome ? pH : 1 - pH;
  const scarcity = clamp((0.5 / clamp(share, 0.15, 0.85)) ** 0.6, 0.72, 1.45);

  /* un'azione */
  if (rand() < (TUNE.attackRate * n1.tempo * 0.5 + 0.5 * TUNE.attackRate * n1.tempo * clamp(n1.attackMult, 0.5, 1.6) - 0.08) * scarcity) {
    const wide = n1.st.wide;
    const direct = n1.st.direct * 0.4;
    const r = rand();
    const kind = r < direct ? 'direct' : r < direct + (1 - direct) * wide ? 'wide' : 'central';
    const atk = kind === 'wide' ? n1.wide : kind === 'direct' ? n1.direct : n1.central;
    const def = kind === 'direct' ? (n2.defence * 0.6 + n2.aerial * 0.4) : n2.defence;
    const ratio = clamp(atk / Math.max(20, def), 0.4, 2.2) ** TUNE.ratioPower;
    const shotP = clamp(TUNE.shotRate * ratio * clamp(n1.attackMult, 0.5, 1.6) ** 0.7 / clamp(n2.block, 0.6, 1.8) ** 0.9 * (kind === 'direct' ? 0.85 : 1), 0.04, 0.62);
    const x = rand();
    if (x < shotP) {
      const longShot = kind === 'central' && rand() < 0.26;
      const assister = pick(rand, S1, (role, p) => (ASSISTER[kind]?.[role] || 0.05) * (0.5 + (kind === 'wide' ? p.attrs.crossing : p.attrs.vision) / 100));
      shot(state, rand, S1, S2, n1, n2, longShot ? 'long' : kind, { assister: longShot ? null : assister });
    } else if (x < shotP + TUNE.foulRate * n2.press ** 0.5) {
      const d = pick(rand, S2, (role) => DEFENDER[role] || 0);
      card(state, rand, S2, d, n2);
      const danger = rand();
      if (danger < TUNE.penaltyPerFoul * clamp(ratio, 0.6, 1.6)) {
        event(state, S1, 'penalty', { player: d.id });
        penalty(state, rand, S1, S2, n1, n2);
      } else if (danger < 0.11) {
        freeKick(state, rand, S1, S2, n1, n2);
      }
    } else if (x < shotP + TUNE.foulRate + TUNE.cornerRate * (0.6 + wide)) {
      S1.stats.corners++;
      if (rand() < 0.3 * n1.st.setPiece) {
        const taker = setPieceTaker(S1, 'corner');
        shot(state, rand, S1, S2, n1, n2, 'corner', { assister: taker });
      }
    } else {
      /* l'azione si spegne: qualcuno ha rubato palla */
      const d = pick(rand, S2, (role, p) => (DEFENDER[role] || 0) * (0.5 + p.attrs.tackling / 100));
      const t = rand();
      const ds = statOf(state, d.id);
      if (t < 0.42) ds.tackles++; else if (t < 0.75) ds.interceptions++; else ds.recoveries++;
      if (rand() < 0.35) {
        const helper = pick(rand, S2, (role) => ({ MED: 1, CC: 0.8, TZ: 0.5, DC: 0.4, TRQ: 0.3, ALA: 0.3 }[role] || 0.1));
        statOf(state, helper.id).recoveries++;
      }
      if (kind !== 'wide' && rand() < 0.25) {
        const winner = pick(rand, S2, (role) => ({ DC: 1, MED: 0.5, PUN: 0.3 }[role] || 0.1));
        statOf(state, winner.id).aerials++;
      }
      /* recupero alto e difesa avversaria alta: ripartenza */
      const cP = TUNE.counterRate * n2.st.counter ** 1.6 * n1.line ** 1.3 * clamp(n2.press, 0.6, 1.5) ** 0.3 * clamp(n2.counter / Math.max(30, n1.defence), 0.5, 1.8) ** 1.5;
      if (rand() < cP) {
        S2.stats.possession += 0.2;
        const assister = pick(rand, S2, (role, p) => (ASSISTER.counter[role] || 0.05) * (0.5 + p.attrs.vision / 100));
        if (rand() < 0.62) shot(state, rand, S2, S1, n2, n1, 'counter', { assister });
        else if (rand() < 0.3) { const o = pick(rand, S1, (role) => DEFENDER[role] || 0); card(state, rand, S1, o, n1); }
      }
    }
  }

  /* un errore che regala un gol: raro, ma pesa sul voto */
  if (rand() < 0.0016) {
    const culprit = pick(rand, S2, (role, p) => ({ DC: 1, POR: 0.6, MED: 0.5, TZ: 0.5 }[role] || 0.1) * (1.4 - p.attrs.composure / 100));
    statOf(state, culprit.id).errors++;
    if (rand() < 0.45) {
      event(state, S2, 'error', { player: culprit.id });
      shot(state, rand, S1, S2, n1, n2, 'counter', { fixedXg: 0.4 });
    }
  }

  const hurt = [injuries(state, rand, H), injuries(state, rand, A)];
  hurt.forEach((o, i) => {
    if (!o) return;
    const s = state.sides[i];
    if (!(state.user === s.key)) autoInjurySub(state, s, o);
  });

  for (const s of state.sides) s.mods = s.mods.filter((m) => m.until == null || state.minute <= m.until);

  /* intelligenza dell'altra panchina */
  for (const s of state.sides) if (s.key !== state.user || state.autoUser) aiManager(state, s, state.sides.find((x) => x !== s));

  /* fine dei tempi */
  if (state.minute >= limit) endPeriod(state);
  else if (state.user) checkMoments(state);

  return state.events.slice(before);
}

function periodLength(state) {
  const ends = [45, 90, 105, 120];
  const p = state.period;
  if (p > 4) return Infinity;
  return ends[p - 1] + state.added[p - 1];
}

function computeAdded(state) {
  const p = state.period;
  const startMin = [0, 45, 90, 105][p - 1];
  const inPeriod = state.events.filter((e) => e.period === p && e.minute > startMin);
  const n = inPeriod.filter((e) => ['goal', 'penGoal', 'sub', 'injury', 'red', 'secondYellow', 'disallowed'].includes(e.type)).length;
  const base = p === 1 ? 1 : p === 2 ? 3 : 1;
  return clamp(base + Math.round(n * 0.5), p === 2 ? 2 : 1, p === 2 ? 9 : 4);
}

function endPeriod(state) {
  const [H, A] = state.sides;
  const p = state.period;
  if (p === 1) {
    event(state, null, 'halftime', { score: [H.goals, A.goals] });
    state.period = 2;
    state.minute = 45;
    for (const s of state.sides) { s.windowsLeft = Math.max(s.windowsLeft, 1); for (const o of s.onPitch) { const pl = P(s, o.id); pl.fitness = clamp(pl.fitness + 4, 0, 100); } }
    state.added[1] = 0;
    if (state.user && !state.coachBan) offerMoment(state, 'halftime');
    return;
  }
  if (p === 2) {
    if (state.knockout && H.goals === A.goals) {
      event(state, null, 'extratime');
      state.period = 3; state.minute = 90;
      return;
    }
    return finish(state);
  }
  if (p === 3) { state.period = 4; state.minute = 105; event(state, null, 'et-half'); return; }
  if (p === 4) {
    if (H.goals === A.goals) { shootout(state); }
    return finish(state);
  }
}

/* il recupero si decide all'ultimo minuto regolamentare */
function maybeAnnounceAdded(state) {
  const p = state.period;
  const reg = [45, 90, 105, 120][p - 1];
  if (state.minute === reg - 1 && !state.added[p - 1]) {
    state.added[p - 1] = computeAdded(state);
    event(state, null, 'added', { added: state.added[p - 1] });
  }
}

function finish(state) {
  const [H, A] = state.sides;
  state.period = 6;
  state.finished = true;
  for (const s of state.sides) for (const o of s.onPitch) statOf(state, o.id).end = state.minute;
  event(state, null, 'fulltime', { score: [H.goals, A.goals], pens: state.shootout ? [state.shootout.home, state.shootout.away] : null });
  const total = H.stats.possession + A.stats.possession || 1;
  H.stats.possessionPct = Math.round((H.stats.possession / total) * 100);
  A.stats.possessionPct = 100 - H.stats.possessionPct;
  for (const s of state.sides) {
    const other = state.sides.find((x) => x !== s);
    if (other.goals === 0) {
      for (const [id, ps] of Object.entries(state.pstats)) {
        if (!s.byId.has(id) || ps.start == null) continue;
        const p = s.byId.get(id);
        if ((p.role === 'POR' || p.role === 'DC' || p.role === 'TZ') && (ps.end ?? state.minute) - ps.start >= 60) ps.cleanSheet = true;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* calci piazzati                                                       */
/* ------------------------------------------------------------------ */

function setPieceTaker(side, kind) {
  const pref = kind === 'penalty' ? side.team.penaltyId : side.team.freeKickId;
  const on = side.onPitch.find((o) => o.id === pref);
  if (on) return on;
  const key = kind === 'penalty' ? (p) => p.attrs.finishing * 0.6 + p.attrs.composure * 0.4 : (p) => p.attrs.technique * 0.5 + p.attrs.crossing * 0.2 + p.attrs.longshots * 0.3;
  return [...side.onPitch].filter((o) => P(side, o.id).role !== 'POR').sort((a, b) => key(P(side, b.id)) - key(P(side, a.id)))[0] || side.onPitch[0];
}

function penalty(state, rand, S1, S2, n1, n2, takerId = null) {
  if (state.user === S1.key && !takerId && !state.coachBan) {
    state.pending = momentPenalty(state, S1);
    state.pendingPenalty = true;
    return;
  }
  const taker = takerId ? S1.onPitch.find((o) => o.id === takerId) || setPieceTaker(S1, 'penalty') : setPieceTaker(S1, 'penalty');
  const p = P(S1, taker.id);
  const pressure = (state.minute >= 80 && Math.abs(S1.goals - S2.goals) <= 1 ? 0.04 : 0) + (p.personality === 'fragile' ? 0.05 : 0);
  const xg = clamp(TUNE.xg.penalty + (eff(S1, taker, 'finishing') - 70) * 0.0025 + (eff(S1, taker, 'composure') - 70) * 0.002 - pressure, 0.55, 0.92);
  shot(state, rand, S1, S2, n1, n2, 'penalty', { shooter: taker, fixedXg: xg });
}

function freeKick(state, rand, S1, S2, n1, n2, choice = null) {
  if (state.user === S1.key && !state.coachBan && !choice && rand() < 0.35 && state.momentsSeen.filter((m) => m === 'freekick').length < 2) {
    state.pending = momentFreeKick(state, S1);
    return;
  }
  const c = choice || (rand() < 0.55 ? 'direct' : 'cross');
  const taker = setPieceTaker(S1, 'freekick');
  const tp = P(S1, taker.id);
  if (c === 'direct') {
    const q = eff(S1, taker, 'technique') * 0.45 + eff(S1, taker, 'longshots') * 0.55;
    shot(state, rand, S1, S2, n1, n2, 'long', { shooter: taker, fixedXg: clamp(0.02 + (q - 60) * 0.0028, 0.02, 0.16) * n1.st.setPiece });
  } else if (c === 'cross') {
    const q = eff(S1, taker, 'crossing');
    const air = n1.aerial / Math.max(30, n2.aerial);
    shot(state, rand, S1, S2, n1, n2, 'corner', { assister: taker, fixedXg: clamp(0.05 * air ** 1.4 * (0.6 + q / 160) * n1.st.setPiece, 0.02, 0.2) });
  } else {
    const q = eff(S1, taker, 'passing');
    if (rand() < 0.55 + q / 400) shot(state, rand, S1, S2, n1, n2, 'central', { assister: taker, fixedXg: clamp(0.07 + (q - 65) * 0.0015, 0.04, 0.14) });
  }
  void tp;
}

/* ------------------------------------------------------------------ */
/* cambi                                                               */
/* ------------------------------------------------------------------ */

export function substitute(state, side, outId, inId, { forced = false, slot = null } = {}) {
  if (typeof side === 'string') side = state.sides.find((s) => s.key === side);
  const o = side.onPitch.find((x) => x.id === outId);
  if (!o || !side.bench.includes(inId) || side.subsLeft <= 0) return false;
  const inWindow = state.minute === side.lastSubMinute || state.period !== (side.lastSubPeriod || 0) && state.minute === 45;
  if (!inWindow && !forced && side.windowsLeft <= 0 && state.minute !== 45) return false;
  if (!inWindow && state.minute !== 45) side.windowsLeft = Math.max(0, side.windowsLeft - 1);
  side.lastSubMinute = state.minute;
  side.subsLeft--;
  side.bench = side.bench.filter((id) => id !== inId);
  statOf(state, outId).end = state.minute;
  statOf(state, inId).start = state.minute;
  side.onPitch = side.onPitch.map((x) => (x === o ? { id: inId, slot: slot ?? o.slot } : x));
  side.subbedOff = [...(side.subbedOff || []), outId];
  event(state, side, 'sub', { out: outId, in: inId, forced });
  return true;
}

function autoInjurySub(state, side, o) {
  const role = side.slots[o.slot].role;
  const best = bestBenchFor(side, role);
  if (best && side.subsLeft > 0) substitute(state, side, o.id, best, { forced: true });
  else { side.onPitch = side.onPitch.filter((x) => x !== o); statOf(state, o.id).end = state.minute; side.sentOff.push(o.id); }
}

export function bestBenchFor(side, role) {
  const scored = side.bench.map((id) => {
    const p = P(side, id);
    if (p.injury > 0) return [id, -1];
    return [id, p.ovr * roleFit(p.role, role, p.extra) * readiness(p)];
  }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  return scored[0]?.[0] || null;
}

/** l'allenatore del computer: cambi per stanchezza e punteggio, mentalità */
function aiManager(state, side, other) {
  const m = state.minute;
  if (state.period === 1 && m < 30) return;
  const diff = side.goals - other.goals;
  /* le scelte dell'allenatore non si toccano: la mentalità resta la sua */
  if (m >= 60 && m % 5 === 0 && !side.locked) {
    if (diff < 0 && m >= 70) side.mentality = diff <= -2 && m >= 80 ? 'tuttoattacco' : 'offensiva';
    else if (diff > 0 && m >= 75) side.mentality = diff >= 2 ? 'equilibrata' : 'difensiva';
    else if (diff === 0 && m >= 78 && side.key === 'away') side.mentality = 'difensiva';
    else if (m >= 60) side.mentality = side.team.mentality || 'equilibrata';
  }
  if (side.subsLeft <= 0) return;
  if (!(m === 46 || m === 58 || m === 66 || m === 74 || m === 82)) return;
  const tired = side.onPitch
    .map((o) => ({ o, p: P(side, o.id), role: side.slots[o.slot].role }))
    .filter((x) => x.role !== 'POR')
    .sort((a, b) => (a.p.fitness + (statOf(state, a.p.id).yellow ? -12 : 0)) - (b.p.fitness + (statOf(state, b.p.id).yellow ? -12 : 0)));
  const n = m === 46 ? 0 : m === 58 ? 1 : 2;
  let made = 0;
  for (const t of tired) {
    if (made >= n || side.subsLeft <= 0) break;
    if (t.p.fitness > 72 && !statOf(state, t.p.id).yellow) continue;
    let role = t.role;
    if (diff < 0 && m >= 70 && ['DC', 'TZ', 'MED'].includes(role) && side.onPitch.filter((x) => side.slots[x.slot].role === 'DC').length > 2) role = 'PUN';
    const best = bestBenchFor(side, role);
    if (!best) continue;
    if (substitute(state, side, t.p.id, best, { slot: t.o.slot })) {
      if (role !== t.role) side.slots[t.o.slot] = { ...side.slots[t.o.slot], role };
      made++;
    }
  }
}

/* ------------------------------------------------------------------ */
/* tattica a partita in corso                                          */
/* ------------------------------------------------------------------ */

export function setTactics(state, key, { mentality, style, formation } = {}) {
  const side = state.sides.find((s) => s.key === key);
  if (mentality && MENTALITIES[mentality]) side.mentality = mentality;
  if (style && STYLES[style] && style !== side.style) {
    side.style = style;
    /* cambiare stile a partita in corso costa qualche minuto di confusione */
    side.mods.push({ key: 'control', value: 0.95, until: state.minute + 6 });
  }
  if (formation && FORMATIONS[formation] && formation !== side.formation) {
    const slots = FORMATIONS[formation];
    /* ognuno va nel posto nuovo più adatto al suo ruolo */
    const free = slots.map((s, i) => ({ ...s, i }));
    const placed = [];
    const players = [...side.onPitch].sort((a, b) => (P(side, b.id).role === 'POR') - (P(side, a.id).role === 'POR'));
    for (const o of players) {
      const p = P(side, o.id);
      free.sort((a, b) => roleFit(p.role, b.role, p.extra) - roleFit(p.role, a.role, p.extra) || Math.abs(a.x - side.slots[o.slot].x) - Math.abs(b.x - side.slots[o.slot].x));
      const s = free.shift();
      if (s) placed.push({ id: o.id, slot: s.i });
    }
    side.formation = formation;
    side.slots = slots.map((s) => ({ ...s }));
    side.onPitch = placed;
    side.mods.push({ key: 'control', value: 0.96, until: state.minute + 5 });
  }
  event(state, side, 'tactic', { mentality: side.mentality, style: side.style, formation: side.formation });
}

/* ------------------------------------------------------------------ */
/* rigori (coppe)                                                       */
/* ------------------------------------------------------------------ */

function shootout(state) {
  const rand = rng(state);
  const res = { home: 0, away: 0, kicks: [] };
  const order = (side) => [...side.onPitch].sort((a, b) => {
    const k = (o) => { const p = P(side, o.id); return (o.id === side.team.penaltyId ? 100 : 0) + p.attrs.finishing * 0.5 + p.attrs.composure * 0.5 - (p.role === 'POR' ? 60 : 0); };
    return k(b) - k(a);
  });
  const lists = state.sides.map(order);
  const kick = (i, round) => {
    const side = state.sides[i];
    const other = state.sides[1 - i];
    const list = lists[i];
    const o = list[(round - 1) % list.length];
    const p = P(side, o.id);
    const k = keeperRating(other);
    const pr = clamp(0.76 + (p.attrs.finishing - 72) * 0.003 + (p.attrs.composure - 70) * 0.003 - (k - 72) * 0.004 - (p.personality === 'fragile' ? 0.06 : 0), 0.45, 0.92);
    const scored = rand() < pr;
    if (scored) res[side.key]++;
    res.kicks.push({ side: side.key, player: o.id, scored });
    return scored;
  };
  for (let round = 1; round <= 5; round++) {
    for (let i = 0; i < 2; i++) {
      const me = res[state.sides[i].key]; const them = res[state.sides[1 - i].key];
      const leftMe = 5 - round + 1; const leftThem = 5 - round + (i === 0 ? 1 : 0);
      if (me + leftMe < them || them + leftThem < me) continue;
      kick(i, round);
    }
  }
  let round = 6;
  while (res.home === res.away && round < 60) { const a = kick(0, round); const b = kick(1, round); if (a !== b) break; round++; }
  if (res.home === res.away) res[rand() < 0.5 ? 'home' : 'away']++;
  state.shootout = res;
  event(state, null, 'shootout', { home: res.home, away: res.away });
}

/* ------------------------------------------------------------------ */
/* momenti chiave: le scelte a partita in corso                         */
/* ------------------------------------------------------------------ */

/* Ogni momento ha condizioni vere di partita, tre opzioni e un effetto che
   il motore sente davvero nei minuti successivi. Nessuna opzione vince
   sempre: dipende da rosa, punteggio, avversario, fiato. */

const MOMENT_GAP = 11;
const MAX_MOMENTS = 4;

function userSide(state) { return state.sides.find((s) => s.key === state.user); }
function otherSide(state) { return state.sides.find((s) => s.key !== state.user); }

function offerMoment(state, id, ctx = {}) {
  const builder = MOMENTS[id];
  if (!builder) return false;
  const m = builder.build(state, userSide(state), otherSide(state), ctx);
  if (!m) return false;
  /* nello stato solo dati: le funzioni delle opzioni si ricostruiscono alla scelta */
  const options = m.options.map((o) => ({ id: o.id, disabled: Boolean(o.disabled) }));
  /* l'ordine delle opzioni cambia ogni volta: la risposta giusta non sta mai nello stesso posto */
  const order = mulberry32((state.seed + state.momentsSeen.length * 977 + state.minute) >>> 0);
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(order() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  if (!options.some((o) => !o.disabled)) return false;
  state.pending = { id, minute: state.minute, period: state.period, ctx: m.ctx || {}, options };
  state.momentsSeen.push(id);
  state.lastMomentMinute = state.minute;
  return true;
}

function checkMoments(state) {
  if (state.pending || state.finished || state.coachBan) return;
  const me = userSide(state);
  const them = otherSide(state);
  const seen = (id) => state.momentsSeen.includes(id);
  const count = state.momentsSeen.filter((x) => x !== 'halftime' && x !== 'penalty' && x !== 'freekick').length;
  if (count >= MAX_MOMENTS || state.minute - state.lastMomentMinute < MOMENT_GAP) return;
  const m = state.minute;
  const diff = me.goals - them.goals;
  const recent = (type, side, mins) => state.events.filter((e) => e.type === type && e.side === side && e.minute > m - mins);
  const tries = [
    [!seen('redOwn') && recent('red', me.key, 2).length + recent('secondYellow', me.key, 2).length > 0, 'redOwn'],
    [!seen('redOpp') && recent('red', them.key, 2).length + recent('secondYellow', them.key, 2).length > 0 && m < 85, 'redOpp'],
    [!seen('injuryOwn') && state.events.some((e) => e.type === 'injury' && e.side === me.key && e.minute >= m - 1 && me.onPitch.some((o) => o.id === e.player)), 'injuryOwn'],
    [!seen('concededEarly') && m <= 35 && diff < 0 && recent('goal', them.key, 2).length + recent('penGoal', them.key, 2).length > 0, 'concededEarly'],
    [!seen('tiredStar') && m >= 58 && m <= 80 && tiredStar(me), 'tiredStar'],
    [!seen('bookedDefender') && m >= 20 && m <= 62 && bookedDefender(state, me, them), 'bookedDefender'],
    [!seen('pressure') && m >= 20 && pressureOn(state, me, them), 'pressure'],
    [!seen('leadLate') && m >= 74 && m <= 84 && diff === 1, 'leadLate'],
    [!seen('trailLate') && m >= 68 && m <= 84 && (diff === -1 || diff === -2), 'trailLate'],
    [!seen('drawLate') && m >= 76 && m <= 84 && diff === 0 && state.stakes >= 1, 'drawLate'],
    [!seen('oppChange') && m >= 55 && m <= 78 && recent('tactic', them.key, 1).length > 0, 'oppChange'],
    [!seen('bigLead') && m >= 55 && m <= 75 && diff >= 2, 'bigLead'],
  ];
  for (const [ok, id] of tries) if (ok && offerMoment(state, id)) return;
}

function tiredStar(side) {
  return side.onPitch.some((o) => { const p = P(side, o.id); return p.role !== 'POR' && p.fitness < 42 && p.ovr >= Math.max(...side.onPitch.map((x) => P(side, x.id).ovr)) - 4; });
}
function bookedDefender(state, me, them) {
  const winger = them.onPitch.some((o) => ['ALA', 'PUN'].includes(them.slots[o.slot].role) && P(them, o.id).attrs.dribbling >= 72);
  return winger && me.onPitch.some((o) => ['DC', 'TZ'].includes(me.slots[o.slot].role) && statOf(state, o.id).yellow === 1);
}
function pressureOn(state, me, them) {
  const m = state.minute;
  const shotsThem = state.events.filter((e) => e.side === them.key && e.minute > m - 10 && ['saved', 'bigSave', 'miss', 'bigMiss', 'woodwork', 'blocked', 'goal'].includes(e.type)).length;
  const shotsMe = state.events.filter((e) => e.side === me.key && e.minute > m - 10 && ['saved', 'bigSave', 'miss', 'bigMiss', 'woodwork', 'blocked', 'goal'].includes(e.type)).length;
  return shotsThem >= 4 && shotsMe <= 1;
}

const mod = (side, key, value, minutes, state) => side.mods.push({ key, value, until: minutes == null ? null : state.minute + minutes });

/* le opzioni di un momento: id, parametri per il testo, effetto */
const MOMENTS = {
  halftime: {
    build(state, me, them) {
      const diff = me.goals - them.goals;
      const morale = me.team.morale ?? 60;
      return {
        ctx: { diff, score: [state.sides[0].goals, state.sides[1].goals] },
        options: [
          /* ordine: rende poco ma non tradisce mai; utile quando si è avanti */
          { id: 'calm', apply: () => { mod(me, 'defence', 1.04, 45, state); mod(me, 'discipline', 0.85, 45, state); } },
          { id: 'fire', apply: (rand) => {
            /* una strigliata funziona se si è sotto e lo spogliatoio è con te */
            const works = rand() < 0.25 + morale / 250 + (diff < 0 ? 0.3 : diff > 0 ? -0.25 : 0.05);
            if (works) { mod(me, 'attack', 1.14, 45, state); mod(me, 'tempo', 1.08, 45, state); mod(me, 'press', 1.1, 45, state); me.momentum = 0.5; return 'good'; }
            mod(me, 'discipline', 1.6, 30, state); mod(me, 'control', 0.9, 30, state); mod(me, 'defence', 0.94, 30, state); return 'bad';
          } },
          { id: 'praise', apply: (rand) => {
            /* i complimenti tengono alta la concentrazione di chi sta vincendo */
            const works = rand() < 0.5 + (diff > 0 ? 0.3 : diff < 0 ? -0.35 : 0) + (morale - 60) / 200;
            if (works) { mod(me, 'control', 1.08, 45, state); mod(me, 'defence', 1.05, 45, state); return 'good'; }
            mod(me, 'attack', 0.9, 30, state); mod(me, 'tempo', 0.92, 30, state); return 'bad';
          } },
        ],
      };
    },
  },

  concededEarly: {
    build(state, me) {
      return {
        options: [
          { id: 'patience', apply: () => {} },
          /* alzarsi funziona per chi è più forte, gli altri si scoprono */
          { id: 'pushUp', apply: () => { mod(me, 'attack', 1.18, 30, state); mod(me, 'line', 1.35, 30, state); mod(me, 'defence', 0.9, 30, state); } },
          { id: 'switchCounter', apply: () => { setTactics(state, me.key, { style: 'contropiede' }); mod(me, 'counter', 1.15, 30, state); } },
        ],
      };
    },
  },

  redOwn: {
    build(state, me) {
      const attacker = me.onPitch.filter((o) => ['PUN', 'ALA', 'TRQ'].includes(me.slots[o.slot].role)).sort((a, b) => P(me, a.id).ovr - P(me, b.id).ovr)[0];
      const def = bestBenchFor({ ...me, bench: me.bench.filter((id) => ['DC', 'TZ', 'MED'].includes(P(me, id).role)) }, 'DC');
      return {
        ctx: { out: attacker?.id, in: def },
        options: [
          { id: 'sacrifice', disabled: !attacker || !def || me.subsLeft <= 0, apply: () => { substitute(state, me, attacker.id, def, { slot: attacker.slot }); me.slots[attacker.slot] = { ...me.slots[attacker.slot], role: P(me, def).role }; mod(me, 'defence', 1.05, null, state); mod(me, 'attack', 0.9, null, state); } },
          { id: 'dropDeep', apply: () => { me.mentality = 'ultradif'; mod(me, 'block', 1.2, null, state); } },
          { id: 'keepGoing', apply: () => { mod(me, 'attack', 1.05, 20, state); mod(me, 'defence', 0.9, 20, state); } },
        ],
      };
    },
  },

  redOpp: {
    build(state, me) {
      return {
        options: [
          { id: 'allIn', apply: () => { me.mentality = 'offensiva'; mod(me, 'attack', 1.15, null, state); mod(me, 'line', 1.3, null, state); } },
          { id: 'patientPossession', apply: () => { setTactics(state, me.key, { style: 'tikitaka' }); mod(me, 'control', 1.06, null, state); mod(me, 'tempo', 0.9, null, state); } },
          { id: 'wideOverload', apply: () => { mod(me, 'wide', 1.25, null, state); mod(me, 'central', 0.88, null, state); } },
        ],
      };
    },
  },

  injuryOwn: {
    build(state, me) {
      const e = [...state.events].reverse().find((x) => x.type === 'injury' && x.side === me.key);
      const o = me.onPitch.find((x) => x.id === e.player);
      if (!o) return null;
      const role = me.slots[o.slot].role;
      const like = bestBenchFor(me, role);
      const attackerIn = bestBenchFor({ ...me, bench: me.bench.filter((id) => ['PUN', 'ALA', 'TRQ'].includes(P(me, id).role)) }, 'PUN');
      const defenderIn = bestBenchFor({ ...me, bench: me.bench.filter((id) => ['DC', 'TZ', 'MED'].includes(P(me, id).role)) }, 'DC');
      return {
        ctx: { player: e.player, like, attackerIn, defenderIn },
        options: [
          { id: 'likeForLike', disabled: !like || me.subsLeft <= 0, apply: () => substitute(state, me, o.id, like, { forced: true }) },
          { id: 'moreAttack', disabled: !attackerIn || me.subsLeft <= 0, apply: () => { substitute(state, me, o.id, attackerIn, { forced: true }); me.slots[o.slot] = { ...me.slots[o.slot], role: P(me, attackerIn).role }; } },
          { id: 'moreDefence', disabled: !defenderIn || me.subsLeft <= 0, apply: () => { substitute(state, me, o.id, defenderIn, { forced: true }); me.slots[o.slot] = { ...me.slots[o.slot], role: P(me, defenderIn).role }; } },
        ],
        fallback: () => { me.onPitch = me.onPitch.filter((x) => x !== o); me.sentOff.push(o.id); },
      };
    },
  },

  tiredStar: {
    build(state, me) {
      const best = Math.max(...me.onPitch.map((x) => P(me, x.id).ovr));
      const o = me.onPitch.find((x) => { const p = P(me, x.id); return p.role !== 'POR' && p.fitness < 42 && p.ovr >= best - 4; });
      if (!o) return null;
      const role = me.slots[o.slot].role;
      const sub = bestBenchFor(me, role);
      return {
        ctx: { player: o.id, in: sub },
        options: [
          { id: 'subNow', disabled: !sub || me.subsLeft <= 0, apply: () => substitute(state, me, o.id, sub) },
          { id: 'keepHim', apply: (rand) => {
            const p = P(me, o.id);
            /* il campione stanco può ancora inventare, ma rischia di rompersi */
            p.flags = [...(p.flags || []), 'playingHurt'];
            if (rand() < 0.35 + p.attrs.composure / 400) { mod(me, 'central', 1.2, 15, state); return 'good'; }
            return 'neutral';
          } },
          { id: 'freeRole', apply: () => { const p = P(me, o.id); p.fitness = clamp(p.fitness + 10, 0, 100); mod(me, 'defence', 0.92, null, state); mod(me, 'counter', 1.15, null, state); } },
        ],
      };
    },
  },

  bookedDefender: {
    build(state, me) {
      const o = me.onPitch.find((x) => ['DC', 'TZ'].includes(me.slots[x.slot].role) && statOf(state, x.id).yellow === 1);
      if (!o) return null;
      const sub = bestBenchFor(me, me.slots[o.slot].role);
      return {
        ctx: { player: o.id, in: sub },
        options: [
          { id: 'subBooked', disabled: !sub || me.subsLeft <= 0, apply: () => substitute(state, me, o.id, sub) },
          { id: 'careful', apply: () => { mod(me, 'discipline', 0.45, null, state); mod(me, 'defence', 0.92, null, state); } },
          { id: 'trust', apply: () => { mod(me, 'discipline', 1.25, null, state); mod(me, 'defence', 1.04, null, state); } },
        ],
      };
    },
  },

  pressure: {
    build(state, me) {
      return {
        options: [
          { id: 'dropDeep', apply: () => { mod(me, 'block', 1.3, 15, state); mod(me, 'attack', 0.8, 15, state); } },
          { id: 'pressHigher', apply: () => { mod(me, 'press', 1.35, 15, state); mod(me, 'control', 1.06, 15, state); mod(me, 'line', 1.35, 15, state); } },
          { id: 'longBalls', apply: () => { setTactics(state, me.key, { style: 'verticale' }); mod(me, 'direct', 1.25, 15, state); } },
        ],
      };
    },
  },

  leadLate: {
    build(state, me) {
      return {
        options: [
          { id: 'parkBus', apply: () => { setTactics(state, me.key, { style: 'pullman', mentality: 'ultradif' }); } },
          { id: 'keepPlaying', apply: () => {} },
          { id: 'killGame', apply: () => { me.mentality = 'difensiva'; mod(me, 'tempo', 0.75, null, state); mod(me, 'discipline', 1.5, null, state); mod(them(state), 'tempo', 0.85, null, state); } },
        ],
      };
    },
  },

  trailLate: {
    build(state, me) {
      const def = me.onPitch.filter((o) => ['DC', 'MED'].includes(me.slots[o.slot].role)).sort((a, b) => P(me, a.id).ovr - P(me, b.id).ovr)[0];
      const fw = bestBenchFor({ ...me, bench: me.bench.filter((id) => ['PUN', 'ALA'].includes(P(me, id).role)) }, 'PUN');
      const tall = [...me.bench].filter((id) => P(me, id).role === 'PUN').sort((a, b) => P(me, b).attrs.heading - P(me, a).attrs.heading)[0];
      return {
        ctx: { out: def?.id, in: fw, tall },
        options: [
          { id: 'extraStriker', disabled: !def || !fw || me.subsLeft <= 0, apply: () => { substitute(state, me, def.id, fw, { slot: def.slot }); me.slots[def.slot] = { ...me.slots[def.slot], role: 'PUN' }; me.mentality = 'tuttoattacco'; } },
          { id: 'longBallsTall', apply: () => { setTactics(state, me.key, { style: 'verticale', mentality: 'offensiva' }); mod(me, 'aerial', 1.2, null, state); } },
          { id: 'staysPatient', apply: () => { mod(me, 'control', 1.04, null, state); me.mentality = 'offensiva'; } },
        ],
      };
    },
  },

  drawLate: {
    build(state, me) {
      return {
        options: [
          { id: 'goForWin', apply: () => { me.mentality = 'offensiva'; mod(me, 'attack', 1.1, null, state); mod(me, 'defence', 0.92, null, state); } },
          { id: 'takePoint', apply: () => { me.mentality = 'difensiva'; mod(me, 'block', 1.2, null, state); mod(me, 'attack', 0.85, null, state); } },
          { id: 'setPieces', apply: () => { mod(me, 'aerial', 1.25, null, state); mod(me, 'central', 0.9, null, state); } },
        ],
      };
    },
  },

  oppChange: {
    build(state, me, them) {
      return {
        ctx: { mentality: them.mentality, style: them.style },
        options: [
          { id: 'mirror', apply: () => { mod(me, 'defence', 1.08, 20, state); mod(me, 'attack', 0.94, 20, state); } },
          { id: 'exploit', apply: () => { mod(me, 'counter', 1.3, 20, state); mod(me, 'block', 0.92, 20, state); } },
          { id: 'ignore', apply: () => {} },
        ],
      };
    },
  },

  bigLead: {
    build(state, me) {
      return {
        options: [
          { id: 'restStars', apply: () => { for (const o of me.onPitch) { const p = P(me, o.id); p.fitness = clamp(p.fitness + 8, 0, 100); } mod(me, 'tempo', 0.85, null, state); mod(me, 'attack', 0.9, null, state); } },
          { id: 'moreGoals', apply: () => { mod(me, 'attack', 1.12, null, state); mod(me, 'defence', 0.92, null, state); } },
          { id: 'youngsters', apply: () => { mod(me, 'control', 0.96, null, state); state.youthMinutes = true; } },
        ],
      };
    },
  },
};
function them(state) { return otherSide(state); }

function momentPenalty(state, side) {
  const cands = [...side.onPitch]
    .filter((o) => P(side, o.id).role !== 'POR')
    .map((o) => ({ o, p: P(side, o.id), k: P(side, o.id).attrs.finishing * 0.55 + P(side, o.id).attrs.composure * 0.45 }))
    .sort((a, b) => b.k - a.k);
  const list = [];
  const pushU = (x) => { if (x && !list.some((y) => y.o.id === x.o.id)) list.push(x); };
  pushU(cands.find((x) => x.o.id === side.team.penaltyId) || cands[0]);
  pushU([...cands].sort((a, b) => b.p.form - a.p.form)[0]);
  pushU(cands.find((x) => x.p.captain) || cands[1]);
  pushU(cands[1]); pushU(cands[2]);
  state.momentsSeen.push('penalty');
  return {
    id: 'penalty',
    minute: state.minute,
    period: state.period,
    ctx: { takers: list.slice(0, 3).map((x) => ({ id: x.o.id, finishing: x.p.attrs.finishing, composure: x.p.attrs.composure, form: Math.round(x.p.form) })) },
    options: list.slice(0, 3).map((x) => ({ id: `taker:${x.o.id}`, player: x.o.id })),
  };
}

function momentFreeKick(state, side) {
  const taker = setPieceTaker(side, 'freekick');
  state.momentsSeen.push('freekick');
  return {
    id: 'freekick',
    minute: state.minute,
    period: state.period,
    ctx: { taker: taker.id },
    options: [{ id: 'fkDirect' }, { id: 'fkCross' }, { id: 'fkShort' }],
  };
}

/** la scelta dell'utente sul momento aperto */
export function decide(state, optionId) {
  const m = state.pending;
  if (!m) return null;
  const rand = rng(state);
  const me = userSide(state);
  const other = otherSide(state);
  state.pending = null;
  state.decisionsTaken.push({ id: m.id, minute: m.minute, option: optionId, draws: state.draws });
  let outcome = null;
  if (m.id === 'penalty') {
    const nMe = teamNumbers(state, me, other);
    const nOt = teamNumbers(state, other, me);
    const takerId = optionId.split(':')[1];
    penalty(state, rand, me, other, nMe, nOt, takerId);
    state.pendingPenalty = false;
    outcome = state.events[state.events.length - 1].type;
  } else if (m.id === 'freekick') {
    const nMe = teamNumbers(state, me, other);
    const nOt = teamNumbers(state, other, me);
    freeKick(state, rand, me, other, nMe, nOt, { fkDirect: 'direct', fkCross: 'cross', fkShort: 'short' }[optionId]);
    outcome = state.events[state.events.length - 1].type;
  } else {
    const def = MOMENTS[m.id].build(state, me, other, {});
    const opt = def?.options.find((o) => o.id === optionId && !o.disabled);
    if (opt) outcome = opt.apply(rand) || 'done';
    else if (def?.fallback) def.fallback();
  }
  me.locked = true;
  event(state, me, 'decision', { moment: m.id, option: optionId, outcome });
  return outcome;
}

/* ------------------------------------------------------------------ */
/* il vice: prova ogni opzione su copie della partita                   */
/* ------------------------------------------------------------------ */

export function cloneMatch(state) {
  const copy = JSON.parse(JSON.stringify(serializeMatch(state)));
  const players = state.sides.map((side) => side.team.players.map((p) => JSON.parse(JSON.stringify(p))));
  return restoreMatch(copy, (id) => players.flat().find((p) => p.id === id));
}

/** la partita come JSON: i giocatori restano fuori, si ricollegano per id */
export function serializeMatch(state) {
  const out = { ...state, sides: state.sides.map((s) => ({ ...s, byId: undefined, team: { ...s.team, players: undefined, playerIds: s.team.players.map((p) => p.id) } })) };
  delete out._r; delete out._rSeed;
  return out;
}

export function restoreMatch(json, getPlayer) {
  const state = { ...json };
  state.sides = json.sides.map((s) => {
    const players = s.team.playerIds.map(getPlayer).filter(Boolean);
    return { ...s, team: { ...s.team, players }, byId: new Map(players.map((p) => [p.id, p])) };
  });
  return state;
}

/* Il buon senso del vice, ricavato da migliaia di partite simulate
   (tools/manager/moments-options.mjs): in quale situazione vince quale scelta. */
function rulePick(state, me, them) {
  const m = state.pending;
  const diff = me.goals - them.goals;
  const nMe = teamNumbers(state, me, them);
  const nThem = teamNumbers(state, them, me);
  const power = (nMe.control + nMe.central + nMe.defence) / Math.max(1, nThem.control + nThem.central + nThem.defence);
  const aerial = nMe.aerial / Math.max(1, nThem.aerial);
  switch (m.id) {
    case 'halftime': return diff > 0 ? 'calm' : 'fire';
    case 'concededEarly': return power >= 1.02 ? 'pushUp' : nThem.line > 1.05 ? 'switchCounter' : 'patience';
    case 'redOwn': return diff < 0 ? 'keepGoing' : 'dropDeep';
    case 'redOpp': return diff > 0 ? 'wideOverload' : 'allIn';
    case 'injuryOwn': return diff < 0 ? 'moreAttack' : diff > 0 ? 'moreDefence' : 'likeForLike';
    case 'tiredStar': return diff >= 0 ? 'subNow' : 'keepHim';
    case 'bookedDefender': return diff >= 0 ? 'subBooked' : 'trust';
    case 'pressure': return diff === 0 && power >= 1 ? 'pressHigher' : aerial > 1.1 && diff < 0 ? 'longBalls' : 'dropDeep';
    case 'leadLate': return power >= 1.12 ? 'keepPlaying' : 'parkBus';
    case 'trailLate': return aerial > 1.12 ? 'longBallsTall' : 'extraStriker';
    case 'drawLate': return power >= 0.98 ? 'goForWin' : aerial > 1.1 ? 'setPieces' : 'takePoint';
    case 'oppChange': return them.mentality === 'offensiva' || them.mentality === 'tuttoattacco' ? 'exploit' : 'mirror';
    case 'bigLead': return 'restStars';
    case 'freekick': return aerial > 1.08 ? 'fkCross' : 'fkDirect';
    case 'penalty': return m.options[0]?.id;
    default: return null;
  }
}

/**
 * Il consiglio del vice su un momento aperto: il buon senso (le regole),
 * controllato su `runs` copie della partita. Il vice non è infallibile:
 * `accuracy` 0-1 dice quanto spesso il suo consiglio è quello giusto.
 */
export function adviseMoment(state, runs = 16, accuracy = 0.75, seedBase = 1) {
  if (!state.pending) return null;
  const me = state.user;
  const mine = userSide(state);
  const other = otherSide(state);
  const open = state.pending.options.filter((o) => !o.disabled);
  const ruled = rulePick(state, mine, other);
  const scores = open.map((opt) => {
    let pts = 0;
    for (let r = 0; r < runs; r++) {
      const c = cloneMatch(state);
      c.seed = (state.seed ^ (seedBase * 7919 + r * 104729)) >>> 0;
      c.draws = 0;
      c.pending = state.pending;
      c.user = me;
      decide(c, opt.id);
      /* da qui in poi niente altre domande: i cambi li fa il vice */
      c.user = null;
      c.autoUser = true;
      simulateToEnd(c);
      const [H, A] = c.sides;
      const g = me === 'home' ? H.goals - A.goals : A.goals - H.goals;
      pts += g > 0 ? 3 : g === 0 ? 1 : 0;
    }
    /* le regole valgono come mezzo punto di vantaggio: le copie sono poche e rumorose */
    return { id: opt.id, points: runs ? pts / runs : 0, rule: opt.id === ruled };
  });
  const best = [...scores].sort((a, b) => (b.points + (b.rule ? 0.5 : 0)) - (a.points + (a.rule ? 0.5 : 0)))[0];
  const rand = mulberry32((state.seed + state.minute * 31 + seedBase) >>> 0);
  const pick = rand() < accuracy ? best.id : open[Math.floor(rand() * open.length)].id;
  return { pick, scores };
}

/* ------------------------------------------------------------------ */
/* fino alla fine                                                       */
/* ------------------------------------------------------------------ */

export function simulateToEnd(state, onEvent = null) {
  let guard = 0;
  while (!state.finished && guard++ < 400) {
    if (state.pending) {
      /* senza utente: l'opzione che sceglierebbe un allenatore prudente */
      const opt = state.pending.options.find((o) => !o.disabled);
      decide(state, opt ? opt.id : null);
      continue;
    }
    maybeAnnounceAdded(state);
    const evs = step(state);
    if (onEvent) evs.forEach(onEvent);
  }
  return state;
}

/** un minuto per la partita dal vivo, con l'annuncio del recupero */
export function tick(state) {
  if (state.finished || state.pending) return [];
  maybeAnnounceAdded(state);
  return step(state);
}

/* ------------------------------------------------------------------ */
/* il voto in pagella                                                   */
/* ------------------------------------------------------------------ */

export function playerRatings(state) {
  const out = {};
  const [H, A] = state.sides;
  for (const s of state.sides) {
    const other = s === H ? A : H;
    const res = Math.sign(s.goals - other.goals);
    for (const [id, ps] of Object.entries(state.pstats)) {
      if (!s.byId.has(id) || ps.start == null) continue;
      const p = s.byId.get(id);
      const mins = Math.max(1, (ps.end ?? state.minute) - ps.start);
      let r = 6.0;
      r += ps.goals * (p.role === 'PUN' ? 0.95 : 1.15) + ps.assists * 0.7 + ps.keyPasses * 0.15;
      r += ps.tackles * 0.12 + ps.interceptions * 0.1 + ps.recoveries * 0.04 + ps.aerials * 0.05 + ps.blocks * 0.1;
      r += ps.saves * 0.28 + ps.penSaved * 1.2;
      r -= ps.errors * 0.9 + ps.yellow * 0.25 + ps.red * 1.6 + ps.penMissed * 0.8;
      if (['POR', 'DC', 'TZ'].includes(p.role)) r -= ps.conceded * (p.role === 'POR' ? 0.32 : 0.18);
      if (ps.cleanSheet) r += p.role === 'POR' ? 0.6 : 0.4;
      if (p.role === 'PUN' && ps.goals === 0) r -= 0.35;
      if (ps.shots >= 3 && ps.goals === 0) r -= 0.15;
      r += res * 0.3;
      r = 6 + (r - 6) * Math.min(1, 0.4 + mins / 90);
      out[id] = Math.round(clamp(r, 3.5, 10) * 10) / 10;
    }
  }
  return out;
}
