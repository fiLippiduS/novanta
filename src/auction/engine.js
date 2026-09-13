/* ASTA — le regole.
   Nessun DOM qui dentro: così si può simulare l'asta migliaia di volte
   e dimostrare che ogni rosa finisce sempre completa. */

import { shuffled } from '../core/rng.js';

export const ROLES = ['POR', 'DIF', 'CEN', 'ATT'];
export const NEED = { POR: 1, DIF: 2, CEN: 1, ATT: 1 };
export const START_CREDITS = 20;
export const BID_MS = 5000;

/* Quanto va tenuto da parte per ogni posto ancora libero.
   Con un solo credito di riserva si poteva bruciare quasi tutto il budget
   sul primo giocatore e finire l'asta con quattro comparse: l'asta smetteva
   di essere una scelta. Con due, spendere forte su uno si paga davvero. */
export const RESERVE_PER_SLOT = 2;

export function totalSlots() {
  return ROLES.reduce((n, r) => n + NEED[r], 0);
}

/**
 * I lotti: per ogni ruolo servono esattamente due giocatori per posto,
 * uno per partecipante. È questo a garantire che nessuno resti a metà.
 *
 * Il catalogo è largo (campioni e comprimari di ogni epoca). Ogni lotto
 * estrae prima una fascia, poi un giocatore di quella fascia: un campione
 * dal quinto più alto, un comprimario dal fondo, o uno di mezzo. Le fasce si
 * estraggono lotto per lotto, quindi un ruolo può avere un forte e un debole,
 * due forti da contendersi o due scarti su cui non vale la pena spendere.
 */
export const WEAK_MAX = 72;
export const STRONG_SHARE = 0.2;
export const TIER_ODDS = { strong: 0.35, weak: 0.35 };   // il resto: fascia di mezzo

export function buildLots(rand, catalog) {
  const lots = [];
  for (const role of ROLES) {
    const pool = catalog.filter((p) => p.role === role);
    const perVoto = [...pool].sort((a, b) => b.rating - a.rating);
    const alto = perVoto.slice(0, Math.max(NEED[role] * 2, Math.round(perVoto.length * STRONG_SHARE)));
    const basso = pool.filter((p) => p.rating <= WEAK_MAX && !alto.includes(p));
    const mezzo = pool.filter((p) => !alto.includes(p) && !basso.includes(p));

    const picked = [];
    while (picked.length < NEED[role] * 2) {
      const r = rand();
      const fascia = r < TIER_ODDS.strong ? alto : r < TIER_ODDS.strong + TIER_ODDS.weak ? basso : mezzo;
      /* se la fascia estratta è vuota o già esaurita, si pesca da tutto il ruolo */
      const liberi = fascia.filter((p) => !picked.includes(p));
      const scelta = liberi.length ? liberi : pool.filter((p) => !picked.includes(p));
      if (!scelta.length) break;
      picked.push(scelta[Math.floor(rand() * scelta.length)]);
    }

    picked.sort((a, b) => b.rating - a.rating);
    picked.forEach((player, i) => lots.push({ role, player, pair: Math.floor(i / 2) }));
  }
  return lots;
}

export function createTeam(name, human) {
  return {
    name,
    human,
    credits: START_CREDITS,
    squad: { POR: [], DIF: [], CEN: [], ATT: [] },
  };
}

export function needs(team, role) {
  return team.squad[role].length < NEED[role];
}

export function slotsLeft(team) {
  return ROLES.reduce((n, r) => n + (NEED[r] - team.squad[r].length), 0);
}

/**
 * Quanto può spendere al massimo su questo giocatore.
 * Due vincoli, e vale il più stretto dei due:
 *  1. deve restare almeno un credito per ogni posto ancora da riempire,
 *     altrimenti si arriva in fondo con una casella vuota;
 *  2. non si può impegnare la riserva degli altri posti, così il budget
 *     basta davvero per tutti e cinque i ruoli.
 * Con venti crediti e cinque posti si parte da un tetto di dodici.
 */
export function maxBid(team, role) {
  if (!needs(team, role)) return 0;
  const rest = slotsLeft(team) - 1;
  const tetto = team.credits - rest;                       // vincolo 1
  const quota = team.credits - rest * RESERVE_PER_SLOT;    // vincolo 2
  if (tetto <= 0) return 0;
  return Math.min(tetto, Math.max(1, quota));
}

export function canBid(team, role, price) {
  return maxBid(team, role) > price;
}

export function createAuction(rand, catalog, teams) {
  return {
    lots: buildLots(rand, catalog),
    teams,
    index: -1,
    current: null,
    history: [],
  };
}

/**
 * Apre il lotto successivo. Chi apre l'offerta si alterna, così nessuno
 * dei due ha sempre il vantaggio di parlare per ultimo.
 * Se un solo partecipante ha ancora bisogno di quel ruolo, il giocatore
 * è suo al prezzo minimo: non c'è asta da fare.
 */
export function openNext(auction) {
  auction.index += 1;
  if (auction.index >= auction.lots.length) {
    auction.current = null;
    return null;
  }
  const lot = auction.lots[auction.index];
  const [a, b] = auction.teams;
  const interested = auction.teams.filter((t) => needs(t, lot.role));

  if (interested.length === 0) {
    // non dovrebbe accadere: i lotti sono esattamente quanti i posti
    return openNext(auction);
  }

  const opener = interested.length === 1
    ? interested[0]
    : (auction.index % 2 === 0 ? a : b);

  auction.current = {
    ...lot,
    price: 1,
    leader: opener,
    uncontested: interested.length === 1,
    bids: [{ team: opener, price: 1 }],
  };
  return auction.current;
}

export function raise(auction, team) {
  const c = auction.current;
  if (!c || c.leader === team) return false;
  if (!canBid(team, c.role, c.price)) return false;
  c.price += 1;
  c.leader = team;
  c.bids.push({ team, price: c.price });
  return true;
}

/** chiude il lotto: il giocatore va a chi ha l'offerta più alta */
export function settle(auction) {
  const c = auction.current;
  if (!c) return null;
  const winner = c.leader;
  winner.credits -= c.price;
  winner.squad[c.role].push({ ...c.player, paid: c.price });
  const record = { player: c.player, role: c.role, price: c.price, winner };
  auction.history.push(record);
  auction.current = null;
  return record;
}

export function isComplete(team) {
  return ROLES.every((r) => team.squad[r].length === NEED[r]);
}

/** la formazione schierata, in ordine di ruolo */
export function lineup(team) {
  return ROLES.flatMap((r) => team.squad[r]);
}
