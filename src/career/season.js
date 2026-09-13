/* CARRIERA — una stagione.
   Quanto giochi dipende da quanto vali rispetto alla squadra e dalla fiducia
   dell'allenatore; le coppe che giochi dipendono da dove sei arrivato l'anno
   prima; quello che produci dipende dal ruolo. Un portiere chiude la stagione
   con porte inviolate, gol subiti e rigori parati, non con gol e assist. */

import { overall, STYLE_TRAITS, grow, clampPlayer, unlockPerks } from './model.js';
import { NATION, tournamentsIn, FIRST_SEASON_END } from './nations.js';

export const LEAGUE_MATCHES = 38;

export function clubDemand(tier) { return 80 - (tier - 1) * 7; }      // 80 · 73 · 66 · 59 · 52
export function teamPower(tier) { return 88 - (tier - 1) * 9; }       // 88 · 79 · 70 · 61 · 52
const NATION_DEMAND = { 1: 83, 2: 76, 3: 68 };

/** quanta parte della stagione giochi: 0 = mai, 1 = sempre */
export function minutesShare(player, club, mods = {}) {
  const gap = overall(player) - clubDemand(club.tier);
  const young = player.age <= 18 ? -6 : player.age <= 20 ? -3 : 0;
  const trust = (player.trust - 50) / 9;
  const raw = (gap + young + trust + 11) / 22 + (mods.minutes || 0);
  const floor = club.tier >= 4 ? 0.08 : 0;
  return Math.max(floor, Math.min(1, raw));
}

export function leaguePosition(rand, player, club, share, mods = {}) {
  const expected = [2, 5, 9, 12, 10][club.tier - 1];
  const weight = 1 + (club.tier - 1) * 0.15;
  const mine = ((overall(player) - 60) / 12) * share * weight;
  const luck = (rand() + rand() + rand() - 1.5) * 5.2;
  return Math.max(1, Math.min(20, Math.round(expected - mine - (mods.team || 0) + luck)));
}

function poisson(rand, mean) {
  if (mean <= 0) return 0;
  if (mean > 60) return Math.max(0, Math.round(mean + Math.sqrt(mean) * (rand() + rand() - 1)));
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k += 1; p *= rand(); } while (p > L && k < 200);
  return k - 1;
}

function binomial(rand, n, p) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand() < p) k++;
  return k;
}

/* ------------------------------------------------------------------ */
/* coppe continentali: ci si arriva dalla classifica                   */
/* ------------------------------------------------------------------ */

/**
 * Dove porta una posizione in classifica, l'anno dopo.
 * Solo le squadre di prima divisione (fasce 1-4) vanno in Europa o in
 * Sudamerica; la fascia 5 è la serie cadetta.
 */
export function qualification(club, position) {
  if (club.tier >= 5) return null;
  const L = club.level || 5;
  if (club.confed === 'UEFA') {
    if (L === 1) return position <= 4 ? 'ucl' : position <= 6 ? 'uel' : position === 7 ? 'uecl' : null;
    if (L === 2) return position <= 2 ? 'ucl' : position === 3 ? 'uel' : position <= 5 ? 'uecl' : null;
    if (L === 3) return position === 1 ? 'ucl' : position === 2 ? 'uel' : position <= 4 ? 'uecl' : null;
    return position === 1 ? 'ucl' : position <= 3 ? 'uecl' : null;
  }
  if (club.confed === 'CONMEBOL') {
    const lib = L === 1 ? 6 : 4;
    return position <= lib ? 'libertadores' : position <= lib + 6 ? 'sudamericana' : null;
  }
  if (club.confed === 'CONCACAF') return position <= 4 ? 'concacaf' : null;
  if (club.confed === 'AFC') return position <= 3 ? 'afc' : null;
  if (club.confed === 'CAF') return position <= 2 ? 'caf' : position <= 4 ? 'caf_conf' : null;
  return null;
}

const CONT_WIN = {
  ucl: [0.14, 0.035, 0.006, 0.001, 0], uel: [0.25, 0.12, 0.05, 0.015, 0], uecl: [0.35, 0.22, 0.12, 0.05, 0.02],
  libertadores: [0.3, 0.13, 0.05, 0.012, 0], sudamericana: [0.3, 0.2, 0.1, 0.04, 0],
  concacaf: [0.3, 0.2, 0.12, 0.05, 0], afc: [0.3, 0.2, 0.1, 0.04, 0], caf: [0.3, 0.2, 0.15, 0.06, 0], caf_conf: [0.3, 0.2, 0.12, 0.05, 0],
};
const CONT_MATCHES = { ucl: 11, uel: 10, uecl: 10, libertadores: 10, sudamericana: 8, concacaf: 6, afc: 8, caf: 8, caf_conf: 6 };
/* le coppe da campioni portano al Mondiale per club */
const CHAMPIONS_CUPS = new Set(['ucl', 'libertadores', 'concacaf', 'afc', 'caf']);
const CWC_WIN = { UEFA: 0.55, CONMEBOL: 0.28, CONCACAF: 0.05, AFC: 0.05, CAF: 0.05 };

/* ------------------------------------------------------------------ */
/* infortuni: rari, e coerenti con le partite giocate                  */
/* ------------------------------------------------------------------ */

export function injuryRoll(rand, player, mods = {}) {
  const risk = 0.07 + (100 - player.fitness) / 420 + Math.max(0, player.age - 30) * 0.012
    + (mods.injuryRisk || 0) - (player.flags.includes('carefulBody') ? 0.03 : 0);
  if (rand() >= Math.max(0.02, risk)) return null;
  const r = rand();
  if (r < 0.55) return { severity: 'minor', weeks: 2 + Math.floor(rand() * 3) };        // 2-4 settimane
  if (r < 0.88) return { severity: 'medium', weeks: 6 + Math.floor(rand() * 5) };       // circa due mesi
  return { severity: 'severe', weeks: 16 + Math.floor(rand() * 17) };                    // da quattro a otto mesi
}

/* ------------------------------------------------------------------ */
/* la stagione                                                         */
/* ------------------------------------------------------------------ */

/**
 * club: { id, name, tier, level, confed, code, colors, cont, cwc, lastLeague, lastCup }
 * opts.mods: modificatori della stagione arrivati dalle scelte
 */
export function playSeason(rand, player, club, opts = {}) {
  const mods = opts.mods || {};
  const trait = STYLE_TRAITS[player.style];
  const ovr = overall(player);
  const year = FIRST_SEASON_END + player.seasons.length;
  const share = minutesShare(player, club, mods);

  /* un infortunio passato per scelta (rientro affrettato) o capitato */
  const injury = mods.forcedInjury || injuryRoll(rand, player, mods);
  let weeksOut = injury ? Math.min(40, injury.weeks) : 0;
  /* un evento che racconta partite giocate lascia comunque il tempo di giocarle */
  if (mods.minApps) weeksOut = Math.min(weeksOut, Math.max(0, Math.floor(42 * (1 - mods.minApps / 46))));
  const available = Math.max(0, 1 - weeksOut / 42);

  const contMatches = club.cont ? CONT_MATCHES[club.cont] : 0;
  const cupMatches = 3;
  const leagueApps = Math.round(LEAGUE_MATCHES * share * available);
  const otherApps = Math.round((contMatches + cupMatches + (club.cwc ? 3 : 0)) * share * available);
  /* Se un evento dell'anno racconta una partita giocata (una papera, un gol,
     dieci partite a secco), il resoconto non può dire zero presenze. */
  const apps = Math.max(leagueApps + otherApps, mods.minApps || 0);

  const pos = leaguePosition(rand, player, club, share, mods);
  const power = teamPower(club.tier) + (20 - pos) * 0.5;
  const teamGoals = 0.85 + (power - 52) * 0.030;
  const teamConceded = Math.max(0.45, 1.85 - (power - 52) * 0.026);
  const form = Math.max(0.5, 0.72 + (player.morale / 100) * 0.34 + (ovr - 60) / 130 + (mods.form || 0));
  const has = (perk) => player.perks.includes(perk);

  /* ---- numeri del ruolo ---- */
  const stats = { apps, goals: 0, assists: 0, clean: 0, conceded: 0, penSaved: 0, tackles: 0, recoveries: 0, keyPasses: 0, dribbles: 0, aerials: 0 };
  const A = player.attrs;
  const rate = (attr, base) => apps * base * ((A[attr] || 60) / 70);

  if (player.role === 'POR') {
    const save = trait.save * (1 + (has('catlike') ? 0.04 : 0) + (has('wall') ? 0.05 : 0));
    const concededMean = apps * teamConceded * Math.max(0.55, 1.12 - (ovr - 60) / 180) / save;
    stats.conceded = poisson(rand, concededMean);
    stats.clean = Math.min(apps, poisson(rand, apps * Math.min(0.6, Math.exp(-teamConceded) * save * (0.85 + (ovr - 55) / 200))));
    const faced = poisson(rand, apps * 0.2);
    const penRate = Math.min(0.55, (0.16 + ((A.reflexes + A.composure) / 2 - 60) / 320) * (trait.penSave || 1) + (has('icecold') ? 0.05 : 0));
    stats.penSaved = binomial(rand, faced, Math.max(0.05, penRate));
    stats.assists = rand() < 0.04 * apps / 38 ? 1 : 0;
  } else {
    const goalK = player.role === 'DC' ? 0.055 : player.role === 'TZ' ? 0.065 : 0.155;
    const assistK = ['DC', 'MED'].includes(player.role) ? 0.1 : 0.145;
    const perkGoals = (has('poacher') ? 1.08 : 1) * (has('killer') ? 1.1 : 1) * (has('longrange') ? 1.05 : 1) * (has('aerialthreat') ? 1.06 : 1);
    stats.goals = poisson(rand, apps * teamGoals * trait.goal * goalK * form * perkGoals * (mods.goals || 1));
    stats.assists = poisson(rand, apps * teamGoals * trait.assist * assistK * form * (has('architect') || has('cannon') ? 1.1 : 1) * (mods.assists || 1));
    if (['DC', 'TZ'].includes(player.role)) {
      stats.clean = Math.min(apps, poisson(rand, apps * Math.min(0.5, Math.exp(-teamConceded) * trait.save * 0.92)));
    }
    if (['DC', 'TZ', 'MED', 'MEZ'].includes(player.role)) stats.tackles = poisson(rand, rate('tackling', player.role === 'MEZ' ? 1.1 : 1.9));
    if (player.role === 'DC') stats.aerials = poisson(rand, rate('heading', 3.1));
    if (player.role === 'PUN') stats.aerials = poisson(rand, rate('heading', 2.2));
    if (player.role === 'MED') stats.recoveries = poisson(rand, rate('positioning', 5.8));
    if (['MED', 'MEZ', 'ALA', 'TZ'].includes(player.role)) stats.keyPasses = poisson(rand, rate(player.role === 'TZ' ? 'crossing' : player.role === 'ALA' ? 'vision' : 'vision', player.role === 'MEZ' ? 1.5 : player.role === 'ALA' ? 1.7 : 1.1));
    if (['ALA', 'MEZ'].includes(player.role)) stats.dribbles = poisson(rand, rate('dribbling', player.role === 'ALA' ? 2.4 : 1.1));
  }

  /* quello che gli eventi hanno raccontato deve comparire nei numeri */
  if (apps > 0) {
    if (player.role !== 'POR') stats.goals = Math.max(stats.goals, mods.minGoals || 0);
    stats.assists = Math.max(stats.assists, mods.minAssists || 0);
    if (player.role === 'POR') stats.conceded = Math.max(stats.conceded, mods.minConceded || 0);
  }

  /* ---- voto ---- */
  const per90 = apps > 0
    ? (player.role === 'POR'
      ? (stats.clean * 0.9 + stats.penSaved * 1.2 - stats.conceded * 0.12) / apps + 0.3
      : (stats.goals + stats.assists * 0.7 + stats.clean * 0.35 + stats.tackles * 0.04 + stats.dribbles * 0.03 + stats.keyPasses * 0.05) / apps)
    : 0;
  const rating = apps > 0
    ? Math.max(4.8, Math.min(9.3, 5.6 + per90 * 1.6 + (ovr - 62) / 26 + (rand() - 0.5) * 0.3))
    : 0;

  /* ---- trofei di squadra ---- */
  const trophies = [];
  const t = club.tier - 1;
  const contribution = Math.max(-0.3, (ovr - clubDemand(club.tier)) / 60) * share;
  const top = club.tier <= 4;
  const leagueWin = top && pos === 1;
  if (leagueWin) trophies.push('campionato');
  const promoted = club.tier === 5 && pos <= 2;
  const relegated = club.tier === 4 && pos >= 18;
  if (promoted) trophies.push('promozione');
  const cupWin = rand() < [0.2, 0.11, 0.05, 0.02, 0.006][t] + contribution * 0.1;
  if (cupWin) trophies.push('coppa');
  if ((club.lastLeague || club.lastCup) && rand() < 0.5) trophies.push('supercoppa');

  let contWon = false;
  if (club.cont) {
    const p = Math.max(0, CONT_WIN[club.cont][t] * (1 + contribution * 1.5));
    contWon = rand() < p;
    if (contWon) trophies.push(club.cont);
  }
  if (club.cwc) {
    if (rand() < (CWC_WIN[club.confed] || 0.04)) trophies.push('mondiale_club');
  }

  /* ---- nazionale ---- */
  const nat = player.national;
  const nation = NATION.get(player.nation) || { tier: 3, confed: 'UEFA' };
  const national = { caps: 0, goals: 0, tournaments: [] };
  if (nat.arc && nat.called && !nat.retired) {
    const demand = NATION_DEMAND[nation.tier];
    const natShare = Math.max(0.12, Math.min(1, (ovr - (demand - 8)) / 12 + nat.standing / 40)) * available;
    national.caps = Math.max(mods.minCaps || 0, Math.round((5 + rand() * 5) * natShare));
    const natGoalK = player.role === 'POR' ? 0 : player.role === 'DC' || player.role === 'TZ' ? 0.04 : player.role === 'PUN' ? 0.42 : player.role === 'ALA' ? 0.3 : 0.14;
    national.goals = poisson(rand, national.caps * natGoalK * form);
    const base = { mondiale: 0.12, europeo: 0.16, copa_america: 0.28, nations_league: 0.2 };
    for (const tour of tournamentsIn(year, nation.confed)) {
      if ((natShare < 0.2 && !mods.natPlayed) || weeksOut > 30) { national.tournaments.push({ id: tour, played: false }); continue; }
      const won = rand() < base[tour] * (0.75 + natShare * 0.5);
      national.tournaments.push({ id: tour, played: true, won });
      if (won) trophies.push(tour);
    }
    nat.caps += national.caps;
    nat.goals += national.goals;
  }

  /* ---- premi individuali ---- */
  const age = player.age;
  const bigWin = trophies.some((x) => ['ucl', 'mondiale', 'europeo', 'copa_america', 'libertadores'].includes(x));
  /* capocannoniere e Scarpa d'Oro contano solo i gol in campionato */
  const leagueGoals = apps > 0 ? Math.round(stats.goals * (leagueApps / Math.max(1, leagueApps + otherApps))) : 0;
  const threshold = club.level === 1 ? 21 : 18;
  if (player.role !== 'POR' && top && leagueGoals >= threshold && rand() < 0.45 + (leagueGoals - threshold) * 0.06) trophies.push('capocannoniere');
  if (player.role !== 'POR' && top && ((club.level === 1 && leagueGoals >= 32 && rand() < 0.4) || (leagueGoals >= 38 && rand() < 0.3))) trophies.push('scarpa_oro');
  if (age <= 21 && apps >= 25 && rating >= 7.1 && ovr >= 76 && club.level <= 2 && top && !player.flags.includes('goldenBoy') && rand() < 0.35) {
    trophies.push('golden_boy');
    player.flags.push('goldenBoy');
  }
  if (player.role === 'POR' && ovr >= 85 && stats.clean >= 15 && rating >= 7 && club.tier === 1 && rand() < 0.15) trophies.push('miglior_portiere');
  if (ovr >= 88 && rating >= 7.5 && player.reputation >= 85 && club.tier <= 2
      && ((bigWin && rand() < 0.35) || (ovr >= 91 && rating >= 7.8 && rand() < 0.06))) trophies.push('pallone_oro');

  /* ---- prossima stagione: coppe e passaggi di categoria ---- */
  const next = {
    cont: qualification(club, pos),
    cwc: contWon && CHAMPIONS_CUPS.has(club.cont),
    lastLeague: leagueWin,
    lastCup: cupWin,
    tier: promoted ? club.tier - 1 : relegated ? club.tier + 1 : club.tier,
  };

  /* ---- crescita, fama, morale ---- */
  const quality = Math.min(1, Math.max(0, (rating - 5.2) / 2.6 + per90 * 0.3));
  const changes = grow(rand, player, { minutesShare: share, quality });
  const perks = unlockPerks(player);

  /* la fama si costruisce giocando bene e vincendo, e si consuma quando non si
     gioca: a trentacinque anni in panchina nessuno si ricorda più di te */
  const fameGain = apps * 0.05 * (1 + Math.min(1.5, per90 * 2)) + trophies.length * 2.2
    + Math.max(0, rating ? (rating - 6.3) * 2 : 0) + national.caps * 0.2;
  const fameLoss = (rating && rating < 6.3 ? (6.3 - rating) * 2 : 0) + (apps < 10 ? 3 : 0)
    + Math.max(0, age - 31) * 0.8 + (club.tier >= 4 ? 1 : 0);
  /* più sei famoso, meno una buona stagione aggiunge */
  player.reputation += fameGain * Math.max(0.15, 1 - player.reputation / 115) - fameLoss;
  player.morale += (rating ? (rating - 6.3) * 7 : -8) + trophies.length * 5 - weeksOut * 0.35 + (relegated ? -10 : 0);
  player.fitness += (weeksOut > 0 ? -5 : 3) - Math.max(0, age - 30) * 1.2 + (mods.fitness || 0);
  player.trust += (rating ? (rating - 6.4) * 6 : -6) + (weeksOut > 12 ? -6 : 0);
  clampPlayer(player);

  /* ---- i momenti della stagione, ricavati dai numeri veri ---- */
  const highlights = [];
  if (apps > 0 && player.seasons.every((s) => s.stats.apps === 0)) highlights.push({ id: 'debut' });
  if (player.role !== 'POR' && stats.goals >= 3 && rand() < Math.min(0.8, stats.goals / 20)) highlights.push({ id: 'hattrick' });
  if (player.role === 'POR' && stats.penSaved >= 2) highlights.push({ id: 'penHero', n: stats.penSaved });
  if (stats.clean >= 15) highlights.push({ id: 'wall', n: stats.clean });
  if (stats.assists >= 10) highlights.push({ id: 'provider', n: stats.assists });
  if (promoted) highlights.push({ id: 'promoted' });
  if (relegated) highlights.push({ id: 'relegated' });
  if (injury && weeksOut > 0) highlights.push({ id: `injury_${injury.severity}`, n: weeksOut });
  if (national.caps > 0 && nat.caps === national.caps) highlights.push({ id: 'natDebut' });
  national.tournaments.filter((x) => !x.played).forEach((x) => highlights.push({ id: 'missedTournament', tour: x.id }));
  perks.forEach((perk) => highlights.push({ id: 'perk', perk }));

  const record = {
    season: player.seasons.length + 1,
    year,
    age,
    club: { id: club.id, name: club.name, tier: club.tier, colors: club.colors, code: club.code, level: club.level },
    stats,
    rating: Math.round(rating * 100) / 100,
    position: pos,
    division: club.tier === 5 ? 2 : 1,
    cont: club.cont || null,
    cwc: Boolean(club.cwc),
    trophies,
    injury: injury && weeksOut > 0 ? { severity: injury.severity, weeks: weeksOut } : null,
    national,
    changes,
    perks,
    highlights,
    overall: ovr,
    overallAfter: overall(player),
    share: Math.round(share * 100) / 100,
  };

  player.seasons.push(record);
  const T = player.totals;
  for (const k of Object.keys(stats)) T[k] = (T[k] || 0) + stats[k];
  T.trophies.push(...trophies);
  const played = player.seasons.filter((s) => s.stats.apps > 0);
  T.rating = played.length
    ? Math.round((played.reduce((n, s) => n + s.rating * s.stats.apps, 0) / played.reduce((n, s) => n + s.stats.apps, 0)) * 100) / 100
    : 0;

  player.age += 1;
  return { record, next, share };
}
