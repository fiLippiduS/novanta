/* CARRIERA — il giocatore e la sua crescita.
   Niente DOM qui dentro: una carriera si può simulare mille volte e
   controllare che i numeri abbiano senso.

   Ogni ruolo ha le sue doti. Un portiere non migliora il colpo di testa né
   la velocità: lavora su riflessi, presa, uscite, rinvio. Un centravanti non
   ha le parate. Le doti che si allenano sono solo quelle del ruolo. */

export const ROLES = ['POR', 'DC', 'TZ', 'MED', 'MEZ', 'ALA', 'PUN'];

/* sei doti per ruolo, con il loro peso nel valore complessivo */
export const ROLE_ATTRS = {
  POR: { reflexes: 0.24, handling: 0.18, positioning: 0.2, aerial: 0.14, distribution: 0.12, composure: 0.12 },
  DC: { marking: 0.22, tackling: 0.2, heading: 0.18, positioning: 0.18, strength: 0.12, passing: 0.1 },
  TZ: { pace: 0.2, stamina: 0.18, tackling: 0.18, crossing: 0.16, marking: 0.14, dribbling: 0.14 },
  MED: { tackling: 0.22, passing: 0.2, positioning: 0.18, stamina: 0.14, vision: 0.14, strength: 0.12 },
  MEZ: { passing: 0.2, stamina: 0.18, vision: 0.16, shooting: 0.16, dribbling: 0.16, tackling: 0.14 },
  ALA: { pace: 0.2, dribbling: 0.22, crossing: 0.14, finishing: 0.18, technique: 0.14, vision: 0.12 },
  PUN: { finishing: 0.26, positioning: 0.2, heading: 0.16, strength: 0.14, technique: 0.12, pace: 0.12 },
};

/* doti che l'età porta via prima, e doti che invece restano */
const PHYSICAL = new Set(['pace', 'stamina', 'strength', 'reflexes', 'aerial']);
const MENTAL = new Set(['positioning', 'vision', 'composure', 'passing', 'marking', 'distribution']);

export const STYLES = {
  POR: ['volante', 'linea', 'rigorista'],
  DC: ['marcatore', 'costruttore', 'libero'],
  TZ: ['fluidificante', 'bloccato', 'braccetto'],
  MED: ['diga', 'regista'],
  MEZ: ['incursore', 'tuttocampista'],
  ALA: ['saltatore', 'rientrante', 'assistman'],
  PUN: ['rapace', 'falsonueve', 'torre'],
};

/* lo stile spinge una dote e cambia il modo in cui produci la stagione */
export const STYLE_TRAITS = {
  volante:       { attr: 'distribution', goal: 0, assist: 0.05, save: 1.0, penSave: 1.0 },
  linea:         { attr: 'reflexes', goal: 0, assist: 0, save: 1.08, penSave: 1.0 },
  rigorista:     { attr: 'composure', goal: 0, assist: 0, save: 1.0, penSave: 1.45 },
  marcatore:     { attr: 'marking', goal: 0.2, assist: 0.1, save: 1.12, penSave: 0 },
  costruttore:   { attr: 'passing', goal: 0.15, assist: 0.35, save: 1.02, penSave: 0 },
  libero:        { attr: 'positioning', goal: 0.25, assist: 0.2, save: 1.08, penSave: 0 },
  fluidificante: { attr: 'stamina', goal: 0.3, assist: 0.8, save: 0.92, penSave: 0 },
  bloccato:      { attr: 'marking', goal: 0.1, assist: 0.2, save: 1.1, penSave: 0 },
  braccetto:     { attr: 'tackling', goal: 0.2, assist: 0.4, save: 1.04, penSave: 0 },
  diga:          { attr: 'tackling', goal: 0.15, assist: 0.25, save: 1.08, penSave: 0 },
  regista:       { attr: 'vision', goal: 0.25, assist: 0.8, save: 1.0, penSave: 0 },
  incursore:     { attr: 'shooting', goal: 0.75, assist: 0.55, save: 0.95, penSave: 0 },
  tuttocampista: { attr: 'stamina', goal: 0.45, assist: 0.6, save: 1.0, penSave: 0 },
  saltatore:     { attr: 'dribbling', goal: 0.8, assist: 0.95, save: 0.9, penSave: 0 },
  rientrante:    { attr: 'finishing', goal: 1.1, assist: 0.6, save: 0.9, penSave: 0 },
  assistman:     { attr: 'vision', goal: 0.45, assist: 1.3, save: 0.9, penSave: 0 },
  rapace:        { attr: 'finishing', goal: 1.6, assist: 0.3, save: 0.88, penSave: 0 },
  falsonueve:    { attr: 'technique', goal: 1.05, assist: 0.9, save: 0.88, penSave: 0 },
  torre:         { attr: 'heading', goal: 1.35, assist: 0.45, save: 0.9, penSave: 0 },
};

/* Gli idoli. Per ruolo, fra i più grandi e i più particolari: danno una
   spinta iniziale sulla dote per cui erano famosi e una piccola storia. */
export const IDOLS = {
  POR: [
    { id: 'buffon', name: 'Gianluigi Buffon', attr: 'composure' },
    { id: 'neuer', name: 'Manuel Neuer', attr: 'distribution' },
    { id: 'casillas', name: 'Iker Casillas', attr: 'reflexes' },
    { id: 'higuita', name: 'René Higuita', attr: 'distribution', quirk: 'showman' },
    { id: 'yashin', name: 'Lev Yashin', attr: 'positioning' },
  ],
  DC: [
    { id: 'maldini', name: 'Paolo Maldini', attr: 'positioning' },
    { id: 'baresi', name: 'Franco Baresi', attr: 'marking' },
    { id: 'ramos', name: 'Sergio Ramos', attr: 'heading', quirk: 'fiery' },
    { id: 'vandijk', name: 'Virgil van Dijk', attr: 'strength' },
    { id: 'beckenbauer', name: 'Franz Beckenbauer', attr: 'passing' },
  ],
  TZ: [
    { id: 'cafu', name: 'Cafu', attr: 'stamina' },
    { id: 'robertocarlos', name: 'Roberto Carlos', attr: 'pace', quirk: 'freekick' },
    { id: 'zanetti', name: 'Javier Zanetti', attr: 'stamina' },
    { id: 'lahm', name: 'Philipp Lahm', attr: 'tackling' },
    { id: 'alves', name: 'Dani Alves', attr: 'crossing' },
  ],
  MED: [
    { id: 'pirlo', name: 'Andrea Pirlo', attr: 'vision' },
    { id: 'makelele', name: 'Claude Makélélé', attr: 'tackling' },
    { id: 'busquets', name: 'Sergio Busquets', attr: 'positioning' },
    { id: 'kante', name: "N'Golo Kanté", attr: 'stamina' },
    { id: 'gattuso', name: 'Gennaro Gattuso', attr: 'tackling', quirk: 'fiery' },
  ],
  MEZ: [
    { id: 'modric', name: 'Luka Modrić', attr: 'vision' },
    { id: 'gerrard', name: 'Steven Gerrard', attr: 'shooting' },
    { id: 'iniesta', name: 'Andrés Iniesta', attr: 'dribbling' },
    { id: 'lampard', name: 'Frank Lampard', attr: 'shooting' },
    { id: 'nedved', name: 'Pavel Nedvěd', attr: 'stamina' },
  ],
  ALA: [
    { id: 'messi', name: 'Lionel Messi', attr: 'dribbling' },
    { id: 'ronaldo7', name: 'Cristiano Ronaldo', attr: 'finishing' },
    { id: 'ronaldinho', name: 'Ronaldinho', attr: 'technique', quirk: 'showman' },
    { id: 'robben', name: 'Arjen Robben', attr: 'finishing' },
    { id: 'garrincha', name: 'Garrincha', attr: 'dribbling', quirk: 'showman' },
  ],
  PUN: [
    { id: 'ronaldo9', name: 'Ronaldo', attr: 'pace' },
    { id: 'ibrahimovic', name: 'Zlatan Ibrahimović', attr: 'technique', quirk: 'fiery' },
    { id: 'inzaghi', name: 'Filippo Inzaghi', attr: 'positioning' },
    { id: 'haaland', name: 'Erling Haaland', attr: 'strength' },
    { id: 'batistuta', name: 'Gabriel Batistuta', attr: 'finishing' },
  ],
};

/* traguardi di una dote: a ottanta e a novanta si sblocca qualcosa di vero */
export const PERKS = {
  reflexes: { 80: 'catlike', 90: 'wall' },
  handling: { 85: 'safehands' },
  positioning: { 85: 'reader' },
  aerial: { 85: 'commander' },
  distribution: { 85: 'launcher' },
  composure: { 85: 'icecold' },
  marking: { 85: 'shadow' },
  tackling: { 85: 'enforcer' },
  heading: { 85: 'aerialthreat' },
  strength: { 85: 'rock' },
  passing: { 85: 'metronome' },
  pace: { 85: 'rocket' },
  stamina: { 85: 'engine' },
  crossing: { 85: 'cannon' },
  dribbling: { 85: 'magician' },
  vision: { 85: 'architect' },
  shooting: { 85: 'longrange' },
  finishing: { 80: 'poacher', 90: 'killer' },
  technique: { 85: 'artist' },
};

export function attrsOf(role) {
  return Object.keys(ROLE_ATTRS[role]);
}

export function overall(player) {
  const w = ROLE_ATTRS[player.role];
  return Math.round(Object.entries(w).reduce((n, [a, k]) => n + player.attrs[a] * k, 0));
}

/* carattere di partenza: rende diverse due carriere con le stesse scelte */
export const PERSONALITIES = ['leader', 'istintivo', 'professionista', 'ribelle', 'timido', 'ambizioso'];

export function createPlayer(rand, { name, role, style, number, nation, idol }) {
  const attrs = {};
  for (const a of attrsOf(role)) attrs[a] = 38 + Math.floor(rand() * 14);
  attrs[STYLE_TRAITS[style].attr] += 4;
  const idolInfo = (IDOLS[role] || []).find((i) => i.id === idol);
  if (idolInfo && attrs[idolInfo.attr] !== undefined) attrs[idolInfo.attr] += 5;

  return {
    v: 2,
    name, role, style, number, nation, idol: idol || null,
    personality: PERSONALITIES[Math.floor(rand() * PERSONALITIES.length)],
    age: 16,
    attrs,
    talent: 0.55 + rand() * 0.45,      // quanto lontano può arrivare: nascosto
    morale: 60,
    fitness: 90,
    reputation: 4,
    trust: 45,                         // quanto l'allenatore conta su di te
    flags: [],
    perks: [],
    training: { attr: null, level: 0 },
    national: { arc: false, called: false, caps: 0, goals: 0, captain: false, retired: false, standing: 0 },
    seasons: [],
    totals: emptyTotals(),
    retired: false,
  };
}

export function emptyTotals() {
  return {
    apps: 0, goals: 0, assists: 0, clean: 0, conceded: 0, penSaved: 0, tackles: 0,
    recoveries: 0, keyPasses: 0, dribbles: 0, aerials: 0, rating: 0, trophies: [],
  };
}

/* La curva dell'età: si cresce forte fino a vent'anni, si tiene il picco
   fra i ventisei e i trenta, poi il fisico comincia a scendere. Un portiere
   dura di più, e lo si vede qui. */
export function ageFactor(age, role) {
  const late = role === 'POR' ? 3 : 0;
  if (age <= 20) return 1.0;
  if (age <= 24) return 0.7;
  if (age <= 27) return 0.4;
  if (age <= 30 + late) return 0.1;
  if (age <= 32 + late) return -0.18;
  if (age <= 35 + late) return -0.5;
  return -0.9;
}

export function clampPlayer(player) {
  for (const a of Object.keys(player.attrs)) {
    player.attrs[a] = Math.max(20, Math.min(99, Math.round(player.attrs[a])));
  }
  for (const k of ['morale', 'reputation', 'trust']) {
    player[k] = Math.max(0, Math.min(100, Math.round(player[k])));
  }
  player.fitness = Math.max(20, Math.min(100, Math.round(player.fitness)));
}

/**
 * Crescita di fine stagione.
 * La dote allenata cresce il doppio, e il programma continuato più anni di
 * fila sale di livello: al terzo anno sulla stessa dote rende di più.
 * Restituisce le variazioni, così la schermata le mostra una per una.
 */
export function grow(rand, player, { minutesShare, quality }) {
  const f = ageFactor(player.age, player.role);
  const push = player.talent * (0.6 + minutesShare * 0.8) * (0.7 + quality * 0.6);
  const focus = player.training.attr;
  const level = player.training.level || 0;
  const before = { ...player.attrs };

  for (const a of attrsOf(player.role)) {
    let delta = f * push * (f >= 0 ? 3.1 + rand() * 2.3 : 2.4 + rand() * 2.0);
    if (a === focus) delta *= f >= 0 ? 1.9 + level * 0.15 : 0.45;     // a trent'anni allenarla serve a non perderla
    if (a === STYLE_TRAITS[player.style].attr) delta *= 1.2;
    if (f < 0 && PHYSICAL.has(a)) delta *= 1.5;
    if (f < 0 && MENTAL.has(a)) delta *= 0.3;
    /* più sei in alto, più costa salire: a novanta si sale solo col talento */
    if (f >= 0 && player.attrs[a] > 80) delta *= 0.55 * (0.6 + player.talent * 0.5);
    if (f >= 0 && player.attrs[a] > 87) delta *= 0.65;
    player.attrs[a] += delta;
  }
  clampPlayer(player);

  const changes = {};
  for (const a of attrsOf(player.role)) changes[a] = player.attrs[a] - before[a];
  return changes;
}

/** i traguardi raggiunti quest'anno */
export function unlockPerks(player) {
  const fresh = [];
  for (const a of attrsOf(player.role)) {
    const perks = PERKS[a] || {};
    for (const [threshold, perk] of Object.entries(perks)) {
      if (player.attrs[a] >= +threshold && !player.perks.includes(perk)) {
        player.perks.push(perk);
        fresh.push(perk);
      }
    }
  }
  return fresh;
}
