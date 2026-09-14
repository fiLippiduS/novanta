/* CARRIERA — il filo di una stagione, senza schermate.
   La scena lo usa per giocare, i test per simulare mille carriere: la
   logica è una sola, e quello che si collauda è quello che si gioca. */

import { createPlayer, attrsOf, overall, IDOLS } from './model.js';
import { NATION } from './nations.js';
import { playSeason, minutesShare } from './season.js';
import { pickDecisions, pickIncidents, applyEffects, offers } from './events.js';

export const CAREER_VERSION = 2;

export function retirementAge(role) { return role === 'POR' ? 41 : 38; }

function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }

/** nuova carriera: il giocatore, la storia della nazionale decisa qui */
export function newCareer(rand, draft, clubs) {
  const player = createPlayer(rand, draft);
  const nation = NATION.get(draft.nation);
  /* la nazionale entra solo nelle carriere di chi viene da una delle dieci
     nazionali più forti, e nemmeno in tutte */
  player.national.arc = Boolean(nation && nation.tier === 1 && rand() < 0.7);
  const small = clubs.filter((c) => c.tier >= 4);
  /* una delle tre offerte viene dal proprio paese, quando esiste */
  const home = small.filter((c) => c.code === draft.nation);
  const first = [];
  if (home.length) first.push(pick(rand, home));
  while (first.length < 3) {
    const c = pick(rand, small);
    if (!first.includes(c)) first.push(c);
  }
  return { v: CAREER_VERSION, player, club: null, seen: [], seenAt: {}, pending: null, lastResult: null, offersList: first };
}

export function signFor(state, club, { loan = false } = {}) {
  const prev = state.club;
  state.club = {
    ...club,
    cont: null, cwc: false, lastLeague: false, lastCup: false,
    loan,
    /* il prestito finisce: si torna alla squadra di prima */
    parent: loan && prev ? prev : null,
  };
  state.player.flags = state.player.flags.filter((f) => !['wantsOut', 'forceMove', 'wantsLoan', 'wantsLower', 'wantsExotic', 'wantsHome'].includes(f));
  state.player.trust = loan ? 55 : 45;
  state.offersList = null;
}

/** le opzioni di allenamento: tre doti del ruolo, sempre la dote in corso, più il riposo */
function focusOptions(rand, player) {
  const attrs = attrsOf(player.role);
  const current = player.training.attr;
  const others = attrs.filter((a) => a !== current).sort(() => rand() - 0.5);
  const list = current ? [current, ...others.slice(0, 2)] : others.slice(0, 3);
  return [...list, 'rest'];
}

export function beginSeason(state, rand, events) {
  const p = state.player;
  state.seenAt = state.seenAt || {};
  const decisions = pickDecisions(rand, events, p, state.club, state.seen, state.seenAt)
    .map((d) => ({ id: d.id, chosen: null, outcome: null }));
  decisions.forEach((d) => { state.seenAt[d.id] = p.seasons.length; if (!state.seen.includes(d.id)) state.seen.push(d.id); });
  state.pending = {
    focus: { options: focusOptions(rand, p), chosen: null },
    decisions,
    mods: {},
  };
  return state.pending;
}

export function chooseFocus(state, attr) {
  const p = state.player;
  const f = state.pending.focus;
  if (f.chosen) return;
  f.chosen = attr;
  if (attr === 'rest') {
    p.training = { attr: null, level: 0 };
    p.fitness = Math.min(100, p.fitness + 6);
    state.pending.mods.injuryRisk = (state.pending.mods.injuryRisk || 0) - 0.03;
  } else {
    const level = p.training.attr === attr ? Math.min(5, (p.training.level || 0) + 1) : 1;
    p.training = { attr, level };
  }
}

export function chooseOption(state, events, index, option, rand) {
  const slot = state.pending.decisions[index];
  if (!slot || slot.chosen !== null) return null;
  const ev = events.find((e) => e.id === slot.id);
  const res = applyEffects(rand, state.player, ev.o[option], state.pending.mods);
  slot.chosen = option;
  slot.outcome = res.outcome;
  if (!state.seen.includes(ev.id)) state.seen.push(ev.id);
  return res;
}

export function readyToPlay(state) {
  return state.pending && state.pending.focus.chosen && state.pending.decisions.every((d) => d.chosen !== null);
}

/* Ogni turno copre due stagioni: le scelte si fanno una volta, poi si giocano
   due anni di fila nella stessa squadra e solo dopo si apre il mercato. Una
   carriera intera resta ricca di decisioni ma dura la metà dei turni. */
export const SEASONS_PER_TURN = 2;

function playOne(state, rand, events, mods) {
  const p = state.player;
  const club = state.club;
  const incidents = pickIncidents(rand, events, p, club, state.seen, state.seenAt || {});
  incidents.forEach((ev) => {
    applyEffects(rand, p, ev.fx, mods);
    if (!state.seen.includes(ev.id)) state.seen.push(ev.id);
    state.seenAt[ev.id] = p.seasons.length;
  });
  const out = playSeason(rand, p, club, { mods });
  club.cont = out.next.cont;
  club.cwc = out.next.cwc;
  club.lastLeague = out.next.lastLeague;
  club.lastCup = out.next.lastCup;
  club.tier = out.next.tier;
  return { record: out.record, incidents: incidents.map((e) => e.id), share: out.share };
}

/**
 * Le due stagioni del turno. Quello che le scelte hanno raccontato (una
 * partita giocata, un gol, un infortunio affrettato) riguarda la prima; la
 * seconda si gioca con quello che la prima ha lasciato: doti, fiducia, forma.
 */
export function finishSeason(state, rand, events) {
  const first = playOne(state, rand, events, state.pending.mods);
  const seasons = [first];
  for (let k = 1; k < SEASONS_PER_TURN; k++) {
    /* l'annuncio del ritiro vale per il turno intero, ma nessuno gioca
       oltre l'età del ritiro */
    if (state.player.age > retirementAge(state.player.role)) break;
    seasons.push(playOne(state, rand, events, {}));
  }
  const last = seasons[seasons.length - 1];
  state.lastResult = {
    seasons: seasons.map(({ record, incidents }) => ({ record, incidents })),
    record: last.record,
    incidents: seasons.flatMap((x) => x.incidents),
    decisions: state.pending.decisions,
    focus: state.pending.focus.chosen,
    share: last.share,
  };
  state.pending = null;
  return state.lastResult;
}

/**
 * Il mercato di fine stagione. Prima però la carriera può finire: per età,
 * o perché quella appena giocata era stata annunciata come l'ultima.
 */
export function openMarket(state, rand, clubs) {
  const p = state.player;
  if (p.flags.includes('lastSeason') || p.age > retirementAge(p.role)) {
    p.retired = true;
    state.offersList = null;
    return null;
  }
  /* il prestito finisce a fine stagione: si torna a casa, poi il mercato */
  if (state.club.loan && state.club.parent) {
    const parent = state.club.parent;
    state.club = { ...parent, loan: false, parent: null };
  }
  const share = state.lastResult ? state.lastResult.share : minutesShare(p, state.club);
  state.offersList = offers(rand, clubs, p, state.club, overall(p), share);
  return state.offersList;
}

export function retire(state) {
  state.player.retired = true;
  state.offersList = null;
  state.pending = null;
}

/** il testo di un evento, con i segnaposto riempiti */
export function fillText(str, state, extra = {}) {
  if (!str) return '';
  const p = state.player;
  const idol = (IDOLS[p.role] || []).find((i) => i.id === p.idol);
  const values = {
    club: state.club ? state.club.name : '',
    idol: idol ? idol.name : '',
    name: p.name,
    caps: p.national.caps,
    ...extra,
  };
  return str.replace(/\{(\w+)\}/g, (m, k) => (values[k] !== undefined ? values[k] : m));
}
