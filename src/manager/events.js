/* ALLENATORE — imprevisti e decisioni.

   Un evento ha condizioni (classifica, risultati, fiducia, un giocatore con
   certe caratteristiche), da due a tre opzioni e per ogni opzione un effetto.
   Alcune opzioni sono una scommessa: la stessa scelta va bene o male secondo
   la personalità del giocatore, il suo legame con l'allenatore, la forma, il
   caso. Altre lasciano un segno che torna settimane dopo (catene e promesse).

   Formato di un evento (data/manager/events.json):
   { id, cat, kind: 'decision'|'news', w, repeat, when: {…, player: {…}},
     o: [{ fx, odds?: { base, pers, bond, form, good, bad }, chain?, promise? }] }
   I testi stanno in data/manager/text.<lingua>.json con la stessa chiave. */

import { applyPlayerFx, ageOf, valueOf, DEPT } from './players.js';
import { cashIn } from './market.js';
import { squadOf, leagueOf, table, rngFor, nextFixture, isDerby, teamMorale, makeYouth, currentStrength, topUpSquad, resetCurve } from './career.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* nazionalità: chi è straniero, chi parla un'altra lingua, chi viene   */
/* da lontano. Il paese è quello del club, non quello dell'allenatore.  */
/* ------------------------------------------------------------------ */

const EUROPE = new Set('ES IT FR DE GB-ENG GB-SCT GB-WLS GB-NIR NL BE DK PT IE SE CH AT PL HR RS NO TR FI AL SI BA GR UA CZ GE RO HU SK XK BG IS ME LU IL LT RU EE LV AM MK MD MT CY AZ KZ AD FO BY LI SM MC'.split(' '));
const LANGS = {
  it: 'IT SM CH MT',
  en: 'GB-ENG GB-SCT GB-WLS GB-NIR IE US CA AU NZ JM GH NG ZM ZW KE TT BB BM GY KN LC UG SL GM NA ZA MT',
  es: 'ES AR UY CO CL EC VE MX PY PE DO PA CR BO GQ CU HN SV GT NI PR',
  fr: 'FR BE CH LU MC SN CI ML CM CD GN BF MQ GP GA TG MG CF CG HT BJ NE TD KM GF MA DZ TN MR',
  de: 'DE AT CH LU LI',
};
const SPEAKS = {};
for (const [l, list] of Object.entries(LANGS)) for (const c of list.split(' ')) (SPEAKS[c] = SPEAKS[c] || new Set()).add(l);
const LEAGUE_LANG = { IT: 'it', 'GB-ENG': 'en', ES: 'es', DE: 'de', FR: 'fr' };
const sameCountry = (nation, code) => nation === code || (code === 'GB-ENG' && /^GB-/.test(nation || ''));

/** straniero rispetto al paese del club */
export const isForeign = (nation, leagueCode) => Boolean(nation) && !sameCountry(nation, leagueCode);
/** non parla la lingua del campionato fin da piccolo */
export const newLanguage = (nation, leagueCode) => !(SPEAKS[nation]?.has(LEAGUE_LANG[leagueCode]));
/** viene da fuori dall'Europa: voli intercontinentali, un altro mondo */
export const farAway = (nation) => Boolean(nation) && !EUROPE.has(nation);

/* ------------------------------------------------------------------ */
/* contesto                                                            */
/* ------------------------------------------------------------------ */

export function contextOf(career, data) {
  const league = leagueOf(data, career.league);
  const rows = table(career, data, career.md);
  const me = rows.find((r) => r.id === career.club);
  const results = [];
  career.fixtures.slice(0, career.md).forEach((round) => {
    const f = round.find((x) => x.h === career.club || x.a === career.club);
    if (!f?.res) return;
    const home = f.h === career.club;
    const gf = home ? f.res[0] : f.res[1];
    const ga = home ? f.res[1] : f.res[0];
    results.push(gf > ga ? 'W' : gf < ga ? 'L' : 'D');
  });
  const streak = (ch) => { let n = 0; for (let i = results.length - 1; i >= 0 && results[i] === ch; i--) n++; return n; };
  const unbeaten = (() => { let n = 0; for (let i = results.length - 1; i >= 0 && results[i] !== 'L'; i--) n++; return n; })();
  const winless = (() => { let n = 0; for (let i = results.length - 1; i >= 0 && results[i] !== 'W'; i--) n++; return n; })();
  const nf = nextFixture(career);
  const players = squadOf(career, career.club);
  return {
    league, rows, me, level: league.level,
    md: career.md, total: career.fixtures.length,
    pos: me ? me.pos : null, pts: me ? me.pts : 0,
    last: results[results.length - 1] || null,
    streakW: streak('W'), streakL: streak('L'), unbeaten, winless,
    trust: career.board.trust, fans: career.board.fans, rep: career.coach.reputation,
    objective: career.board.objective, gapToTarget: me ? me.pos - career.board.objective.target : 0,
    morale: teamMorale(players), budget: career.clubs[career.club].budget,
    derbyNext: nf ? isDerby(career, career.club, nf.opponent) : false,
    opponent: nf ? career.clubs[nf.opponent] : null,
    season: career.season, seasons: career.coach.seasons,
    players,
    style: career.tactics.style,
    injured: players.filter((p) => p.injury > 0).length,
    ultimatum: Boolean(career.board.ultimatum),
    windowOpen: isWindowOpen(career),
  };
}

export function isWindowOpen(career) {
  const half = Math.floor(career.fixtures.length / 2);
  return career.md <= 1 || (career.md >= half - 1 && career.md <= half + 1);
}

/* ------------------------------------------------------------------ */
/* condizioni                                                          */
/* ------------------------------------------------------------------ */

const inRange = (v, min, max) => (min === undefined || v >= min) && (max === undefined || v <= max);

export function fits(ev, ctx, career) {
  const w = ev.when || {};
  if (!inRange(ctx.md, w.mdMin, w.mdMax)) return false;
  if (w.mdFromEndMax !== undefined && ctx.total - ctx.md > w.mdFromEndMax) return false;
  if (!inRange(ctx.pos ?? 99, w.posMin, w.posMax)) return false;
  if (w.gapMin !== undefined && ctx.gapToTarget < w.gapMin) return false;
  if (w.gapMax !== undefined && ctx.gapToTarget > w.gapMax) return false;
  if (!inRange(ctx.trust, w.trustMin, w.trustMax)) return false;
  if (!inRange(ctx.fans, w.fansMin, w.fansMax)) return false;
  if (!inRange(ctx.morale, w.moraleMin, w.moraleMax)) return false;
  if (!inRange(ctx.rep, w.repMin, w.repMax)) return false;
  if (!inRange(ctx.budget, w.budgetMin, w.budgetMax)) return false;
  if (!inRange(ctx.seasons, w.seasonsMin, w.seasonsMax)) return false;
  if (!inRange(ctx.injured, w.injuredMin, w.injuredMax)) return false;
  if (w.level && w.level !== ctx.level) return false;
  if (w.streakW && ctx.streakW < w.streakW) return false;
  if (w.streakL && ctx.streakL < w.streakL) return false;
  if (w.unbeaten && ctx.unbeaten < w.unbeaten) return false;
  if (w.winless && ctx.winless < w.winless) return false;
  if (w.last && ctx.last !== w.last) return false;
  if (w.derbyNext && !ctx.derbyNext) return false;
  if (w.objective && !w.objective.includes(ctx.objective.id)) return false;
  if (w.styles && !w.styles.includes(ctx.style)) return false;
  if (w.notStyles && w.notStyles.includes(ctx.style)) return false;
  if (w.window === true && !ctx.windowOpen) return false;
  if (w.window === false && ctx.windowOpen) return false;
  if (w.ultimatum !== undefined && w.ultimatum !== ctx.ultimatum) return false;
  if (w.coachForeign && !isForeign(career.coach.nation, ctx.league.code)) return false;
  if (w.flag && !career.flags[w.flag]) return false;
  if (w.noFlag && career.flags[w.noFlag]) return false;
  if (w.chainOnly) return false;
  return true;
}

/** i giocatori che possono essere protagonisti di un evento, dal più adatto */
export function candidates(ev, ctx, career) {
  const f = ev.when?.player;
  if (!f) return [null];
  const season = career.season;
  const squad = ctx.players.filter((p) => !p.loanOut);
  const byOvr = [...squad].sort((a, b) => b.ovr - a.ovr);
  const rank = new Map(byOvr.map((p, i) => [p.id, i + 1]));
  const starters = new Set(career.tactics.lineup);
  return squad.filter((p) => {
    const age = ageOf(p, season);
    if (f.roles && !f.roles.includes(p.role)) return false;
    if (f.depts && !f.depts.includes(DEPT[p.role])) return false;
    if (!inRange(age, f.ageMin, f.ageMax)) return false;
    if (!inRange(p.ovr, f.ovrMin, f.ovrMax)) return false;
    if (f.rankMax && rank.get(p.id) > f.rankMax) return false;
    if (f.rankMin && rank.get(p.id) < f.rankMin) return false;
    if (f.personality && !f.personality.includes(p.personality)) return false;
    if (!inRange(p.form, f.formMin, f.formMax)) return false;
    if (!inRange(p.morale, f.moraleMin, f.moraleMax)) return false;
    if (!inRange(p.fitness, f.fitnessMin, f.fitnessMax)) return false;
    if (!inRange(p.bond ?? 50, f.bondMin, f.bondMax)) return false;
    if (f.potentialGap && p.potential - p.ovr < f.potentialGap) return false;
    if (f.injured === true && !p.injury) return false;
    if (f.injured === false && p.injury) return false;
    if (f.starter === true && !starters.has(p.id)) return false;
    if (f.starter === false && starters.has(p.id)) return false;
    if (f.captain === true && p.id !== career.tactics.captainId) return false;
    if (f.captain === false && p.id === career.tactics.captainId) return false;
    if (f.contractLeft !== undefined && p.contract - season > f.contractLeft) return false;
    if (f.capsMin && (p.caps || 0) < f.capsMin) return false;
    if (f.injuryProneMin && p.injuryProne < f.injuryProneMin) return false;
    if (f.goalsMin && p.stats.goals < f.goalsMin) return false;
    if (f.appsMax !== undefined && p.stats.apps > f.appsMax) return false;
    if (f.appsMin !== undefined && p.stats.apps < f.appsMin) return false;
    if (f.avgMin && (!p.stats.apps || p.stats.ratingSum / p.stats.apps < f.avgMin)) return false;
    if (f.avgMax && (!p.stats.apps || p.stats.ratingSum / p.stats.apps > f.avgMax)) return false;
    const code = ctx.league.code;
    if (f.foreign === true && !isForeign(p.nation, code)) return false;
    if (f.newLang && (!isForeign(p.nation, code) || !newLanguage(p.nation, code))) return false;
    if (f.farAway && !farAway(p.nation)) return false;
    if (f.newSigning && !(p.signedFrom && p.signedSeason === season)) return false;
    if (f.penMissedLast && p.lastMatch?.md !== career.md - 1) return false;
    if (f.penMissedLast && !p.lastMatch.penMissed) return false;
    if (f.errorLast && !(p.lastMatch?.md === career.md - 1 && p.lastMatch.errors > 0)) return false;
    if (f.errorsMin && (p.stats.errors || 0) < f.errorsMin) return false;
    if (f.exClubNext && !(ctx.opponent && p.signedFrom === ctx.opponent.id)) return false;
    if (f.justBack && !(p.backMd && p.backMd.s === season && career.md - p.backMd.md <= 3)) return false;
    if (f.lastRatingMin && !(p.lastMatch?.md === career.md - 1 && (p.lastRating || 0) >= f.lastRatingMin)) return false;
    if (f.academy && !p.academy && !p.youth) return false;
    if (f.flag && !p.flags.includes(f.flag)) return false;
    if (f.noFlag && p.flags.includes(f.noFlag)) return false;
    return true;
  }).sort((a, b) => (rank.get(a.id) - rank.get(b.id)));
}

/* ------------------------------------------------------------------ */
/* scelta degli eventi della settimana                                  */
/* ------------------------------------------------------------------ */

export const PER_WEEK = { min: 1, max: 3 };

/**
 * Prepara la coda della prossima giornata: prima le conseguenze in arrivo
 * (catene, promesse da verificare), poi eventi nuovi pesati, mai due della
 * stessa categoria nella stessa settimana.
 */
export function planWeek(career, data, defs) {
  const rand = rngFor(career, 'events');
  const ctx = contextOf(career, data);
  const byId = new Map(defs.map((e) => [e.id, e]));
  const queue = [];

  /* 1. catene in scadenza */
  career.later = career.later || [];
  const due = career.later.filter((x) => x.md <= career.md);
  career.later = career.later.filter((x) => x.md > career.md);
  for (const d of due) {
    const ev = byId.get(d.id);
    if (!ev) continue;
    const subject = d.player ? career.players[d.player] : null;
    if (d.player && (!subject || subject.club !== career.club)) continue;
    queue.push(instance(career, ev, subject, d.vars));
  }

  /* 2. promesse: si controllano alla scadenza */
  for (const pr of [...(career.promises || [])]) {
    if (pr.deadline > career.md) continue;
    career.promises = career.promises.filter((x) => x !== pr);
    const p = career.players[pr.player];
    if (!p || p.club !== career.club) continue;
    const kept = pr.count >= pr.need;
    const ev = byId.get(kept ? 'promise_kept' : 'promise_broken');
    if (ev) queue.push(instance(career, ev, p, { need: pr.need, count: pr.count, type: pr.type }));
  }

  /* 3. eventi nuovi */
  const want = queue.length >= 2 ? 0 : PER_WEEK.min + (rand() < 0.45 ? 1 : 0) + (rand() < 0.12 ? 1 : 0) - queue.length;
  const usedCats = new Set(queue.map((q) => byId.get(q.id)?.cat));
  const usedPlayers = new Set(queue.map((q) => q.player).filter(Boolean));
  for (let n = 0; n < want; n++) {
    const pool = [];
    for (const ev of defs) {
      if (ev.chainOnly || usedCats.has(ev.cat)) continue;
      const last = career.seen[ev.id];
      if (last !== undefined) {
        if (!ev.repeat) continue;
        const ago = (career.season - last.s) * 50 + (career.md - last.md);
        if (ago < ev.repeat) continue;
      }
      if (!fits(ev, ctx, career)) continue;
      const cands = candidates(ev, ctx, career).filter((p) => !p || !usedPlayers.has(p.id));
      if (!cands.length) continue;
      pool.push({ ev, cands, w: ev.w || 5 });
    }
    if (!pool.length) break;
    let r = rand() * pool.reduce((a, x) => a + x.w, 0);
    let chosen = pool[0];
    for (const x of pool) { r -= x.w; if (r <= 0) { chosen = x; break; } }
    /* il protagonista: più spesso i primi della lista, ma non sempre */
    const c = chosen.cands;
    const subject = c[0] === null ? null : c[Math.min(c.length - 1, Math.floor(rand() ** 2 * Math.min(c.length, 6)))];
    queue.push(instance(career, chosen.ev, subject, {}));
    usedCats.add(chosen.ev.cat);
    if (subject) usedPlayers.add(subject.id);
  }
  career.queue = queue;
  return queue;
}

function instance(career, ev, subject, vars) {
  const nf = nextFixture(career);
  return {
    key: `${ev.id}:${career.season}:${career.md}:${subject ? subject.id : '-'}`,
    id: ev.id,
    player: subject ? subject.id : null,
    vars: {
      ...vars,
      player: subject ? subject.name : '',
      surname: subject ? subject.name.split(' ').slice(-1)[0] : '',
      club: career.clubs[career.club].name,
      opponent: nf ? career.clubs[nf.opponent].name : '',
      coach: career.coach.name,
      value: subject ? valueOf(subject, career.season) : 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* risoluzione                                                          */
/* ------------------------------------------------------------------ */

/** probabilità che un'opzione scommessa vada bene, spiegabile a schermo */
export function oddsFor(career, opt, subject) {
  const o = opt.odds;
  if (!o) return null;
  let p = o.base ?? 0.5;
  if (subject) {
    if (o.pers && o.pers[subject.personality] !== undefined) p += o.pers[subject.personality];
    if (o.bond) p += ((subject.bond ?? 50) - 50) * o.bond;
    if (o.form) p += subject.form * o.form;
    if (o.morale) p += (subject.morale - 60) * o.morale;
    if (o.age) p += (ageOf(subject, career.season) - 25) * o.age;
  }
  if (o.trust) p += (career.board.trust - 50) * o.trust;
  if (o.fans) p += (career.board.fans - 50) * o.fans;
  if (o.rep) p += (career.coach.reputation - 50) * o.rep;
  if (o.teamMorale) p += (teamMorale(squadOf(career, career.club)) - 60) * o.teamMorale;
  return clamp(p, 0.05, 0.95);
}

/**
 * Applica l'effetto di un'opzione. Restituisce cosa è cambiato, per il
 * resoconto a schermo: { outcome: 'good'|'bad'|null, changes: [...] }.
 */
export function resolve(career, data, defs, key, index) {
  const item = career.queue.find((q) => q.key === key);
  if (!item) return null;
  const ev = defs.find((e) => e.id === item.id);
  const opt = ev.o[index] || ev.o[0];
  const subject = item.player ? career.players[item.player] : null;
  const rand = rngFor(career, `resolve-${key}`);
  let outcome = null;
  let fx = opt.fx || {};
  const odds = oddsFor(career, opt, subject);
  if (odds !== null) {
    outcome = rand() < odds ? 'good' : 'bad';
    fx = mergeFx(fx, opt.odds[outcome] || {});
  }
  const changes = applyFx(career, data, fx, subject, rand);
  if (opt.chain && (!opt.chainOn || opt.chainOn === outcome)) {
    career.later = career.later || [];
    career.later.push({ id: opt.chain.id, md: career.md + (opt.chain.in || 3), player: subject ? subject.id : null, vars: item.vars });
  }
  if (opt.promise && subject) {
    career.promises = career.promises || [];
    career.promises.push({ player: subject.id, type: opt.promise.type, need: opt.promise.need, count: 0, deadline: career.md + opt.promise.within });
  }
  career.seen[ev.id] = { s: career.season, md: career.md };
  career.queue = career.queue.filter((q) => q.key !== key);
  const entry = { key, id: ev.id, option: index, outcome, changes, season: career.season, md: career.md, vars: item.vars, player: item.player };
  career.log.unshift(entry);
  if (career.log.length > 120) career.log.length = 120;
  return entry;
}

function mergeFx(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') out[k] = mergeFx(a[k], v);
    else if (typeof v === 'number' && typeof a[k] === 'number') out[k] = a[k] + v;
    else out[k] = v;
  }
  return out;
}

/* le chiavi di fx che riguardano il protagonista */
const PLAYER_KEYS = ['attrs', 'potential', 'morale', 'form', 'fitness', 'bond', 'injury', 'injuryProne', 'consistency', 'newRole', 'contract', 'wage', 'flag', 'unflag'];

export function applyFx(career, data, fx, subject, rand = Math.random) {
  const changes = [];
  const club = career.clubs[career.club];
  const b = career.board;
  const push = (kind, value, extra = {}) => { if (value) changes.push({ kind, value: Math.round(value * 10) / 10, ...extra }); };

  if (fx.trust) { const before = b.trust; b.trust = clamp(b.trust + fx.trust, 0, 100); push('trust', b.trust - before); }
  if (fx.fans) { const before = b.fans; b.fans = clamp(b.fans + fx.fans, 0, 100); push('fans', b.fans - before); }
  if (fx.reputation) { const before = career.coach.reputation; career.coach.reputation = clamp(career.coach.reputation + fx.reputation, 1, 100); push('reputation', career.coach.reputation - before); }
  if (fx.budget) { club.budget = Math.max(0, Math.round((club.budget + fx.budget) * 10) / 10); push('budget', fx.budget); }
  if (fx.budgetPct) { const d = Math.round(club.budget * fx.budgetPct * 10) / 10; club.budget = Math.max(0, club.budget + d); push('budget', d); }
  if (fx.teamMorale || fx.teamForm || fx.teamFitness) {
    for (const p of squadOf(career, career.club)) {
      if (fx.teamMorale) p.morale = clamp(p.morale + fx.teamMorale, 0, 100);
      if (fx.teamForm) p.form = clamp(p.form + fx.teamForm, -10, 10);
      if (fx.teamFitness) p.fitness = clamp(p.fitness + fx.teamFitness, 0, 100);
    }
    push('teamMorale', fx.teamMorale); push('teamForm', fx.teamForm); push('teamFitness', fx.teamFitness);
  }
  if (fx.senior) {
    /* i senatori: i cinque con più presenze in nazionale o più anni */
    const seniors = [...squadOf(career, career.club)].sort((a, b2) => (b2.caps + ageOf(b2, career.season)) - (a.caps + ageOf(a, career.season))).slice(0, 5);
    for (const p of seniors) applyPlayerFx(p, fx.senior, career.season);
    push('seniors', fx.senior.morale || fx.senior.bond);
  }
  if (fx.youngsters) {
    for (const p of squadOf(career, career.club).filter((x) => ageOf(x, career.season) <= 21)) applyPlayerFx(p, fx.youngsters, career.season);
    push('youngsters', fx.youngsters.morale || fx.youngsters.potential);
  }
  if (fx.familiarity) {
    const s = career.tactics.style;
    club.familiarity[s] = clamp((club.familiarity[s] || 0) + fx.familiarity, 0, 100);
    push('familiarity', fx.familiarity);
  }
  if (fx.nextMatch) {
    career.flags.nextMatch = { ...(career.flags.nextMatch || {}), ...fx.nextMatch };
    changes.push({ kind: 'nextMatch', value: fx.nextMatch });
  }
  if (fx.setFlag) career.flags[fx.setFlag] = { s: career.season, md: career.md };
  if (fx.clearFlag) delete career.flags[fx.clearFlag];
  if (fx.suspendCoach) { career.flags.coachBan = { left: fx.suspendCoach }; push('coachBan', fx.suspendCoach); }
  if (fx.academyInvest) { career.flags.academyInvest = { s: career.season }; push('academy', 1); }
  if (fx.staff) { career.flags.staff = clamp((career.flags.staff || 50) + fx.staff, 0, 100); push('staff', fx.staff); }

  if (subject) {
    const pfx = {};
    for (const k of PLAYER_KEYS) if (fx[k] !== undefined) pfx[k] = fx[k];
    if (Object.keys(pfx).length) {
      const beforeMorale = subject.morale;
      const res = applyPlayerFx(subject, pfx, career.season);
      push('ovr', res.ovr, { player: subject.id });
      push('morale', subject.morale - beforeMorale, { player: subject.id });
      if (pfx.injury) push('injury', pfx.injury, { player: subject.id });
      if (pfx.potential) push('potential', pfx.potential, { player: subject.id });
      if (pfx.bond) push('bond', pfx.bond, { player: subject.id });
      if (pfx.newRole) changes.push({ kind: 'newRole', value: pfx.newRole, player: subject.id });
      if (pfx.contract) changes.push({ kind: 'contract', value: pfx.contract, player: subject.id });
      if (pfx.suspended) subject.suspended = Math.max(subject.suspended, pfx.suspended);
    }
    if (fx.suspended) { subject.suspended = Math.max(subject.suspended, fx.suspended); push('suspended', fx.suspended, { player: subject.id }); }
    if (fx.renew) {
      subject.contract = career.season + fx.renew;
      subject.flags = [...new Set([...(subject.flags || []), 'renewed'])].filter((f) => f !== 'noRenew');
      subject.wage = Math.round(subject.wage * (1 + (fx.raise || 0.2)) * 100) / 100;
      changes.push({ kind: 'renew', value: fx.renew, player: subject.id });
    }
    if (fx.noRenew) { subject.flags = [...new Set([...(subject.flags || []), 'noRenew'])].filter((f) => f !== 'renewed'); changes.push({ kind: 'noRenew', value: 1, player: subject.id }); }
    if (fx.sell) {
      /* ceduto: esce dalla rosa, entrano i soldi (una quota del valore) */
      const fee = Math.round(valueOf(subject, career.season) * fx.sell * 10) / 10;
      const money = cashIn(career, fee);
      career.moved = career.moved || {};
      career.moved[`${subject.name}|${subject.birth}`] = 'sold';
      career.inbox.unshift({ id: `out-ev-${subject.id}`, type: 'market', season: career.season, md: career.md, key: 'soldEvent', vars: { player: subject.name, fee, ...money } });
      club.squad = club.squad.filter((id) => id !== subject.id);
      career.tactics.lineup = career.tactics.lineup.filter((id) => id !== subject.id);
      career.tactics.bench = career.tactics.bench.filter((id) => id !== subject.id);
      subject.club = null;
      delete career.players[subject.id];
      changes.push({ kind: 'sold', value: fee, player: subject.id, name: subject.name });
      changes.push({ kind: 'clubCut', value: money.toClub, name: subject.name });
    } else if (fx.loanOut) {
      subject.loanOut = true;
      career.tactics.lineup = career.tactics.lineup.filter((id) => id !== subject.id);
      career.tactics.bench = career.tactics.bench.filter((id) => id !== subject.id);
      changes.push({ kind: 'loanOut', value: 1, player: subject.id });
    }
    if (fx.sell || fx.loanOut) {
      for (const y of topUpSquad(career, career.club, rand)) changes.push({ kind: 'youthIn', value: y.ovr, player: y.id, name: y.name });
    }
    if (fx.promiseStarts) {
      career.promises = career.promises || [];
      career.promises.push({ player: subject.id, type: 'starts', need: fx.promiseStarts.need, count: 0, deadline: career.md + fx.promiseStarts.within });
    }
    if (fx.captain) { career.tactics.captainId = subject.id; changes.push({ kind: 'captain', value: 1, player: subject.id }); }
    if (fx.penalties) { career.tactics.penaltyId = subject.id; changes.push({ kind: 'penalties', value: 1, player: subject.id }); }
  }
  if (fx.youthPromote) {
    /* ragazzi della Primavera che salgono subito in prima squadra */
    for (let i = 0; i < fx.youthPromote; i++) {
      const y = makeYouth(career, career.club, rand, { quality: fx.youthQuality || 0 });
      changes.push({ kind: 'youthIn', value: y.ovr, player: y.id, name: y.name });
    }
  }
  if (fx.signVeteran) {
    /* uno svincolato esperto: pronto subito, per una stagione */
    const v = makeYouth(career, career.club, rand, { role: fx.signVeteran.role || null, quality: 0 });
    v.birth = career.season - 31 - Math.floor(rand() * 4);
    v.academy = false;
    v.youth = false;
    const target = Math.round(currentStrength(career, career.club) + (fx.signVeteran.level || 0));
    applyPlayerFx(v, { attrs: { role: target - v.ovr } }, career.season);
    resetCurve(v, career.season);
    v.potential = v.ovr;
    v.contract = career.season + 1;
    v.wage = Math.round((0.3 + (v.ovr - 60) * 0.08) * 100) / 100;
    v.personality = fx.signVeteran.personality || v.personality;
    changes.push({ kind: 'veteranIn', value: v.ovr, player: v.id, name: v.name });
  }
  void data; void rand;
  return changes;
}

/** dopo la partita: le presenze da titolare contano per le promesse */
export function trackPromises(career, lineup) {
  for (const pr of career.promises || []) {
    if (pr.type === 'starts' && lineup.includes(pr.player)) pr.count++;
  }
}
