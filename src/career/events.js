/* CARRIERA — che cosa ti succede quest'anno.
   Le decisioni le prendi tu, gli imprevisti no: è la differenza fra una
   carriera e un foglio di calcolo. */

import { shuffled } from '../core/rng.js';
import { clampAttrs } from './model.js';

/** l'evento è compatibile con la situazione attuale? */
export function fits(ev, player, club) {
  const w = ev.when || {};
  if (w.ageMin !== undefined && player.age < w.ageMin) return false;
  if (w.ageMax !== undefined && player.age > w.ageMax) return false;
  if (w.roles && !w.roles.includes(player.role)) return false;
  if (w.repMin !== undefined && player.reputation < w.repMin) return false;
  if (w.tierMin !== undefined && club.tier < w.tierMin) return false;
  if (w.tierMax !== undefined && club.tier > w.tierMax) return false;
  return true;
}

function pickWeighted(rand, pool, n) {
  const out = [];
  const bag = pool.slice();
  while (out.length < n && bag.length) {
    const total = bag.reduce((s, e) => s + (e.weight || 1), 0);
    let r = rand() * total;
    let i = 0;
    for (; i < bag.length; i++) { r -= bag[i].weight || 1; if (r <= 0) break; }
    out.push(bag.splice(Math.min(i, bag.length - 1), 1)[0]);
  }
  return out;
}

/**
 * Le decisioni dell'anno. La scelta sull'allenamento c'è sempre, perché è
 * quella che indirizza la crescita; le altre cambiano di stagione in stagione.
 */
export function pickDecisions(rand, all, player, club, seen, howMany = 3) {
  const usable = all.filter((e) => e.type === 'decision' && fits(e, player, club));
  const always = usable.filter((e) => e.id === 'focus');
  const rest = usable.filter((e) => e.id !== 'focus' && !seen.includes(e.id));
  return [...always, ...pickWeighted(rand, rest, Math.max(0, howMany - always.length))];
}

/** Gli imprevisti: da zero a due, e non li sceglie nessuno. */
export function pickIncidents(rand, all, player, club, seen) {
  const usable = all.filter((e) => e.type === 'incident'
    && fits(e, player, club) && !seen.includes(e.id));
  const n = rand() < 0.30 ? 0 : rand() < 0.82 ? 1 : 2;
  return pickWeighted(rand, usable, Math.min(n, usable.length));
}

/**
 * Applica gli effetti di una scelta o di un imprevisto.
 * Restituisce il focus di allenamento, se l'effetto lo imposta.
 */
export function applyEffects(player, effects = {}) {
  let focus = null;
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'focus') { focus = v; continue; }
    if (k === 'trait') { if (!player.traits.includes(v)) player.traits.push(v); continue; }
    if (k === 'injuryRisk') { player.pendingRisk = (player.pendingRisk || 0) + v; continue; }
    if (['tec', 'fis', 'men', 'vel'].includes(k)) { player.attrs[k] += v; continue; }
    if (k in player) player[k] += v;
  }
  /* Senza questa riga morale e condizione uscivano dalla scala appena due
     eventi tiravano nella stessa direzione. */
  clampAttrs(player);
  return focus;
}

/* ------------------------------------------------------------------ */
/*  Mercato                                                            */
/* ------------------------------------------------------------------ */

/** la fascia di squadra che ti puoi permettere, dati valore e fama */
export function reachableTier(player, ovr) {
  const r = player.reputation;
  if (ovr >= 83 && r >= 62) return 1;
  if (ovr >= 77 && r >= 42) return 2;
  if (ovr >= 69 && r >= 22) return 3;
  if (ovr >= 60) return 4;
  return 5;
}

/**
 * Due o tre offerte, più la scelta di restare.
 * A un ragazzo che non gioca arriva anche un prestito: è così che si cresce.
 */
export function offers(rand, clubs, player, club, ovr, share) {
  const target = reachableTier(player, ovr);
  const out = [];
  const usedCountries = new Set([club.country]);

  const tryTier = (tier, loan = false) => {
    const pool = clubs.filter((c) => c.tier === tier && c.id !== club.id
      && !out.some((o) => o.club.id === c.id));
    if (!pool.length) return;
    // due offerte dallo stesso paese sono una scelta più povera
    const fresh = pool.filter((c) => !usedCountries.has(c.country));
    const pick = shuffled(rand, fresh.length >= 3 ? fresh : pool)[0];
    usedCountries.add(pick.country);
    out.push({ club: pick, loan });
  };

  tryTier(target);
  tryTier(Math.max(1, target - 1));
  if (rand() < 0.6) tryTier(Math.min(5, target + 1));

  // se sei giovane e non giochi, qualcuno ti vuole in prestito per farti giocare
  if (player.age <= 21 && share < 0.35 && club.tier <= 3) {
    tryTier(Math.min(5, club.tier + 2), true);
  }

  return out.slice(0, 3);
}
