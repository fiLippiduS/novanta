/* ALLENATORE — formazione automatica.
   Serve alle squadre del computer e come proposta iniziale all'utente:
   per ogni posto del modulo il giocatore disponibile che ci rende di più,
   partendo dai posti più difficili da coprire (portiere, poi i ruoli rari). */

import { FORMATIONS, STYLES, playerAffinity } from './tactics.js';
import { roleFit, readiness } from './players.js';

export const available = (p) => !p.injury && !p.suspended && !p.loanOut;

/** quanto vale un giocatore in un posto, oggi */
export function slotScore(p, role, styleId = null) {
  const fit = roleFit(p.role, role, p.extra);
  const aff = styleId ? 0.94 + playerAffinity(p, styleId) * 0.0012 : 1;
  const fresh = p.fitness >= 75 ? 1 : 0.8 + p.fitness * 0.0027;
  return p.ovr * fit * readiness(p) * aff * fresh;
}

/**
 * { lineup: [11 id nell'ordine dei posti], bench: [fino a 9 id] }
 * `rotate` 0-1: quanto pesa il fiato (le squadre con coppe fanno turnover)
 */
export function autoLineup(players, formation, styleId = 'equilibrio', { rotate = 0.5, benchSize = 9, locked = {} } = {}) {
  const slots = FORMATIONS[formation];
  const pool = players.filter(available);
  const taken = new Set();
  const lineup = new Array(slots.length).fill(null);
  for (const [i, id] of Object.entries(locked)) {
    if (pool.some((p) => p.id === id)) { lineup[i] = id; taken.add(id); }
  }
  const scarcity = (role) => pool.filter((p) => roleFit(p.role, role, p.extra) >= 0.95).length;
  const order = slots.map((s, i) => i).filter((i) => !lineup[i]).sort((a, b) => scarcity(slots[a].role) - scarcity(slots[b].role));
  for (const i of order) {
    const role = slots[i].role;
    let best = null; let bestScore = -1;
    for (const p of pool) {
      if (taken.has(p.id)) continue;
      const tiredPenalty = p.fitness < 80 ? (80 - p.fitness) * 0.35 * rotate : 0;
      const score = slotScore(p, role, styleId) - tiredPenalty;
      if (score > bestScore) { best = p; bestScore = score; }
    }
    if (best) { lineup[i] = best.id; taken.add(best.id); }
  }
  /* panchina: un portiere, poi un cambio per reparto, poi i migliori */
  const rest = pool.filter((p) => !taken.has(p.id)).sort((a, b) => b.ovr * readiness(b) - a.ovr * readiness(a));
  const bench = [];
  const want = ['POR', 'DC', 'TZ', 'MED', 'CC', 'ALA', 'PUN'];
  for (const r of want) {
    const p = rest.find((x) => !bench.includes(x.id) && roleFit(x.role, r, x.extra) >= 0.95);
    if (p && bench.length < benchSize) bench.push(p.id);
  }
  for (const p of rest) if (bench.length < benchSize && !bench.includes(p.id)) bench.push(p.id);
  return { lineup: lineup.filter(Boolean).length === slots.length ? lineup : fillHoles(lineup, pool, taken), bench };
}

function fillHoles(lineup, pool, taken) {
  return lineup.map((id) => {
    if (id) return id;
    const p = pool.find((x) => !taken.has(x.id));
    if (p) { taken.add(p.id); return p.id; }
    return null;
  }).filter(Boolean);
}

/** il modulo e lo stile che un allenatore del computer sceglierebbe per questa rosa */
export function aiTactics(players, rand = Math.random) {
  const pool = players.filter(available);
  const count = (roles) => pool.filter((p) => roles.includes(p.role) && p.ovr >= median(pool)).length;
  const wingers = count(['ALA']);
  const cbs = count(['DC']);
  const trq = count(['TRQ']);
  let formation = '4-3-3';
  if (cbs >= 4 && wingers < 2) formation = rand() < 0.5 ? '3-5-2' : '5-3-2';
  else if (trq >= 1 && wingers >= 2) formation = '4-2-3-1';
  else if (wingers < 2) formation = rand() < 0.5 ? '4-4-2' : '4-3-1-2';
  const styles = Object.keys(STYLES).filter((s) => s !== 'pullman');
  const scored = styles.map((s) => [s, pool.reduce((n, p) => n + playerAffinity(p, s), 0) + (STYLES[s].formations.includes(formation) ? 60 : 0) + rand() * 80]);
  scored.sort((a, b) => b[1] - a[1]);
  return { formation, style: scored[0][0] };
}

function median(pool) {
  const v = pool.map((p) => p.ovr).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)] || 60;
}
