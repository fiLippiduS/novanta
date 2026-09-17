/* ALLENATORE — le coppe.
   Coppa nazionale a eliminazione diretta (32 squadre, gara secca) e una coppa
   europea per chi si è qualificato: gironi da quattro con andata e ritorno,
   poi ottavi, quarti, semifinale e finale in gara secca.

   Le partite di coppa stanno fra una giornata di campionato e l'altra
   (`afterMd`): chi va avanti gioca di più e arriva più stanco in campionato.
   Le squadre fuori dal campionato dell'utente si costruiscono dai dati. */

import { fnv1a, mulberry32 } from '../core/rng.js';
import { createMatch, simulateToEnd } from './match.js';
import { playerFromRow, recover } from './players.js';
import { autoLineup, aiTactics } from './lineup.js';
import { squadOf, currentStrength, leagueOf, rngFor, applyMatch, isDerby } from './career.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EUROPE_LEAGUES = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'];
export const CUP_ROUNDS = ['r32', 'r16', 'qf', 'sf', 'final'];
export const EURO_KO = ['r16', 'qf', 'sf', 'final'];

function strengthOf(career, data, id) {
  return career.clubs[id] ? currentStrength(career, id) : data.leagues.clubs[id]?.strength ?? 60;
}
export function clubInfo(career, data, id) {
  return career.clubs[id] || data.leagues.clubs[id];
}

/* squadre fuori dal campionato: costruite una volta per partita, dai dati */
function outsideTeam(career, data, id) {
  const info = data.leagues.clubs[id];
  const moved = career.moved || {};
  const rows = data.squads[info.league][id].filter((r) => !moved[`${r[0]}|${r[1]}`] || moved[`${r[0]}|${r[1]}`] === id);
  const players = rows.map((r) => playerFromRow(r, id, career.season)).filter((p) => !p.loanOut);
  const rand = mulberry32(fnv1a(`${career.seed}|${career.season}|${id}|cupteam`));
  const t = aiTactics(players, rand);
  const { lineup, bench } = autoLineup(players, t.formation, t.style);
  return { id, name: info.name, players, lineup, bench, formation: t.formation, style: t.style, mentality: 'equilibrata', familiarity: { [t.style]: 60 }, morale: 62 };
}

function worldTeam(career, id) {
  const club = career.clubs[id];
  const players = squadOf(career, id).filter((p) => !p.loanOut);
  if (id === career.club) {
    const t = career.tactics;
    return { id, name: club.name, players, lineup: t.lineup, bench: t.bench, formation: t.formation, style: t.style, mentality: t.mentality, familiarity: club.familiarity, morale: 62, penaltyId: t.penaltyId || t.penaltyIdAuto, freeKickId: t.freeKickId, captainId: t.captainId };
  }
  /* in coppa il computer fa turnover: chi ha giocato di più riposa */
  const { lineup, bench } = autoLineup(players, club.formation, club.style, { rotate: 0.8 });
  return { id, name: club.name, players, lineup, bench, formation: club.formation, style: club.style, mentality: 'equilibrata', familiarity: club.familiarity, morale: 62 };
}

export function teamForCup(career, data, id) {
  return career.clubs[id] ? worldTeam(career, id) : outsideTeam(career, data, id);
}

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ------------------------------------------------------------------ */
/* calendario delle coppe                                               */
/* ------------------------------------------------------------------ */

function slots(total, fractions) {
  return fractions.map((f) => clamp(Math.floor(total * f), 1, total - 2));
}

/** le coppe della stagione: si creano a inizio campionato */
export function setupCups(career, data) {
  const league = leagueOf(data, career.league);
  const total = career.fixtures.length;
  const rand = rngFor(career, 'cups');
  const cups = {};

  /* coppa nazionale: il campionato dell'utente più l'altra divisione dello stesso paese */
  const partnerId = league.level === 1 ? league.lower : league.upper;
  const own = Object.keys(career.clubs).sort((a, b) => strengthOf(career, data, b) - strengthOf(career, data, a)).slice(0, 20);
  const partner = partnerId ? leagueOf(data, partnerId).clubs.filter((id) => !career.clubs[id] && !/ B$| II$/.test(data.leagues.clubs[id].name))
    .sort((a, b) => data.leagues.clubs[b].strength - data.leagues.clubs[a].strength) : [];
  const field = [...own, ...partner].slice(0, 32);
  if (field.length === 32) {
    cups.national = {
      id: 'national', name: league.cup || 'Cup', type: 'knockout', rounds: CUP_ROUNDS,
      schedule: slots(total, [0.14, 0.3, 0.48, 0.68, 0.86]),
      round: 0, alive: field, ties: drawKnockout(field, rand, career, data, true), history: [], winner: null,
    };
  }

  /* coppa europea: solo per chi si è qualificato */
  const comp = career.europeNext;
  if (comp && league.level === 1) {
    const pool = EUROPE_LEAGUES.flatMap((lid) => leagueOf(data, lid).clubs)
      .filter((id) => id !== career.club)
      .map((id) => ({ id, s: strengthOf(career, data, id) }))
      .sort((a, b) => b.s - a.s);
    const start = comp === 'ucl' ? 0 : comp === 'uel' ? 30 : 60;
    const teams = [career.club, ...pool.slice(start, start + 31).map((x) => x.id)];
    const groups = drawGroups(teams, rand, career, data);
    cups.europe = {
      id: 'europe', comp, type: 'groups', rounds: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', ...EURO_KO],
      schedule: slots(total, [0.08, 0.16, 0.24, 0.32, 0.4, 0.47, 0.56, 0.66, 0.78, 0.92]),
      round: 0, groups, ties: null, alive: teams, history: [], winner: null,
    };
  }
  /* due partite di coppa non cadono mai nella stessa settimana */
  if (cups.national && cups.europe) {
    const used = new Set(cups.europe.schedule);
    cups.national.schedule = cups.national.schedule.map((m) => { let x = m; while (used.has(x)) x++; used.add(x); return Math.min(x, total - 2); });
  }
  career.cups = cups;
  career.europeNext = null;
}

function drawKnockout(teams, rand, career, data, weakerHome = false) {
  const list = shuffle(teams, rand);
  const ties = [];
  for (let i = 0; i < list.length; i += 2) {
    let [h, a] = [list[i], list[i + 1]];
    /* nei primi turni gioca in casa la più debole */
    if (weakerHome && strengthOf(career, data, h) > strengthOf(career, data, a)) [h, a] = [a, h];
    ties.push({ h, a, res: null, pens: null, winner: null });
  }
  return ties;
}

function drawGroups(teams, rand, career, data) {
  const sorted = [...teams].sort((a, b) => strengthOf(career, data, b) - strengthOf(career, data, a));
  const pots = [0, 1, 2, 3].map((k) => shuffle(sorted.slice(k * 8, k * 8 + 8), rand));
  const groups = Array.from({ length: 8 }, (_, i) => ({ id: String.fromCharCode(65 + i), teams: [], fixtures: [] }));
  const leagueOfClub = (id) => clubInfo(career, data, id).league;
  for (const pot of pots) {
    for (const g of groups) {
      /* evitare, se si può, due squadre dello stesso campionato */
      let idx = pot.findIndex((id) => !g.teams.some((x) => leagueOfClub(x) === leagueOfClub(id)));
      if (idx < 0) idx = 0;
      g.teams.push(pot.splice(idx, 1)[0]);
    }
  }
  for (const g of groups) {
    const [a, b, c, d] = g.teams;
    const pairs = [[a, b, c, d], [a, c, d, b], [a, d, b, c]];
    const first = pairs.map(([w, x, y, z]) => [{ h: w, a: x, res: null }, { h: y, a: z, res: null }]);
    const second = first.map((round) => round.map((f) => ({ h: f.a, a: f.h, res: null })));
    g.fixtures = [...first, ...second];
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/* cosa si gioca adesso                                                 */
/* ------------------------------------------------------------------ */

/** la partita di coppa che viene prima della prossima giornata, se c'è */
export function dueCup(career) {
  for (const cup of Object.values(career.cups || {})) {
    if (cup.winner || cup.round >= cup.schedule.length) continue;
    if (cup.schedule[cup.round] <= career.md - 1 && cup.alive.includes(career.club)) return cup;
    if (cup.schedule[cup.round] <= career.md - 1 && !cup.alive.includes(career.club)) {
      /* l'utente è fuori: il turno si gioca senza di lui */
      return { ...cup, silent: true };
    }
  }
  return null;
}

export function currentTies(cup) {
  if (cup.type === 'groups' && cup.round < 6) return cup.groups.flatMap((g) => g.fixtures[cup.round].map((f) => ({ ...f, group: g.id })));
  return cup.ties || [];
}

export function userTie(career, cup) {
  return currentTies(cup).find((f) => f.h === career.club || f.a === career.club) || null;
}

export function roundKey(cup) { return cup.rounds[cup.round]; }

/** la partita dell'utente in coppa */
export function startCupMatch(career, data, cupId) {
  const cup = career.cups[cupId];
  const tie = userTie(career, cup);
  const knockout = cup.type === 'knockout' || cup.round >= 6;
  const home = tie.h === career.club;
  const me = teamForCup(career, data, career.club);
  const them = teamForCup(career, data, home ? tie.a : tie.h);
  const final = roundKey(cup) === 'final';
  const match = createMatch({
    seed: fnv1a(`${career.seed}|${career.season}|${cupId}|${cup.round}|match`),
    home: home ? me : them, away: home ? them : me, user: home ? 'home' : 'away',
    knockout, neutral: final, derby: isDerby(career, tie.h, tie.a), stakes: 2,
  });
  if (career.flags.coachBan?.left > 0) match.coachBan = true;
  return match;
}

/**
 * Chiude il turno: risultato dell'utente (se ha giocato), le altre partite
 * simulate, qualificate, sorteggio del turno dopo, stanchezza.
 */
export function closeCupRound(career, data, cupId, userMatch = null) {
  const cup = career.cups[cupId];
  const knockout = cup.type === 'knockout' || cup.round >= 6;
  const ties = cup.type === 'groups' && cup.round < 6 ? cup.groups.flatMap((g) => g.fixtures[cup.round]) : cup.ties;
  const report = { cupId, round: roundKey(cup), results: [], eliminated: false, advanced: false, trophy: null };
  const rand = rngFor(career, `cupround-${cupId}-${cup.round}`);
  for (const f of ties) {
    let m;
    if (userMatch && (f.h === career.club || f.a === career.club)) m = userMatch;
    else {
      m = createMatch({
        seed: fnv1a(`${career.seed}|${career.season}|${cupId}|${cup.round}|${f.h}|${f.a}`),
        home: teamForCup(career, data, f.h), away: teamForCup(career, data, f.a),
        knockout, neutral: roundKey(cup) === 'final',
      });
      simulateToEnd(m);
    }
    const [H, A] = m.sides;
    f.res = [H.goals, A.goals];
    if (knockout) {
      f.pens = m.shootout ? [m.shootout.home, m.shootout.away] : null;
      f.winner = H.goals > A.goals ? f.h : H.goals < A.goals ? f.a : (m.shootout && m.shootout.home > m.shootout.away ? f.h : f.a);
    }
    /* statistiche e squalifiche valgono anche in coppa per chi è nel campionato */
    if (career.clubs[f.h] || career.clubs[f.a]) applyMatch(career, m, { h: f.h, a: f.a, res: null });
    report.results.push({ h: f.h, a: f.a, res: f.res, pens: f.pens, winner: f.winner });
  }
  void rand;

  /* chi va avanti */
  if (cup.type === 'groups' && cup.round < 6) {
    if (cup.round === 5) {
      const through = [];
      for (const g of cup.groups) {
        const table = groupTable(g);
        through.push({ first: table[0].id, second: table[1].id, group: g.id });
      }
      cup.alive = through.flatMap((x) => [x.first, x.second]);
      const r = rngFor(career, `eurodraw-${cup.round}`);
      const seconds = shuffle(through.map((x) => ({ id: x.second, group: x.group })), r);
      cup.ties = through.map((x) => {
        let i = seconds.findIndex((s) => s.group !== x.group);
        if (i < 0) i = 0;
        const s = seconds.splice(i, 1)[0];
        return { h: x.first, a: s.id, res: null, pens: null, winner: null };
      });
      if (!cup.alive.includes(career.club)) report.eliminated = true;
      else report.advanced = true;
    }
  } else {
    const winners = ties.map((t) => t.winner);
    const wasIn = cup.alive.includes(career.club);
    cup.alive = winners;
    cup.history.push(ties.map((t) => ({ ...t })));
    if (wasIn && !winners.includes(career.club)) report.eliminated = true;
    if (wasIn && winners.includes(career.club)) report.advanced = true;
    if (winners.length === 1) {
      cup.winner = winners[0];
      if (winners[0] === career.club) {
        report.trophy = cupId === 'national' ? { type: 'cup', name: cup.name } : { type: cup.comp };
        career.coach.trophies.push({ type: report.trophy.type, league: career.league, season: career.season, club: career.club });
      }
    } else {
      cup.ties = drawKnockout(winners, rngFor(career, `draw-${cupId}-${cup.round}`), career, data, cup.round < 2);
    }
  }
  cup.round++;

  /* la coppa pesa su fiducia e tifosi, e sulle gambe */
  if (report.trophy) { career.board.trust = clamp(career.board.trust + 12, 0, 100); career.board.fans = clamp(career.board.fans + 10, 0, 100); career.coach.reputation = clamp(career.coach.reputation + (cupId === 'national' ? 4 : 8), 1, 100); }
  else if (report.eliminated) {
    const early = cup.round <= 2;
    career.board.fans = clamp(career.board.fans - (early ? 4 : 2), 0, 100);
    if (early && strengthOf(career, data, career.club) > 74) career.board.trust = clamp(career.board.trust - 4, 0, 100);
  } else if (report.advanced) career.board.fans = clamp(career.board.fans + 2, 0, 100);
  for (const c of Object.values(career.clubs)) {
    for (const id of c.squad) { const p = career.players[id]; if (p) recover(p, 3, career.season); }
  }
  career.lastCupReport = report;
  return report;
}

export function groupTable(g) {
  const rows = new Map(g.teams.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const round of g.fixtures) for (const f of round) {
    if (!f.res) continue;
    const H = rows.get(f.h); const A = rows.get(f.a);
    H.p++; A.p++; H.gf += f.res[0]; H.ga += f.res[1]; A.gf += f.res[1]; A.ga += f.res[0];
    if (f.res[0] > f.res[1]) { H.w++; A.l++; H.pts += 3; } else if (f.res[0] < f.res[1]) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

/** a fine stagione: dove giocherà l'utente in Europa l'anno dopo */
export function europeFromTable(league, pos) {
  if (!league.europe) return null;
  let n = 0;
  for (const [k, v] of Object.entries(league.europe)) { n += v; if (pos <= n) return k; }
  return null;
}

export { strengthOf };
