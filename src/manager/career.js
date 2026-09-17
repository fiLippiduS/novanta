/* ALLENATORE — il filo della carriera, senza schermate.
   La scena lo usa per giocare, i test per simulare dieci stagioni: la logica
   è una sola, e quello che si collauda è quello che si gioca.

   Il caso della carriera non vive in un generatore da salvare: ogni volta
   nasce dal seme, dalla stagione, dalla giornata e da un'etichetta. Così lo
   stato resta JSON puro e la stessa carriera, ricaricata, fa le stesse cose. */

import { fnv1a, mulberry32 } from '../core/rng.js';
import { playerFromRow, emptyStats, evolve, recover, valueOf, wageFor, ageOf, overallOf, applyPlayerFx, careerCurve, revisePotential, ROLE_PIVOT, DEPT } from './players.js';
import { STYLES, FORMATIONS, playerAffinity } from './tactics.js';
import { autoLineup, aiTactics, available } from './lineup.js';
import { makeFixtures, standings, TIEBREAK, zones, expectedPoints } from './league.js';
import { createMatch, simulateToEnd, playerRatings } from './match.js';
import { setupCups, europeFromTable, closeCupRound } from './cups.js';
import { windowOpen, expireTalks, worldTransfers, payBonuses } from './market.js';

export const MANAGER_VERSION = 1;
export const FIRST_SEASON = 2026;
export const EVOLVE_EVERY = 5;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function rngFor(career, tag) {
  return mulberry32(fnv1a(`${career.seed}|${career.season}|${career.md}|${tag}`));
}

/* ------------------------------------------------------------------ */
/* il mondo: campionati e club dai dati                                 */
/* ------------------------------------------------------------------ */

export const leagueOf = (data, id) => data.leagues.leagues.find((l) => l.id === id);

/** obiettivo della dirigenza: dalla forza del club nel suo campionato */
export function objectiveFor(league, rank) {
  const n = league.teams;
  if (league.level === 1) {
    const euro = Object.values(league.europe || {}).reduce((a, b) => a + b, 0);
    if (rank <= 1) return { id: 'title', target: 1, tolerance: 2 };
    if (rank <= 4) return { id: 'ucl', target: league.europe?.ucl || 4, tolerance: 2 };
    if (rank <= 7) return { id: 'europe', target: euro, tolerance: 2 };
    if (rank <= 12) return { id: 'topHalf', target: Math.round(n / 2), tolerance: 3 };
    return { id: 'survival', target: n - (league.down || 3), tolerance: 1 };
  }
  if (rank <= 3) return { id: 'promotion', target: league.up || 2, tolerance: 4 };
  if (rank <= 8) return { id: 'playoff', target: league.playoff ? league.playoff[1] : 6, tolerance: 3 };
  if (rank <= 15) return { id: 'midTable', target: Math.round(n / 2) + 2, tolerance: 3 };
  return { id: 'safe', target: n - 3, tolerance: 2 };
}

function budgetFor(club, league, reputation) {
  const base = Math.exp((club.strength - 65) * 0.19) * 2.4;
  const mult = league.level === 1 ? 1 : 0.45;
  return Math.round(base * mult * (0.85 + reputation / 250) * 10) / 10;
}

function buildClub(data, id, season, moved = {}) {
  const info = data.leagues.clubs[id];
  /* chi è stato comprato, venduto o svincolato non torna nel club di prima */
  const rows = data.squads[info.league][id].filter((r) => !moved[`${r[0]}|${r[1]}`] || moved[`${r[0]}|${r[1]}`] === id);
  const players = rows.map((r) => playerFromRow(r, id, season));
  return { info, players };
}

/** i club di un campionato con le rose dai dati; `keep` sono club già vivi da non ricreare */
function populateLeague(career, data, leagueId, keep = {}, only = null) {
  const league = leagueOf(data, leagueId);
  const rand = rngFor(career, `populate-${leagueId}`);
  const clubs = {};
  for (const id of only || league.clubs) {
    if (keep[id]) { clubs[id] = keep[id].club; for (const p of keep[id].players) career.players[p.id] = p; continue; }
    const { info, players } = buildClub(data, id, career.season, career.moved);
    for (const p of players) { p.recent = emptyStats(); career.players[p.id] = p; }
    const t = aiTactics(players.filter((p) => !p.loanOut), rand);
    clubs[id] = {
      id,
      name: info.name,
      colors: info.colors,
      ground: info.ground,
      capacity: info.capacity,
      strength: info.strength,
      league: leagueId,
      squad: players.map((p) => p.id),
      formation: t.formation,
      style: t.style,
      familiarity: { [t.style]: 55 + Math.round(rand() * 25) },
      budget: 0,
      morale: 62,
    };
  }
  return clubs;
}

export function squadOf(career, clubId) {
  return career.clubs[clubId].squad.map((id) => career.players[id]).filter(Boolean);
}

/** forza reale di oggi: media dei migliori undici disponibili, non il numero dei dati */
export function currentStrength(career, clubId) {
  const ps = squadOf(career, clubId).filter((p) => !p.loanOut).map((p) => p.ovr).sort((a, b) => b - a);
  const top = ps.slice(0, 14);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
}

/* ------------------------------------------------------------------ */
/* nuova carriera                                                       */
/* ------------------------------------------------------------------ */

export function newCareer(data, { seed, name, nation, style, clubId }) {
  const info = data.leagues.clubs[clubId];
  const league = leagueOf(data, info.league);
  const career = {
    v: MANAGER_VERSION,
    seed: seed >>> 0,
    season: FIRST_SEASON,
    md: 0,
    phase: 'preseason',
    club: clubId,
    league: league.id,
    coach: {
      name, nation, style,
      reputation: clamp(Math.round(30 + (info.strength - 65) * 0.9), 25, 55),
      record: { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 },
      trophies: [],
      history: [],
      sacked: 0,
      seasons: 0,
    },
    players: {},
    clubs: {},
    fixtures: [],
    tactics: null,
    board: null,
    inbox: [],
    queue: [],
    seen: {},
    flags: {},
    log: [],
    lastReport: null,
    live: null,
  };
  career.clubs = populateLeague(career, data, league.id);
  /* in Europa ci va chi si è qualificato nella stagione vera appena finita */
  const last = info.lastSeason;
  if (last && last.league === league.id) career.europeNext = europeFromTable(league, last.pos);
  startSeason(career, data, { first: true });
  return career;
}

/* ------------------------------------------------------------------ */
/* stagione                                                             */
/* ------------------------------------------------------------------ */

function strengthRank(career, clubId) {
  const ids = Object.keys(career.clubs);
  const sorted = ids.map((id) => [id, currentStrength(career, id)]).sort((a, b) => b[1] - a[1]);
  return sorted.findIndex(([id]) => id === clubId) + 1;
}

export function startSeason(career, data, { first = false } = {}) {
  const league = leagueOf(data, career.league);
  const rand = rngFor(career, 'season');
  career.md = 0;
  career.phase = 'preseason';
  career.fixtures = makeFixtures(Object.keys(career.clubs), rand);
  const rank = strengthRank(career, career.club);
  const club = career.clubs[career.club];
  const objective = objectiveFor(league, rank);
  const rep = career.coach.reputation;
  career.board = {
    objective,
    trust: first ? 60 : clamp((career.board?.trust ?? 60) * 0.5 + 35, 35, 80),
    fans: first ? 60 : clamp(career.board?.fans ?? 60, 25, 90),
    warned: false,
    ultimatum: null,
    patience: clamp(Math.round(55 + (rep - 40) * 0.4), 35, 80),
  };
  club.budget = budgetFor(club, league, rep);
  club.wageBudget = Math.round(squadOf(career, career.club).reduce((n, p) => n + p.wage, 0) * 1.08 * 10) / 10;
  for (const id of Object.keys(career.clubs)) {
    if (id === career.club) continue;
    career.clubs[id].budget = budgetFor(career.clubs[id], league, 50);
  }
  for (const p of Object.values(career.players)) {
    p.stats = emptyStats();
    p.recent = emptyStats();
    p.yellows = 0;
    p.fitness = Math.max(p.fitness, 88);
  }
  if (!career.tactics || first) {
    const players = squadOf(career, career.club);
    const style = career.coach.style;
    const formation = STYLES[style].formations[0];
    career.tactics = { formation, style, mentality: 'equilibrata', lineup: [], bench: [], captainId: null, penaltyId: null, freeKickId: null, auto: true };
    club.style = style;
    club.formation = formation;
    club.familiarity = { [style]: 35 };
    const cap = players.find((p) => p.captain) || [...players].sort((a, b) => b.caps - a.caps)[0];
    career.tactics.captainId = cap?.id || null;
  }
  refreshUserLineup(career);
  setupCups(career, data);
  career.inbox.unshift({ id: `season-${career.season}`, type: 'board', season: career.season, md: 0, key: 'objective', vars: { objective: objective.id, target: objective.target, budget: club.budget } });
  career.phase = 'season';
}

/** formazione dell'utente: se è in automatico si rifà, altrimenti si tappano solo i buchi */
export function refreshUserLineup(career) {
  const t = career.tactics;
  const players = squadOf(career, career.club);
  const valid = t.lineup.length === FORMATIONS[t.formation].length && t.lineup.every((id) => {
    const p = career.players[id];
    return p && available(p) && career.clubs[career.club].squad.includes(id);
  });
  if (t.auto || !valid) {
    const locked = {};
    if (!t.auto) t.lineup.forEach((id, i) => { const p = career.players[id]; if (p && available(p)) locked[i] = id; });
    const { lineup, bench } = autoLineup(players, t.formation, t.style, { rotate: 0.6, locked });
    t.lineup = lineup;
    t.bench = bench;
  } else {
    const onPitch = new Set(t.lineup);
    t.bench = t.bench.filter((id) => !onPitch.has(id) && career.players[id] && available(career.players[id])).slice(0, 9);
    if (t.bench.length < 9) {
      const extra = players.filter((p) => available(p) && !onPitch.has(p.id) && !t.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
      for (const p of extra) { if (t.bench.length >= 9) break; t.bench.push(p.id); }
    }
  }
  const onField = new Set(t.lineup);
  if (!t.penaltyId || !onField.has(t.penaltyId)) {
    t.penaltyIdAuto = [...t.lineup].map((id) => career.players[id]).sort((a, b) => (b.attrs.finishing + b.attrs.composure) - (a.attrs.finishing + a.attrs.composure))[0]?.id;
  }
}

/* ------------------------------------------------------------------ */
/* partita                                                              */
/* ------------------------------------------------------------------ */

export function nextFixture(career) {
  const round = career.fixtures[career.md];
  if (!round) return null;
  const f = round.find((x) => x.h === career.club || x.a === career.club);
  if (!f) return null;
  const home = f.h === career.club;
  return { md: career.md, fixture: f, home, opponent: home ? f.a : f.h };
}

function teamFor(career, clubId, { user = false, rand = Math.random } = {}) {
  const club = career.clubs[clubId];
  const players = squadOf(career, clubId).filter((p) => !p.loanOut);
  if (user) {
    const t = career.tactics;
    refreshUserLineup(career);
    return {
      id: clubId, name: club.name, players, lineup: t.lineup, bench: t.bench, formation: t.formation, style: t.style,
      mentality: t.mentality, familiarity: club.familiarity, morale: teamMorale(players),
      penaltyId: t.penaltyId || t.penaltyIdAuto, freeKickId: t.freeKickId, captainId: t.captainId,
    };
  }
  /* il computer ruota un po' e ogni tanto cambia modulo */
  if (rand() < 0.08) {
    const tt = aiTactics(players, rand);
    club.formation = tt.formation;
    if (rand() < 0.3) club.style = tt.style;
  }
  const { lineup, bench } = autoLineup(players, club.formation, club.style, { rotate: 0.45 });
  return {
    id: clubId, name: club.name, players, lineup, bench, formation: club.formation, style: club.style,
    mentality: 'equilibrata', familiarity: club.familiarity, morale: teamMorale(players),
  };
}

export function teamMorale(players) {
  const core = [...players].sort((a, b) => b.ovr - a.ovr).slice(0, 16);
  return Math.round(core.reduce((n, p) => n + p.morale, 0) / Math.max(1, core.length));
}

/** la partita dell'utente, pronta da giocare dal vivo */
export function startUserMatch(career) {
  const nf = nextFixture(career);
  if (!nf) return null;
  const rand = rngFor(career, 'ai-lineup');
  const me = teamFor(career, career.club, { user: true });
  const them = teamFor(career, nf.opponent, { rand });
  const seed = fnv1a(`${career.seed}|${career.season}|${career.md}|match`);
  const derby = career.clubs[nf.opponent] && isDerby(career, career.club, nf.opponent);
  const match = createMatch({
    seed,
    home: nf.home ? me : them,
    away: nf.home ? them : me,
    user: nf.home ? 'home' : 'away',
    derby,
    stakes: 1,
  });
  /* le decisioni della settimana arrivano in campo: squadra carica, nervosa, stanca… */
  const side = match.sides.find((x) => x.key === match.user);
  for (const [key, value] of Object.entries(career.flags.nextMatch || {})) side.mods.push({ key, value, until: null });
  /* allenatore squalificato: in panchina va il vice, le scelte in partita non arrivano */
  if (career.flags.coachBan?.left > 0) match.coachBan = true;
  return match;
}

/* derby e rivalità storiche, anche fra le due divisioni dello stesso paese
   (si incontrano in coppa o dopo una promozione). Gli id senza l'anno di fondazione. */
const RIVALS = [
  /* Italia */
  ['inter-milan', 'milan'], ['roma', 'lazio'], ['juventus', 'torino'], ['genoa-cfc', 'uc-sampdoria'], ['inter-milan', 'juventus'],
  ['milan', 'juventus'], ['napoli', 'roma'], ['napoli', 'juventus'], ['fiorentina', 'juventus'], ['fiorentina', 'bologna'], ['fiorentina', 'empoli'],
  ['pisa', 'empoli'], ['bologna', 'modena'], ['sassuolo', 'modena'], ['parma', 'modena'], ['hellas-verona', 'lr-vicenza'], ['padova', 'lr-vicenza'],
  ['padova', 'venezia'], ['hellas-verona', 'padova'], ['avellino', 'benevento'], ['atalanta', 'cremonese'], ['como', 'monza'], ['cesena', 'bologna'],
  ['uc-sampdoria', 'virtus-entella'], ['udinese', 'venezia'], ['lazio', 'frosinone'], ['palermo', 'catanzaro'], ['ascoli', 'pisa'],
  /* Inghilterra */
  ['arsenal', 'tottenham-hotspur'], ['arsenal', 'chelsea'], ['chelsea', 'tottenham-hotspur'], ['liverpool', 'everton'], ['manchester-united', 'manchester-city'],
  ['manchester-united', 'liverpool'], ['manchester-united', 'leeds-united'], ['newcastle-united', 'sunderland'], ['crystal-palace', 'brighton-hove-albion'],
  ['chelsea', 'fulham'], ['fulham', 'brentford'], ['brentford', 'queens-park-rangers'], ['fulham', 'queens-park-rangers'], ['nottingham-forest', 'derby-county'],
  ['aston-villa', 'birmingham-city'], ['coventry-city', 'birmingham-city'], ['ipswich-town', 'norwich-city'], ['west-bromwich-albion', 'wolverhampton-wanderers'],
  ['aston-villa', 'wolverhampton-wanderers'], ['southampton', 'portsmouth'], ['bournemouth', 'southampton'], ['swansea-city', 'cardiff-city'], ['bristol-city', 'cardiff-city'],
  ['west-ham-united', 'millwall'], ['west-ham-united', 'tottenham-hotspur'], ['charlton-athletic', 'millwall'], ['charlton-athletic', 'crystal-palace'],
  ['blackburn-rovers', 'burnley'], ['preston-north-end', 'blackburn-rovers'], ['bolton-wanderers', 'preston-north-end'], ['middlesbrough', 'sunderland'],
  ['middlesbrough', 'newcastle-united'], ['hull-city', 'leeds-united'], ['sheffield-united', 'leeds-united'], ['stoke-city', 'wolverhampton-wanderers'],
  ['lincoln-city', 'hull-city'], ['watford', 'queens-park-rangers'], ['wrexham', 'cardiff-city'],
  /* Spagna */
  ['real-madrid', 'atletico-madrid'], ['real-madrid', 'barcelona'], ['barcelona', 'rcd-espanyol'], ['real-betis', 'sevilla'], ['athletic-bilbao', 'real-sociedad'],
  ['deportivo-alaves', 'athletic-bilbao'], ['deportivo-alaves', 'real-sociedad'], ['sd-eibar', 'real-sociedad'], ['valencia', 'levante-ud'], ['valencia', 'villarreal'],
  ['cd-castellon', 'villarreal'], ['rc-celta-de-vigo', 'deportivo-de-a-coruna'], ['real-oviedo', 'sporting-de-gijon'], ['getafe', 'cd-leganes'],
  ['atletico-madrid', 'rayo-vallecano'], ['real-madrid', 'rayo-vallecano'], ['ud-las-palmas', 'cd-tenerife'], ['granada', 'malaga'], ['granada', 'ud-almeria'],
  ['malaga', 'sevilla'], ['cadiz', 'sevilla'], ['cordoba', 'sevilla'], ['barcelona', 'girona'], ['rcd-espanyol', 'girona'], ['real-valladolid', 'burgos'],
  ['racing-de-santander', 'athletic-bilbao'], ['racing-de-santander', 'sporting-de-gijon'], ['ca-osasuna', 'real-sociedad'], ['elche', 'cd-eldense'],
  ['albacete-balompie', 'elche'], ['rcd-mallorca', 'rcd-espanyol'],
  /* Germania */
  ['borussia-dortmund', 'schalke-04'], ['bayern-munich', 'borussia-dortmund'], ['hamburger-sv', 'sv-werder-bremen'], ['hamburger-sv', 'st-pauli'],
  ['1-koln', 'borussia-monchengladbach'], ['1-koln', 'bayer-04-leverkusen'], ['1-union-berlin', 'hertha-bsc'], ['vfb-stuttgart', 'karlsruher'],
  ['freiburg', 'karlsruher'], ['freiburg', 'vfb-stuttgart'], ['1-nurnberg', 'spvgg-greuther-furth'], ['bayern-munich', '1-nurnberg'], ['augsburg', 'bayern-munich'],
  ['eintracht-frankfurt', 'sv-darmstadt-98'], ['eintracht-frankfurt', '1-fsv-mainz-05'], ['1-fsv-mainz-05', '1-kaiserslautern'], ['sv-elversberg', '1-kaiserslautern'],
  ['hannover-96', 'eintracht-braunschweig'], ['vfl-wolfsburg', 'eintracht-braunschweig'], ['vfl-wolfsburg', 'hannover-96'], ['schalke-04', 'vfl-bochum'],
  ['borussia-dortmund', 'vfl-bochum'], ['arminia-bielefeld', 'paderborn-07'], ['arminia-bielefeld', 'vfl-osnabruck'], ['dynamo-dresden', 'energie-cottbus'],
  ['dynamo-dresden', '1-magdeburg'], ['rb-leipzig', 'dynamo-dresden'], ['holstein-kiel', 'st-pauli'], ['holstein-kiel', 'hamburger-sv'], ['tsg-1899-hoffenheim', 'vfb-stuttgart'],
  ['1-heidenheim', 'vfb-stuttgart'], ['sv-werder-bremen', 'vfl-osnabruck'],
  /* Francia */
  ['paris-saint-germain', 'olympique-de-marseille'], ['olympique-lyonnais', 'saint-etienne'], ['olympique-de-marseille', 'olympique-lyonnais'], ['ogc-nice', 'monaco'],
  ['olympique-de-marseille', 'ogc-nice'], ['rc-lens', 'lille-osc'], ['stade-rennais', 'nantes'], ['stade-rennais', 'stade-brestois-29'], ['stade-rennais', 'lorient'],
  ['stade-brestois-29', 'lorient'], ['en-avant-guingamp', 'stade-rennais'], ['en-avant-guingamp', 'stade-brestois-29'], ['metz', 'nancy-lorraine'],
  ['rc-strasbourg-alsace', 'metz'], ['rc-strasbourg-alsace', 'nancy-lorraine'], ['paris', 'paris-saint-germain'], ['red-star', 'paris'], ['aj-auxerre', 'dijon-fco'],
  ['angers-sco', 'nantes'], ['angers-sco', 'le-mans'], ['stade-lavallois', 'le-mans'], ['es-troyes', 'stade-de-reims'], ['usl-dunkerque', 'boulogne'],
  ['rc-lens', 'usl-dunkerque'], ['grenoble-foot-38', 'saint-etienne'], ['clermont-foot-63', 'saint-etienne'], ['annecy', 'grenoble-foot-38'],
  ['sochaux-montbeliard', 'rc-strasbourg-alsace'], ['montpellier-hsc', 'olympique-de-marseille'], ['pau', 'toulouse'], ['rodez-af', 'toulouse'], ['le-havre', 'paris-saint-germain'],
];
const norm = (id) => String(id).replace(/-\d{4}$/, '');
const RIVAL_SET = new Set(RIVALS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
export function isDerby(career, a, b) {
  void career;
  return RIVAL_SET.has(`${norm(a)}|${norm(b)}`);
}

/**
 * Dopo una partita (dell'utente o del computer): risultato nel calendario,
 * statistiche, voti, forma, morale, squalifiche, infortuni.
 */
export function applyMatch(career, match, fixture) {
  const [H, A] = match.sides;
  fixture.res = [H.goals, A.goals];
  const ratings = playerRatings(match);
  const motm = Object.entries(ratings).sort((a, b) => b[1] - a[1])[0]?.[0];
  const scorers = match.events.filter((e) => ['goal', 'penGoal'].includes(e.type)).map((e) => ({ side: e.side, player: e.player, minute: e.minute, pen: e.type === 'penGoal', assist: e.assist }));
  fixture.info = { scorers, motm, pens: match.shootout ? [match.shootout.home, match.shootout.away] : null };

  const userSide = match.sides.find((x) => x.team.id === career.club);
  if (userSide) {
    for (const pr of career.promises || []) if (pr.type === 'starts' && userSide.team.lineup.includes(pr.player)) pr.count++;
    /* "spazio ai giovani" a partita chiusa: i ragazzi lo sentono */
    if (match.youthMinutes) for (const p of userSide.team.players) if (career.season - p.birth <= 21) p.morale = clamp(p.morale + 4, 0, 100);
    delete career.flags.nextMatch;
    if (career.flags.coachBan) { career.flags.coachBan.left--; if (career.flags.coachBan.left <= 0) delete career.flags.coachBan; }
  }
  for (const side of match.sides) {
    const other = side === H ? A : H;
    const result = side.goals > other.goals ? 'W' : side.goals < other.goals ? 'L' : 'D';
    for (const p of side.team.players) {
      /* le squadre fuori dal campionato non si salvano: niente da aggiornare */
      if (career.players[p.id] !== p) continue;
      p.flags = (p.flags || []).filter((f) => f !== 'playingHurt');
      const ps = match.pstats[p.id];
      const played = ps && ps.start != null;
      if (played) {
        const mins = Math.max(1, (ps.end ?? 90) - ps.start);
        const r = ratings[p.id] ?? 6;
        for (const bucket of [p.stats, p.recent]) {
          bucket.apps++; if (ps.start === 0) bucket.starts++;
          bucket.minutes += mins;
          bucket.goals += ps.goals; bucket.assists += ps.assists; bucket.shots += ps.shots; bucket.keyPasses += ps.keyPasses;
          bucket.tackles += ps.tackles; bucket.interceptions += ps.interceptions; bucket.recoveries += ps.recoveries;
          bucket.aerials += ps.aerials; bucket.saves += ps.saves; bucket.conceded += p.role === 'POR' ? ps.conceded : 0;
          bucket.penSaved += ps.penSaved; bucket.errors += ps.errors; bucket.yellows += ps.yellow ? 1 : 0; bucket.reds += ps.red;
          if (ps.cleanSheet) bucket.cleanSheets++;
          bucket.ratingSum += r;
          if (p.id === motm) bucket.motm++;
        }
        p.form = clamp(p.form * 0.6 + (r - 6.4) * 2.2, -10, 10);
        p.morale = clamp(p.morale + (result === 'W' ? 2.5 : result === 'L' ? -2.5 : 0) + (r >= 7.5 ? 2 : r < 5.5 ? -2 : 0), 0, 100);
        /* squalifiche: rosso diretto 1-3 giornate, doppio giallo 1, un turno ogni cinque gialli */
        if (ps.red) p.suspended = Math.max(p.suspended, ps.yellow >= 2 ? 1 : 1 + (fnv1a(`${p.id}|${career.md}`) % 10 < 3 ? 1 : 0));
        else if (ps.yellow) { p.yellows++; if (p.yellows % 5 === 0) p.suspended = Math.max(p.suspended, 1); }
        if (ps.injured) p.injury += 1;
        p.lastRating = r;
      } else if (side.team.lineup) {
        /* chi resta fuori: i più ambiziosi lo prendono male */
        const important = p.ovr >= teamMorale([p]) && p.ovr >= median(side.team.players.map((x) => x.ovr)) + 3;
        if (!p.injury && !p.suspended && important) p.morale = clamp(p.morale - (p.personality === 'ambizioso' ? 3 : p.personality === 'leader' ? 1.5 : 1), 0, 100);
      }
    }
  }
  return { ratings, motm, scorers };
}

function median(v) { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 0; }

/** tutte le altre partite della giornata */
export function simulateRest(career) {
  const round = career.fixtures[career.md];
  const rand = rngFor(career, 'rest');
  for (const f of round) {
    if (f.res || f.h === career.club || f.a === career.club) continue;
    const m = createMatch({
      seed: fnv1a(`${career.seed}|${career.season}|${career.md}|${f.h}|${f.a}`),
      home: teamFor(career, f.h, { rand }),
      away: teamFor(career, f.a, { rand }),
      derby: isDerby(career, f.h, f.a),
    });
    simulateToEnd(m);
    applyMatch(career, m, f);
  }
}

/* ------------------------------------------------------------------ */
/* fine giornata                                                        */
/* ------------------------------------------------------------------ */

export function table(career, data, upTo = Infinity) {
  const league = leagueOf(data, career.league);
  return standings(Object.keys(career.clubs), career.fixtures, { tiebreak: TIEBREAK[league.code] || 'gd', upTo });
}

/**
 * Chiude la giornata: recupero, infortuni e squalifiche che scalano,
 * crescita dei giocatori ogni cinque giornate, dirigenza e tifosi.
 * Restituisce il resoconto da mostrare.
 */
export function closeMatchday(career, data) {
  const league = leagueOf(data, career.league);
  const md = career.md;
  const before = table(career, data, md);
  const after = table(career, data, md + 1);
  const rand = rngFor(career, 'close');
  const report = { md, season: career.season, table: after, before: before.map((r) => r.id), evolution: null, board: null, injuries: [], news: [] };

  const nf = career.fixtures[md].find((x) => x.h === career.club || x.a === career.club);
  if (nf?.res) {
    const home = nf.h === career.club;
    const gf = home ? nf.res[0] : nf.res[1];
    const ga = home ? nf.res[1] : nf.res[0];
    const rec = career.coach.record;
    rec.p++; rec.gf += gf; rec.ga += ga;
    if (gf > ga) rec.w++; else if (gf === ga) rec.d++; else rec.l++;
    report.result = { gf, ga, opponent: home ? nf.a : nf.h, home };
  }

  /* recupero e calendario delle assenze */
  for (const club of Object.values(career.clubs)) {
    for (const id of club.squad) {
      const p = career.players[id];
      if (!p) continue;
      if (p.injury > 0) p.injury--;
      if (p.suspended > 0) p.suspended--;
      recover(p, 7, career.season);
      /* infortuni in allenamento: rari, più probabili per chi è fragile o sfinito */
      if (!p.injury && rand() < 0.0018 * (0.5 + p.injuryProne / 80) * (p.fitness < 60 ? 1.8 : 1)) {
        p.injury = 1 + Math.floor(rand() * 4);
        if (club.id === career.club) report.injuries.push({ id: p.id, weeks: p.injury, training: true });
      }
    }
  }
  const mine = squadOf(career, career.club);
  for (const p of mine) if (p.injury && !report.injuries.some((x) => x.id === p.id) && p.injury > 0 && p.recent.apps && p.lastInjuryNoted !== `${career.season}-${p.injury}`) { /* segnati dalla partita */ }

  /* ogni cinque giornate le doti si muovono con il rendimento */
  if ((md + 1) % EVOLVE_EVERY === 0) {
    report.evolution = [];
    for (const club of Object.values(career.clubs)) {
      for (const id of club.squad) {
        const p = career.players[id];
        if (!p) continue;
        const d = evolve(rngFor(career, `evo-${p.id}`), p, p.loanOut ? loanStats(p, EVOLVE_EVERY) : p.recent, career.season, 1);
        p.history.push({ s: career.season, md: md + 1, ovr: p.ovr });
        if (p.history.length > 60) p.history.shift();
        if (club.id === career.club && d !== 0) report.evolution.push({ id: p.id, delta: d, ovr: p.ovr });
        p.recent = emptyStats();
        /* lo stile si impara giocandolo */
        if (club.id === career.club && p.stats.minutes > 0) {
          p.styleXp = p.styleXp || {};
          p.styleXp[career.tactics.style] = clamp((p.styleXp[career.tactics.style] || 0) + 2, 0, 20);
        }
      }
    }
    report.evolution.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  /* familiarità con lo stile: sale giocando, scende piano per gli altri */
  const club = career.clubs[career.club];
  for (const s of Object.keys(STYLES)) {
    const cur = club.familiarity[s] || 0;
    club.familiarity[s] = s === career.tactics.style ? clamp(cur + 3, 0, 100) : clamp(cur - 0.5, 0, 100);
  }

  report.board = boardReview(career, data, after, report);
  report.bonuses = payBonuses(career);
  const marketWasOpen = windowOpen(career);
  career.md++;
  /* il mercato degli altri: un po' durante la finestra, di più quando chiude */
  if (marketWasOpen) {
    const closing = !windowOpen(career);
    report.transfers = worldTransfers(career, data, closing ? 0.3 : 0.12);
    report.talksExpired = expireTalks(career);
  }
  career.lastReport = report;
  if (career.md >= career.fixtures.length) career.phase = 'seasonEnd';
  if (career.board.sacked) career.phase = 'sacked';
  refreshUserLineup(career);
  return report;
}

/* ------------------------------------------------------------------ */
/* dirigenza                                                            */
/* ------------------------------------------------------------------ */

export function boardReview(career, data, rows, report) {
  const league = leagueOf(data, career.league);
  const b = career.board;
  const md = career.md + 1;
  const total = career.fixtures.length;
  const row = rows.find((r) => r.id === career.club);
  const others = Object.keys(career.clubs).filter((id) => id !== career.club).map((id) => currentStrength(career, id));
  const expPerMatch = expectedPoints(currentStrength(career, career.club), others, 1);
  const last = report.result;
  const before = b.trust;
  let delta = 0;
  if (last) {
    const pts = last.gf > last.ga ? 3 : last.gf === last.ga ? 1 : 0;
    delta += clamp((pts - expPerMatch) * 1.6, -4.5, 3.5);
    if (isDerby(career, career.club, last.opponent)) delta += last.gf > last.ga ? 2 : last.gf < last.ga ? -2 : 0;
    b.fans = clamp(b.fans + (pts === 3 ? 1.5 : pts === 0 ? -1.8 : -0.2) + (last.gf >= 3 ? 1 : 0), 0, 100);
  }
  /* la classifica conta di più col passare delle giornate */
  if (md >= 6) {
    const gap = row.pos - b.objective.target;
    const weight = 0.25 + (md / total) * 0.9;
    if (gap > b.objective.tolerance) delta -= Math.min(3, (gap - b.objective.tolerance) * 0.35) * weight;
    else if (gap <= 0) delta += 0.6 * weight;
  }
  /* i tifosi scontenti premono sulla società */
  if (b.fans < 30) delta -= 0.6;
  b.trust = clamp(b.trust + delta * (b.patience >= 60 ? 0.85 : 1.1), 0, 100);

  /* ultimatum e esonero */
  const out = { trust: Math.round(b.trust), delta: Math.round((b.trust - before) * 10) / 10, fans: Math.round(b.fans), pos: row.pos };
  if (b.ultimatum) {
    const u = b.ultimatum;
    u.left--;
    if (last) u.points += last.gf > last.ga ? 3 : last.gf === last.ga ? 1 : 0;
    if (u.points >= u.need) { b.ultimatum = null; b.trust = clamp(b.trust + 12, 0, 100); out.ultimatum = 'passed'; }
    else if (u.left <= 0) { b.sacked = true; out.sacked = true; }
  } else if (md >= 7 && b.trust < 22 && !b.warned) {
    b.warned = true;
    b.ultimatum = { left: 3, need: 5, points: 0 };
    out.ultimatum = 'given';
  } else if (md >= 7 && b.trust < 8) {
    b.sacked = true;
    out.sacked = true;
  }
  if (out.sacked) {
    career.coach.sacked++;
    career.coach.reputation = clamp(career.coach.reputation - 8, 5, 100);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* utilità per le schermate                                             */
/* ------------------------------------------------------------------ */

export function playerCard(career, id) {
  const p = career.players[id];
  if (!p) return null;
  return {
    ...p,
    age: ageOf(p, career.season),
    value: valueOf(p, career.season),
    avgRating: p.stats.apps ? Math.round((p.stats.ratingSum / p.stats.apps) * 100) / 100 : null,
    affinity: playerAffinity(p, career.tactics.style),
  };
}

export { valueOf, wageFor, overallOf, DEPT };

/* ------------------------------------------------------------------ */
/* fine stagione                                                        */
/* ------------------------------------------------------------------ */

const isReserveTeam = (club) => / B$|\bB\b| II$/.test(club.name) || /-b$|-ii$/.test(club.id);

/**
 * Chi arriva dall'altro campionato: quella classifica non la giochiamo, la
 * forza sì. Da sotto salgono i più forti, da sopra scendono i più deboli.
 */
function drawPromoted(career, data, otherId, n, rand, exclude = [], weakest = false) {
  const other = leagueOf(data, otherId);
  const pool = other.clubs.map((id) => data.leagues.clubs[id]).filter((c) => !exclude.includes(c.id) && !isReserveTeam(c) && !career.clubs[c.id]);
  const out = [];
  while (out.length < n && pool.length) {
    const avg = pool.reduce((a, c) => a + c.strength, 0) / pool.length;
    const weights = pool.map((c) => Math.exp((c.strength - avg) * 0.6 * (weakest ? -1 : 1)));
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    for (; i < pool.length; i++) { r -= weights[i]; if (r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0].id);
  }
  return out;
}

/** una sfida secca fra due club (andata e ritorno se `legs` 2), simulata */
export function playTie(career, data, a, b, { legs = 2, tag = 'tie' } = {}) {
  const make = (id) => (career.clubs[id] ? teamFor(career, id, { user: id === career.club }) : outsideTeam(career, data, id));
  let ga = 0; let gb = 0;
  const games = [];
  for (let leg = 0; leg < legs; leg++) {
    const home = leg === 0 ? b : a;   // il ritorno in casa della meglio piazzata
    const away = home === a ? b : a;
    const last = leg === legs - 1;
    const m = createMatch({ seed: fnv1a(`${career.seed}|${career.season}|${tag}|${leg}|${a}|${b}`), home: make(home), away: make(away), knockout: false, neutral: legs === 1 });
    simulateToEnd(m);
    const [H, A] = m.sides;
    if (home === a) { ga += H.goals; gb += A.goals; } else { gb += H.goals; ga += A.goals; }
    games.push({ home, away, res: [H.goals, A.goals] });
    if (last && ga === gb) {
      /* parità: rigori (il motore li calcola solo in partita secca con eliminazione) */
      const r = rngFor(career, `${tag}-pens-${a}-${b}`);
      const pa = 0.5 + (currentStrengthAny(career, data, a) - currentStrengthAny(career, data, b)) * 0.01;
      games.push({ pens: r() < pa ? a : b });
      return { winner: games[games.length - 1].pens, games, agg: [ga, gb] };
    }
  }
  return { winner: ga > gb ? a : b, games, agg: [ga, gb] };
}

function currentStrengthAny(career, data, id) {
  return career.clubs[id] ? currentStrength(career, id) : data.leagues.clubs[id].strength;
}

/** un club che non è nel campionato dell'utente, costruito al volo dai dati */
function outsideTeam(career, data, id) {
  const { info, players } = buildClub(data, id, career.season, career.moved);
  const pool = players.filter((p) => !p.loanOut);
  const rand = mulberry32(fnv1a(`${career.seed}|${id}|outside`));
  const t = aiTactics(pool, rand);
  const { lineup, bench } = autoLineup(pool, t.formation, t.style);
  return { id, name: info.name, players: pool, lineup, bench, formation: t.formation, style: t.style, mentality: 'equilibrata', familiarity: { [t.style]: 60 }, morale: 62 };
}

function youthName(career, clubId, rand) {
  const pool = squadOf(career, clubId).filter((p) => / /.test(p.name));
  const nation = career.clubs[clubId] ? mostCommon(pool.map((p) => p.nation)) : null;
  const same = pool.filter((p) => p.nation === nation);
  const src = same.length >= 4 ? same : Object.values(career.players).filter((p) => p.nation === nation && / /.test(p.name));
  const a = src[Math.floor(rand() * src.length)].name.split(' ');
  const b = src[Math.floor(rand() * src.length)].name.split(' ');
  return { name: `${a[0]} ${b[b.length - 1]}`, nation };
}
function mostCommon(list) { const m = {}; list.forEach((x) => { m[x] = (m[x] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || ''; }

/** un ragazzo del vivaio, con un potenziale che nessuno conosce ancora bene */
export function makeYouth(career, clubId, rand, { role = null, quality = 0 } = {}) {
  const club = career.clubs[clubId];
  const roles = ['POR', 'DC', 'DC', 'TZ', 'MED', 'CC', 'CC', 'TRQ', 'ALA', 'ALA', 'PUN', 'PUN'];
  const r = role || roles[Math.floor(rand() * roles.length)];
  const { name, nation } = youthName(career, clubId, rand);
  const birth = career.season - 16 - Math.floor(rand() * 2);
  const rating = Math.round(clamp(club.strength - 22 + rand() * 9 + quality, 44, 70));
  const p = playerFromRow([name, birth, nation, r, rating, 0, '', 170 + Math.round(rand() * 22), 0, 'y', 0], clubId, career.season);
  p.id = `${clubId}:y${career.season}${Math.floor(rand() * 1e6).toString(36)}`;
  /* la curva del ragazzo, più il lavoro del vivaio: qualche gioiello, tanti normali */
  p.potential = Math.round(clamp(p.potential + quality * 1.2 + (rand() - 0.5) * 4, rating + 3, 93));
  p.contract = career.season + 3;
  p.wage = 0.05;
  p.recent = emptyStats();
  p.academy = true;
  career.players[p.id] = p;
  club.squad.push(p.id);
  return p;
}

/** dopo aver cambiato età o voto a un giocatore generato, la curva si ricalcola */
export function resetCurve(p, season) {
  const c = careerCurve(p, season);
  p.peakAge = c.peakAge;
  p.declineAge = c.declineAge;
  p.potential = Math.max(c.potential, p.ovr);
}

/* un giocatore in prestito gioca altrove: minuti e voti di un titolare normale */
export function loanStats(p, matches) {
  const apps = Math.round(matches * 0.75);
  return { ...emptyStats(), apps, starts: apps, minutes: apps * 80, ratingSum: apps * (ROLE_PIVOT[p.role] + 0.1 + ((p.consistency || 60) - 60) * 0.004) };
}

const DEPT_NEED = { POR: 3, DIF: 7, CEN: 7, ATT: 5 };

/** un club del computer non resta mai con la rosa scoperta */
function maintainSquad(career, clubId, rand, added = null) {
  const count = (d) => squadOf(career, clubId).filter((p) => !p.loanOut && DEPT[p.role] === d).length;
  const pick = { POR: 'POR', DIF: 'DC', CEN: 'CC', ATT: 'PUN' };
  for (const d of Object.keys(DEPT_NEED)) {
    while (count(d) < DEPT_NEED[d]) {
      const p = makeYouth(career, clubId, rand, { role: pick[d], quality: 8 });
      p.birth = career.season - 19 - Math.floor(rand() * 6);
      const floor = Math.round(career.clubs[clubId].strength - 12);
      if (p.ovr < floor) applyPlayerFx(p, { attrs: { role: floor - p.ovr } }, career.season);
      resetCurve(p, career.season);
      p.academy = false;
      p.free = true;
      if (added) added.push(p.id);
    }
  }
  while (squadOf(career, clubId).filter((p) => !p.loanOut).length < 22) {
    const p = makeYouth(career, clubId, rand, { quality: 4 });
    if (added) added.push(p.id);
  }
  /* rosa troppo lunga (per un club del computer): i ragazzi in prestito, i più deboli liberi */
  if (clubId === career.club) return;
  let live = squadOf(career, clubId).filter((p) => !p.loanOut).sort((a, b) => a.ovr - b.ovr);
  while (live.length > 30) {
    const p = live.find((x) => ageOf(x, career.season) <= 22) || live[0];
    if (ageOf(p, career.season) <= 22) p.loanOut = true;
    else {
      career.clubs[clubId].squad = career.clubs[clubId].squad.filter((id) => id !== p.id);
      career.moved = career.moved || {};
      career.moved[`${p.name}|${p.birth}`] = 'free';
      delete career.players[p.id];
    }
    live = live.filter((x) => x !== p);
  }
}

/**
 * A stagione in corso, dopo una cessione decisa in un evento: la Primavera
 * copre i buchi, così restano sempre 20 giocatori e due portieri.
 */
export function topUpSquad(career, clubId, rand) {
  const added = [];
  const live = () => squadOf(career, clubId).filter((p) => !p.loanOut);
  while (live().filter((p) => p.role === 'POR').length < 2) added.push(makeYouth(career, clubId, rand, { role: 'POR', quality: 6 }));
  while (live().length < 20) added.push(makeYouth(career, clubId, rand, { quality: 6 }));
  return added;
}

/**
 * Fine stagione: verdetto, trofei, promozioni e retrocessioni, ritiri,
 * contratti, prestiti, vivaio. Restituisce il riepilogo da mostrare.
 */
export function endSeason(career, data) {
  const league = leagueOf(data, career.league);
  const rows = table(career, data);
  const rand = rngFor(career, 'endseason');
  const me = rows.find((r) => r.id === career.club);
  const b = career.board;
  const obj = b.objective;
  const summary = { season: career.season, league: league.id, table: rows, pos: me.pos, pts: me.pts, objective: obj, trophies: [], moves: {}, retired: [], left: [], returned: [], loanAgain: [], youth: [], verdict: null, playoffs: [] };

  /* trofei */
  if (me.pos === 1) summary.trophies.push({ type: league.level === 1 ? 'league' : 'league2', league: league.id, season: career.season, club: career.club });

  /* promozioni e retrocessioni */
  const z = zones(league);
  const ids = rows.map((r) => r.id);
  let up = []; let down = []; let inFrom = [];
  if (league.level === 1) {
    down = ids.slice(league.teams - (league.down || 0));
    let replacements = drawPromoted(career, data, league.lower, down.length, rand);
    if (league.relegationPlayoff) {
      const pl = ids[league.relegationPlayoff - 1];
      const challenger = drawPromoted(career, data, league.lower, 1, rand, replacements)[0];
      const tie = playTie(career, data, pl, challenger, { tag: 'relplayoff' });
      summary.playoffs.push({ type: 'relegation', a: pl, b: challenger, ...tie, names: [career.clubs[pl].name, data.leagues.clubs[challenger].name] });
      if (tie.winner === challenger) { down.push(pl); replacements.push(challenger); }
    }
    inFrom = replacements;
  } else {
    const eligible = ids.filter((id) => !isReserveTeam(career.clubs[id]));
    up = eligible.slice(0, league.up || 2);
    if (league.playoff) {
      const [a, bPos] = league.playoff;
      const field = eligible.filter((id) => !up.includes(id)).filter((id) => { const pos = ids.indexOf(id) + 1; return pos >= a && pos <= bPos; });
      /* tabellone: le migliori aspettano, le altre si sfidano */
      let round = [...field];
      let n = 0;
      while (round.length > 1) {
        const next = [];
        if (round.length % 2) next.push(round.shift());
        for (let i = 0; i < round.length / 2; i++) {
          const x = round[i]; const y = round[round.length - 1 - i];
          const tie = playTie(career, data, x, y, { legs: round.length === 2 ? 2 : 1, tag: `playoff-${n}-${i}` });
          summary.playoffs.push({ type: 'promotion', round: n, a: x, b: y, ...tie, names: [career.clubs[x].name, career.clubs[y].name] });
          next.push(tie.winner);
        }
        round = next;
        n++;
      }
      if (round[0]) up.push(round[0]);
    } else if (league.promotionPlayoff) {
      const third = eligible[league.promotionPlayoff - 1];
      const upper = leagueOf(data, league.upper);
      const victim = drawPromoted(career, data, league.upper, 1, rand, [], true)[0] || upper.clubs[0];
      const tie = playTie(career, data, victim, third, { tag: 'promoplayoff' });
      summary.playoffs.push({ type: 'relegation', a: victim, b: third, ...tie, names: [data.leagues.clubs[victim].name, career.clubs[third].name] });
      if (tie.winner === third) up.push(third);
    }
    /* sotto non ci sono campionati nel gioco: dalla serie cadetta non si scende */
    inFrom = drawPromoted(career, data, league.upper, up.length, rand, [], true);
  }
  summary.moves = { up, down, inFrom };
  if (up.includes(career.club)) summary.trophies.push({ type: 'promotion', league: league.id, season: career.season, club: career.club });

  /* le coppe vinte quest'anno vanno nel riepilogo; l'Europa dell'anno prossimo */
  summary.trophies.push(...career.coach.trophies.filter((t) => t.season === career.season && ['cup', 'ucl', 'uel', 'uecl'].includes(t.type)));
  career.europeNext = league.level === 1 && !down.includes(career.club) ? europeFromTable(league, me.pos) : null;
  summary.europe = career.europeNext;

  /* verdetto della dirigenza */
  const met = me.pos <= obj.target || up.includes(career.club);
  const gap = me.pos - obj.target;
  let repDelta = clamp(-gap * 0.9, -9, 9) + summary.trophies.filter((t) => ['league', 'league2'].includes(t.type)).length * 10 + summary.trophies.filter((t) => t.type === 'promotion').length * 5 + (met ? 3 : -2);
  if (league.level === 2) repDelta *= 0.7;
  career.coach.reputation = Math.round(clamp(career.coach.reputation + repDelta, 1, 100));
  b.trust = clamp(b.trust + (met ? 14 : -Math.min(30, gap * 4)), 0, 100);
  const relegated = down.includes(career.club);
  summary.verdict = relegated ? (b.trust < 45 ? 'sacked' : 'relegatedKept') : met ? (gap <= -3 ? 'triumph' : 'met') : b.trust < 25 ? 'sacked' : 'missed';
  if (summary.verdict === 'sacked') { b.sacked = true; career.coach.sacked++; }
  career.coach.trophies.push(...summary.trophies.filter((t) => !['cup', 'ucl', 'uel', 'uecl'].includes(t.type)));
  career.coach.history.push({ season: career.season, club: career.club, clubName: career.clubs[career.club].name, league: league.id, pos: me.pos, pts: me.pts, objective: obj.id, target: obj.target, met, verdict: summary.verdict, record: { ...career.coach.record } });
  career.coach.seasons++;

  /* crescita dell'estate, ritiri, contratti, prestiti */
  const nextSeason = career.season + 1;
  for (const club of Object.values(career.clubs)) {
    /* chi torna dal prestito resta se è fra i primi 24 della rosa; i ragazzi in esubero ripartono */
    const depth = squadOf(career, club.id).filter((x) => !x.loanOut).map((x) => x.ovr).sort((a, b) => b - a);
    const cut = depth[23] ?? 0;
    for (const id of [...club.squad]) {
      const p = career.players[id];
      if (!p) continue;
      evolve(rngFor(career, `summer-${p.id}`), p, p.loanOut ? loanStats(p, 10) : { ...p.stats }, nextSeason, 1.4);
      revisePotential(rngFor(career, `potential-${p.id}`), p, career.season);
      const age = nextSeason - p.birth;
      const retireP = age >= 34 ? (age - 33) * (p.role === 'POR' ? 0.12 : 0.2) + (p.ovr < 68 ? 0.1 : 0) : 0;
      const expiring = p.contract <= career.season;
      if (rand() < retireP) {
        club.squad = club.squad.filter((x) => x !== id);
        if (club.id === career.club) summary.retired.push({ id, name: p.name, age });
        delete career.players[id];
        continue;
      }
      if (p.loanIn) {
        club.squad = club.squad.filter((x) => x !== id);
        if (club.id === career.club) summary.left.push({ id, name: p.name, why: 'loanEnd' });
        delete career.players[id];
        continue;
      }
      if (p.loanOut) {
        if (age <= 23 && p.ovr < cut) { if (club.id === career.club) summary.loanAgain.push({ id, name: p.name }); }
        else {
          p.loanOut = false;
          /* chi torna e non rientra nei primi 24 finisce sul mercato */
          if (p.ovr < cut && !(p.flags || []).includes('listed')) p.flags = [...(p.flags || []), 'listed'];
          if (club.id === career.club) summary.returned.push({ id, name: p.name, listed: p.ovr < cut });
        }
      }
      if (expiring) {
        const med = median(squadOf(career, club.id).map((x) => x.ovr));
        /* l'utente decide i rinnovi durante la stagione; chi non ha deciso
           segue la regola della società: si tiene chi serve, si lascia andare chi no */
        const keep = club.id === career.club
          ? (p.flags.includes('renewed') || (!p.flags.includes('noRenew') && p.ovr >= med - 3 && age <= 32))
          : (p.ovr >= med - 2 && age <= 32) || rand() < 0.35;
        if (keep) { p.contract = nextSeason + 1 + Math.floor(rand() * 3); p.wage = wageFor(p.ovr, age); }
        else {
          club.squad = club.squad.filter((x) => x !== id);
          if (club.id === career.club) summary.left.push({ id, name: p.name, why: 'contract' });
          delete career.players[id];
        }
      }
      p.flags = (p.flags || []).filter((f) => f !== 'renewed');
    }
  }

  maintainSquad(career, career.club, rand, summary.youth);
  /* il vivaio: ogni estate qualche ragazzo sale in prima squadra */
  const available = squadOf(career, career.club).filter((p) => !p.loanOut).length;
  const intake = clamp(Math.min(2 + Math.floor(rand() * 3), 30 - available), career.flags.academyInvest ? 1 : 0, 4);
  for (let i = 0; i < intake; i++) summary.youth.push(makeYouth(career, career.club, rand, { quality: (career.flags.academyInvest ? 4 : 0) }).id);

  career.lastSeason = summary;
  career.phase = b.sacked ? 'sacked' : 'summer';
  return summary;
}

/**
 * Dopo il riepilogo: il mondo della stagione nuova. Se il club dell'utente
 * cambia campionato, gli altri club arrivano freschi dai dati.
 */
export function beginNextSeason(career, data) {
  const s = career.lastSeason;
  const league = leagueOf(data, career.league);
  const rand = rngFor(career, 'nextworld');
  career.season++;
  const { up, down, inFrom } = s.moves;
  const leaving = league.level === 1 ? down : up;
  const userMoves = leaving.includes(career.club);

  if (userMoves) {
    /* nel campionato nuovo: i suoi club, meno chi ha fatto il viaggio opposto,
       più chi si muove insieme all'utente (con le rose cresciute quest'anno) */
    const target = league.level === 1 ? league.lower : league.upper;
    const keep = {};
    for (const id of leaving) keep[id] = { club: { ...career.clubs[id], league: target }, players: squadOf(career, id) };
    const newLeague = leagueOf(data, target);
    const base = newLeague.clubs.filter((id) => !leaving.includes(id));
    /* chi ha fatto il viaggio opposto esce per primo; se non basta, i più deboli */
    const extra = base.length - (newLeague.teams - leaving.length);
    const out = [...base.filter((id) => inFrom.includes(id)), ...[...base].filter((id) => !inFrom.includes(id)).sort((a, b) => data.leagues.clubs[a].strength - data.leagues.clubs[b].strength)].slice(0, Math.max(0, extra));
    const ids = [...base.filter((id) => !out.includes(id)), ...leaving];
    career.players = {};
    career.league = target;
    career.clubs = populateLeague(career, data, target, keep, ids);
  } else {
    for (const id of leaving) {
      for (const pid of career.clubs[id].squad) delete career.players[pid];
      delete career.clubs[id];
    }
    for (const id of inFrom) {
      if (career.clubs[id]) continue;
      const { info, players } = buildClub(data, id, career.season, career.moved);
      const t = aiTactics(players.filter((p) => !p.loanOut), rand);
      for (const p of players) { p.recent = emptyStats(); p.club = id; career.players[p.id] = p; }
      career.clubs[id] = {
        id, name: info.name, colors: info.colors, ground: info.ground, capacity: info.capacity, strength: info.strength,
        league: career.league, squad: players.map((p) => p.id), formation: t.formation, style: t.style,
        familiarity: { [t.style]: 60 }, budget: 0, morale: 62,
      };
    }
  }
  for (const id of Object.keys(career.clubs)) if (id !== career.club) maintainSquad(career, id, rand);
  /* la forza scritta nei dati segue la rosa di oggi */
  for (const c of Object.values(career.clubs)) c.strength = Math.round((c.strength * 0.4 + (currentStrength(career, c.id) + 2) * 0.6) * 10) / 10;
  career.coach.record = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  career.lastSeason = null;
  startSeason(career, data);
}

/* ------------------------------------------------------------------ */
/* offerte di lavoro                                                    */
/* ------------------------------------------------------------------ */

/** quali panchine si aprono per un allenatore con questa reputazione */
export function jobOffers(career, data, { count = 3, tag = 'offers' } = {}) {
  const rand = rngFor(career, tag);
  const rep = career.coach.reputation;
  const all = Object.values(data.leagues.clubs).filter((c) => c.id !== career.club && !isReserveTeam(c));
  /* forza che un club cerca in un allenatore: 60 = serie cadette, 85 = grandi */
  const wanted = 60 + rep * 0.27;
  const scored = all.map((c) => ({ c, s: -Math.abs(c.strength - wanted) + rand() * 5 })).sort((a, b) => b.s - a.s);
  const out = [];
  for (const { c } of scored) {
    if (out.length >= count) break;
    if (out.some((o) => o.league === c.league) && rand() < 0.6) continue;
    out.push({ club: c.id, league: c.league, name: c.name, strength: c.strength, colors: c.colors });
  }
  return out;
}

/**
 * Cambio di panchina: il mondo del campionato del club nuovo. A stagione in
 * corso le giornate già giocate si simulano, così la classifica è vera.
 */
export function takeJob(career, data, clubId) {
  const info = data.leagues.clubs[clubId];
  const midSeason = career.phase === 'sacked' && career.md > 0 && career.md < career.fixtures.length && !career.lastSeason;
  /* i campionati hanno lunghezze diverse (34, 38, 46 giornate): si riparte
     dallo stesso punto della stagione, lasciando sempre almeno una giornata */
  const progress = midSeason ? career.md / career.fixtures.length : 0;
  /* l'Europa è del club, non dell'allenatore: conta dove ha chiuso il club nuovo */
  const newLeague = leagueOf(data, info.league);
  let europe = null;
  if (!midSeason && career.lastSeason && newLeague.level === 1) {
    const prev = career.lastSeason;
    const row = prev.league === info.league ? prev.table.find((r) => r.id === clubId) : null;
    if (row && !(prev.moves?.down || []).includes(clubId)) europe = europeFromTable(newLeague, row.pos);
    else if (!row) {
      const rank = newLeague.clubs.map((id) => data.leagues.clubs[id]).sort((a, b) => b.strength - a.strength).findIndex((c) => c.id === clubId) + 1;
      europe = rank > 0 ? europeFromTable(newLeague, rank) : null;
    }
  }
  career.europeNext = europe;
  if (!midSeason && career.lastSeason) { career.season++; career.lastSeason = null; }
  career.players = {};
  career.club = clubId;
  career.league = info.league;
  career.clubs = populateLeague(career, data, info.league);
  career.tactics = null;
  career.board = null;
  career.flags = {};
  /* catene, promesse e trattative restano al club di prima */
  career.later = [];
  career.promises = [];
  career.queue = [];
  career.offersIn = [];
  career.coach.record = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  career.md = 0;
  startSeason(career, data, { first: true });
  const total = career.fixtures.length;
  const md = midSeason ? Math.max(1, Math.min(total - 1, Math.round(progress * total))) : 0;
  career.inbox.unshift({ id: `job-${career.season}-${clubId}`, type: 'board', season: career.season, md, key: 'newJob', vars: { club: info.name } });
  if (md > 0) {
    /* il club nuovo ha già giocato: le giornate passate vanno in archivio */
    const userClub = career.club;
    career.club = '__none__';
    for (let i = 0; i < md; i++) {
      career.md = i;
      simulateRestAll(career, userClub);
    }
    career.club = userClub;
    career.md = md;
    const rows = table(career, data, md);
    const pos = rows.findIndex((r) => r.id === clubId) + 1;
    /* la dirigenza giudica dal punto in cui si prende la squadra */
    career.board.objective.target = Math.max(career.board.objective.target, Math.min(pos, career.board.objective.target + 4));
    career.board.trust = 62;
  }
  /* le coppe già iniziate: i turni passati si giocano senza l'utente in panchina */
  for (const [id, cup] of Object.entries(career.cups || {})) {
    while (!cup.winner && cup.round < cup.schedule.length && cup.schedule[cup.round] <= career.md - 1) closeCupRound(career, data, id);
  }
}

function simulateRestAll(career, userClub) {
  const round = career.fixtures[career.md];
  const rand = rngFor(career, 'past');
  for (const f of round) {
    if (f.res) continue;
    const m = createMatch({ seed: fnv1a(`${career.seed}|${career.season}|${career.md}|${f.h}|${f.a}|past`), home: teamFor(career, f.h, { rand }), away: teamFor(career, f.a, { rand }) });
    simulateToEnd(m);
    applyMatch(career, m, f);
  }
  for (const club of Object.values(career.clubs)) for (const id of club.squad) { const p = career.players[id]; if (!p) continue; if (p.injury > 0) p.injury--; if (p.suspended > 0) p.suspended--; recover(p, 7, career.season); }
  void userClub;
}
