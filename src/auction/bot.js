/* L'avversario. Sa di calcio: valuta il giocatore, conta i posti che gli
   restano e non si fa portare via l'ultimo attaccante per un credito.
   Ma ha anche un carattere, così non è mai lo stesso avversario due volte. */

import { maxBid, needs, slotsLeft, NEED } from './engine.js';

/** un pizzico di personalità: chi spende subito e chi aspetta il fondo */
export function createBot(rand, name = 'Bot') {
  return {
    name,
    greed: 0.82 + rand() * 0.34,      // quanto è disposto a spingere
    patience: 0.35 + rand() * 0.4,    // quanto tarda a rilanciare
    bluff: rand() * 0.18,             // ogni tanto rilancia senza motivo
  };
}

/**
 * Quanto vale questo giocatore per il bot, in crediti.
 * Conta il voto rispetto al ruolo, quanto budget può ancora impegnare
 * e quanti giocatori di quel ruolo restano da assegnare.
 */
export function valuation(bot, team, lot, remainingOfRole) {
  if (!needs(team, lot.role)) return 0;

  const surplus = maxBid(team, lot.role);
  if (surplus <= 1) return surplus;

  // il catalogo va da 73 a 96: la qualità si legge su tutto l'arco,
  // altrimenti metà dei giocatori varrebbero uguale a zero
  const quality = Math.min(1, Math.max(0, (lot.player.rating - 74) / 22));

  // se restano esattamente tanti giocatori quanti i posti, quel giocatore
  // arriverà comunque: non serve svenarsi
  const stillNeeded = NEED[lot.role] - team.squad[lot.role].length;
  const scarcity = remainingOfRole <= stillNeeded ? 0.25 : 1;

  const share = (0.30 + 0.55 * quality) * bot.greed * scarcity;
  return Math.max(1, Math.min(surplus, Math.round(surplus * share)));
}

/**
 * Rilancia? Restituisce anche dopo quanti millisecondi lo farebbe,
 * perché un avversario che risponde all'istante non sembra vivo.
 */
export function decide(bot, team, current, remainingOfRole, rand) {
  if (current.leader === team) return null;
  const value = valuation(bot, team, current, remainingOfRole);
  const next = current.price + 1;

  const wants = next <= value || (rand() < bot.bluff && next <= value + 1);
  if (!wants) return null;

  // più il prezzo si avvicina al suo tetto, più il bot ci pensa
  const pressure = value > 0 ? next / value : 1;
  // con cinque secondi di finestra il bot può prendersi il suo tempo,
  // ma deve sempre rilanciare prima che scada
  const delay = 600 + bot.patience * 1400 + pressure * 1500 + rand() * 500;
  return { delay: Math.round(Math.min(3800, delay)) };
}

/** quello che il bot direbbe se potesse parlare: serve al taccuino rewarded */
export function scoutReport(bot, team, lots, fromIndex) {
  return lots.slice(fromIndex, fromIndex + 4).map((lot) => {
    const remaining = lots.slice(fromIndex).filter((l) => l.role === lot.role).length;
    return { player: lot.player, max: valuation(bot, team, lot, remaining) };
  });
}
