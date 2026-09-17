/* ALLENATORE — il mercato.
   Si compra da tutti e dieci i campionati: i giocatori dei club del proprio
   campionato sono quelli vivi della carriera (con i voti cambiati), gli
   altri arrivano dai dati. Chi viene ceduto o comprato non ricompare nel
   club di prima.

   Un acquisto è una trattativa in tre tempi, e può saltare in ognuno:
   1. il club: chiede un prezzo, risponde ai rilanci e perde la pazienza;
      a volte si inserisce un'altra squadra e il prezzo sale; in Spagna c'è
      la clausola rescissoria;
   2. il giocatore e il suo procuratore: ingaggio, anni, ruolo promesso e
      commissione; il giocatore può rilanciare, rifiutare o scegliere il rivale;
   3. le visite mediche: un problema fisico può far saltare tutto, o
      costringere a rinegoziare.
   Tutto è deterministico per finestra di mercato: riaprire la stessa
   trattativa non cambia le risposte. */

import { fnv1a, mulberry32 } from '../core/rng.js';
import { playerFromRow, valueOf, wageFor, ageOf, emptyStats, careerCurve, DEPT } from './players.js';
import { squadOf, currentStrength, leagueOf, rngFor } from './career.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
export const rowKey = (name, birth) => `${name}|${birth}`;
const keyOf = (p) => rowKey(p.name, p.birth);

/** la rosa minima: mai sotto i 20 giocatori disponibili, mai senza il secondo portiere */
export const SQUAD_MIN = 20;
/** la rosa massima per comprare ancora */
export const SQUAD_MAX = 36;
/** in prestito l'ingaggio si divide: il club che prende paga questa quota */
export const LOAN_WAGE = 0.6;
export const TALK_ROLES = ['starter', 'rotation', 'prospect'];
const ROLE_RANK = { starter: 2, rotation: 1, prospect: 0 };

/** finestre: estate (prime due giornate) e gennaio (a metà campionato) */
export function windowOpen(career) {
  if (career.phase !== 'season') return false;
  const half = Math.floor(career.fixtures.length / 2);
  return career.md <= 1 || (career.md >= half - 1 && career.md <= half + 1);
}

/** la finestra in corso, una estiva e una invernale per stagione */
export function windowTag(career) {
  return `${career.season}-${career.md <= 1 ? 'summer' : 'winter'}`;
}

/** l'ultimo giorno della finestra: le trattative aperte stanotte saltano */
export function deadlineDay(career) {
  if (!windowOpen(career)) return false;
  const half = Math.floor(career.fixtures.length / 2);
  return career.md === 1 || career.md === half + 1;
}

function clubStrength(career, data, clubId) {
  return career.clubs[clubId] ? currentStrength(career, clubId) : data.leagues.clubs[clubId]?.strength ?? 60;
}

/**
 * Cerca giocatori in tutti i campionati.
 * filters: { role, dept, ageMax, ovrMin, ovrMax, priceMax, league, query }
 * Restituisce al massimo `limit` candidati, già con prezzo e disponibilità.
 */
export function search(career, data, filters = {}, limit = 40) {
  const out = [];
  const moved = career.moved || {};
  const q = (filters.query || '').trim().toLowerCase();
  const pass = (name, role, age, ovr, league) => {
    if (filters.role && role !== filters.role) return false;
    if (filters.dept && DEPT[role] !== filters.dept) return false;
    if (filters.ageMax && age > filters.ageMax) return false;
    if (filters.ovrMin && ovr < filters.ovrMin) return false;
    if (filters.ovrMax && ovr > filters.ovrMax) return false;
    if (filters.league && league !== filters.league) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  };
  /* i club vivi della carriera */
  for (const club of Object.values(career.clubs)) {
    if (club.id === career.club) continue;
    for (const p of squadOf(career, club.id)) {
      if (p.loanIn || !pass(p.name, p.role, ageOf(p, career.season), p.ovr, club.league)) continue;
      out.push({ p, clubId: club.id, live: true });
    }
  }
  /* gli altri campionati, dai dati */
  for (const lg of data.leagues.leagues) {
    if (lg.id === career.league) continue;
    for (const [clubId, rows] of Object.entries(data.squads[lg.id])) {
      if (career.clubs[clubId]) continue;
      for (const r of rows) {
        const [name, birth, , role, rating, , , , , flags] = r;
        if (flags.includes('i') || flags.includes('g')) continue;
        if (moved[rowKey(name, birth)]) continue;
        if (!pass(name, role, career.season - birth, rating, lg.id)) continue;
        out.push({ row: r, clubId, live: false });
      }
    }
  }
  /* i migliori per voto (o per potenziale), poi il prezzo: si costruiscono solo quelli da mostrare */
  const ovr = (x) => (x.live ? x.p.ovr : x.row[4]);
  if (filters.sort === 'pot') {
    const pot = (x) => x.pot ??= (x.live ? x.p.potential : careerCurve({ name: x.row[0], birth: x.row[1], role: x.row[3], ovr: x.row[4], fame: x.row[10] || 0 }, career.season).potential);
    out.sort((a, b) => (pot(b) - pot(a)) || (ovr(b) - ovr(a)));
  } else {
    out.sort((a, b) => ovr(b) - ovr(a));
  }
  const res = [];
  for (const x of out) {
    if (res.length >= limit) break;
    const p = x.live ? x.p : playerFromRow(x.row, x.clubId, career.season);
    const offer = quote(career, data, p, x.clubId);
    if (filters.priceMax && offer.price > filters.priceMax) continue;
    const talk = findTalk(career, keyOf(p));
    res.push({ player: p, clubId: x.clubId, live: x.live, ...offer, talk: talk ? talk.id : null, talkStage: talk ? talk.stage : null });
  }
  return res;
}

/** quanto chiede il club, quanto vuole il giocatore, e se è disposto a venire */
export function quote(career, data, p, clubId) {
  const age = ageOf(p, career.season);
  const value = valueOf(p, career.season);
  const sellerStr = clubStrength(career, data, clubId);
  const myStr = currentStrength(career, career.club);
  /* i titolari costano di più: la posizione del giocatore nella sua rosa */
  const squad = career.clubs[clubId] ? squadOf(career, clubId).map((x) => x.ovr) : data.squads[data.leagues.clubs[clubId].league][clubId].map((r) => r[4]);
  const rank = squad.filter((o) => o > p.ovr).length + 1;
  const keyMult = rank <= 3 ? 1.45 : rank <= 8 ? 1.2 : rank <= 14 ? 1.05 : 0.85;
  /* un club più forte non vende volentieri a uno più debole */
  const bigger = sellerStr > myStr + 5 ? 1.15 : 1;
  const price = r1(value * keyMult * bigger);
  /* stipendio: di più se scende di livello o se è un campione */
  const drop = Math.max(0, sellerStr - myStr);
  const wage = r2(wageFor(p.ovr, age) * (1 + drop * 0.05) * (p.personality === 'ambizioso' ? 1.15 : 1));
  /* disponibilità: nessuno lascia volentieri un club molto più forte */
  const rep = career.coach.reputation;
  let interest = 0.7 - drop * 0.07 + (rep - 50) * 0.006 + (p.morale < 50 ? 0.12 : 0) + (rank > 14 ? 0.15 : 0);
  if (age >= 32) interest += 0.1;
  if (p.personality === 'ambizioso') interest -= drop * 0.03;
  interest = clamp(interest, 0.02, 0.97);
  const mood = interest >= 0.6 ? 'keen' : interest >= 0.35 ? 'maybe' : 'no';
  return { price, wage, interest, mood, rank, loanFee: r1(value * 0.12) };
}

/** spazio nel monte ingaggi */
export function wageRoom(career) {
  const club = career.clubs[career.club];
  const bill = squadOf(career, career.club).reduce((n, p) => n + p.wage, 0);
  return r2(club.wageBudget * 1.1 - bill);
}

/* ------------------------------------------------------------------ */
/* trattative in entrata                                                */
/* ------------------------------------------------------------------ */

const OPEN = new Set(['club', 'player', 'medicalIssue']);
export const isOpenTalk = (t) => OPEN.has(t.stage);

/** le trattative della finestra in corso */
export function talksNow(career) {
  const w = windowTag(career);
  return (career.talks || []).filter((t) => t.window === w);
}
export function findTalk(career, key) {
  return talksNow(career).find((t) => t.key === key) || null;
}
export function talkById(career, id) {
  return (career.talks || []).find((t) => t.id === id) || null;
}
function talkRng(career, talk, tag) {
  return mulberry32(fnv1a(`${career.seed}|${talk.id}|${tag}|${talk.round}|${talk.playerRound}`));
}
const say = (talk, who, key, vars = {}) => { talk.log.push({ who, key, vars }); };
function collapse(talk, reason, vars = {}) {
  talk.stage = 'collapsed';
  talk.reason = reason;
  say(talk, 'deal', `collapsed_${reason}`, { ...vars, club: talk.rival?.name || vars.club || '' });
}

/** il giocatore della trattativa: quello vivo del campionato o quello dei dati */
export function talkPlayer(career, data, talk) {
  if (talk.live) return career.players[talk.playerId] || null;
  const info = data.leagues.clubs[talk.clubId];
  const row = data.squads[info.league][talk.clubId].find((r) => rowKey(r[0], r[1]) === talk.key);
  return row ? playerFromRow(row, talk.clubId, career.season) : null;
}

/** che ruolo si aspetta in squadra: dipende da quanti in rosa sono più forti di lui */
function roleWanted(career, p, kind) {
  const mine = squadOf(career, career.club).filter((x) => !x.loanOut).map((x) => x.ovr);
  const better = mine.filter((o) => o > p.ovr).length;
  let i = better < 11 ? 0 : better < 17 ? 1 : 2;
  if (p.personality === 'ambizioso' && better < 15) i = Math.max(0, i - 1);
  if (kind === 'loan') i = Math.min(i, 1); // in prestito si va per giocare
  return TALK_ROLES[i];
}

/**
 * Apre (o riapre) la trattativa per un giocatore. Una sola per giocatore a
 * finestra: se è saltata, per questa finestra resta saltata.
 * Esito: { talk } oppure { error: 'closed' | 'noLoan' | 'squadFull' | 'own' }
 */
export function openTalks(career, data, candidate, kind = 'buy') {
  const p = candidate.player;
  const key = keyOf(p);
  const existing = findTalk(career, key);
  if (existing) return { talk: existing };
  if (!windowOpen(career)) return { error: 'closed' };
  if (candidate.clubId === career.club) return { error: 'own' };
  if (squadOf(career, career.club).filter((x) => !x.loanOut).length >= SQUAD_MAX) return { error: 'squadFull' };
  const q = quote(career, data, p, candidate.clubId);
  const importance = q.rank <= 3 ? 'key' : q.rank <= 8 ? 'important' : q.rank <= 14 ? 'rotation' : 'fringe';
  if (kind === 'loan' && (importance === 'key' || importance === 'important')) return { error: 'noLoan' };

  const window = windowTag(career);
  const id = `${window}|${key}`;
  const rand = mulberry32(fnv1a(`${career.seed}|${id}|open`));
  const season = career.season;
  const age = ageOf(p, season);
  const left = p.contract - season;
  const sellerStr = clubStrength(career, data, candidate.clubId);
  const myStr = currentStrength(career, career.club);
  const listed = (p.flags || []).includes('listed');

  /* il prezzo sotto il quale il club non scende: dipende da quanto gli serve il
     giocatore, dal contratto, da quanto è in vendita e dall'umore del giorno */
  let ask = kind === 'buy' ? q.price : q.loanFee;
  let floorK = { key: 1, important: 0.9, rotation: 0.82, fringe: 0.72 }[importance]
    * (left <= 1 ? 0.8 : left === 2 ? 0.92 : 1) * (listed ? 0.85 : 1) * (0.93 + rand() * 0.14);
  if (kind === 'loan') floorK = 0.75 + rand() * 0.2;
  const untouchable = kind === 'buy' && importance === 'key' && sellerStr >= myStr + 4;
  if (untouchable) { ask *= 1.5; floorK = 0.95; }
  const sellerLeague = career.clubs[candidate.clubId]?.league || data.leagues.clubs[candidate.clubId].league;
  const clause = kind === 'buy' && leagueOf(data, sellerLeague).code === 'ES'
    ? r1(Math.max(ask * 1.6, valueOf(p, season) * (2.2 + rand() * 1.2)))
    : null;

  const years = kind === 'loan' ? 1 : age <= 23 ? 5 : age <= 27 ? 4 : age <= 30 ? 3 : age <= 32 ? 2 : 1;
  const wage = r2(q.wage * (0.95 + rand() * 0.2) * (kind === 'loan' ? LOAN_WAGE : 1));
  const talk = {
    id, key, window, kind,
    live: Boolean(candidate.live), playerId: candidate.live ? p.id : null, clubId: candidate.clubId,
    name: p.name, ovr: p.ovr, age, role: p.role, importance, untouchable,
    stage: 'club', reason: null,
    ask: r1(ask), startAsk: r1(ask), floor: r1(Math.max(0.05, ask * floorK)), clause,
    patience: { key: 2, important: 3, rotation: 3, fringe: 4 }[importance] + (rand() < 0.3 ? 1 : 0),
    interest: q.interest, mind: rand(), playerPatience: 3,
    demand: { wage, years, role: roleWanted(career, p, kind) },
    counter: null, agentFee: 0, fee: null, bonus: 0, contract: null, rival: null,
    round: 0, playerRound: 0, discountTried: false, issueWeeks: 0, signedId: null,
    md: career.md, log: [],
  };
  say(talk, 'club', untouchable ? 'untouchable' : kind === 'loan' ? 'openLoan' : 'open', { ask: talk.ask });
  if (clause) say(talk, 'club', 'clauseInfo', { fee: clause });
  if (q.mood === 'no') say(talk, 'agent', 'reluctant');
  career.talks = [...(career.talks || []), talk].slice(-40);
  return { talk };
}

/* controlli comuni: finestra, giocatore ancora lì, fase giusta */
function guard(career, data, talk, stage) {
  if (!talk) return { status: 'invalid' };
  if (talk.stage === 'collapsed' || talk.stage === 'signed') return { status: talk.stage, talk };
  if (!windowOpen(career) || talk.window !== windowTag(career)) { collapse(talk, 'windowClosed'); return { status: 'collapsed', talk }; }
  const gone = talk.live
    ? career.players[talk.playerId]?.club !== talk.clubId
    : Boolean(career.moved?.[talk.key] && career.moved[talk.key] !== talk.clubId);
  if (gone) { collapse(talk, 'gone'); return { status: 'collapsed', talk }; }
  if (talk.stage !== stage) return { status: 'invalid', talk };
  return null;
}

/** a volte, mentre si tratta, arriva un'altra squadra: il prezzo sale */
function maybeRival(career, data, talk, rand) {
  if (talk.rival || talk.stage !== 'club' || talk.kind !== 'buy' || talk.ovr < 68) return;
  if (rand() >= 0.12 + (talk.startAsk >= 15 ? 0.1 : 0)) return;
  const sellerStr = clubStrength(career, data, talk.clubId);
  const rivals = Object.values(data.leagues.clubs)
    .filter((c) => c.id !== talk.clubId && c.id !== career.club && c.strength >= sellerStr - 2 && !/ B$| II$/.test(c.name));
  if (!rivals.length) return;
  const c = rivals[Math.floor(rand() * rivals.length)];
  const up = 1.1 + rand() * 0.15;
  talk.rival = { club: c.id, name: c.name };
  talk.ask = r1(talk.ask * up);
  talk.floor = r1(talk.floor * up);
  say(talk, 'rival', 'entered', { club: c.name, ask: talk.ask });
}

function agentStage(talk, rand) {
  talk.stage = 'player';
  talk.agentFee = talk.kind === 'buy' ? r1(Math.max(0.1, talk.fee * (0.04 + rand() * 0.06))) : 0;
  say(talk, 'agent', 'demand', { wage: talk.demand.wage, years: talk.demand.years, role: talk.demand.role, agent: talk.agentFee });
}

/**
 * 1. Offerta al club. `bonus` sono premi legati alle presenze: valgono meno
 * dei soldi subito per chi vende, ma si pagano solo se il giocatore gioca.
 * Esito: accepted | countered | insulted | collapsed | noBudget | invalid
 */
export function bidClub(career, data, talkId, { fee, bonus = 0 }) {
  const talk = talkById(career, talkId);
  const stop = guard(career, data, talk, 'club');
  if (stop) return stop;
  fee = r1(fee); bonus = r1(Math.max(0, bonus));
  if (!(fee > 0)) return { status: 'invalid', talk };
  if (fee > career.clubs[career.club].budget + 0.001) return { status: 'noBudget', talk };
  talk.round++;
  const rand = talkRng(career, talk, 'club');
  say(talk, 'you', bonus ? 'bidBonus' : 'bid', { fee, bonus });
  const value = fee + bonus * 0.5;
  const breakOff = () => collapse(talk, talk.rival ? 'hijacked' : 'clubBroke');
  if (value < talk.ask * 0.55) {
    talk.patience -= 2;
    if (talk.patience <= 0) { breakOff(); return { status: 'collapsed', talk }; }
    say(talk, 'club', 'insulted', { ask: talk.ask });
    return { status: 'insulted', talk };
  }
  if (value >= talk.floor) {
    talk.fee = fee;
    talk.bonus = bonus;
    say(talk, 'club', 'accepted', { fee, bonus });
    agentStage(talk, rand);
    return { status: 'accepted', talk };
  }
  talk.patience -= 1;
  if (talk.patience <= 0) { breakOff(); return { status: 'collapsed', talk }; }
  talk.ask = r1(Math.max(talk.floor, talk.ask - (talk.ask - value) * (0.2 + rand() * 0.25)));
  if (talk.patience === 1) {
    talk.ask = r1(Math.max(talk.floor, Math.min(talk.ask, talk.floor * 1.04)));
    say(talk, 'club', 'lastPrice', { ask: talk.ask });
  } else {
    say(talk, 'club', 'counter', { ask: talk.ask });
  }
  maybeRival(career, data, talk, rand);
  return { status: 'countered', talk };
}

/** La clausola rescissoria: si paga e il club non può dire di no. */
export function payClause(career, data, talkId) {
  const talk = talkById(career, talkId);
  const stop = guard(career, data, talk, 'club');
  if (stop) return stop;
  if (!talk.clause) return { status: 'invalid', talk };
  if (talk.clause > career.clubs[career.club].budget + 0.001) return { status: 'noBudget', talk };
  talk.round++;
  talk.fee = talk.clause;
  talk.bonus = 0;
  say(talk, 'you', 'clause', { fee: talk.fee });
  say(talk, 'club', 'clausePaid', { fee: talk.fee });
  agentStage(talk, talkRng(career, talk, 'clause'));
  return { status: 'accepted', talk };
}

/* quanto piace al giocatore un contratto, prima dell'ingaggio */
function contractBase(talk, p, years, role) {
  const d = talk.demand;
  const diff = ROLE_RANK[role] - ROLE_RANK[d.role];
  const roleTerm = diff < 0 ? diff * (p?.personality === 'ambizioso' ? 0.3 : 0.2) : diff * 0.04;
  const yearsTerm = -Math.abs(years - d.years) * 0.05;
  return talk.interest + roleTerm + yearsTerm + (talk.rival ? -0.08 : 0);
}
const wageTerm = (wage, demanded) => clamp((wage / demanded - 1) * 1.5, -0.6, 0.35);
const WAGE_CAP = 1 + 0.35 / 1.5;

/**
 * 2. Il contratto al giocatore: ingaggio (milioni l'anno), anni, ruolo promesso.
 * Esito: signed | medicalIssue | countered | refused | collapsed | noBudget | noWages | invalid
 */
export function offerContract(career, data, talkId, { wage, years, role }) {
  const talk = talkById(career, talkId);
  const stop = guard(career, data, talk, 'player');
  if (stop) return stop;
  const p = talkPlayer(career, data, talk);
  wage = r2(wage);
  years = talk.kind === 'loan' ? 1 : clamp(Math.round(years), 1, 5);
  if (!TALK_ROLES.includes(role) || !(wage > 0)) return { status: 'invalid', talk };
  if (talk.fee + talk.agentFee > career.clubs[career.club].budget + 0.001) return { status: 'noBudget', talk };
  const room = wageRoom(career);
  if (wage > room + 0.001) return { status: 'noWages', talk, room };
  talk.playerRound++;
  const rand = talkRng(career, talk, 'player');
  say(talk, 'you', 'contract', { wage, years, role });
  const d = talk.demand;
  const base = contractBase(talk, p, years, role);
  if (base + wageTerm(wage, d.wage) >= talk.mind) {
    talk.contract = { wage, years, role };
    talk.counter = null;
    say(talk, 'agent', 'agreed');
    return medical(career, data, talk, rand);
  }
  /* il procuratore rilancia se l'accordo è possibile, altrimenti si allontana */
  const need = talk.mind - base;
  const needFull = talk.mind - contractBase(talk, p, d.years, d.role);
  let counter = null;
  if (need <= 0.35) counter = { wage: r2(d.wage * (1 + Math.max(need, -0.3) / 1.5) * 1.02 + 0.01), years, role };
  else if (needFull <= 0.35) counter = { wage: r2(d.wage * (1 + Math.max(needFull, -0.3) / 1.5) * 1.02 + 0.01), years: d.years, role: d.role };
  if (counter && counter.wage <= r2(d.wage * WAGE_CAP) + 0.02) {
    talk.playerPatience -= 1;
    if (talk.playerPatience <= 0) { collapse(talk, talk.rival ? 'hijacked' : 'playerRefused'); return { status: 'collapsed', talk }; }
    talk.counter = counter;
    say(talk, 'agent', talk.playerPatience === 1 ? 'lastDemand' : 'agentCounter', { wage: counter.wage, years: counter.years, role: counter.role });
    return { status: 'countered', talk };
  }
  talk.playerPatience -= 2;
  if (talk.playerPatience <= 0 || needFull > 0.35) { collapse(talk, talk.rival ? 'hijacked' : 'playerRefused'); return { status: 'collapsed', talk }; }
  say(talk, 'agent', 'refused');
  return { status: 'refused', talk };
}

/* 3. le visite mediche */
function medical(career, data, talk, rand) {
  const p = talkPlayer(career, data, talk);
  if (!p) { collapse(talk, 'gone'); return { status: 'collapsed', talk }; }
  const age = ageOf(p, career.season);
  const risk = (p.injuryProne / 100) * 0.14 + (age >= 31 ? 0.05 : 0) + (p.injury > 0 ? 0.6 : 0);
  if (rand() < risk) {
    talk.stage = 'medicalIssue';
    talk.issueWeeks = p.injury > 0 ? p.injury + 2 : 2 + Math.floor(rand() * 6);
    say(talk, 'medical', 'issue', { weeks: talk.issueWeeks });
    return { status: 'medicalIssue', talk };
  }
  say(talk, 'medical', 'passed');
  return finalize(career, data, talk, 0);
}

/**
 * Dopo un problema alle visite: 'discount' (chiedere uno sconto, una volta),
 * 'proceed' (firmare lo stesso, con l'infortunio), 'walk' (lasciar perdere).
 */
export function medicalChoice(career, data, talkId, choice) {
  const talk = talkById(career, talkId);
  const stop = guard(career, data, talk, 'medicalIssue');
  if (stop) return stop;
  if (choice === 'walk') { collapse(talk, 'medical'); return { status: 'collapsed', talk }; }
  if (choice === 'proceed') return finalize(career, data, talk, talk.issueWeeks);
  if (choice !== 'discount' || talk.discountTried) return { status: 'invalid', talk };
  talk.discountTried = true;
  talk.round++;
  const rand = talkRng(career, talk, 'discount');
  const yes = rand() < (talk.importance === 'fringe' || talk.importance === 'rotation' ? 0.7 : 0.45);
  if (!yes) { say(talk, 'club', 'noDiscount'); return { status: 'noDiscount', talk }; }
  talk.fee = r1(talk.fee * (0.75 + rand() * 0.1));
  say(talk, 'club', 'discount', { fee: talk.fee });
  return finalize(career, data, talk, talk.issueWeeks);
}

/** Si esce dalla trattativa. */
export function withdrawTalk(career, talkId) {
  const talk = talkById(career, talkId);
  if (!talk || !isOpenTalk(talk)) return { status: 'invalid', talk };
  collapse(talk, 'withdrawn');
  return { status: 'collapsed', talk };
}

function finalize(career, data, talk, injuryWeeks) {
  const p = talkPlayer(career, data, talk);
  if (!p) { collapse(talk, 'gone'); return { status: 'collapsed', talk }; }
  const club = career.clubs[career.club];
  if (talk.fee + talk.agentFee > club.budget + 0.001) { collapse(talk, 'noBudget'); return { status: 'collapsed', talk }; }
  const c = talk.contract;
  const signed = sign(career, data, { player: p, clubId: talk.clubId, live: talk.live }, talk.fee, talk.kind, c.wage, { years: c.years, agentFee: talk.agentFee, bonus: talk.bonus });
  if (injuryWeeks) {
    signed.injury = Math.max(signed.injury, injuryWeeks);
    signed.injuryProne = clamp(signed.injuryProne + 10, 0, 100);
  }
  /* il ruolo promesso diventa una promessa vera: si controlla fra dieci giornate */
  if (c.role !== 'prospect') {
    career.promises = career.promises || [];
    career.promises.push({ player: signed.id, type: 'starts', need: c.role === 'starter' ? 6 : 3, count: 0, deadline: career.md + 10 });
  }
  signed.promisedRole = c.role;
  talk.stage = 'signed';
  talk.signedId = signed.id;
  say(talk, 'deal', talk.kind === 'loan' ? 'signedLoan' : 'signed', { fee: talk.fee, wage: c.wage, years: c.years });
  return { status: 'signed', talk, player: signed };
}

/** A fine giornata: quando la finestra chiude, le trattative ancora aperte saltano. */
export function expireTalks(career) {
  const open = windowOpen(career);
  const w = windowTag(career);
  let n = 0;
  for (const t of career.talks || []) {
    if (isOpenTalk(t) && (!open || t.window !== w)) { collapse(t, 'windowClosed'); n++; }
  }
  return n;
}

function sign(career, data, candidate, fee, kind, wage, { years = null, agentFee = 0, bonus = 0 } = {}) {
  const club = career.clubs[career.club];
  const { player: p, clubId, live } = candidate;
  club.budget = r1(club.budget - fee - agentFee);
  career.moved = career.moved || {};
  career.moved[keyOf(p)] = career.club;
  if (live) {
    const seller = career.clubs[clubId];
    seller.squad = seller.squad.filter((id) => id !== p.id);
    seller.budget = r1((seller.budget || 0) + fee);
    delete career.players[p.id];
  }
  /* nuovo id nel club nuovo; le statistiche della stagione restano sue */
  const signed = { ...p, id: `${career.club}:${fnv1a(`${keyOf(p)}|${career.season}|${career.md}`).toString(36)}`, club: career.club };
  signed.recent = signed.recent || emptyStats();
  signed.loanIn = kind === 'loan';
  signed.loanOut = false;
  signed.wage = wage;
  signed.morale = clamp((p.morale || 70) + 8, 0, 100);
  signed.bond = 55;
  signed.flags = (signed.flags || []).filter((f) => f !== 'listed' && f !== 'wantsOut');
  if (kind === 'buy') signed.contract = years ? career.season + years : Math.max(signed.contract, career.season + 3);
  signed.signedFrom = clubId;
  signed.fee = fee;
  signed.bonusDue = bonus > 0 ? { fee: bonus, apps: 20, club: clubId } : null;
  career.players[signed.id] = signed;
  club.squad.push(signed.id);
  career.transfers = career.transfers || [];
  career.transfers.unshift({ season: career.season, md: career.md, dir: 'in', kind, name: p.name, from: clubId, fee, agentFee, bonus });
  if (live) refillAfterSale(career, clubId, rngFor(career, `refill-${clubId}`));
  void data;
  return signed;
}

/** i premi a obiettivo: si pagano quando il giocatore arriva alle presenze promesse */
export function payBonuses(career) {
  const club = career.clubs[career.club];
  const paid = [];
  for (const p of squadOf(career, career.club)) {
    const b = p.bonusDue;
    if (!b || (p.stats?.apps || 0) < b.apps) continue;
    club.budget = r1(club.budget - b.fee);
    paid.push({ id: p.id, name: p.name, fee: b.fee });
    p.bonusDue = null;
  }
  return paid;
}

/* il club che vende si rimpiazza con un ragazzo, così la rosa resta intera */
function refillAfterSale(career, clubId, rand) {
  const squad = squadOf(career, clubId).filter((p) => !p.loanOut);
  if (squad.length >= 22) return;
  const src = squad.filter((p) => / /.test(p.name));
  if (!src.length) return;
  const a = src[Math.floor(rand() * src.length)].name.split(' ');
  const b = src[Math.floor(rand() * src.length)].name.split(' ');
  const role = ['DC', 'CC', 'PUN', 'TZ', 'ALA'][Math.floor(rand() * 5)];
  const rating = Math.round(career.clubs[clubId].strength - 10);
  const p = playerFromRow([`${a[0]} ${b[b.length - 1]}`, career.season - 20 - Math.floor(rand() * 5), src[0].nation, role, rating, 0, '', 180, 0, '', 0], clubId, career.season);
  p.recent = emptyStats();
  career.players[p.id] = p;
  career.clubs[clubId].squad.push(p.id);
}

/* ------------------------------------------------------------------ */
/* cessioni                                                            */
/* ------------------------------------------------------------------ */

export function setListed(career, playerId, listed) {
  const p = career.players[playerId];
  if (!p) return;
  p.flags = (p.flags || []).filter((f) => f !== 'listed');
  if (listed) p.flags.push('listed');
}

/* cosa pensa il giocatore dell'offerta: vuole andare, ci pensa, oppure no */
function stanceOf(career, p, buyer) {
  const mine = currentStrength(career, career.club);
  if ((p.flags || []).includes('wantsOut')) return 'wants';
  if (buyer.strength >= mine + 3 && (p.personality === 'ambizioso' || p.morale < 55)) return 'wants';
  if ((p.bond ?? 50) >= 68 && buyer.strength <= mine + 2) return 'refuses';
  if (buyer.strength < mine - 4 && ageOf(p, career.season) <= 29) return 'refuses';
  return 'open';
}

/** la rosa minima: si può lasciar partire questo giocatore? */
export function canLetGo(career, p) {
  const left = squadOf(career, career.club).filter((x) => !x.loanOut && x.id !== p.id);
  if (left.length < SQUAD_MIN) return 'squadMin';
  if (p.role === 'POR' && left.filter((x) => x.role === 'POR').length < 2) return 'keeperMin';
  return null;
}

/**
 * Offerte in arrivo per i giocatori messi sul mercato (e ogni tanto per i
 * migliori anche se non lo sono). Si generano a fine giornata. Ogni club ha
 * un massimo che non dice e una pazienza per le controproposte.
 */
export function incomingOffers(career, data) {
  career.offersIn = (career.offersIn || []).filter((o) => o.expires > career.md && career.players[o.player]);
  if (!windowOpen(career)) return [];
  const rand = rngFor(career, 'offers-in');
  const all = Object.values(data.leagues.clubs).filter((c) => c.id !== career.club);
  const made = [];
  for (const p of squadOf(career, career.club)) {
    if (p.loanIn || career.offersIn.some((o) => o.player === p.id)) continue;
    const listed = (p.flags || []).includes('listed');
    const wants = (p.flags || []).includes('wantsOut');
    const chance = listed ? 0.55 : wants ? 0.3 : p.ovr >= currentStrength(career, career.club) + 4 ? 0.05 : 0;
    if (rand() >= chance) continue;
    const value = valueOf(p, career.season);
    const buyers = all.filter((c) => c.strength >= p.ovr - 9 && c.strength <= p.ovr + 12);
    if (!buyers.length) continue;
    const buyer = buyers[Math.floor(rand() * buyers.length)];
    const fee = r1(value * (listed ? 0.7 + rand() * 0.35 : 1.05 + rand() * 0.4));
    const offer = {
      id: `${p.id}|${career.season}|${career.md}`, player: p.id, club: buyer.id, clubName: buyer.name, fee, expires: career.md + 3,
      max: r1(fee * (1.08 + rand() * 0.3)), patience: 2, stance: stanceOf(career, p, buyer),
    };
    career.offersIn.push(offer);
    made.push(offer);
  }
  return made;
}

/** Esito: sold | squadMin | keeperMin | playerRefuses | null */
export function acceptOffer(career, data, offerId) {
  const o = (career.offersIn || []).find((x) => x.id === offerId);
  if (!o) return null;
  const p = career.players[o.player];
  const blocked = canLetGo(career, p);
  if (blocked) return { status: blocked };
  if (o.stance === 'refuses') return { status: 'playerRefuses' };
  const club = career.clubs[career.club];
  club.budget = r1(club.budget + o.fee);
  club.squad = club.squad.filter((id) => id !== p.id);
  career.tactics.lineup = career.tactics.lineup.filter((id) => id !== p.id);
  career.tactics.bench = career.tactics.bench.filter((id) => id !== p.id);
  career.moved = career.moved || {};
  career.moved[keyOf(p)] = o.club;
  /* se il compratore è nel campionato, il giocatore continua a giocare lì */
  if (career.clubs[o.club]) {
    const moved = { ...p, id: `${o.club}:${fnv1a(`${keyOf(p)}|sold|${career.season}`).toString(36)}`, club: o.club, flags: [], bonusDue: null };
    career.players[moved.id] = moved;
    career.clubs[o.club].squad.push(moved.id);
  }
  delete career.players[p.id];
  career.offersIn = career.offersIn.filter((x) => x.player !== o.player);
  career.promises = (career.promises || []).filter((x) => x.player !== p.id);
  career.transfers = career.transfers || [];
  career.transfers.unshift({ season: career.season, md: career.md, dir: 'out', kind: 'buy', name: p.name, to: o.club, fee: o.fee });
  void data;
  return { status: 'sold', ...o };
}

/**
 * Controproposta a un'offerta ricevuta: se la cifra è entro il massimo del
 * compratore l'affare si chiude, altrimenti rilancia o se ne va.
 * Esito: sold | raised | walkedAway | playerRefuses | squadMin | keeperMin | null
 */
export function counterIncoming(career, data, offerId, ask) {
  const o = (career.offersIn || []).find((x) => x.id === offerId);
  if (!o) return null;
  const p = career.players[o.player];
  const blocked = canLetGo(career, p);
  if (blocked) return { status: blocked };
  if (o.stance === 'refuses') return { status: 'playerRefuses' };
  ask = r1(ask);
  if (ask <= o.max) { o.fee = Math.max(o.fee, ask); return acceptOffer(career, data, offerId); }
  o.patience--;
  if (o.patience <= 0) {
    career.offersIn = career.offersIn.filter((x) => x.id !== offerId);
    return { status: 'walkedAway', club: o.clubName };
  }
  const rand = mulberry32(fnv1a(`${career.seed}|${o.id}|counter|${o.patience}`));
  o.fee = r1(o.fee + (o.max - o.fee) * (0.5 + rand() * 0.35));
  return { status: 'raised', fee: o.fee, club: o.clubName };
}

export function rejectOffer(career, offerId) {
  const o = (career.offersIn || []).find((x) => x.id === offerId);
  if (!o) return null;
  career.offersIn = career.offersIn.filter((x) => x.id !== offerId);
  const p = career.players[o.player];
  if (!p) return null;
  /* dire di no a chi voleva andare lascia il segno */
  if (o.stance === 'wants') {
    p.morale = clamp(p.morale - 10, 0, 100);
    p.bond = clamp((p.bond ?? 50) - 6, 0, 100);
    const rand = mulberry32(fnv1a(`${career.seed}|${o.id}|reject`));
    if (rand() < 0.35 && !(p.flags || []).includes('wantsOut')) p.flags = [...(p.flags || []), 'wantsOut'];
    return { status: 'upset', wantsOut: (p.flags || []).includes('wantsOut') };
  }
  if (!(p.flags || []).includes('listed') && p.personality === 'ambizioso') p.morale = clamp(p.morale - 8, 0, 100);
  return { status: 'rejected' };
}

/* ------------------------------------------------------------------ */
/* il mercato degli altri                                               */
/* ------------------------------------------------------------------ */

const NEED = { DIF: 7, CEN: 7, ATT: 5 };

/**
 * Anche i club del computer comprano: da un altro club del campionato o da
 * un altro campionato, nel reparto dove sono più corti. Se l'utente stava
 * trattando lo stesso giocatore, la trattativa salta.
 * `share` è la probabilità che un club faccia un acquisto.
 */
export function worldTransfers(career, data, share = 0.3) {
  const rand = rngFor(career, `world-${career.season}-${career.md}`);
  const season = career.season;
  const moved = career.moved = career.moved || {};
  const ai = Object.keys(career.clubs).filter((id) => id !== career.club);
  const news = [];
  /* il livello del campionato secondo i dati: chi sale di categoria investe per restarci */
  const home = leagueOf(data, career.league).clubs.map((id) => data.leagues.clubs[id]?.strength ?? 60);
  const leagueLevel = home.reduce((a, b) => a + b, 0) / Math.max(1, home.length);
  for (const buyerId of ai) {
    const buyer = career.clubs[buyerId];
    /* chi è sceso sotto il suo livello storico compra di più, e compra meglio */
    const now = currentStrength(career, buyerId);
    const ambition = Math.max(data.leagues.clubs[buyerId]?.strength ?? now, leagueLevel - 3);
    if (rand() >= share * clamp(1 + (ambition - now) * 0.35, 0.5, 3)) continue;
    const str = Math.max(now, ambition - 1);
    const squad = squadOf(career, buyerId).filter((p) => !p.loanOut);
    const count = (d) => squad.filter((p) => DEPT[p.role] === d).length;
    const dept = Object.keys(NEED).sort((a, b) => count(a) / NEED[a] - count(b) / NEED[b])[0];
    const fits = (role, ovr, age) => DEPT[role] === dept && ovr >= str - 1 && ovr <= str + 5 && age <= 31;
    /* dentro il campionato si pesca solo fra le riserve degli altri (un titolare
       venduto a una rivale impoverirebbe il campionato); più spesso si compra fuori */
    const inside = [];
    for (const other of ai) {
      if (other === buyerId || squadOf(career, other).length <= 23) continue;
      const starters = new Set(squadOf(career, other).filter((x) => !x.loanOut).sort((a, b) => b.ovr - a.ovr).slice(0, 11).map((x) => x.id));
      for (const p of squadOf(career, other)) {
        if (!p.loanOut && !p.loanIn && !starters.has(p.id) && fits(p.role, p.ovr, ageOf(p, season))) inside.push({ p, clubId: other, live: true });
      }
    }
    const outside = [];
    const others = data.leagues.leagues.filter((l) => l.id !== career.league);
    const lg = others[Math.floor(rand() * others.length)];
    for (const [clubId, rows] of Object.entries(data.squads[lg.id])) {
      if (career.clubs[clubId]) continue;
      for (const r of rows) {
        const [name, birth, , role, rating, , , , , flags] = r;
        if (flags.includes('i') || flags.includes('g') || moved[rowKey(name, birth)]) continue;
        if (fits(role, rating, season - birth)) outside.push({ row: r, clubId, live: false });
      }
    }
    const pool = outside.length && (!inside.length || rand() < 0.75) ? outside : inside;
    if (!pool.length) continue;
    const pick = pool[Math.floor(rand() * pool.length)];
    const p = pick.live ? pick.p : playerFromRow(pick.row, pick.clubId, season);
    const key = keyOf(p);
    const fee = r1(valueOf(p, season) * (0.9 + rand() * 0.4));
    if (pick.live) {
      const seller = career.clubs[pick.clubId];
      seller.squad = seller.squad.filter((id) => id !== p.id);
      delete career.players[p.id];
      refillAfterSale(career, pick.clubId, rand);
    }
    const np = { ...p, id: `${buyerId}:${fnv1a(`${key}|w|${season}|${career.md}`).toString(36)}`, club: buyerId, recent: p.recent || emptyStats(), flags: [], wage: wageFor(p.ovr, ageOf(p, season)) };
    career.players[np.id] = np;
    buyer.squad.push(np.id);
    moved[key] = buyerId;
    const fromName = career.clubs[pick.clubId]?.name || data.leagues.clubs[pick.clubId]?.name || pick.clubId;
    news.push({ season, md: career.md, name: p.name, ovr: p.ovr, role: p.role, from: pick.clubId, fromName, to: buyerId, toName: buyer.name, fee });
    /* se l'utente lo stava trattando, qualcuno è stato più veloce */
    for (const t of talksNow(career)) {
      if (t.key === key && isOpenTalk(t)) collapse(t, 'hijacked', { club: buyer.name });
    }
    /* rosa troppo lunga: il peggiore si libera */
    const long = squadOf(career, buyerId).filter((x) => !x.loanOut);
    if (long.length > 28) {
      const worst = long.sort((a, b) => a.ovr - b.ovr)[0];
      buyer.squad = buyer.squad.filter((id) => id !== worst.id);
      moved[keyOf(worst)] = 'free';
      delete career.players[worst.id];
    }
  }
  career.news = [...news, ...(career.news || [])].slice(0, 40);
  return news;
}

/* ------------------------------------------------------------------ */
/* rinnovi e rescissioni                                                */
/* ------------------------------------------------------------------ */

/** cosa chiede un giocatore per rinnovare, e se ne ha voglia */
export function renewalTerms(career, p) {
  const age = ageOf(p, career.season);
  const years = age <= 24 ? 5 : age <= 29 ? 4 : age <= 32 ? 2 : 1;
  const base = wageFor(p.ovr, age);
  const mood = (p.morale - 55) * 0.006 + ((p.bond ?? 50) - 50) * 0.006;
  const raise = clamp(0.25 - mood + (p.personality === 'ambizioso' ? 0.15 : 0), 0, 0.6);
  const wage = r2(Math.max(p.wage, base) * (1 + raise));
  const willing = p.morale >= 35 && (p.bond ?? 50) >= 30 && !(p.flags || []).includes('wantsOut');
  return { years, wage, willing };
}

export function renew(career, playerId) {
  const p = career.players[playerId];
  if (!p) return null;
  const terms = renewalTerms(career, p);
  if (!terms.willing) return { status: 'refused' };
  const bill = squadOf(career, career.club).reduce((n, x) => n + x.wage, 0) - p.wage + terms.wage;
  if (bill > career.clubs[career.club].wageBudget * 1.1) return { status: 'noWages' };
  p.contract = career.season + terms.years;
  p.wage = terms.wage;
  p.morale = clamp(p.morale + 6, 0, 100);
  p.flags = [...new Set([...(p.flags || []), 'renewed'])].filter((f) => f !== 'noRenew');
  return { status: 'renewed', ...terms };
}

/** rescissione: si paga metà di quello che resta del contratto */
export function release(career, playerId) {
  const p = career.players[playerId];
  if (!p) return null;
  const blocked = canLetGo(career, p);
  if (blocked) return { status: blocked };
  const club = career.clubs[career.club];
  const cost = r1(Math.max(0, p.contract - career.season) * p.wage * 0.5);
  if (cost > club.budget) return { status: 'noBudget', cost };
  club.budget = r1(club.budget - cost);
  club.squad = club.squad.filter((id) => id !== p.id);
  career.tactics.lineup = career.tactics.lineup.filter((id) => id !== p.id);
  career.tactics.bench = career.tactics.bench.filter((id) => id !== p.id);
  career.moved = career.moved || {};
  career.moved[keyOf(p)] = 'free';
  career.promises = (career.promises || []).filter((x) => x.player !== p.id);
  delete career.players[p.id];
  return { status: 'released', cost };
}

export { leagueOf };
