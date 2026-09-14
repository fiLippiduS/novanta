/* CARRIERA — che cosa ti succede quest'anno.
   Le decisioni le prendi tu, gli imprevisti no. Ogni stagione ha le sue
   scelte fino all'ultimo anno, e ogni scelta cambia qualcosa di misurabile:
   una dote, la fiducia dell'allenatore, i minuti, il rischio d'infortunio,
   il posto in nazionale, le squadre che ti cercheranno. */

import { clampPlayer, attrsOf, IDOLS, overall } from './model.js';
import { NATION, tournamentsIn, FIRST_SEASON_END } from './nations.js';

const PHYS = ['pace', 'stamina', 'strength', 'reflexes', 'aerial'];

export function context(player, club) {
  const nation = NATION.get(player.nation);
  const year = FIRST_SEASON_END + player.seasons.length;
  const last = player.seasons[player.seasons.length - 1] || null;
  return {
    player, club, nation, year, last,
    /* un turno copre due stagioni: conta un grande torneo in una delle due */
    tournamentYear: Boolean(nation && [year, year + 1].some((y) => tournamentsIn(y, nation.confed).some((x) => x !== 'nations_league'))),
    abroad: club && player.nation !== club.code,
    eligible: natEligible(player),
  };
}

/** la nazionale ti guarda? solo nelle carriere con la storia della nazionale */
export function natEligible(player) {
  const n = player.national;
  const nation = NATION.get(player.nation);
  if (!n.arc || n.called || n.retired || !nation) return false;
  const demand = { 1: 83, 2: 76, 3: 68 }[nation.tier] - 7;
  return player.age >= 18 && overall(player) >= demand && player.reputation >= 30;
}

/** l'evento è compatibile con la situazione attuale? */
export function fits(ev, ctx) {
  const w = ev.when || {};
  const p = ctx.player;
  const c = ctx.club || {};
  if (w.roles && !w.roles.includes(p.role)) return false;
  if (w.notRoles && w.notRoles.includes(p.role)) return false;
  if (w.styles && !w.styles.includes(p.style)) return false;
  if (w.notStyles && w.notStyles.includes(p.style)) return false;
  if (w.ageMin !== undefined && p.age < w.ageMin) return false;
  if (w.ageMax !== undefined && p.age > w.ageMax) return false;
  if (w.tierMin !== undefined && c.tier < w.tierMin) return false;
  if (w.tierMax !== undefined && c.tier > w.tierMax) return false;
  if (w.repMin !== undefined && p.reputation < w.repMin) return false;
  if (w.repMax !== undefined && p.reputation > w.repMax) return false;
  if (w.trustMin !== undefined && p.trust < w.trustMin) return false;
  if (w.trustMax !== undefined && p.trust > w.trustMax) return false;
  if (w.moraleMax !== undefined && p.morale > w.moraleMax) return false;
  if (w.fitnessMax !== undefined && p.fitness > w.fitnessMax) return false;
  if (w.flags && !w.flags.every((f) => p.flags.includes(f))) return false;
  if (w.notFlags && w.notFlags.some((f) => p.flags.includes(f))) return false;
  if (w.idol && !p.idol) return false;
  if (w.idolQuirk && !(IDOLS[p.role] || []).some((i) => i.id === p.idol && i.quirk === w.idolQuirk)) return false;
  if (w.abroad !== undefined && Boolean(ctx.abroad) !== w.abroad) return false;
  if (w.cont && !c.cont) return false;
  if (w.seasonMin !== undefined && p.seasons.length < w.seasonMin) return false;
  if (w.natArc && !p.national.arc) return false;
  if (w.natCalled !== undefined && (p.national.called && !p.national.retired) !== w.natCalled) return false;
  if (w.natCapsMin !== undefined && p.national.caps < w.natCapsMin) return false;
  if (w.natCapsMax !== undefined && p.national.caps > w.natCapsMax) return false;
  if (w.natCaptain !== undefined && p.national.captain !== w.natCaptain) return false;
  if (w.tournamentYear && !ctx.tournamentYear) return false;
  if (w.eligible && !ctx.eligible) return false;
  if (w.lastInjured && !(ctx.last && ctx.last.injury)) return false;
  if (w.lastRelegated && !(ctx.last && ctx.last.highlights.some((h) => h.id === 'relegated'))) return false;
  if (w.lastTrophy && !(ctx.last && ctx.last.trophies.length)) return false;
  return true;
}

function pickWeighted(rand, pool, n) {
  const out = [];
  const bag = pool.slice();
  while (out.length < n && bag.length) {
    const total = bag.reduce((s, e) => s + (e.w || 1), 0);
    let r = rand() * total;
    let i = 0;
    for (; i < bag.length; i++) { r -= bag[i].w || 1; if (r <= 0) break; }
    out.push(bag.splice(Math.min(i, bag.length - 1), 1)[0]);
  }
  return out;
}

/**
 * Un evento già visto torna disponibile solo se è ripetibile e sono passate
 * abbastanza stagioni. seenAt: { id: stagione in cui è uscito l'ultima volta }
 */
export function isFresh(ev, player, seen, seenAt = {}) {
  if (!seen.includes(ev.id)) return true;
  if (!ev.repeat) return false;
  const last = seenAt[ev.id];
  return last === undefined || player.seasons.length - last >= ev.repeat;
}

/**
 * Le decisioni dell'anno, oltre all'allenamento (che la scena propone sempre):
 * la convocazione se la nazionale ti ha notato, una legata al ruolo, le altre
 * alla vita e al momento della carriera. Tre scelte vere, ogni stagione.
 */
export const DECISIONS_PER_SEASON = 3;

export function pickDecisions(rand, all, player, club, seen, seenAt = {}) {
  const ctx = context(player, club);
  const usable = all.filter((e) => e.kind === 'decision' && isFresh(e, player, seen, seenAt) && fits(e, ctx));
  const out = [];
  const forced = usable.filter((e) => e.forced);
  out.push(...forced.slice(0, 1));
  const role = usable.filter((e) => !e.forced && e.group === 'role');
  const national = usable.filter((e) => !e.forced && e.group === 'national');
  const life = usable.filter((e) => !e.forced && e.group !== 'role' && e.group !== 'national');
  out.push(...pickWeighted(rand, role, 1));
  /* chi gioca in nazionale ha sempre una scelta che la riguarda, se ce n'è */
  if (out.length < DECISIONS_PER_SEASON) out.push(...pickWeighted(rand, national.filter((e) => !out.includes(e)), 1));
  out.push(...pickWeighted(rand, life.filter((e) => !out.includes(e)), DECISIONS_PER_SEASON - out.length));
  /* se la vita non ha più nulla da proporre, il ruolo ne propone un'altra */
  if (out.length < DECISIONS_PER_SEASON) out.push(...pickWeighted(rand, [...role, ...national].filter((e) => !out.includes(e)), DECISIONS_PER_SEASON - out.length));
  /* Carriere lunghissime possono esaurire le novità: allora torna una
     situazione già vissuta, purché non negli ultimi due anni. Le scelte ci
     sono sempre, fino all'ultima stagione. */
  if (out.length < DECISIONS_PER_SEASON) {
    const recent = (e) => seenAt[e.id] !== undefined && player.seasons.length - seenAt[e.id] < 2;
    const again = all.filter((e) => e.kind === 'decision' && !e.forced && !out.includes(e) && !recent(e) && fits(e, ctx)
      && (e.repeat || e.group === 'role'));
    out.push(...pickWeighted(rand, again, DECISIONS_PER_SEASON - out.length));
    /* caso rarissimo: anche le ripetibili sono appena uscite */
    if (out.length < DECISIONS_PER_SEASON) {
      const any = all.filter((e) => e.kind === 'decision' && !e.forced && !out.includes(e) && fits(e, ctx) && (e.repeat || e.group === 'role'));
      out.push(...pickWeighted(rand, any, DECISIONS_PER_SEASON - out.length));
    }
  }
  return out;
}

/** gli imprevisti: da zero a due, e non li sceglie nessuno */
export function pickIncidents(rand, all, player, club, seen, seenAt = {}) {
  const ctx = context(player, club);
  const usable = all.filter((e) => e.kind === 'incident' && isFresh(e, player, seen, seenAt) && fits(e, ctx));
  const n = rand() < 0.35 ? 0 : rand() < 0.8 ? 1 : 2;
  return pickWeighted(rand, usable, Math.min(n, usable.length));
}

/**
 * Applica gli effetti. Un effetto con probabilità (p, win, lose) si risolve
 * qui: la carriera ricorda quale strada è uscita, e il testo lo racconta.
 * Restituisce { outcome: 'win' | 'lose' | null }.
 */
export function applyEffects(rand, player, fx = {}, seasonMods = {}) {
  let outcome = null;
  let effects = fx;
  if (fx.p !== undefined) {
    outcome = rand() < fx.p ? 'win' : 'lose';
    effects = { ...(fx.base || {}), ...(fx[outcome] || {}) };
  }
  const roleAttrs = attrsOf(player.role);

  for (const [k, v] of Object.entries(effects)) {
    if (k === 'attrs') {
      for (const [a, d] of Object.entries(v)) if (roleAttrs.includes(a)) player.attrs[a] += d;
    } else if (k === 'best' || k === 'weakest') {
      const sorted = [...roleAttrs].sort((a, b) => player.attrs[b] - player.attrs[a]);
      player.attrs[k === 'best' ? sorted[0] : sorted[sorted.length - 1]] += v;
    } else if (k === 'phys') {
      roleAttrs.filter((a) => PHYS.includes(a)).forEach((a) => { player.attrs[a] += v; });
    } else if (k === 'idolAttr') {
      const idol = (IDOLS[player.role] || []).find((i) => i.id === player.idol);
      if (idol && roleAttrs.includes(idol.attr)) player.attrs[idol.attr] += v;
    } else if (k === 'mods') {
      for (const [m, d] of Object.entries(v)) {
        if (m === 'goals' || m === 'assists') seasonMods[m] = (seasonMods[m] || 1) * d;
        else if (m.startsWith('min')) seasonMods[m] = Math.max(seasonMods[m] || 0, d);   // minimi raccontati: vale il più alto
        else if (m === 'natPlayed') seasonMods[m] = true;
        else seasonMods[m] = (seasonMods[m] || 0) + d;
      }
    } else if (k === 'flag') {
      [].concat(v).forEach((f) => { if (!player.flags.includes(f)) player.flags.push(f); });
    } else if (k === 'unflag') {
      [].concat(v).forEach((f) => { player.flags = player.flags.filter((x) => x !== f); });
    } else if (k === 'nat') {
      const n = player.national;
      if (v.called) n.called = true;
      if (v.retired) n.retired = true;
      if (v.captain !== undefined) n.captain = v.captain;
      if (v.standing) n.standing = Math.max(-20, Math.min(20, n.standing + v.standing));
    } else if (k === 'forcedInjury') {
      seasonMods.forcedInjury = v;
    } else if (k === 'trustSet') {
      player.trust = v;
    } else if (['morale', 'fitness', 'reputation', 'trust'].includes(k)) {
      player[k] += v;
    }
  }
  clampPlayer(player);
  return { outcome };
}

/* ------------------------------------------------------------------ */
/*  Mercato                                                            */
/* ------------------------------------------------------------------ */

export function reachableTier(player, ovr) {
  const r = player.reputation;
  if (ovr >= 83 && r >= 62) return 1;
  if (ovr >= 77 && r >= 42) return 2;
  if (ovr >= 69 && r >= 22) return 3;
  if (ovr >= 60) return 4;
  return 5;
}

function shuffled(rand, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Due o tre offerte, più la scelta di restare. Le scelte dell'anno pesano:
 * chi ha chiesto di andarsene riceve più offerte, chi ha firmato la fedeltà
 * meno; a fine carriera arrivano i campionati esotici e la squadra di casa.
 */
export function offers(rand, clubs, player, club, ovr, share) {
  let target = reachableTier(player, ovr);
  if (player.flags.includes('bigTrialWon') && player.age <= 20) target = Math.max(1, target - 1);
  const out = [];
  const usedCountries = new Set([club.code]);
  const want = player.flags.includes('wantsOut') || player.flags.includes('forceMove') ? 4 : player.flags.includes('loyal') ? 2 : 3;

  const tryPool = (pool, loan = false, tag = null) => {
    const clean = pool.filter((c) => c.id !== club.id && !out.some((o) => o.club.id === c.id));
    if (!clean.length) return;
    const fresh = clean.filter((c) => !usedCountries.has(c.code));
    const pick = shuffled(rand, fresh.length >= 3 ? fresh : clean)[0];
    usedCountries.add(pick.code);
    out.push({ club: pick, loan, tag });
  };
  const byTier = (tier) => clubs.filter((c) => c.tier === tier);

  if (player.age >= 31 && (player.flags.includes('wantsExotic') || rand() < 0.35) && player.reputation >= 35) {
    tryPool(clubs.filter((c) => ['SA', 'QA', 'AE', 'US'].includes(c.code) && c.tier <= 3), false, 'exotic');
  }
  if (player.age >= 32 && player.flags.includes('wantsHome')) {
    tryPool(clubs.filter((c) => c.code === player.nation && c.tier >= Math.max(2, target)), false, 'home');
  }
  if (player.flags.includes('wantsLower')) tryPool(byTier(Math.min(5, club.tier + 1)), false, 'lower');
  tryPool(byTier(target));
  tryPool(byTier(Math.max(1, target - 1)));
  if (rand() < 0.6) tryPool(byTier(Math.min(5, target + 1)));
  if ((player.age <= 21 && share < 0.35 && club.tier <= 3) || player.flags.includes('wantsLoan')) {
    tryPool(byTier(Math.min(5, club.tier + 2)), true, 'loan');
  }
  return out.slice(0, want);
}
