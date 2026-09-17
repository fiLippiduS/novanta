/* ALLENATORE — i giocatori.
   Niente DOM: una rosa si può simulare per dieci stagioni e controllare che i
   numeri abbiano senso.

   Il voto (overall) non è un numero fisso: è la somma pesata delle doti del
   ruolo, e le doti si muovono con quello che il giocatore fa in campo e con
   le scelte dell'allenatore su di lui. */

import { fnv1a, mulberry32 } from '../core/rng.js';

export const ROLES = ['POR', 'DC', 'TZ', 'MED', 'CC', 'TRQ', 'ALA', 'PUN'];
export const DEPT = { POR: 'POR', DC: 'DIF', TZ: 'DIF', MED: 'CEN', CC: 'CEN', TRQ: 'CEN', ALA: 'ATT', PUN: 'ATT' };

export const ATTRS = [
  'pace', 'stamina', 'strength', 'tackling', 'marking', 'heading', 'passing', 'vision', 'technique',
  'dribbling', 'crossing', 'finishing', 'longshots', 'positioning', 'composure',
  'reflexes', 'handling', 'aerial', 'distribution',
];
const GK_ONLY = new Set(['reflexes', 'handling', 'aerial', 'distribution']);

/* le doti del ruolo e il loro peso nel voto */
export const ROLE_ATTRS = {
  POR: { reflexes: 0.26, handling: 0.18, positioning: 0.2, aerial: 0.14, distribution: 0.1, composure: 0.12 },
  DC: { marking: 0.22, tackling: 0.2, heading: 0.16, positioning: 0.18, strength: 0.12, passing: 0.06, pace: 0.06 },
  TZ: { pace: 0.18, stamina: 0.16, tackling: 0.18, crossing: 0.14, marking: 0.14, dribbling: 0.1, passing: 0.1 },
  MED: { tackling: 0.22, passing: 0.18, positioning: 0.18, stamina: 0.14, vision: 0.12, strength: 0.1, composure: 0.06 },
  CC: { passing: 0.2, stamina: 0.16, vision: 0.16, technique: 0.14, tackling: 0.12, dribbling: 0.1, longshots: 0.12 },
  TRQ: { vision: 0.22, passing: 0.18, technique: 0.18, dribbling: 0.16, longshots: 0.12, finishing: 0.08, composure: 0.06 },
  ALA: { pace: 0.2, dribbling: 0.22, crossing: 0.14, finishing: 0.14, technique: 0.14, vision: 0.08, stamina: 0.08 },
  PUN: { finishing: 0.26, positioning: 0.2, heading: 0.14, strength: 0.12, technique: 0.1, pace: 0.1, composure: 0.08 },
};

/* quanto rende un giocatore fuori dal suo ruolo */
const FIT = {
  POR: { POR: 1 },
  DC: { DC: 1, TZ: 0.86, MED: 0.84 },
  TZ: { TZ: 1, DC: 0.84, ALA: 0.82, MED: 0.74, CC: 0.72 },
  MED: { MED: 1, CC: 0.94, DC: 0.82, TRQ: 0.76, TZ: 0.7 },
  CC: { CC: 1, MED: 0.92, TRQ: 0.9, ALA: 0.76, TZ: 0.7 },
  TRQ: { TRQ: 1, CC: 0.9, ALA: 0.86, PUN: 0.82, MED: 0.74 },
  ALA: { ALA: 1, TRQ: 0.86, PUN: 0.84, TZ: 0.76, CC: 0.74 },
  PUN: { PUN: 1, ALA: 0.84, TRQ: 0.8 },
};
export function roleFit(natural, slot, extra = []) {
  if (natural === slot) return 1;
  if (extra.includes(slot)) return 0.95;
  if (slot === 'POR' || natural === 'POR') return 0.25;
  return FIT[natural]?.[slot] ?? 0.62;
}

export const PERSONALITIES = ['professionista', 'leader', 'ribelle', 'fragile', 'ambizioso', 'pigro'];
const PERSONALITY_W = [30, 12, 12, 14, 18, 14];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function overallOf(attrs, role) {
  const w = ROLE_ATTRS[role];
  let s = 0;
  for (const k in w) s += (attrs[k] ?? 50) * w[k];
  return Math.round(s);
}

/* ------------------------------------------------------------------ */
/* dalla riga dei dati al giocatore vivo                                */
/* ------------------------------------------------------------------ */

/**
 * Riga di data/manager/squads-*.json:
 * [nome, nascita, nazione, ruolo, voto, numero, lato, altezza, presenze in nazionale, bandierine, fama]
 * Le doti nascono dal voto e dal ruolo, con un seme legato al nome: lo stesso
 * giocatore ha le stesse doti su ogni telefono.
 */
export function playerFromRow(row, clubId, season) {
  const [name, birth, nation, role, rating, number, side, height, caps, flags, fame] = row;
  const rand = mulberry32(fnv1a(`${name}|${birth}`));
  const age = season - birth;
  const attrs = {};
  const w = ROLE_ATTRS[role];
  for (const k of ATTRS) {
    const inRole = k in w;
    let v;
    if (role === 'POR') v = GK_ONLY.has(k) || k === 'positioning' || k === 'composure' ? rating : rating - 30;
    else if (GK_ONLY.has(k)) v = 18 + rand() * 14;
    else v = inRole ? rating : rating - 12 - rand() * 14;
    v += (rand() - 0.5) * (inRole ? 14 : 18);
    attrs[k] = v;
  }
  /* il fisico: l'altezza dà testa e forza, toglie un po' di rapidità */
  if (height) {
    const d = (height - 182) / 8;
    attrs.heading += d * 5; attrs.strength += d * 3; attrs.aerial += d * 5; attrs.pace -= d * 2.5;
  }
  /* l'età: gambe da ragazzo, testa da veterano */
  const young = clamp((24 - age) / 6, 0, 1);
  const old = clamp((age - 30) / 5, 0, 1);
  attrs.pace += young * 4 - old * 8; attrs.stamina += young * 3 - old * 6;
  attrs.composure += -young * 6 + old * 5; attrs.positioning += -young * 4 + old * 4; attrs.vision += old * 3;
  /* si riporta la media del ruolo esattamente al voto di partenza */
  for (let pass = 0; pass < 3; pass++) {
    const diff = rating - overallOf(attrs, role);
    for (const k in w) attrs[k] += diff;
  }
  for (const k of ATTRS) attrs[k] = Math.round(clamp(attrs[k], 8, 99));

  rand(); // il vecchio seme del talento: si consuma per non cambiare le personalità
  let pers = rand() * PERSONALITY_W.reduce((a, b) => a + b, 0);
  let personality = PERSONALITIES[0];
  for (let i = 0; i < PERSONALITIES.length; i++) { pers -= PERSONALITY_W[i]; if (pers <= 0) { personality = PERSONALITIES[i]; break; } }
  if (flags.includes('c')) personality = 'leader';

  const ovr = overallOf(attrs, role);
  const curve = careerCurve({ name, birth, role, ovr, fame: fame || 0 }, season);
  return {
    id: `${clubId}:${fnv1a(`${name}|${birth}`).toString(36)}`,
    name,
    birth,
    nation,
    role,
    side: side || '',
    extra: [],
    number,
    height: height || 0,
    caps,
    fame: fame || 0,
    attrs,
    ovr,
    potential: curve.potential,
    peakAge: curve.peakAge,
    declineAge: curve.declineAge,
    personality,
    consistency: Math.round(40 + rand() * 55),
    injuryProne: Math.round(rand() * 100),
    morale: 70,
    form: 0,
    fitness: 100,
    injury: 0,
    suspended: 0,
    yellows: 0,
    contract: season + 1 + Math.floor(rand() * 4) + (age < 24 ? 1 : 0),
    wage: wageFor(ovr, age),
    captain: flags.includes('c'),
    loanIn: flags.includes('i'),
    loanOut: flags.includes('o'),
    youth: flags.includes('y'),
    club: clubId,
    stats: emptyStats(),
    history: [],
    bond: 50,
    flags: [],
  };
}

/* ------------------------------------------------------------------ */
/* potenziale e curva della carriera                                    */
/* ------------------------------------------------------------------ */

/* l'età del massimo, in media, per ruolo: i portieri maturano tardi, le ali presto */
const PEAK_AGE = { POR: 30, DC: 28, TZ: 27, MED: 28, CC: 27.5, TRQ: 27, ALA: 26.5, PUN: 27 };
/* quanti punti cresce in un anno, a quell'età, un talento nella media */
const GROWTH_AT = { 15: 4.6, 16: 4.5, 17: 4.2, 18: 3.8, 19: 3.3, 20: 2.8, 21: 2.3, 22: 1.75, 23: 1.3, 24: 0.9, 25: 0.6, 26: 0.35, 27: 0.2, 28: 0.1, 29: 0.05 };

/**
 * La curva di un giocatore: a che età arriva al massimo, quando comincia a
 * calare e dove può arrivare. Dipende dal ruolo, dall'età, da quanto è già
 * forte per la sua età (un diciannovenne da 78 è un fenomeno, uno da 60 no),
 * dalla fama e da un talento nascosto legato al nome: stesso giocatore,
 * stessa curva su ogni telefono.
 */
export function careerCurve({ name, birth, role, ovr, fame = 0 }, season) {
  const rand = mulberry32(fnv1a(`${name}|${birth}|curve`));
  const age = season - birth;
  const peakAge = Math.round((PEAK_AGE[role] + (rand() - 0.5) * 3) * 10) / 10;
  const declineAge = Math.round(peakAge + 2 + rand() * 2.5 + (role === 'POR' ? 1.5 : 0));
  const t = rand();
  let mult = 0.35 + 0.95 * t ** 1.8;
  /* chi è già forte per la sua età ha quasi sempre un talento vero */
  const norm = 64 + clamp(age - 17, 0, 6) * 1.6;
  const precocity = clamp((ovr - norm) / 12, -1, 1.5);
  if (age <= 23 && precocity > 0) {
    mult *= 1 + precocity * 0.35;
    if (precocity > 0.5) mult = Math.max(mult, 0.6 + precocity * 0.35);
  }
  if (fame >= 95) mult *= 1.14; else if (fame > 60) mult *= 1.06;
  let growth = 0;
  for (let a = Math.max(15, age); a < Math.floor(peakAge); a++) growth += GROWTH_AT[a] ?? 0;
  /* vicino al vertice si cresce meno: da 85 a 90 è più difficile che da 60 a 65 */
  growth *= mult * clamp((99 - ovr) / 28, 0.2, 1);
  /* sopra 87 arrivano solo i fenomeni */
  let top = ovr + growth;
  if (top > 87) top = 87 + (top - 87) * 0.55;
  const potential = age >= declineAge ? ovr : Math.round(clamp(top, ovr, 95));
  return { peakAge, declineAge, potential, talent: Math.round(t * 100) };
}

/** la fase della carriera: talento, in crescita, al massimo, in declino */
export function careerPhase(p, season) {
  const age = ageOf(p, season);
  const gap = p.potential - p.ovr;
  if (age >= (p.declineAge ?? 31)) return 'declining';
  if (age <= 21 && gap >= 6 && p.potential >= 80) return 'talent';
  if (gap >= 2 && age < (p.peakAge ?? 27)) return 'growing';
  return 'peak';
}

/**
 * Il potenziale come lo vedono gli osservatori: una forchetta che contiene
 * sempre quello vero, larga per i ragazzi e per i giocatori degli altri,
 * stretta per i propri e con uno staff bravo. Chi è in declino non ha forchetta.
 */
export function potentialRange(p, season, { own = false, staff = 50 } = {}) {
  const age = ageOf(p, season);
  if (age >= (p.declineAge ?? 31) || p.potential <= p.ovr) return { lo: p.ovr, hi: p.ovr, exact: true };
  const base = age <= 19 ? 8 : age <= 21 ? 6 : age <= 24 ? 4 : 2;
  const width = Math.max(0, Math.round(base * (own ? 0.45 : 1) * (1.3 - clamp(staff, 0, 100) * 0.006)));
  if (width === 0) return { lo: p.potential, hi: p.potential, exact: true };
  /* l'errore dell'osservatore: fisso per giocatore, così la forchetta non balla */
  const shift = Math.round(((fnv1a(`${p.name}|${p.birth}|scout`) % 1000) / 1000 - 0.5) * width);
  const lo = Math.max(p.ovr, p.potential + shift - Math.ceil(width / 2));
  const hi = Math.min(95, p.potential + shift + Math.floor(width / 2));
  return { lo: Math.min(lo, p.potential), hi: Math.max(hi, p.potential), exact: false };
}

export function emptyStats() {
  return {
    apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, shots: 0, keyPasses: 0,
    tackles: 0, interceptions: 0, recoveries: 0, aerials: 0, saves: 0, cleanSheets: 0,
    conceded: 0, penSaved: 0, errors: 0, yellows: 0, reds: 0, ratingSum: 0, motm: 0,
  };
}

export const ageOf = (p, season) => season - p.birth;

/* ------------------------------------------------------------------ */
/* soldi                                                               */
/* ------------------------------------------------------------------ */

/** milioni di euro */
export function valueOf(p, season) {
  const age = ageOf(p, season);
  /* si paga quello che è oggi più una parte di quello che diventerà: tanto più giovane, tanto più conta il futuro */
  const future = clamp(p.potential - p.ovr, 0, 30) * (age <= 19 ? 0.45 : age <= 21 ? 0.4 : age <= 24 ? 0.3 : 0.15);
  const base = Math.exp((p.ovr + future - 60) * 0.19) * 0.6;
  const ageMult = age <= 21 ? 1.5 : age <= 25 ? 1.25 : age <= 28 ? 1 : age <= 30 ? 0.72 : age <= 32 ? 0.45 : 0.25;
  const pot = 1;
  /* contratto in scadenza: il club incassa meno, perché a zero lo perderebbe */
  const left = p.contract - season;
  const contract = left <= 0 ? 0.5 : left === 1 ? 0.7 : left === 2 ? 0.87 : 1;
  return Math.max(0.05, Math.round(base * ageMult * pot * contract * 20) / 20);
}

/** milioni di euro l'anno */
export function wageFor(ovr, age) {
  const w = Math.exp((ovr - 60) * 0.14) * 0.25 * (age >= 31 ? 1.1 : 1);
  return Math.round(Math.max(0.05, w) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* rendimento effettivo                                                 */
/* ------------------------------------------------------------------ */

/** quanto rende oggi, fra 0.6 e 1.12: forma, morale e fiato */
export function readiness(p) {
  const form = clamp(p.form, -10, 10) * 0.006;
  const morale = (p.morale - 60) * 0.0009;
  const fit = p.fitness >= 80 ? 0 : (p.fitness - 80) * 0.0045;
  return clamp(1 + form + morale + fit, 0.6, 1.12);
}

/** una dote come la vede la partita, già pesata sullo stato del giocatore */
export const attr = (p, k) => (p.attrs[k] ?? 40) * readiness(p);

/* ------------------------------------------------------------------ */
/* crescita: le doti si muovono con quello che fai                      */
/* ------------------------------------------------------------------ */

/* le statistiche del ruolo e le doti che allenano */
const STAT_ATTRS = {
  goals: ['finishing', 'composure'],
  assists: ['passing', 'vision', 'crossing'],
  keyPasses: ['vision', 'passing'],
  tackles: ['tackling', 'marking'],
  interceptions: ['positioning', 'marking'],
  recoveries: ['positioning', 'stamina', 'tackling'],
  aerials: ['heading', 'strength'],
  saves: ['reflexes', 'handling'],
  cleanSheets: ['positioning', 'composure'],
};
/* quanto vale una statistica, per ruolo, ogni novanta minuti: le medie vere dei
   titolari nelle partite simulate (tools/manager/norms), così un titolare nella
   media resta com'è e cresce solo chi fa meglio del suo ruolo */
export const ROLE_NORMS = {
  POR: { saves: 2.97, cleanSheets: 0.26 },
  DC: { tackles: 1.12, interceptions: 1.3, aerials: 0.52, cleanSheets: 0.25, goals: 0.04 },
  TZ: { tackles: 0.81, interceptions: 0.91, assists: 0.11, keyPasses: 1.02, recoveries: 1.01 },
  MED: { tackles: 0.86, interceptions: 0.97, recoveries: 1.53, keyPasses: 0.7, assists: 0.09 },
  CC: { tackles: 0.63, recoveries: 1.25, keyPasses: 1.48, assists: 0.16, goals: 0.08 },
  TRQ: { keyPasses: 1.88, assists: 0.2, goals: 0.2, recoveries: 0.4 },
  ALA: { keyPasses: 1.92, assists: 0.21, goals: 0.21, recoveries: 0.42 },
  PUN: { goals: 0.41, assists: 0.08, aerials: 0.17, keyPasses: 0.65 },
};
/* il voto medio di un titolare per ruolo: sopra si cresce, sotto si cala */
export const ROLE_PIVOT = { POR: 6.69, DC: 6.19, TZ: 6.3, MED: 6.41, CC: 6.54, TRQ: 6.58, ALA: 6.7, PUN: 6.22 };

function nudge(p, k, amount) {
  if (!(k in p.attrs)) return;
  p.attrs[k] = clamp(Math.round((p.attrs[k] + amount) * 10) / 10, 8, 99);
}

/**
 * Un blocco di giornate (window) chiuso: le doti del ruolo salgono o scendono
 * secondo il voto medio, le statistiche chiave, i minuti e l'età.
 * `recent` sono le statistiche del blocco; `scale` 1 per un blocco di cinque
 * giornate, di più a fine stagione.
 */
export function evolve(rand, p, recent, season, scale = 1) {
  const age = ageOf(p, season);
  const before = p.ovr;
  const w = ROLE_ATTRS[p.role];
  const mins = recent.minutes || 0;
  const played = mins / 90;
  const avg = recent.apps ? recent.ratingSum / recent.apps : 0;

  /* 1. la curva: si cresce verso il potenziale fino al picco (di più giocando),
     poi si resta al massimo, poi si cala, prima e più forte senza disciplina */
  const peakAge = p.peakAge ?? 27;
  const declineAge = p.declineAge ?? 31;
  const room = Math.max(0, p.potential - p.ovr);
  const minutesShare = clamp(mins / (450 * scale), 0, 1);
  let base = 0;
  if (age < peakAge) {
    const rate = age <= 21 ? 0.05 : age <= 24 ? 0.04 : 0.03;
    base += room * rate * (0.3 + 0.7 * minutesShare) * scale;
  }
  if (age >= declineAge) {
    const care = { professionista: 0.7, leader: 0.9, pigro: 1.3, ribelle: 1.15 }[p.personality] || 1;
    base -= (0.08 + (age - declineAge) * 0.06) * scale * care;
  }
  if (age <= 23 && played < 0.5 * scale) base -= 0.04 * scale; // chi non gioca mai si arrugginisce

  /* 2. il rendimento: il voto medio pesa più di tutto */
  const perf = played >= 1 ? clamp((avg - ROLE_PIVOT[p.role]) * 0.38, -0.7, 0.8) * Math.min(1, played / (3 * scale)) * scale : 0;

  /* 3. le statistiche del ruolo: sopra la media del ruolo allenano le doti */
  const norms = ROLE_NORMS[p.role];
  const byAttr = {};
  if (played >= 1) {
    for (const [stat, norm] of Object.entries(norms)) {
      const per90 = (recent[stat] || 0) / played;
      const ratio = clamp(per90 / norm - 1, -1, 1.5);
      for (const k of STAT_ATTRS[stat]) byAttr[k] = (byAttr[k] || 0) + ratio * 0.16 * scale;
    }
  }
  /* la personalità cambia quanto rendono gli stimoli */
  const drive = { professionista: 1.15, ambizioso: 1.1, leader: 1, ribelle: 0.95, fragile: 0.9, pigro: 0.75 }[p.personality] || 1;

  /* il tetto: al massimo due punti sopra il potenziale, che si aggiorna solo a fine stagione */
  const ceiling = Math.min(95, p.potential + 1);
  const capped = p.ovr >= ceiling;
  for (const k in w) {
    const noise = (rand() - 0.5) * 0.3 * scale;
    const delta = (base + perf) * drive + (byAttr[k] || 0) * drive + noise;
    nudge(p, k, capped ? Math.min(0, delta) : delta);
  }
  if (age >= declineAge - 1) { nudge(p, 'pace', -0.12 * scale); nudge(p, 'stamina', -0.1 * scale); }
  capOverall(p, ceiling);
  if (age >= declineAge) p.potential = Math.min(p.potential, p.ovr); // in declino il tetto scende con lui
  return p.ovr - before;
}

/* riporta il voto sotto il tetto togliendo dalle doti del ruolo */
function capOverall(p, ceiling) {
  p.ovr = overallOf(p.attrs, p.role);
  for (let i = 0; i < 4 && p.ovr > ceiling; i++) {
    for (const k in ROLE_ATTRS[p.role]) nudge(p, k, -(p.ovr - ceiling));
    p.ovr = overallOf(p.attrs, p.role);
  }
}

/**
 * A fine stagione il potenziale dei giovani si aggiorna: chi gioca bene e
 * tanto alza il tetto, chi non vede il campo lo abbassa. I prestiti contano
 * come minuti giocati altrove.
 */
export function revisePotential(rand, p, season) {
  const age = ageOf(p, season);
  const before = p.potential;
  /* in declino il tetto scende con il voto */
  if (age >= (p.declineAge ?? 31)) { p.potential = Math.min(p.potential, p.ovr); return p.potential - before; }
  if (age >= (p.peakAge ?? 27)) return 0; // al picco il tetto non si sposta: si oscilla attorno
  const gained = p.potentialGain || 0;
  /* un ragazzo che esplode oltre le attese alza il tetto fin dove è arrivato */
  if (age <= 23 && p.ovr > p.potential) p.potential = Math.min(p.ovr, p.potential + Math.max(0, 5 - gained));
  const st = p.stats || {};
  const avg = st.apps ? st.ratingSum / st.apps : 0;
  let d = 0;
  if (p.loanOut) d += rand() < 0.45 ? 1 : 0;
  else if (st.apps >= 10 && st.minutes >= 900) d += clamp(Math.round((avg - ROLE_PIVOT[p.role] - 0.1) * 2.4 + (rand() - 0.5)), -2, 2);
  else if (age <= 23 && (st.minutes || 0) < 450) d -= rand() < 0.6 ? 1 : 0;
  /* in carriera il tetto sale al massimo di cinque punti rispetto alle previsioni */
  if (d > 0) d = Math.max(0, Math.min(d, 5 - gained - (p.potential - before)));
  const young = age <= 21 ? 1 : 0.6;
  p.potential = Math.round(clamp(p.potential + d * young, Math.min(p.ovr, p.potential), 95));
  if (p.potential > before) p.potentialGain = gained + (p.potential - before);
  return p.potential - before;
}

/**
 * Una scelta dell'allenatore su un giocatore: sposta doti, potenziale,
 * morale e legame. `fx` è quello scritto negli eventi.
 */
export function applyPlayerFx(p, fx = {}, season) {
  const out = { ovr: 0 };
  const before = p.ovr;
  if (fx.attrs) for (const [k, v] of Object.entries(fx.attrs)) {
    if (k === 'role') { for (const a in ROLE_ATTRS[p.role]) nudge(p, a, v); continue; }
    nudge(p, k, v);
  }
  if (fx.potential) p.potential = clamp(p.potential + fx.potential, 40, 95);
  if (fx.morale) p.morale = clamp(p.morale + fx.morale, 0, 100);
  if (fx.form) p.form = clamp(p.form + fx.form, -10, 10);
  if (fx.fitness) p.fitness = clamp(p.fitness + fx.fitness, 0, 100);
  if (fx.bond) p.bond = clamp(p.bond + fx.bond, 0, 100);
  if (fx.injury) p.injury = Math.max(p.injury, fx.injury);
  if (fx.injuryProne) p.injuryProne = clamp(p.injuryProne + fx.injuryProne, 0, 100);
  if (fx.consistency) p.consistency = clamp(p.consistency + fx.consistency, 0, 100);
  if (fx.newRole && ROLE_ATTRS[fx.newRole]) {
    if (!p.extra.includes(p.role)) p.extra.push(p.role);
    p.role = fx.newRole;
    p.extra = p.extra.filter((r) => r !== p.role);
  }
  if (fx.contract) p.contract += fx.contract;
  if (fx.wage) p.wage = Math.round(p.wage * (1 + fx.wage) * 100) / 100;
  if (fx.flag) p.flags = [...new Set([...p.flags, fx.flag])];
  if (fx.unflag) p.flags = p.flags.filter((f) => f !== fx.unflag);
  capOverall(p, 95);
  if (p.ovr > p.potential && ageOf(p, season) <= 24) p.potential = p.ovr;
  out.ovr = p.ovr - before;
  return out;
}

/* ------------------------------------------------------------------ */
/* tra una partita e l'altra                                           */
/* ------------------------------------------------------------------ */

/** giorni di riposo prima della prossima partita: il fiato torna, gli infortuni guariscono */
export function recover(p, days = 7, season = null) {
  /* il fiato torna in fretta all'inizio e piano alla fine: chi gioca sempre
     resta sotto il 100% (circa 85-93 secondo resistenza ed età), chi gioca
     anche in coppa cala, e il turnover conta */
  const week = clamp(0.5 + (p.attrs.stamina || 60) / 500, 0.5, 0.7) * (season && season - p.birth >= 32 ? 0.9 : 1);
  const share = 1 - (1 - week) ** (days / 7);
  p.fitness = clamp(p.fitness + (100 - p.fitness) * share, 0, 100);
  if (p.fitness > 99) p.fitness = 100;
  p.form = p.form * 0.82;
  p.morale += (70 - p.morale) * 0.06;
}
