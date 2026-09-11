/* CARRIERA — il giocatore e la sua crescita.
   Niente DOM qui dentro: una carriera si può simulare mille volte e
   controllare che i numeri abbiano senso. */

export const ROLES = ['POR', 'DC', 'TZ', 'MED', 'MEZ', 'ALA', 'PUN'];

/* Ogni ruolo ha i suoi stili, e lo stile non è un'etichetta: cambia come
   crescono le statistiche e cosa ci si aspetta da te a fine stagione. */
export const STYLES = {
  POR: ['volante', 'linea', 'rigorista'],
  DC: ['marcatore', 'costruttore', 'libero'],
  TZ: ['fluidificante', 'bloccato', 'braccetto'],
  MED: ['diga', 'regista'],
  MEZ: ['incursore', 'tuttocampista'],
  ALA: ['saltatore', 'rientrante', 'assistman'],
  PUN: ['rapace', 'falsonueve', 'torre'],
};

/* peso delle quattro doti nel voto complessivo, ruolo per ruolo */
const WEIGHTS = {
  POR: { tec: 0.28, fis: 0.30, men: 0.32, vel: 0.10 },
  DC:  { tec: 0.20, fis: 0.36, men: 0.28, vel: 0.16 },
  TZ:  { tec: 0.24, fis: 0.24, men: 0.20, vel: 0.32 },
  MED: { tec: 0.28, fis: 0.26, men: 0.34, vel: 0.12 },
  MEZ: { tec: 0.30, fis: 0.26, men: 0.24, vel: 0.20 },
  ALA: { tec: 0.34, fis: 0.14, men: 0.18, vel: 0.34 },
  PUN: { tec: 0.32, fis: 0.24, men: 0.22, vel: 0.22 },
};

/* gol, assist e porta inviolata: quanto pesa lo stile su ciascuno,
   e su quale dote spinge la crescita */
export const STYLE_TRAITS = {
  volante:      { goal: 0.00, assist: 0.10, clean: 1.00, grow: 'tec' },
  linea:        { goal: 0.00, assist: 0.00, clean: 1.15, grow: 'men' },
  rigorista:    { goal: 0.02, assist: 0.00, clean: 1.05, grow: 'men' },
  marcatore:    { goal: 0.20, assist: 0.10, clean: 1.15, grow: 'fis' },
  costruttore:  { goal: 0.15, assist: 0.35, clean: 1.02, grow: 'tec' },
  libero:       { goal: 0.25, assist: 0.20, clean: 1.08, grow: 'men' },
  fluidificante:{ goal: 0.30, assist: 0.75, clean: 0.90, grow: 'vel' },
  bloccato:     { goal: 0.10, assist: 0.20, clean: 1.12, grow: 'fis' },
  braccetto:    { goal: 0.20, assist: 0.40, clean: 1.05, grow: 'men' },
  diga:         { goal: 0.15, assist: 0.25, clean: 1.10, grow: 'fis' },
  regista:      { goal: 0.25, assist: 0.80, clean: 1.00, grow: 'men' },
  incursore:    { goal: 0.75, assist: 0.55, clean: 0.92, grow: 'fis' },
  tuttocampista:{ goal: 0.45, assist: 0.60, clean: 1.00, grow: 'fis' },
  saltatore:    { goal: 0.80, assist: 0.95, clean: 0.88, grow: 'vel' },
  rientrante:   { goal: 1.10, assist: 0.60, clean: 0.88, grow: 'tec' },
  assistman:    { goal: 0.45, assist: 1.30, clean: 0.90, grow: 'tec' },
  rapace:       { goal: 1.60, assist: 0.30, clean: 0.85, grow: 'men' },
  falsonueve:   { goal: 1.05, assist: 0.90, clean: 0.85, grow: 'tec' },
  torre:        { goal: 1.35, assist: 0.45, clean: 0.88, grow: 'fis' },
};

export const ATTRS = ['tec', 'fis', 'men', 'vel'];

export function overall(player) {
  const w = WEIGHTS[player.role];
  return Math.round(ATTRS.reduce((n, a) => n + player.attrs[a] * w[a], 0));
}

/* Un sedicenne non è un fenomeno: si parte bassi e si cresce.
   Il talento è nascosto e decide quanto si può arrivare in alto. */
export function createPlayer(rand, { name, role, style, number, nation }) {
  const base = () => 38 + Math.floor(rand() * 14);
  const attrs = { tec: base(), fis: base(), men: base(), vel: base() };
  // lo stile dà un vantaggio di partenza sulla dote che lo caratterizza
  attrs[STYLE_TRAITS[style].grow] += 4;

  return {
    name, role, style, number, nation,
    age: 16,
    attrs,
    talent: 0.55 + rand() * 0.45,   // quanto lontano può arrivare
    morale: 60,
    fitness: 88,
    reputation: 5,
    injuredWeeks: 0,
    traits: [],
    club: null,
    seasons: [],
    totals: { apps: 0, goals: 0, assists: 0, clean: 0, trophies: [], rating: 0 },
    retired: false,
  };
}

/* La curva dell'età: si cresce forte fino a vent'anni, si tiene il picco
   fra i ventisette e i trenta, poi si comincia a scendere. */
export function ageFactor(age) {
  if (age <= 20) return 1.0;
  if (age <= 24) return 0.72;
  if (age <= 27) return 0.42;
  if (age <= 30) return 0.12;
  if (age <= 32) return -0.15;
  if (age <= 35) return -0.45;
  return -0.85;
}

export function clampAttrs(player) {
  for (const a of ATTRS) {
    player.attrs[a] = Math.max(20, Math.min(99, Math.round(player.attrs[a])));
  }
  player.morale = Math.max(0, Math.min(100, Math.round(player.morale)));
  player.fitness = Math.max(20, Math.min(100, Math.round(player.fitness)));
  player.reputation = Math.max(0, Math.min(100, Math.round(player.reputation)));
}

/**
 * Crescita di fine stagione.
 * focus: la dote su cui si è lavorato durante l'anno, scelta dall'utente.
 */
export function grow(rand, player, { focus, minutesShare, quality }) {
  const f = ageFactor(player.age);
  const push = player.talent * (0.6 + minutesShare * 0.8) * (0.7 + quality * 0.6);

  for (const a of ATTRS) {
    let delta = f * push * (2.6 + rand() * 2.2);
    if (a === focus) delta *= 1.7;
    if (a === STYLE_TRAITS[player.style].grow) delta *= 1.25;
    // le doti fisiche calano prima, la testa resta
    if (f < 0 && (a === 'vel' || a === 'fis')) delta *= 1.5;
    if (f < 0 && a === 'men') delta *= 0.25;
    player.attrs[a] += delta;
  }
  clampAttrs(player);
}
